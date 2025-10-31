'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  Pause, 
  RotateCcw,
  Eye,
  TrendingUp,
  Users,
  Timer,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FormAnalyticsEngine, CompletionTrackingData } from '@/lib/analytics/form-analytics'

interface CompletionTrackingProps {
  submissionId?: string
  formId?: string
  clientId?: string
  practitionerId?: string
  mode: 'live' | 'historical' | 'comparison'
  onTrackingUpdate?: (data: CompletionTrackingData) => void
  className?: string
}

interface LiveTrackingStats {
  activeUsers: number
  completionRate: number
  averageTime: number
  currentSubmissions: number
  hourlyRate: number
}

interface FieldProgressData {
  fieldId: string
  fieldName: string
  visited: boolean
  completed: boolean
  timeSpent: number
  attempts: number
  errorCount: number
  lastModified: string
}

export function CompletionTracking({
  submissionId,
  formId,
  clientId,
  practitionerId,
  mode,
  onTrackingUpdate,
  className
}: CompletionTrackingProps) {
  // State management
  const [trackingData, setTrackingData] = useState<CompletionTrackingData | null>(null)
  const [liveStats, setLiveStats] = useState<LiveTrackingStats>({
    activeUsers: 0,
    completionRate: 0,
    averageTime: 0,
    currentSubmissions: 0,
    hourlyRate: 0
  })
  const [fieldProgress, setFieldProgress] = useState<FieldProgressData[]>([])
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  // Refs for tracking
  const trackingInterval = useRef<NodeJS.Timeout | null>(null)
  const startTime = useRef<number>(Date.now())
  const sessionStarted = useRef<boolean>(false)

  useEffect(() => {
    if (mode === 'live' && formId) {
      startLiveTracking()
    } else if (mode === 'historical' && submissionId) {
      loadHistoricalData()
    }

    return () => {
      if (trackingInterval.current) {
        clearInterval(trackingInterval.current)
      }
    }
  }, [submissionId, formId, mode])

  const startLiveTracking = async () => {
    try {
      if (!formId || !clientId || !practitionerId) return

      // Initialize tracking if not already started
      if (!sessionStarted.current && submissionId) {
        const trackingData = await FormAnalyticsEngine.startCompletionTracking({
          submissionId,
          formId,
          clientId,
          practitionerId,
          sessionData: {
            deviceType: getDeviceType(),
            browser: getBrowserName(),
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        })

        setTrackingData(trackingData)
        sessionStarted.current = true
        onTrackingUpdate?.(trackingData)
      }

      // Start live updates
      setIsTracking(true)
      trackingInterval.current = setInterval(async () => {
        await updateLiveStats()
      }, 5000) // Update every 5 seconds

    } catch (error) {
      console.error('Error starting live tracking:', error)
      setError('Failed to start tracking')
    }
  }

  const loadHistoricalData = async () => {
    try {
      if (!submissionId) return

      // Load historical tracking data
      const response = await fetch(`/api/analytics/completion-tracking/${submissionId}`)
      if (!response.ok) throw new Error('Failed to load tracking data')

      const data = await response.json()
      setTrackingData(data)
      processFieldProgress(data)
      setLastUpdated(new Date().toISOString())

    } catch (error) {
      console.error('Error loading historical data:', error)
      setError('Failed to load tracking data')
    }
  }

  const updateLiveStats = async () => {
    try {
      if (!formId || !practitionerId) return

      // Get current live statistics
      const response = await fetch(`/api/analytics/live-stats?formId=${formId}&practitionerId=${practitionerId}`)
      if (!response.ok) return

      const stats = await response.json()
      setLiveStats(stats)
      setLastUpdated(new Date().toISOString())

      // Update current tracking data if available
      if (submissionId) {
        const trackingResponse = await fetch(`/api/analytics/completion-tracking/${submissionId}`)
        if (trackingResponse.ok) {
          const data = await trackingResponse.json()
          setTrackingData(data)
          processFieldProgress(data)
          onTrackingUpdate?.(data)
        }
      }

    } catch (error) {
      console.error('Error updating live stats:', error)
    }
  }

  const processFieldProgress = (data: CompletionTrackingData) => {
    const fieldProgressArray: FieldProgressData[] = Object.entries(data.fieldProgress).map(([fieldId, progress]) => {
      const errors = data.events.filter(e => e.type === 'validation_error' && e.fieldId === fieldId).length
      
      return {
        fieldId,
        fieldName: fieldId, // Would get actual name from form schema
        visited: progress.visited,
        completed: progress.completed,
        timeSpent: progress.timeSpent,
        attempts: progress.attempts,
        errorCount: errors,
        lastModified: progress.lastModified
      }
    })

    setFieldProgress(fieldProgressArray.sort((a, b) => a.fieldName.localeCompare(b.fieldName)))
  }

  const trackFieldEvent = async (event: {
    type: string
    fieldId?: string
    sectionId?: string
    value?: any
    error?: string
    metadata?: Record<string, any>
  }) => {
    if (!submissionId || !isTracking) return

    try {
      await FormAnalyticsEngine.trackFormProgress(submissionId, event)
    } catch (error) {
      console.error('Error tracking field event:', error)
    }
  }

  const pauseTracking = () => {
    setIsTracking(false)
    if (trackingInterval.current) {
      clearInterval(trackingInterval.current)
      trackingInterval.current = null
    }
  }

  const resumeTracking = () => {
    if (!isTracking && formId) {
      startLiveTracking()
    }
  }

  const resetTracking = async () => {
    try {
      pauseTracking()
      sessionStarted.current = false
      startTime.current = Date.now()
      setTrackingData(null)
      setFieldProgress([])
      setError(null)
      
      if (mode === 'live') {
        await startLiveTracking()
      }
    } catch (error) {
      console.error('Error resetting tracking:', error)
      setError('Failed to reset tracking')
    }
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`
  }

  const getProgressColor = (progress: number): string => {
    if (progress < 25) return 'bg-red-500'
    if (progress < 50) return 'bg-orange-500'
    if (progress < 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getDeviceType = (): string => {
    const userAgent = navigator.userAgent
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet'
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) return 'mobile'
    return 'desktop'
  }

  const getBrowserName = (): string => {
    const userAgent = navigator.userAgent
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    return 'Other'
  }

  return (
    <div className={cn("space-y-6", className)}>
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {mode === 'live' && (
        <>
          {/* Live Tracking Controls */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Live Tracking
                  {isTracking && <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {isTracking ? (
                    <Button variant="outline" size="sm" onClick={pauseTracking}>
                      <Pause className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={resumeTracking}>
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={resetTracking}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {lastUpdated && (
                <p className="text-sm text-muted-foreground">
                  Last updated: {new Date(lastUpdated).toLocaleTimeString()}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold">{liveStats.activeUsers}</p>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold">{liveStats.completionRate.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Timer className="h-8 w-8 text-orange-600" />
                  </div>
                  <p className="text-2xl font-bold">{formatTime(liveStats.averageTime)}</p>
                  <p className="text-sm text-muted-foreground">Avg. Time</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold">{liveStats.currentSubmissions}</p>
                  <p className="text-sm text-muted-foreground">Submissions</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold">{liveStats.hourlyRate.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Per Hour</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Session Progress */}
          {trackingData && (
            <Card>
              <CardHeader>
                <CardTitle>Current Session Progress</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Started: {new Date(trackingData.startedAt).toLocaleString()}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{trackingData.progress.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={trackingData.progress} 
                    className="h-2"
                  />
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Step</p>
                    <p className="text-lg font-semibold">{trackingData.currentStep} / {trackingData.totalSteps}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time Spent</p>
                    <p className="text-lg font-semibold">{formatTime(trackingData.timeSpent)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Device</p>
                    <p className="text-lg font-semibold">{trackingData.sessionData.deviceType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Events</p>
                    <p className="text-lg font-semibold">{trackingData.events.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {mode === 'historical' && trackingData && (
        <Card>
          <CardHeader>
            <CardTitle>Session Summary</CardTitle>
            <p className="text-sm text-muted-foreground">
              {trackingData.completedAt ? 'Completed' : 'Incomplete'} session from {new Date(trackingData.startedAt).toLocaleString()}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Final Progress</span>
                <span>{trackingData.progress.toFixed(1)}%</span>
              </div>
              <Progress 
                value={trackingData.progress} 
                className="h-2"
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-2">
                  {trackingData.completedAt ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Completed</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-orange-600">Incomplete</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Time</p>
                <p className="text-lg font-semibold">{formatTime(trackingData.timeSpent)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Final Step</p>
                <p className="text-lg font-semibold">{trackingData.currentStep} / {trackingData.totalSteps}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Events</p>
                <p className="text-lg font-semibold">{trackingData.events.length}</p>
              </div>
            </div>

            {trackingData.completedAt && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">Completed At</p>
                <p className="font-medium">{new Date(trackingData.completedAt).toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Field Progress Details */}
      {fieldProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Field Progress Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fieldProgress.map((field) => (
                <div key={field.fieldId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {field.completed ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : field.visited ? (
                        <Eye className="h-4 w-4 text-blue-600" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      )}
                      <span className="font-medium">{field.fieldName}</span>
                    </div>
                    {field.errorCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {field.errorCount} error{field.errorCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatTime(field.timeSpent)}</span>
                    <span>{field.attempts} attempt{field.attempts !== 1 ? 's' : ''}</span>
                    {field.lastModified && (
                      <span>Last: {new Date(field.lastModified).toLocaleTimeString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Timeline */}
      {trackingData && trackingData.events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Event Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {trackingData.events.slice(-10).reverse().map((event, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <span className="text-xs text-muted-foreground min-w-[80px]">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  <Badge variant="outline" className="min-w-[100px] justify-center">
                    {event.type}
                  </Badge>
                  <span className="flex-1">
                    {event.fieldId && `Field: ${event.fieldId}`}
                    {event.sectionId && `Section: ${event.sectionId}`}
                    {event.error && ` Error: ${event.error}`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}