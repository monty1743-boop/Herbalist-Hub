"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
  className?: string
  action?: ReactNode
}

export function PageHeader({ 
  title, 
  description, 
  children, 
  className,
  action 
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between space-y-2 pb-6", className)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
        {children}
      </div>
      {action && (
        <div className="flex items-center space-x-2">
          {action}
        </div>
      )}
    </div>
  )
}

export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2 pb-6", className)}>
      <div className="h-8 w-64 bg-muted rounded animate-pulse" />
      <div className="h-4 w-96 bg-muted rounded animate-pulse" />
    </div>
  )
}