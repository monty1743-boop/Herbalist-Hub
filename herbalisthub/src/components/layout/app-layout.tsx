"use client"

import { ReactNode, useState } from "react"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { Footer } from "./footer"

interface AppLayoutProps {
  children: ReactNode
  className?: string
  showSidebar?: boolean
  showFooter?: boolean
}

export function AppLayout({ 
  children, 
  className,
  showSidebar = true,
  showFooter = true 
}: AppLayoutProps) {
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Don't show sidebar for unauthenticated users
  const shouldShowSidebar = showSidebar && session

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header />

      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Sidebar - Desktop */}
        {shouldShowSidebar && (
          <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:top-14 z-30">
            <div className="flex-1 flex flex-col min-h-0 border-r bg-card">
              <Sidebar />
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main 
          className={cn(
            "flex-1 overflow-auto",
            shouldShowSidebar && "md:ml-64",
            className
          )}
        >
          <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
          
          {/* Footer */}
          {showFooter && <Footer />}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {shouldShowSidebar && sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div 
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-card">
            <Sidebar />
          </div>
        </div>
      )}
    </div>
  )
}