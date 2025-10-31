'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  Filter, 
  Star, 
  Download, 
  Eye, 
  Share, 
  Heart,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  Tag,
  Calendar,
  TrendingUp,
  Award,
  Sparkles,
  Code,
  Palette,
  Settings,
  Lock,
  Globe
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FormTemplateManager, FormTemplate, TemplateSearchRequest } from '@/lib/forms/template-manager'

interface TemplateLibraryProps {
  practitionerId: string
  onTemplateSelect?: (template: FormTemplate) => void
  onTemplateCustomize?: (template: FormTemplate) => void
  mode?: 'browse' | 'select' | 'manage'
  className?: string
}

interface FilterState {
  category: string
  specialty: string[]
  difficulty: string
  rating: number
  tags: string[]
  author: string
  pricing: string
}

export function TemplateLibrary({
  practitionerId,
  onTemplateSelect,
  onTemplateCustomize,
  mode = 'browse',
  className
}: TemplateLibraryProps) {
  // State management
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [featuredTemplates, setFeaturedTemplates] = useState<FormTemplate[]>([])
  const [popularTemplates, setPopularTemplates] = useState<FormTemplate[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    specialty: [],
    difficulty: '',
    rating: 0,
    tags: [],
    author: '',
    pricing: ''
  })
  const [sortBy, setSortBy] = useState<'popularity' | 'rating' | 'newest' | 'name' | 'downloads'>('popularity')
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [shareCode, setShareCode] = useState('')
  const [showShareDialog, setShowShareDialog] = useState(false)

  // Available options for filters
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([])
  const [specialties, setSpecialties] = useState<Array<{ name: string; count: number }>>([])
  const [availableTags, setAvailableTags] = useState<Array<{ name: string; count: number }>>([])

  useEffect(() => {
    loadFeaturedTemplates()
    loadPopularTemplates()
    searchTemplates()
  }, [])

  useEffect(() => {
    searchTemplates()
  }, [searchQuery, filters, sortBy])

  const loadFeaturedTemplates = async () => {
    try {
      const featured = await FormTemplateManager.getFeaturedTemplates()
      setFeaturedTemplates(featured)
    } catch (error) {
      console.error('Error loading featured templates:', error)
    }
  }

  const loadPopularTemplates = async () => {
    try {
      const popular = await FormTemplateManager.getPopularTemplates(6)
      setPopularTemplates(popular)
    } catch (error) {
      console.error('Error loading popular templates:', error)
    }
  }

  const searchTemplates = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const searchRequest: TemplateSearchRequest = {
        query: searchQuery || undefined,
        category: filters.category || undefined,
        specialty: filters.specialty.length > 0 ? filters.specialty : undefined,
        difficulty: filters.difficulty || undefined,
        rating: filters.rating > 0 ? filters.rating : undefined,
        tags: filters.tags.length > 0 ? filters.tags : undefined,
        author: filters.author || undefined,
        sortBy,
        sortOrder: 'desc',
        limit: 20,
        offset: 0
      }

      const result = await FormTemplateManager.searchTemplates(searchRequest)
      
      setTemplates(result.templates)
      setTotalCount(result.totalCount)
      setHasMore(result.hasMore)
      setCategories(result.facets.categories)
      setSpecialties(result.facets.specialties)
      setAvailableTags(result.facets.tags)

    } catch (error) {
      console.error('Error searching templates:', error)
      setError('Failed to load templates')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadTemplate = async (template: FormTemplate) => {
    try {
      const result = await FormTemplateManager.downloadTemplate(template.id, practitionerId)
      
      if (result.success) {
        // Show success message or redirect to customization
        if (onTemplateCustomize) {
          onTemplateCustomize(template)
        }
      } else {
        setError(result.errors?.join(', ') || 'Download failed')
      }
    } catch (error) {
      console.error('Error downloading template:', error)
      setError('Failed to download template')
    }
  }

  const handleImportFromShareCode = async () => {
    try {
      if (!shareCode.trim()) {
        setError('Please enter a share code')
        return
      }

      const result = await FormTemplateManager.importFromShareCode(shareCode.trim(), practitionerId)
      
      if (result.success) {
        setShowShareDialog(false)
        setShareCode('')
        // Refresh templates
        await searchTemplates()
      } else {
        setError(result.errors?.join(', ') || 'Import failed')
      }
    } catch (error) {
      console.error('Error importing template:', error)
      setError('Failed to import template')
    }
  }

  const formatRating = (rating: number): string => {
    return rating.toFixed(1)
  }

  const formatDownloads = (downloads: number): string => {
    if (downloads >= 1000000) return `${(downloads / 1000000).toFixed(1)}M`
    if (downloads >= 1000) return `${(downloads / 1000).toFixed(1)}K`
    return downloads.toString()
  }

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getAuthorIcon = (authorType: string) => {
    switch (authorType) {
      case 'official':
        return <Award className="h-4 w-4 text-blue-600" />
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      default:
        return <Users className="h-4 w-4 text-gray-600" />
    }
  }

  const clearFilters = () => {
    setFilters({
      category: '',
      specialty: [],
      difficulty: '',
      rating: 0,
      tags: [],
      author: '',
      pricing: ''
    })
    setSearchQuery('')
  }

  return (
    <div className={cn("space-y-6", className)}>
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Form Template Library</h2>
          <p className="text-muted-foreground">
            Discover and customize professional intake forms
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShareDialog(true)}
          >
            <Code className="h-4 w-4 mr-2" />
            Import Code
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity">Popularity</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="downloads">Downloads</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showFilters && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={filters.category} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, category: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.name} value={category.name}>
                          {category.name} ({category.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Specialty</Label>
                  <Select value={filters.specialty[0] || ''} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, specialty: value ? [value] : [] }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="All specialties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All specialties</SelectItem>
                      {specialties.map(specialty => (
                        <SelectItem key={specialty.name} value={specialty.name}>
                          {specialty.name} ({specialty.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={filters.difficulty} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, difficulty: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="All levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All levels</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Minimum Rating</Label>
                  <Select value={filters.rating.toString()} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, rating: parseInt(value) }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Any rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Any rating</SelectItem>
                      <SelectItem value="4">4+ stars</SelectItem>
                      <SelectItem value="3">3+ stars</SelectItem>
                      <SelectItem value="2">2+ stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
                <p className="text-sm text-muted-foreground">
                  {totalCount} template{totalCount !== 1 ? 's' : ''} found
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Templates</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="popular">Popular</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {/* Search Results */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded mb-4"></div>
                    <div className="h-20 bg-gray-100 rounded mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(template => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-0">
                    {/* Template Preview */}
                    <div className="relative h-32 bg-gradient-to-br from-blue-50 to-purple-50 rounded-t-lg">
                      {template.preview.thumbnail ? (
                        <img 
                          src={template.preview.thumbnail} 
                          alt={template.name}
                          className="w-full h-full object-cover rounded-t-lg"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600">
                              {template.preview.fieldCount}
                            </div>
                            <div className="text-xs text-muted-foreground">Fields</div>
                          </div>
                        </div>
                      )}
                      
                      {/* Badges */}
                      <div className="absolute top-2 left-2 flex gap-1">
                        {template.author.type === 'official' && (
                          <Badge className="bg-blue-600 text-white">
                            <Award className="h-3 w-3 mr-1" />
                            Official
                          </Badge>
                        )}
                        {template.author.verified && (
                          <Badge className="bg-green-600 text-white">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      
                      {/* Pricing */}
                      <div className="absolute top-2 right-2">
                        {template.sharing.pricing?.type === 'free' ? (
                          <Badge variant="secondary">Free</Badge>
                        ) : template.sharing.pricing?.type === 'paid' ? (
                          <Badge variant="default">
                            ${template.sharing.pricing.amount}
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Header */}
                      <div>
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-semibold text-lg leading-tight">{template.name}</h3>
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span>{formatRating(template.metadata.rating)}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {template.description}
                        </p>
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {template.metadata.estimatedTime}m
                        </div>
                        <div className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {formatDownloads(template.metadata.downloads)}
                        </div>
                        <div className="flex items-center gap-1">
                          {getAuthorIcon(template.author.type)}
                          {template.author.name}
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1">
                        <Badge className={getDifficultyColor(template.metadata.difficulty)}>
                          {template.metadata.difficulty}
                        </Badge>
                        <Badge variant="outline">{template.category}</Badge>
                        {template.specialty.slice(0, 2).map(spec => (
                          <Badge key={spec} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>

                      {/* Features */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span>{template.preview.fieldCount} fields</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>{template.preview.sectionCount} sections</span>
                        </div>
                        {template.preview.hasConditionalLogic && (
                          <div className="flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            <span>Smart logic</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => setSelectedTemplate(template)}
                          variant="outline"
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDownloadTemplate(template)}
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Use Template
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="text-center">
              <Button variant="outline" onClick={searchTemplates}>
                Load More Templates
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="featured" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredTemplates.map(template => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      <Badge className="bg-purple-100 text-purple-800">Featured</Badge>
                    </div>
                    <div>
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span>{formatRating(template.metadata.rating)}</span>
                        <span className="text-muted-foreground">
                          ({template.metadata.reviewCount})
                        </span>
                      </div>
                      <Button size="sm" onClick={() => handleDownloadTemplate(template)}>
                        Use Template
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="popular" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularTemplates.map((template, index) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">#{index + 1}</span>
                      </div>
                      <Badge variant="outline">
                        {formatDownloads(template.metadata.downloads)} downloads
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span>{formatRating(template.metadata.rating)}</span>
                      </div>
                      <Button size="sm" onClick={() => handleDownloadTemplate(template)}>
                        Use Template
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recent" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.filter(t => {
              const createdDate = new Date(t.metadata.createdAt)
              const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              return createdDate > thirtyDaysAgo
            }).map(template => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <Badge variant="outline">
                        {new Date(template.metadata.createdAt).toLocaleDateString()}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span>{formatRating(template.metadata.rating)}</span>
                      </div>
                      <Button size="sm" onClick={() => handleDownloadTemplate(template)}>
                        Use Template
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Template Preview Dialog */}
      {selectedTemplate && (
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedTemplate.name}
                {selectedTemplate.author.verified && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedTemplate.description}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Template Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium">Category</p>
                  <p className="text-sm text-muted-foreground">{selectedTemplate.category}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Difficulty</p>
                  <Badge className={getDifficultyColor(selectedTemplate.metadata.difficulty)}>
                    {selectedTemplate.metadata.difficulty}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Est. Time</p>
                  <p className="text-sm text-muted-foreground">{selectedTemplate.metadata.estimatedTime} min</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Downloads</p>
                  <p className="text-sm text-muted-foreground">{formatDownloads(selectedTemplate.metadata.downloads)}</p>
                </div>
              </div>

              {/* Form Preview */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-3">Form Structure</h4>
                <div className="space-y-2">
                  {selectedTemplate.schema.sections.map((section, index) => (
                    <div key={section.id} className="border rounded p-3 bg-white">
                      <h5 className="font-medium">{section.title}</h5>
                      <p className="text-sm text-muted-foreground">
                        {section.fields?.length || 0} fields
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customization Options */}
              <div>
                <h4 className="font-medium mb-3">Customization Options</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.customization.allowedModifications.map(mod => (
                    <Badge key={mod} variant="outline" className="flex items-center gap-1">
                      {mod === 'fields' && <FileText className="h-3 w-3" />}
                      {mod === 'styling' && <Palette className="h-3 w-3" />}
                      {mod === 'logic' && <Sparkles className="h-3 w-3" />}
                      {mod === 'settings' && <Settings className="h-3 w-3" />}
                      {mod}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                Close
              </Button>
              <Button onClick={() => handleDownloadTemplate(selectedTemplate)}>
                <Download className="h-4 w-4 mr-2" />
                Use Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Import Share Code Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Template</DialogTitle>
            <DialogDescription>
              Enter a share code to import a template from another practitioner
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="shareCode">Share Code</Label>
              <Input
                id="shareCode"
                placeholder="Enter 8-character share code"
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportFromShareCode} disabled={!shareCode.trim()}>
              Import Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}