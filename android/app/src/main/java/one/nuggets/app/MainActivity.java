package one.nuggets.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    configureBackButtonBehavior();
    configureExternalLinkBehavior();
  }

  private void configureBackButtonBehavior() {
    getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
      @Override
      public void handleOnBackPressed() {
        Bridge bridge = getBridge();
        if (bridge != null && bridge.getWebView() != null && bridge.getWebView().canGoBack()) {
          bridge.getWebView().goBack();
          return;
        }
        moveTaskToBack(true);
      }
    });
  }

  private void configureExternalLinkBehavior() {
    Bridge bridge = getBridge();
    if (bridge == null || bridge.getWebView() == null) {
      return;
    }

    bridge.getWebView().setWebViewClient(new BridgeWebViewClient(bridge) {
      @Override
      public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        Uri uri = request != null ? request.getUrl() : null;
        if (uri != null && isInternalWebUri(uri)) {
          return false;
        }
        if (uri != null && shouldOpenExternal(uri)) {
          openExternal(uri);
          return true;
        }
        return super.shouldOverrideUrlLoading(view, request);
      }

      @Override
      public boolean shouldOverrideUrlLoading(WebView view, String url) {
        Uri uri = url != null ? Uri.parse(url) : null;
        if (uri != null && isInternalWebUri(uri)) {
          return false;
        }
        if (uri != null && shouldOpenExternal(uri)) {
          openExternal(uri);
          return true;
        }
        return super.shouldOverrideUrlLoading(view, url);
      }
    });
  }

  private boolean shouldOpenExternal(Uri uri) {
    String scheme = uri.getScheme();
    if (scheme == null) {
      return false;
    }

    String normalizedScheme = scheme.toLowerCase();
    if ("http".equals(normalizedScheme) || "https".equals(normalizedScheme)) {
      return !isInternalWebUri(uri);
    }

    return !("about".equals(normalizedScheme)
        || "data".equals(normalizedScheme)
        || "javascript".equals(normalizedScheme)
        || "blob".equals(normalizedScheme)
        || "file".equals(normalizedScheme));
  }

  private boolean isInternalWebUri(Uri uri) {
    String scheme = uri.getScheme();
    if (scheme == null) {
      return false;
    }
    String normalizedScheme = scheme.toLowerCase();
    if (!"http".equals(normalizedScheme) && !"https".equals(normalizedScheme)) {
      return false;
    }
    String host = uri.getHost();
    if (host == null) {
      return false;
    }
    String normalizedHost = host.toLowerCase();
    return "nuggets.one".equals(normalizedHost)
        || "www.nuggets.one".equals(normalizedHost)
        || normalizedHost.endsWith(".nuggets.one");
  }

  private void openExternal(Uri uri) {
    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
    intent.addCategory(Intent.CATEGORY_BROWSABLE);
    try {
      startActivity(intent);
    } catch (ActivityNotFoundException ignored) {
      // Ignore when no handler exists for a custom scheme.
    }
  }
}
