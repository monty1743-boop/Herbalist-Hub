"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatItem {
  title: string
  value: string | number
  change?: {
    value: number
    type: "increase" | "decrease" | "stable"
    period: string
  }
  icon: React.ComponentType<{ className?: string }>
  color?: "blue" | "green" | "orange" | "red" | "purple"
  description?: string
}

interface QuickStatsWidgetProps {
  title?: string
  description?: string
  stats: StatItem[]
  columns?: 2 | 4
  isLoading?: boolean
}

export function QuickStatsWidget({ 
  title = "Quick Stats",
  description = "Key metrics at a glance",
  stats,
  columns = 4,
  isLoading = false
}: QuickStatsWidgetProps) {
  const getColorClasses = (color?: string) => {
    switch (color) {
      case "blue": return "text-blue-600 bg-blue-100"
      case "green": return "text-green-600 bg-green-100"
      case "orange": return "text-orange-600 bg-orange-100"
      case "red": return "text-red-600 bg-red-100"
      case "purple": return "text-purple-600 bg-purple-100"
      default: return "text-gray-600 bg-gray-100"
    }
  }

  const getChangeIcon = (type: string) => {
    switch (type) {
      case "increase": return <TrendingUp className="h-3 w-3 text-green-600" />
      case "decrease": return <TrendingDown className="h-3 w-3 text-red-600" />
      case "stable": return <Minus className="h-3 w-3 text-gray-600" />
      default: return null
    }
  }

  const getChangeColor = (type: string) => {
    switch (type) {
      case "increase": return "text-green-600"
      case "decrease": return "text-red-600"
      case "stable": return "text-gray-600"
      default: return "text-gray-600"
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <div className={cn(
            "grid gap-4",
            columns === 2 && "grid-cols-1 md:grid-cols-2",
            columns === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          )}>
            {Array.from({ length: columns }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className={cn(
          "grid gap-4",
          columns === 2 && "grid-cols-1 md:grid-cols-2",
          columns === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
        )}>
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    getColorClasses(stat.color)
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {stat.change && (
                    <div className={cn(
                      "flex items-center gap-1 text-xs",
                      getChangeColor(stat.change.type)
                    )}>
                      {getChangeIcon(stat.change.type)}
                      {Math.abs(stat.change.value)}%
                    </div>
                  )}
                </div>
                
                <div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  {stat.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.description}
                    </p>
                  )}
                  {stat.change && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.change.period}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}