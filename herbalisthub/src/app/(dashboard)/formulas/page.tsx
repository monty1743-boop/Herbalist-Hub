"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Role } from "@prisma/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { AdvancedSearch, type SearchFilters } from "@/components/formulas/AdvancedSearch"
import { 
  Plus, 
  Search, 
  Filter, 
  Beaker, 
  Calculator, 
  Eye, 
  Edit,
  Copy,
  Trash2,
  ChefHat,
  Clock,
  DollarSign,
  Users,
  BookOpen,
  Grid3X3,
  List
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"

interface Formula {
  id: string
  name: string
  description?: string
  category?: string
  difficulty?: string
  prepTime?: number
  yieldAmount?: number
  yieldUnit?: string
  isPublic: boolean
  isDraft: boolean
  publishedAt?: string
  calculatedTotalCost: number
  calculatedFinalPrice: number
  availabilityStatus: string
  createdAt: string
  updatedAt: string
  tags?: Array<{ tag: string }>
  _count: {
    ingredients: number
    versions: number
    discussions: number
  }
}

interface FormulaSummary {
  totalFormulas: number
  availableFormulas: number
  publicFormulas: number
  draftFormulas: number
}

export default function FormulasPage() {
  const { data: session } = useSession()
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<FormulaSummary>({
    totalFormulas: 0,
    availableFormulas: 0,
    publicFormulas: 0,
    draftFormulas: 0,
  })

  // Filters and search
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [difficultyFilter, setDifficultyFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [activeFilters, setActiveFilters] = useState<SearchFilters>({})

  // Check permissions
  if (!session?.user || ![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-4">
                You need herbalist or admin privileges to access formulas.
              </p>
              <Button asChild>
                <Link href="/dashboard">Return to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fetch formulas
  const fetchFormulas = async (filters: SearchFilters = {}) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
        sortBy: filters.sortBy || "updatedAt",
        sortOrder: filters.sortOrder || "desc",
      })

      // Handle search parameters
      if (filters.search || searchQuery) {
        params.append("search", filters.search || searchQuery)
      }
      
      if (filters.category || (categoryFilter !== "all" && categoryFilter)) {
        params.append("category", filters.category || categoryFilter)
      }
      
      if (filters.difficulty || (difficultyFilter !== "all" && difficultyFilter)) {
        params.append("difficulty", filters.difficulty || difficultyFilter)
      }
      
      // Handle status filters
      if (filters.isPublic !== undefined) {
        params.append("isPublic", filters.isPublic.toString())
      } else if (statusFilter === "public") {
        params.append("isPublic", "true")
        params.append("isDraft", "false")
      }
      
      if (filters.isDraft !== undefined) {
        params.append("isDraft", filters.isDraft.toString())
      } else if (statusFilter === "draft") {
        params.append("isDraft", "true")
      }
      
      // Advanced search parameters
      if (filters.hasIngredients && filters.hasIngredients.length > 0) {
        params.append("hasIngredients", filters.hasIngredients.join(","))
      }
      
      if (filters.tags && filters.tags.length > 0) {
        params.append("tags", filters.tags.join(","))
      }
      
      if (filters.priceRange?.min !== undefined) {
        params.append("priceMin", filters.priceRange.min.toString())
      }
      
      if (filters.priceRange?.max !== undefined) {
        params.append("priceMax", filters.priceRange.max.toString())
      }
      
      if (filters.prepTimeRange?.min !== undefined) {
        params.append("prepTimeMin", filters.prepTimeRange.min.toString())
      }
      
      if (filters.prepTimeRange?.max !== undefined) {
        params.append("prepTimeMax", filters.prepTimeRange.max.toString())
      }
      
      if (filters.availabilityStatus) {
        params.append("availabilityStatus", filters.availabilityStatus)
      }
      
      if (filters.searchFields && filters.searchFields.length > 0) {
        params.append("searchFields", filters.searchFields.join(","))
      }

      const response = await fetch(`/api/formulas?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setFormulas(data.formulas || [])
        setSummary(data.summary || {
          totalFormulas: 0,
          availableFormulas: 0,
          publicFormulas: 0,
          draftFormulas: 0,
        })
      } else {
        toast.error("Failed to load formulas")
      }
    } catch (error) {
      console.error("Error fetching formulas:", error)
      toast.error("Failed to load formulas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFormulas(activeFilters)
  }, [searchQuery, categoryFilter, difficultyFilter, statusFilter, activeFilters])

  const handleAdvancedSearch = (filters: SearchFilters) => {
    setActiveFilters(filters)
    setShowAdvancedSearch(false)
    fetchFormulas(filters)
  }

  const handleResetFilters = () => {
    setActiveFilters({})
    setSearchQuery("")
    setCategoryFilter("all")
    setDifficultyFilter("all")
    setStatusFilter("all")
    fetchFormulas({})
  }

  // Get difficulty badge
  const getDifficultyBadge = (difficulty?: string) => {
    if (!difficulty) return null
    
    const colors = {
      beginner: "bg-green-100 text-green-800",
      intermediate: "bg-yellow-100 text-yellow-800",
      advanced: "bg-red-100 text-red-800",
    }

    return (
      <Badge variant="secondary" className={colors[difficulty as keyof typeof colors]}>
        {difficulty}
      </Badge>
    )
  }

  // Get status badge
  const getStatusBadge = (formula: Formula) => {
    if (formula.isDraft) {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
          Draft
        </Badge>
      )
    } else if (formula.isPublic) {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          Public
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
          Private
        </Badge>
      )
    }
  }

  // Get availability badge
  const getAvailabilityBadge = (status: string) => {
    switch (status) {
      case "available":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Available
          </Badge>
        )
      case "partial":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Partial
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            Unavailable
          </Badge>
        )
    }
  }

  return (
    <div className="container max-w-7xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Formulas</h1>
          <p className="text-muted-foreground">
            Create and manage your herbal formulas with precise ratios and cost calculations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
          >
            <Search className="h-4 w-4 mr-2" />
            Advanced Search
          </Button>

          <Button variant="outline" asChild>
            <Link href="/dashboard/formulas/templates">
              <BookOpen className="h-4 w-4 mr-2" />
              Templates
            </Link>
          </Button>

          <Button asChild>
            <Link href="/dashboard/formulas/new">
              <Plus className="h-4 w-4 mr-2" />
              New Formula
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Beaker className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Total Formulas</p>
                <p className="text-2xl font-bold">{summary.totalFormulas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <ChefHat className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Available</p>
                <p className="text-2xl font-bold">{summary.availableFormulas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Public</p>
                <p className="text-2xl font-bold">{summary.publicFormulas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Edit className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Drafts</p>
                <p className="text-2xl font-bold">{summary.draftFormulas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Search */}
      {showAdvancedSearch && (
        <AdvancedSearch
          onSearch={handleAdvancedSearch}
          onReset={handleResetFilters}
          loading={loading}
        />
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search formulas by name, description, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="digestive">Digestive</SelectItem>
                  <SelectItem value="respiratory">Respiratory</SelectItem>
                  <SelectItem value="nervous">Nervous System</SelectItem>
                  <SelectItem value="immune">Immune Support</SelectItem>
                  <SelectItem value="cardiovascular">Cardiovascular</SelectItem>
                  <SelectItem value="detox">Detoxification</SelectItem>
                  <SelectItem value="womens-health">Women's Health</SelectItem>
                  <SelectItem value="mens-health">Men's Health</SelectItem>
                  <SelectItem value="topical">Topical</SelectItem>
                  <SelectItem value="general">General Wellness</SelectItem>
                </SelectContent>
              </Select>

              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="draft">Drafts</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulas List */}
      {loading ? (
        <div className={cn(
          "grid gap-4",
          viewMode === "grid" 
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
            : "grid-cols-1"
        )}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-20 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : formulas.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Beaker className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No formulas found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || categoryFilter !== "all" || difficultyFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your search criteria or filters"
                  : "Get started by creating your first herbal formula"}
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button asChild>
                  <Link href="/dashboard/formulas/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Formula
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/formulas/templates">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Browse Templates
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={cn(
          "grid gap-4",
          viewMode === "grid" 
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
            : "grid-cols-1"
        )}>
          {formulas.map((formula) => (
            <Card key={formula.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{formula.name}</CardTitle>
                    {formula.description && (
                      <CardDescription className="line-clamp-2 mt-1">
                        {formula.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {getStatusBadge(formula)}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Beaker className="h-4 w-4 text-muted-foreground" />
                    <span>{formula._count.ingredients} ingredients</span>
                  </div>
                  
                  {formula.prepTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formula.prepTime}m prep</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>${formula.calculatedFinalPrice.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                    <span>Cost: ${formula.calculatedTotalCost.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {formula.category && (
                    <Badge variant="outline" className="text-xs">
                      {formula.category}
                    </Badge>
                  )}
                  {getDifficultyBadge(formula.difficulty)}
                  {getAvailabilityBadge(formula.availabilityStatus)}
                  {formula.tags && formula.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag.tag} variant="secondary" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag.tag}
                    </Badge>
                  ))}
                  {formula.tags && formula.tags.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{formula.tags.length - 2} more
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    Updated {new Date(formula.updatedAt).toLocaleDateString()}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/formulas/${formula.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/formulas/${formula.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}