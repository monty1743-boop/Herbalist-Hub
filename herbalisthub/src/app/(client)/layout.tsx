import { Metadata } from 'next'
import { ClientNavigation } from '@/components/client/ClientNavigation'

export const metadata: Metadata = {
  title: 'Client Portal | HerbalistHub',
  description: 'Secure client portal for managing your health journey',
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Desktop Navigation */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white">
          <ClientNavigation />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-8 pb-20 lg:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <ClientNavigation mobile className="lg:hidden" />
    </div>
  )
}