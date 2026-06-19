# Local iOS secrets (gitignored)

This folder holds files that must **not** be committed.

## GoogleService-Info.plist

After downloading from Firebase Console:

```powershell
npm run setup:ios-push -- --google-service-info "C:\Downloads\GoogleService-Info.plist"
```

If `ios/` does not exist yet, the file is copied here automatically as `GoogleService-Info.plist`.

Verify stashed file:

```powershell
npm run setup:ios-push -- --verify
```

## Codemagic

Upload the same plist as **GOOGLE_SERVICE_INFO_PLIST_BASE64** (encrypted env var in Codemagic UI). Do not commit it.

See [docs/IOS_TESTFLIGHT.md](../docs/IOS_TESTFLIGHT.md).
