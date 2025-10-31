"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { MainNav } from "./main-nav"
import { MobileNav } from "./mobile-nav"
import { UserNav } from "./user-nav"
import { Bell, Menu, X } from "lucide-react"

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  const { data: session, status } = useSession()
  const [showMobileNav, setShowMobileNav] = useState(false)

  return (
    <header className={cn("sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      <div className="container flex h-14 items-center">
        {/* Logo */}
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <div className="h-6 w-6 rounded-md bg-primary" />
            <span className="hidden font-bold sm:inline-block">
              HerbalistHub
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        {session && <MainNav />}

        {/* Mobile Navigation Toggle */}
        <button
          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          onClick={() => setShowMobileNav(!showMobileNav)}
          aria-label="Toggle navigation"
        >
          {showMobileNav ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </button>

        {/* Right Side Actions */}
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search bar placeholder - can be implemented later */}
          </div>
          
          <nav className="flex items-center space-x-2">
            {session ? (
              <>
                {/* Notifications */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative h-8 w-8 px-0"
                >
                  <Bell className="h-4 w-4" />
                  <span className="sr-only">Notifications</span>
                  {/* Notification badge */}
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
                </Button>

                {/* User Navigation */}
                <UserNav user={session.user} />
              </>
            ) : (
              <>
                {/* Auth Links for unauthenticated users */}
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/auth/register">Sign Up</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Mobile Navigation */}
      {showMobileNav && session && (
        <MobileNav onClose={() => setShowMobileNav(false)} />
      )}
    </header>
  )
}