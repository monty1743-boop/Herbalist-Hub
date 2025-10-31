'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  Eye,
  BarChart3,
  Target,
  Zap
} from 'lucide-react'
import { format, subDays, subWeeks, subMonths } from 'date-fns'
import { cn } from '@/lib/utils'
import { FormAnalyticsEngine, FormAnalyticsData } from '@/lib/analytics/form-analytics'
import { CompletionTracking } from './CompletionTracking'

interface AnalyticsDashboardProps {
  practitionerId: string
  formId?: string
  mode?: 'single' | 'multi' | 'overview'
  className?: string
}

interface DateRangeOption {
  label: string
  value: string
  start: Date
  end: Date
}

interface FormOption {
  id: string
  name: string
  category: string
  totalSubmissions: number
}

export function AnalyticsDashboard({
  practitionerId,
  formId,
  mode = 'overview',
  className
}: AnalyticsDashboardProps) {
  // State management
  const [analyticsData, setAnalyticsData] = useState<FormAnalyticsData | null>(null)
  const [multiFormData, setMultiFormData] = useState<any>(null)
  const [forms, setForms] = useState<FormOption[]>([])
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>(formId ? [formId] : [])
  const [dateRange, setDateRange] = useState<string>('30d')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<string>('')

  // Date range options
  const dateRangeOptions: DateRangeOption[] = [
    { label: 'Last 7 days', value: '7d', start: subDays(new Date(), 7), end: new Date() },
    { label: 'Last 30 days', value: '30d', start: subDays(new Date(), 30), end: new Date() },
    { label: 'Last 90 days', value: '90d', start: subDays(new Date(), 90), end: new Date() },
    { label: 'Last 6 months', value: '6m', start: subMonths(new Date(), 6), end: new Date() },
    { label: 'Last year', value: '1y', start: subMonths(new Date(), 12), end: new Date() }
  ]

  useEffect(() => {
    loadForms()
  }, [practitionerId])

  useEffect(() => {
    if (forms.length > 0 && selectedFormIds.length === 0 && mode !== 'single') {
      // Auto-select top 5 forms by submission count
      const topForms = forms
        .sort((a, b) => b.totalSubmissions - a.totalSubmissions)
        .slice(0, 5)
        .map(f => f.id)
      setSelectedFormIds(topForms)
    }
  }, [forms])

  useEffect(() => {
    if (selectedFormIds.length > 0) {
      loadAnalyticsData()
    }
  }, [selectedFormIds, dateRange])

  const loadForms = async () => {
    try {
      const response = await fetch(`/api/practitioners/${practitionerId}/forms`)
      if (!response.ok) throw new Error('Failed to load forms')

      const formsData = await response.json()
      setForms(formsData)

      // Auto-select form if in single mode
      if (mode === 'single' && formId) {
        setSelectedFormIds([formId])
      }
    } catch (error) {
      console.error('Error loading forms:', error)
      setError('Failed to load forms')
    }
  }

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const selectedRange = dateRangeOptions.find(r => r.value === dateRange)!
      const range = {
        start: selectedRange.start.toISOString(),
        end: selectedRange.end.toISOString()
      }

      if (mode === 'single' && selectedFormIds.length === 1) {
        // Load single form analytics
        const data = await FormAnalyticsEngine.generateFormAnalytics(
          selectedFormIds[0],
          practitionerId,
          range
        )
        setAnalyticsData(data)
      } else {
        // Load multi-form analytics
        const data = await FormAnalyticsEngine.getMultiFormAnalytics({
          formIds: selectedFormIds,
          practitionerId,
          dateRange: range,
          groupBy: getGroupByFromRange(dateRange)
        })
        setMultiFormData(data)
      }

      setLastRefresh(new Date().toISOString())
    } catch (error) {
      console.error('Error loading analytics:', error)
      setError('Failed to load analytics data')
    } finally {
      setIsLoading(false)
    }
  }

  const getGroupByFromRange = (range: string): 'day' | 'week' | 'month' => {
    switch (range) {
      case '7d':
      case '30d':
        return 'day'
      case '90d':
        return 'week'
      case '6m':
      case '1y':
        return 'month'
      default:
        return 'day'
    }
  }

  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <div className="h-4 w-4" />
    }
  }

  const getTrendColor = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)}m`
    return `${Math.round(minutes / 60)}h ${Math.round(minutes % 60)}m`
  }

  const exportAnalytics = async (format: 'csv' | 'pdf') => {
    try {
      const selectedRange = dateRangeOptions.find(r => r.value === dateRange)!
      const queryParams = new URLSearchParams({
        formIds: selectedFormIds.join(','),
        practitionerId,
        startDate: selectedRange.start.toISOString(),
        endDate: selectedRange.end.toISOString(),
        format
      })

      const response = await fetch(`/api/analytics/export?${queryParams}`)
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `form-analytics-${format}-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting analytics:', error)
      setError('Failed to export analytics')
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Form Analytics</h2>
          <p className="text-muted-foreground">
            Insights and performance metrics for your intake forms
          </p>
          {lastRefresh && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {new Date(lastRefresh).toLocaleString()}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateRangeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={loadAnalyticsData} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => exportAnalytics('csv')}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Form Selection (for multi-form mode) */}
      {mode !== 'single' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Form Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {forms.map(form => (
                  <Badge
                    key={form.id}
                    variant={selectedFormIds.includes(form.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedFormIds(prev => 
                        prev.includes(form.id) 
                          ? prev.filter(id => id !== form.id)
                          : [...prev, form.id]
                      )
                    }}
                  >
                    {form.name}
                    <span className="ml-1 text-xs">({form.totalSubmissions})</span>
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFormIds(forms.map(f => f.id))}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFormIds([])}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Overview Metrics */}
            {mode === 'single' && analyticsData ? (
              <>
                {/* Single Form Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Submissions</p>
                          <p className="text-2xl font-bold">{analyticsData.overview.totalSubmissions}</p>
                        </div>
                        <Users className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        {getTrendIcon(analyticsData.trends.volumeTrend.direction)}
                        <span className={cn("text-sm", getTrendColor(analyticsData.trends.volumeTrend.direction))}>
                          {analyticsData.trends.volumeTrend.percentage.toFixed(1)}% vs previous period
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                          <p className="text-2xl font-bold">{analyticsData.overview.completionRate.toFixed(1)}%</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        {getTrendIcon(analyticsData.trends.completionRateTrend.direction)}
                        <span className={cn("text-sm", getTrendColor(analyticsData.trends.completionRateTrend.direction))}>
                          {analyticsData.trends.completionRateTrend.percentage.toFixed(1)}% vs previous period
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Avg. Completion Time</p>
                          <p className="text-2xl font-bold">{formatTime(analyticsData.overview.averageCompletionTime)}</p>
                        </div>
                        <Clock className="h-8 w-8 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Abandonment Rate</p>
                          <p className="text-2xl font-bold">{analyticsData.overview.abandonmentRate.toFixed(1)}%</p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Completion Trends Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Completion Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analyticsData.completion.byDate}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="submissions" stroke="#3b82f6" name="Submissions" />
                        <Line type="monotone" dataKey="completionRate" stroke="#10b981" name="Completion Rate %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            ) : multiFormData ? (
              <>
                {/* Multi-Form Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Forms</p>
                          <p className="text-2xl font-bold">{multiFormData.summary.totalForms}</p>
                        </div>
                        <BarChart3 className="h-8 w-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Submissions</p>
                          <p className="text-2xl font-bold">{multiFormData.summary.totalSubmissions}</p>
                        </div>
                        <Users className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Avg. Completion Rate</p>
                          <p className="text-2xl font-bold">{multiFormData.summary.averageCompletionRate.toFixed(1)}%</p>
                        </div>
                        <Target className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Time Spent</p>
                          <p className="text-2xl font-bold">{formatTime(multiFormData.summary.totalTimeSpent / 60)}</p>
                        </div>
                        <Clock className="h-8 w-8 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Form Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle>Form Performance Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={multiFormData.formComparison}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="formName" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="completionRate" fill="#10b981" name="Completion Rate %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Multi-Form Trends */}
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={multiFormData.trends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="submissions" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Submissions" />
                        <Area type="monotone" dataKey="completions" stackId="1" stroke="#10b981" fill="#10b981" name="Completions" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            {analyticsData && (
              <>
                {/* Field Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Field Performance Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.performance.fieldAnalytics.slice(0, 10).map((field) => (
                        <div key={field.fieldId} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{field.fieldName}</p>
                            <p className="text-sm text-muted-foreground">{field.fieldType}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-medium">{field.completionRate.toFixed(1)}%</p>
                              <p className="text-xs text-muted-foreground">Completion</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{formatTime(field.averageTime / 60)}</p>
                              <p className="text-xs text-muted-foreground">Avg. Time</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-red-600">{field.validationErrors}</p>
                              <p className="text-xs text-muted-foreground">Errors</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Progress Flow */}
                <Card>
                  <CardHeader>
                    <CardTitle>Form Progress Flow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analyticsData.performance.progressFlow}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="stepName" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="reached" fill="#3b82f6" name="Reached" />
                        <Bar dataKey="completed" fill="#10b981" name="Completed" />
                        <Bar dataKey="dropped" fill="#ef4444" name="Dropped" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="engagement" className="space-y-6">
            {analyticsData && (
              <>
                {/* Device and Browser Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Device Type Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={analyticsData.engagement.deviceTypes}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                            label={({ type, count }) => `${type}: ${count}`}
                          >
                            {analyticsData.engagement.deviceTypes.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b'][index % 3]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Session Duration Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={analyticsData.engagement.sessionDuration.distribution}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="range" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Time of Day Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>Submissions by Time of Day</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={analyticsData.completion.byTimeOfDay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="submissions" stroke="#3b82f6" fill="#3b82f6" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Day of Week Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>Submissions by Day of Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analyticsData.completion.byDayOfWeek}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="submissions" fill="#10b981" name="Submissions" />
                        <Bar dataKey="completionRate" fill="#3b82f6" name="Completion Rate %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            {analyticsData && (
              <>
                {/* Optimization Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Optimization Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.optimization.recommendations.map((rec, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium">{rec.title}</h4>
                            <div className="flex gap-2">
                              <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                                {rec.priority}
                              </Badge>
                              <Badge variant="outline">
                                {rec.effort} effort
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                          <p className="text-sm font-medium text-green-600">{rec.expectedImpact}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Live Tracking */}
                <Card>
                  <CardHeader>
                    <CardTitle>Live Form Tracking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CompletionTracking
                      formId={selectedFormIds[0]}
                      practitionerId={practitionerId}
                      mode="live"
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}