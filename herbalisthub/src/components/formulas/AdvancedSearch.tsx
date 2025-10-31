"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { 
  Search,
  Filter,
  X,
  Plus,
  Settings,
  Tag,
  Clock,
  DollarSign,
  Beaker,
  User,
  Calendar,
  Target
} from "lucide-react"

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void
  onReset: () => void
  loading?: boolean
}

export interface SearchFilters {
  search?: string
  category?: string
  difficulty?: string
  isPublic?: boolean
  isDraft?: boolean
  hasIngredients?: string[]
  tags?: string[]
  priceRange?: { min?: number; max?: number }
  prepTimeRange?: { min?: number; max?: number }
  yieldRange?: { min?: number; max?: number; unit?: string }
  availabilityStatus?: string
  createdBy?: string
  dateRange?: { from?: string; to?: string }
  searchFields?: string[]
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

const categories = [
  "digestive", "respiratory", "nervous", "immune", 
  "cardiovascular", "detox", "womens-health", "mens-health", 
  "topical", "general"
]

const searchFieldOptions = [
  { value: "name", label: "Name" },
  { value: "description", label: "Description" },
  { value: "instructions", label: "Instructions" },
  { value: "category", label: "Category" },
  { value: "tags", label: "Tags" },
  { value: "ingredients", label: "Ingredients" }
]

const sortOptions = [
  { value: "name", label: "Name" },
  { value: "category", label: "Category" },
  { value: "difficulty", label: "Difficulty" },
  { value: "createdAt", label: "Created Date" },
  { value: "updatedAt", label: "Updated Date" },
  { value: "price", label: "Price" },
  { value: "prepTime", label: "Prep Time" },
  { value: "popularity", label: "Popularity" }
]

export function AdvancedSearch({ onSearch, onReset, loading = false }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    searchFields: ["name", "description"]
  })
  const [availableHerbs, setAvailableHerbs] = useState<Array<{id: string, name: string}>>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)

  // Fetch available herbs for ingredient filter
  useEffect(() => {
    const fetchHerbs = async () => {
      try {
        const response = await fetch("/api/herbs?limit=100")
        if (response.ok) {
          const data = await response.json()
          setAvailableHerbs(data.herbs || [])
        }
      } catch (error) {
        console.error("Error fetching herbs:", error)
      }
    }

    fetchHerbs()
  }, [])

  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch("/api/formulas/tags")
        if (response.ok) {
          const data = await response.json()
          setAvailableTags(data.tags || [])
        }
      } catch (error) {
        console.error("Error fetching tags:", error)
      }
    }

    fetchTags()
  }, [])

  const updateFilter = <K extends keyof SearchFilters>(
    key: K, 
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const addIngredient = (herbId: string) => {
    const currentIngredients = filters.hasIngredients || []
    if (!currentIngredients.includes(herbId)) {
      updateFilter("hasIngredients", [...currentIngredients, herbId])
    }
  }

  const removeIngredient = (herbId: string) => {
    const currentIngredients = filters.hasIngredients || []
    updateFilter("hasIngredients", currentIngredients.filter(id => id !== herbId))
  }

  const addTag = (tag: string) => {
    if (!tag.trim()) return
    const currentTags = filters.tags || []
    if (!currentTags.includes(tag.trim())) {
      updateFilter("tags", [...currentTags, tag.trim()])
    }
    setTagInput("")
  }

  const removeTag = (tag: string) => {
    const currentTags = filters.tags || []
    updateFilter("tags", currentTags.filter(t => t !== tag))
  }

  const handleSearch = () => {
    onSearch(filters)
  }

  const handleReset = () => {
    setFilters({ searchFields: ["name", "description"] })
    setTagInput("")
    onReset()
  }

  const toggleSearchField = (field: string) => {
    const currentFields = filters.searchFields || []
    if (currentFields.includes(field)) {
      updateFilter("searchFields", currentFields.filter(f => f !== field))
    } else {
      updateFilter("searchFields", [...currentFields, field])
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Advanced Search
            </CardTitle>
            <CardDescription>
              Find formulas using detailed criteria and filters
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {isExpanded ? "Simple" : "Advanced"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Search */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="search">Search Terms</Label>
            <Input
              id="search"
              placeholder="Enter search terms..."
              value={filters.search || ""}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Search Fields */}
          <div>
            <Label>Search In</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {searchFieldOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={filters.searchFields?.includes(option.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleSearchField(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Category</Label>
              <Select 
                value={filters.category || ""} 
                onValueChange={(value) => updateFilter("category", value || undefined)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Any category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1).replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Difficulty</Label>
              <Select 
                value={filters.difficulty || ""} 
                onValueChange={(value) => updateFilter("difficulty", value || undefined)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Any difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any difficulty</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Availability</Label>
              <Select 
                value={filters.availabilityStatus || ""} 
                onValueChange={(value) => updateFilter("availabilityStatus", value || undefined)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Any availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any availability</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="partial">Partially Available</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {isExpanded && (
          <>
            <Separator />
            
            <Tabs defaultValue="filters" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="filters">Filters</TabsTrigger>
                <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
                <TabsTrigger value="tags">Tags</TabsTrigger>
                <TabsTrigger value="sorting">Sorting</TabsTrigger>
              </TabsList>

              <TabsContent value="filters" className="space-y-4">
                {/* Visibility Filters */}
                <div className="space-y-3">
                  <Label>Visibility</Label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isPublic"
                        checked={filters.isPublic}
                        onCheckedChange={(checked) => updateFilter("isPublic", checked ? true : undefined)}
                      />
                      <Label htmlFor="isPublic">Public only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isDraft"
                        checked={filters.isDraft}
                        onCheckedChange={(checked) => updateFilter("isDraft", checked ? true : undefined)}
                      />
                      <Label htmlFor="isDraft">Drafts only</Label>
                    </div>
                  </div>
                </div>

                {/* Price Range */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Price Range
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="priceMin" className="text-sm">Min Price</Label>
                      <Input
                        id="priceMin"
                        type="number"
                        placeholder="0"
                        value={filters.priceRange?.min || ""}
                        onChange={(e) => updateFilter("priceRange", {
                          ...filters.priceRange,
                          min: e.target.value ? parseFloat(e.target.value) : undefined
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="priceMax" className="text-sm">Max Price</Label>
                      <Input
                        id="priceMax"
                        type="number"
                        placeholder="1000"
                        value={filters.priceRange?.max || ""}
                        onChange={(e) => updateFilter("priceRange", {
                          ...filters.priceRange,
                          max: e.target.value ? parseFloat(e.target.value) : undefined
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Prep Time Range */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Preparation Time (minutes)
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="prepTimeMin" className="text-sm">Min Time</Label>
                      <Input
                        id="prepTimeMin"
                        type="number"
                        placeholder="0"
                        value={filters.prepTimeRange?.min || ""}
                        onChange={(e) => updateFilter("prepTimeRange", {
                          ...filters.prepTimeRange,
                          min: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="prepTimeMax" className="text-sm">Max Time</Label>
                      <Input
                        id="prepTimeMax"
                        type="number"
                        placeholder="180"
                        value={filters.prepTimeRange?.max || ""}
                        onChange={(e) => updateFilter("prepTimeRange", {
                          ...filters.prepTimeRange,
                          max: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ingredients" className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Beaker className="h-4 w-4" />
                    Must Contain Ingredients
                  </Label>
                  <Select onValueChange={addIngredient}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select herbs to include..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableHerbs.map((herb) => (
                        <SelectItem key={herb.id} value={herb.id}>
                          {herb.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {filters.hasIngredients && filters.hasIngredients.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {filters.hasIngredients.map((herbId) => {
                        const herb = availableHerbs.find(h => h.id === herbId)
                        return (
                          <Badge key={herbId} variant="secondary" className="flex items-center gap-1">
                            {herb?.name || herbId}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => removeIngredient(herbId)}
                            />
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="tags" className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Formula Tags
                  </Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addTag(tagInput)
                        }
                      }}
                    />
                    <Button 
                      type="button" 
                      onClick={() => addTag(tagInput)}
                      disabled={!tagInput.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {availableTags.length > 0 && (
                    <div className="mt-3">
                      <Label className="text-sm text-muted-foreground">Popular tags:</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {availableTags.slice(0, 10).map((tag) => (
                          <Button
                            key={tag}
                            variant="outline"
                            size="sm"
                            onClick={() => addTag(tag)}
                            disabled={filters.tags?.includes(tag)}
                          >
                            {tag}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {filters.tags && filters.tags.length > 0 && (
                    <div className="mt-3">
                      <Label className="text-sm">Selected tags:</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {filters.tags.map((tag) => (
                          <Badge key={tag} variant="default" className="flex items-center gap-1">
                            {tag}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => removeTag(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="sorting" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Sort By</Label>
                    <Select 
                      value={filters.sortBy || "updatedAt"} 
                      onValueChange={(value) => updateFilter("sortBy", value)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sortOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Sort Order</Label>
                    <Select 
                      value={filters.sortOrder || "desc"} 
                      onValueChange={(value) => updateFilter("sortOrder", value as "asc" | "desc")}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset Filters
          </Button>
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? "Searching..." : "Search Formulas"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}