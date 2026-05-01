import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Header } from '@/components/layout/header'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <Header />
      <main className="mx-auto max-w-[1800px] px-4 py-6 lg:px-6">
        {children}
      </main>
    </NuqsAdapter>
  )
}
