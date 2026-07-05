import { Suspense } from 'react'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { FeedPendingProvider } from '@/components/feed/feed-pending-context'
import { FeedPendingCoordinator } from '@/components/feed/feed-pending-coordinator'
import { NavigationProgress } from '@/components/layout/navigation-progress'
import { Footer } from '@/components/layout/footer'
import { FooterRouteGate } from '@/components/layout/footer-route-gate'
import { GlobalImageLightboxHost } from '@/components/layout/global-image-lightbox-host'
import { GlobalYouTubeMiniPlayerHost } from '@/components/layout/global-youtube-mini-player-host'
import {
  AuthStatusProvider,
  type AuthStatusState,
} from '@/components/layout/auth-status-provider'
import { Header } from '@/components/layout/header'
import { MobileSearchProvider } from '@/components/layout/mobile-search-context'
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'
import { listAccountMenuLegalLinks } from '@/lib/queries/legal-pages'
import { getServerAuthStatus } from '@/lib/auth/server-auth-status'

const FALLBACK_LEGAL_LINKS = [
  { slug: 'terms', label: 'Terms of use' },
  { slug: 'privacy', label: 'Privacy policy' },
  { slug: 'contact', label: 'Contact' },
]

export default async function MainLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  const [legalLinks, authStatus] = await Promise.all([
    listAccountMenuLegalLinks().catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`MainLayout legal links fallback: ${message}`)
      return FALLBACK_LEGAL_LINKS
    }),
    getServerAuthStatus().catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`MainLayout auth status fallback: ${message}`)
      return { authenticated: false as const, email: null, displayName: null, isAdmin: false }
    }),
  ])

  const initialAuthStatus: AuthStatusState = authStatus.authenticated
    ? {
        status: 'authenticated',
        email: authStatus.email,
        displayName: authStatus.displayName,
        isAdmin: authStatus.isAdmin,
      }
    : { status: 'anonymous' }

  return (
    <NuqsAdapter>
      <MobileSearchProvider>
      <AuthStatusProvider initialStatus={initialAuthStatus}>
      <FeedPendingProvider>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Header legalLinks={legalLinks} />
      <div className="pb-20 lg:pb-0">
        <main className="relative mx-auto max-w-[90rem] px-4 pt-6 lg:px-6">
          <Suspense fallback={null}>
            <FeedPendingCoordinator />
          </Suspense>
          {children}
        </main>
        <Suspense
          fallback={
            <footer className="animate-pulse border-t border-border bg-surface" aria-hidden>
              <div className="mx-auto max-w-[90rem] px-4 py-10 lg:px-6">
                <div className="h-3 max-w-xl rounded-md bg-border" />
                <div className="mt-5 flex gap-4">
                  <div className="h-4 w-20 rounded bg-border" />
                  <div className="h-4 w-24 rounded bg-border" />
                  <div className="h-4 w-16 rounded bg-border" />
                </div>
                <div className="mt-8 h-3 w-28 rounded-md bg-border" />
              </div>
            </footer>
          }
        >
          <FooterRouteGate>
            <Footer />
          </FooterRouteGate>
        </Suspense>
      </div>
      <Suspense fallback={<div aria-hidden className="lg:hidden pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]" />}>
        <MobileBottomNav />
      </Suspense>
      <GlobalYouTubeMiniPlayerHost />
      <GlobalImageLightboxHost />
      {/* The canonical nugget detail route may also render here as an intercepted
          in-context sheet. Direct URL hits still render via the full page route. */}
      {modal}
      </FeedPendingProvider>
      </AuthStatusProvider>
      </MobileSearchProvider>
    </NuqsAdapter>
  )
}
