import { Suspense } from 'react'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Footer } from '@/components/layout/footer'
import { GlobalYouTubeMiniPlayerHost } from '@/components/layout/global-youtube-mini-player-host'
import { Header } from '@/components/layout/header'
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'

export default function MainLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return (
    <NuqsAdapter>
      <Header />
      <div className="pb-20 lg:pb-6">
        <main className="mx-auto max-w-[90rem] px-4 pt-6 lg:px-6">
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
          <Footer />
        </Suspense>
      </div>
      <Suspense fallback={<div aria-hidden className="lg:hidden pb-[calc(3rem+env(safe-area-inset-bottom))]" />}>
        <MobileBottomNav />
      </Suspense>
      <GlobalYouTubeMiniPlayerHost />
      {/* The canonical nugget detail route may also render here as an intercepted
          in-context sheet. Direct URL hits still render via the full page route. */}
      {modal}
    </NuqsAdapter>
  )
}
