import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Header } from '@/components/layout/header'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <Header />
      <main className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
        {children}
      </main>
    </NuqsAdapter>
  )
}
