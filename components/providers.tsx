'use client';

import { ThemeProvider } from 'next-themes';
import { AndroidPushRegistration } from '@/components/push/android-push-registration';

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
    </ThemeProvider>
  );
}
