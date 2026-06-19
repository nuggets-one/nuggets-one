'use client';

import { ThemeProvider } from 'next-themes';
import { NativePushRegistration } from '@/components/push/native-push-registration';
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
      <NativePushRegistration />
      <WebPushRegistration />
      <PushDebugPanel />
    </ThemeProvider>
  );
}
