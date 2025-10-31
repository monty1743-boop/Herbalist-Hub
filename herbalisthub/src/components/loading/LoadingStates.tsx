"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Basic loading spinner
export function LoadingSpinner({ 
  size = "md", 
  className 
}: { 
  size?: "sm" | "md" | "lg" | "xl"
  className?: string 
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8",
    xl: "h-12 w-12"
  }

  return (
    <div 
      className={cn(
        "animate-spin rounded-full border-2 border-gray-300 border-t-blue-600",
        sizeClasses[size],
        className
      )}
    />
  )
}

// Loading dots animation
export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn("flex space-x-1", className)}>
      <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
    </div>
  )
}

// Page loading overlay
export function PageLoadingOverlay({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="xl" className="mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-700">{message}</p>
      </div>
    </div>
  )
}

// Inline loading state
export function InlineLoading({ 
  message = "Loading...", 
  className 
}: { 
  message?: string
  className?: string 
}) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-gray-600", className)}>
      <LoadingSpinner size="sm" />
      <span>{message}</span>
    </div>
  )
}

// Card loading skeleton
export function CardLoadingSkeleton({ 
  showHeader = true,
  showBadge = false,
  linesCount = 3,
  className
}: {
  showHeader?: boolean
  showBadge?: boolean  
  linesCount?: number
  className?: string
}) {
  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            {showBadge && <Skeleton className="h-6 w-12 rounded-full" />}
          </div>
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {Array.from({ length: linesCount }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${i === linesCount - 1 ? "w-2/3" : "w-full"}`} />
        ))}
      </CardContent>
    </Card>
  )
}

// Table loading skeleton
export function TableLoadingSkeleton({ 
  rows = 5,
  columns = 4,
  showHeader = true 
}: {
  rows?: number
  columns?: number  
  showHeader?: boolean
}) {
  return (
    <div className="space-y-3">
      {showHeader && (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-20" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  )
}

// Widget loading skeleton
export function WidgetLoadingSkeleton({ 
  title = true,
  stats = false,
  chart = false,
  className 
}: {
  title?: boolean
  stats?: boolean
  chart?: boolean
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        {title && <Skeleton className="h-6 w-40" />}
        {stats && (
          <div className="flex gap-4 mt-4">
            <div className="text-center">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-4 w-12 mt-1" />
            </div>
            <div className="text-center">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-4 w-12 mt-1" />
            </div>
            <div className="text-center">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-4 w-12 mt-1" />
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {chart ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Form loading skeleton  
export function FormLoadingSkeleton({ 
  fields = 3,
  showButtons = true,
  className 
}: {
  fields?: number
  showButtons?: boolean
  className?: string
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      {showButtons && (
        <div className="flex gap-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      )}
    </div>
  )
}

// Dashboard overview loading
export function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <WidgetLoadingSkeleton key={i} stats />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WidgetLoadingSkeleton chart />
        <CardLoadingSkeleton linesCount={5} />
      </div>

      {/* Table Section */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <TableLoadingSkeleton />
        </CardContent>
      </Card>
    </div>
  )
}

// List loading skeleton
export function ListLoadingSkeleton({ 
  items = 5,
  showAvatar = false,
  showBadge = false,
  className 
}: {
  items?: number
  showAvatar?: boolean
  showBadge?: boolean
  className?: string
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
          {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          {showBadge && <Skeleton className="h-6 w-16 rounded-full" />}
        </div>
      ))}
    </div>
  )
}

// Button loading state
export function LoadingButton({ 
  children, 
  isLoading = false, 
  loadingText = "Loading...",
  ...props 
}: {
  children: React.ReactNode
  isLoading?: boolean
  loadingText?: string
  [key: string]: any
}) {
  return (
    <button {...props} disabled={isLoading || props.disabled}>
      {isLoading ? (
        <div className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          {loadingText}
        </div>
      ) : (
        children
      )}
    </button>
  )
}