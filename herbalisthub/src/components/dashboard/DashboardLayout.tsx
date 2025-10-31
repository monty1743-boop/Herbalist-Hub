"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { ErrorBoundary } from "@/components/error-boundary"
import { LoadingSpinner } from "@/components/loading"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: session } = useSession()

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <LoadingSpinner size="xl" className="mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900">Loading Dashboard</h1>
          <p className="text-gray-600 mt-2">Please wait while we authenticate and load your dashboard</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <ErrorBoundary
          customTitle="Navigation Error"
          customMessage="There was a problem loading the navigation sidebar."
          enableReset={true}
        >
          <Sidebar />
        </ErrorBoundary>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="relative z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button
                  type="button"
                  className="-m-2.5 p-2.5"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <ErrorBoundary
                customTitle="Navigation Error"
                customMessage="There was a problem loading the mobile navigation."
                enableReset={true}
              >
                <Sidebar />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="lg:pl-72">
        <ErrorBoundary
          customTitle="Header Error"
          customMessage="There was a problem loading the dashboard header."
          enableReset={true}
        >
          <Header onMenuClick={() => setSidebarOpen(true)} />
        </ErrorBoundary>
        
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <ErrorBoundary
              customTitle="Dashboard Content Error"
              customMessage="There was a problem loading this page content."
              enableReset={true}
            >
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}