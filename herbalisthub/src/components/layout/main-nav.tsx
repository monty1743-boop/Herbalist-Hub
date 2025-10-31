import Link from "next/link"
import { cn } from "@/lib/utils"

interface MainNavProps {
  className?: string
}

export function MainNav({ className }: MainNavProps) {
  return (
    <div className={cn("mr-4 hidden md:flex", className)}>
      <Link href="/" className="mr-6 flex items-center space-x-2">
        <span className="hidden font-bold sm:inline-block">
          HerbalistHub
        </span>
      </Link>
      <nav className="flex items-center gap-6 text-sm">
        <Link
          href="/dashboard"
          className="transition-colors hover:text-foreground/80 text-foreground/60"
        >
          Dashboard
        </Link>
        <Link
          href="/inventory"
          className="transition-colors hover:text-foreground/80 text-foreground/60"
        >
          Inventory
        </Link>
        <Link
          href="/clients"
          className="transition-colors hover:text-foreground/80 text-foreground/60"
        >
          Clients
        </Link>
        <Link
          href="/appointments"
          className="transition-colors hover:text-foreground/80 text-foreground/60"
        >
          Appointments
        </Link>
        <Link
          href="/formulas"
          className="transition-colors hover:text-foreground/80 text-foreground/60"
        >
          Formulas
        </Link>
      </nav>
    </div>
  )
}