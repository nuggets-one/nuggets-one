'use client';

import { ThemeProvider } from 'next-themes';
import { AndroidPushRegistration } from '@/components/push/android-push-registration';
import { WebPushRegistration } from '@/components/push/web-push-registration';
import { PushDebugPanel } from '@/components/push/push-debug-panel';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <AndroidPushRegistration />
      <WebPushRegistration />
      <PushDebugPanel />
    </ThemeProvider>
  );
}
