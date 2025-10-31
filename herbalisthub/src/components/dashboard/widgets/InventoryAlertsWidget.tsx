"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Package, 
  AlertTriangle, 
  Clock, 
  TrendingDown,
  ExternalLink,
  RefreshCw,
  Filter
} from "lucide-react"
import { cn } from "@/lib/utils"

interface InventoryItem {
  id: string
  name: string
  latinName?: string
  currentStock: number
  minimumStock: number
  unit: string
  category: "herb" | "tincture" | "supplement" | "equipment"
  lastRestocked: string
  supplier?: string
  urgency: "critical" | "low" | "warning"
  estimatedDaysLeft: number
}

const mockInventoryAlerts: InventoryItem[] = [
  {
    id: "1",
    name: "Echinacea Tincture",
    latinName: "Echinacea purpurea",
    currentStock: 2,
    minimumStock: 10,
    unit: "bottles",
    category: "tincture",
    lastRestocked: "2024-10-15",
    supplier: "Mountain Rose Herbs",
    urgency: "critical",
    estimatedDaysLeft: 3
  },
  {
    id: "2", 
    name: "Dried Chamomile",
    latinName: "Matricaria chamomilla",
    currentStock: 50,
    minimumStock: 200,
    unit: "grams",
    category: "herb",
    lastRestocked: "2024-10-20",
    supplier: "Starwest Botanicals",
    urgency: "low",
    estimatedDaysLeft: 8
  },
  {
    id: "3",
    name: "Valerian Root",
    latinName: "Valeriana officinalis",
    currentStock: 75,
    minimumStock: 150,
    unit: "grams",
    category: "herb",
    lastRestocked: "2024-10-18",
    supplier: "Mountain Rose Herbs", 
    urgency: "warning",
    estimatedDaysLeft: 12
  },
  {
    id: "4",
    name: "Ashwagandha Powder",
    latinName: "Withania somnifera",
    currentStock: 100,
    minimumStock: 500,
    unit: "grams",
    category: "herb",
    lastRestocked: "2024-09-30",
    supplier: "Banyan Botanicals",
    urgency: "low",
    estimatedDaysLeft: 15
  },
  {
    id: "5",
    name: "Glass Dropper Bottles",
    currentStock: 5,
    minimumStock: 25,
    unit: "pieces",
    category: "equipment",
    lastRestocked: "2024-10-10",
    supplier: "SKS Bottle",
    urgency: "warning",
    estimatedDaysLeft: 7
  }
]

export function InventoryAlertsWidget() {
  const [filter, setFilter] = useState<"all" | "critical" | "low" | "warning">("all")
  const [isRefreshing, setIsRefreshing] = useState(false)

  const filteredAlerts = mockInventoryAlerts.filter(item => 
    filter === "all" || item.urgency === filter
  )

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical": return "destructive"
      case "warning": return "default"
      case "low": return "secondary"
      default: return "secondary"
    }
  }

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "critical": return <AlertTriangle className="h-4 w-4" />
      case "warning": return <Clock className="h-4 w-4" />
      case "low": return <TrendingDown className="h-4 w-4" />
      default: return <Package className="h-4 w-4" />
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  const criticalCount = mockInventoryAlerts.filter(item => item.urgency === "critical").length
  const warningCount = mockInventoryAlerts.filter(item => item.urgency === "warning").length
  const lowCount = mockInventoryAlerts.filter(item => item.urgency === "low").length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              Inventory Alerts
            </CardTitle>
            <CardDescription>
              Items that need attention or restocking
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/inventory">
                <ExternalLink className="h-4 w-4 mr-1" />
                View All
              </Link>
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 pt-2">
          <Button
            variant={filter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All ({mockInventoryAlerts.length})
          </Button>
          <Button
            variant={filter === "critical" ? "destructive" : "ghost"}
            size="sm"
            onClick={() => setFilter("critical")}
          >
            Critical ({criticalCount})
          </Button>
          <Button
            variant={filter === "warning" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("warning")}
          >
            Warning ({warningCount})
          </Button>
          <Button
            variant={filter === "low" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter("low")}
          >
            Low ({lowCount})
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No {filter !== "all" ? filter : ""} inventory alerts</p>
          </div>
        ) : (
          filteredAlerts.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start space-x-3 flex-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100">
                  {getUrgencyIcon(item.urgency)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <Badge 
                      variant={getUrgencyColor(item.urgency) as any}
                      className="text-xs"
                    >
                      {item.urgency}
                    </Badge>
                  </div>
                  {item.latinName && (
                    <p className="text-xs text-muted-foreground italic mb-1">
                      {item.latinName}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {item.currentStock} / {item.minimumStock} {item.unit}
                    </span>
                    <span>~{item.estimatedDaysLeft} days left</span>
                    {item.supplier && (
                      <span className="truncate">{item.supplier}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-2">
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {Math.round((item.currentStock / item.minimumStock) * 100)}%
                  </div>
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        item.urgency === "critical" && "bg-red-500",
                        item.urgency === "warning" && "bg-yellow-500", 
                        item.urgency === "low" && "bg-orange-500"
                      )}
                      style={{
                        width: `${Math.min((item.currentStock / item.minimumStock) * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <Link href={`/dashboard/inventory/${item.id}`}>
                    Reorder
                  </Link>
                </Button>
              </div>
            </div>
          ))
        )}

        {filteredAlerts.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {filteredAlerts.length} of {mockInventoryAlerts.length} alerts
              </span>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/inventory/reorder">
                  Bulk Reorder
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}