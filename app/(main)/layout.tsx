import { Suspense } from 'react'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
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
      <main className="mx-auto max-w-[1800px] px-4 pb-20 pt-6 lg:px-6 lg:pb-6">
        {children}
      </main>
      <Suspense fallback={<div aria-hidden className="lg:hidden pb-[calc(3rem+env(safe-area-inset-bottom))]" />}>
        <MobileBottomNav />
      </Suspense>
      {modal}
    </NuqsAdapter>
  )
}
