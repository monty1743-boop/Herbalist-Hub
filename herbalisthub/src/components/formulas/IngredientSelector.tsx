"use client"

import { useState, useEffect, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { 
  Search, 
  Plus, 
  Filter, 
  Leaf, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Package
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Herb {
  id: string
  name: string
  latinName?: string
  type: string
  quantity: number
  unit: string
  costPerUnit?: number
  minimumStock?: number
  supplier?: string
  expirationDate?: string
  qualityGrade?: string
}

interface IngredientSelectorProps {
  onIngredientSelect: (herbId: string, herbName: string) => void
}

export function IngredientSelector({ onIngredientSelect }: IngredientSelectorProps) {
  const [herbs, setHerbs] = useState<Herb[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  // Fetch herbs from API
  useEffect(() => {
    const fetchHerbs = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/herbs?limit=100&sortBy=name&sortOrder=asc")
        
        if (response.ok) {
          const data = await response.json()
          setHerbs(data.herbs || [])
        } else {
          toast.error("Failed to load herbs")
        }
      } catch (error) {
        console.error("Error fetching herbs:", error)
        toast.error("Failed to load herbs")
      } finally {
        setIsLoading(false)
      }
    }

    fetchHerbs()
  }, [])

  // Filter and search herbs
  const filteredHerbs = useMemo(() => {
    return herbs.filter(herb => {
      // Text search
      const searchMatch = !searchQuery || 
        herb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        herb.latinName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        herb.type.toLowerCase().includes(searchQuery.toLowerCase())

      // Type filter
      const typeMatch = typeFilter === "all" || herb.type === typeFilter

      // Availability filter
      let availabilityMatch = true
      if (availabilityFilter === "available") {
        availabilityMatch = herb.quantity > 0
      } else if (availabilityFilter === "low_stock") {
        availabilityMatch = herb.quantity <= (herb.minimumStock || 0) && herb.quantity > 0
      } else if (availabilityFilter === "out_of_stock") {
        availabilityMatch = herb.quantity <= 0
      }

      return searchMatch && typeMatch && availabilityMatch
    })
  }, [herbs, searchQuery, typeFilter, availabilityFilter])

  // Get unique herb types for filter
  const herbTypes = useMemo(() => {
    const types = [...new Set(herbs.map(herb => herb.type))]
    return types.sort()
  }, [herbs])

  // Get availability status
  const getAvailabilityStatus = (herb: Herb) => {
    if (herb.quantity <= 0) return "out_of_stock"
    if (herb.quantity <= (herb.minimumStock || 0)) return "low_stock"
    return "available"
  }

  // Get availability badge
  const getAvailabilityBadge = (herb: Herb) => {
    const status = getAvailabilityStatus(herb)
    
    switch (status) {
      case "available":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Available
          </Badge>
        )
      case "low_stock":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Low Stock
          </Badge>
        )
      case "out_of_stock":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Out of Stock
          </Badge>
        )
      default:
        return null
    }
  }

  // Check if herb is expired soon
  const isExpiringSoon = (herb: Herb) => {
    if (!herb.expirationDate) return false
    const expirationDate = new Date(herb.expirationDate)
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    return expirationDate <= thirtyDaysFromNow
  }

  // Handle herb selection
  const handleSelect = (herb: Herb) => {
    if (herb.quantity <= 0) {
      toast.warning(`${herb.name} is out of stock but can still be added to formula`)
    }
    onIngredientSelect(herb.id, herb.name)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="herb-search">Search Herbs</Label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="herb-search"
            placeholder="Search by name or latin name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filters Toggle */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
        <span className="text-sm text-muted-foreground">
          {filteredHerbs.length} of {herbs.length} herbs
        </span>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="space-y-2">
              <Label>Herb Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {herbTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Availability</Label>
              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTypeFilter("all")
                setAvailabilityFilter("all")
                setSearchQuery("")
              }}
              className="w-full"
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Herbs List */}
      <ScrollArea className="h-96">
        <div className="space-y-2">
          {filteredHerbs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Leaf className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No herbs found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            filteredHerbs.map((herb) => (
              <Card 
                key={herb.id} 
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/50",
                  herb.quantity <= 0 && "opacity-75"
                )}
                onClick={() => handleSelect(herb)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {herb.name}
                        </h4>
                        {isExpiringSoon(herb) && (
                          <Clock className="h-3 w-3 text-orange-500" />
                        )}
                      </div>
                      
                      {herb.latinName && (
                        <p className="text-xs text-muted-foreground italic mb-1">
                          {herb.latinName}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {herb.quantity} {herb.unit}
                        </span>
                        
                        {herb.costPerUnit && (
                          <span>${herb.costPerUnit.toFixed(2)}/{herb.unit}</span>
                        )}
                        
                        {herb.qualityGrade && (
                          <Badge variant="outline" className="text-xs">
                            {herb.qualityGrade}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        {getAvailabilityBadge(herb)}
                        
                        <Badge variant="outline" className="text-xs">
                          {herb.type.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelect(herb)
                      }}
                      disabled={false} // Allow adding even if out of stock
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Quick Add Buttons for Common Herbs */}
      <div className="pt-4 border-t">
        <Label className="text-sm font-medium mb-2 block">Quick Add Common Herbs</Label>
        <div className="flex flex-wrap gap-2">
          {herbs
            .filter(herb => ["Ginger", "Turmeric", "Chamomile", "Echinacea", "Ginseng"].includes(herb.name))
            .slice(0, 5)
            .map((herb) => (
              <Button
                key={herb.id}
                variant="outline"
                size="sm"
                onClick={() => handleSelect(herb)}
                className="text-xs"
              >
                {herb.name}
              </Button>
            ))}
        </div>
      </div>
    </div>
  )
}