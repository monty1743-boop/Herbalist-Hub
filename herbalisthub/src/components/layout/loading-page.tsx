"use client"

import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface LoadingPageProps {
  className?: string
  message?: string
}

export function LoadingPage({ className, message = "Loading..." }: LoadingPageProps) {
  return (
    <div className={cn("flex min-h-[400px] flex-col items-center justify-center space-y-4", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export function LoadingSpinner({ className, size = "default" }: { 
  className?: string
  size?: "sm" | "default" | "lg" 
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  return (
    <Loader2 className={cn("animate-spin", sizeClasses[size], className)} />
  )
}