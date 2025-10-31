'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { 
  Users, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Send,
  Archive,
  MoreHorizontal
} from 'lucide-react'
import { format, subDays, isAfter, isBefore } from 'date-fns'
import { cn } from '@/lib/utils'
import { FormAssignmentSystem, FormAssignment, FormAssignmentStatus, AssignmentMetrics } from '@/lib/forms/assignment-system'
import { FormNotificationService } from '@/lib/notifications/form-notifications'

interface AssignmentDashboardProps {
  practitionerId: string
  className?: string
}

interface AssignmentOverview {
  total: number
  assigned: number
  inProgress: number
  completed: number
  overdue: number
  completionRate: number
  averageTime: number
}

interface CompletionTrend {
  date: string
  completed: number
  assigned: number
}

export function AssignmentDashboard({ practitionerId, className }: AssignmentDashboardProps) {
  const [assignmentSystem] = useState(() => new FormAssignmentSystem())
  const [notificationService] = useState(() => new FormNotificationService())
  
  // State for data
  const [assignments, setAssignments] = useState<FormAssignment[]>([])
  const [overview, setOverview] = useState<AssignmentOverview>({
    total: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    completionRate: 0,
    averageTime: 0
  })
  const [metrics, setMetrics] = useState<AssignmentMetrics | null>(null)
  const [completionTrend, setCompletionTrend] = useState<CompletionTrend[]>([])
  
  // State for filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<FormAssignmentStatus | 'all'>('all')
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d')
  
  // State for UI
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<FormAssignment | null>(null)
  const [showAssignmentDetails, setShowAssignmentDetails] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [practitionerId, dateRange])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [assignmentsData, metricsData] = await Promise.all([
        assignmentSystem.getAssignments(practitionerId),
        assignmentSystem.getAssignmentMetrics(practitionerId, getDaysBack(dateRange))
      ])

      setAssignments(assignmentsData)
      setMetrics(metricsData)
      
      // Calculate overview statistics
      const overview = calculateOverview(assignmentsData)
      setOverview(overview)
      
      // Calculate completion trend
      const trend = calculateCompletionTrend(assignmentsData, getDaysBack(dateRange))
      setCompletionTrend(trend)
      
    } catch (error) {
      setError('Failed to load dashboard data')
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getDaysBack = (range: '7d' | '30d' | '90d'): number => {
    switch (range) {
      case '7d': return 7
      case '30d': return 30
      case '90d': return 90
      default: return 30
    }
  }

  const calculateOverview = (assignments: FormAssignment[]): AssignmentOverview => {
    const total = assignments.length
    const assigned = assignments.filter(a => a.status === FormAssignmentStatus.ASSIGNED).length
    const inProgress = assignments.filter(a => a.status === FormAssignmentStatus.IN_PROGRESS).length
    const completed = assignments.filter(a => a.status === FormAssignmentStatus.COMPLETED).length
    const overdue = assignments.filter(a => a.status === FormAssignmentStatus.OVERDUE).length
    
    const completionRate = total > 0 ? (completed / total) * 100 : 0
    
    // Calculate average completion time for completed assignments
    const completedAssignments = assignments.filter(a => a.status === FormAssignmentStatus.COMPLETED && a.completedAt)
    const totalTime = completedAssignments.reduce((sum, assignment) => {
      const assigned = new Date(assignment.assignedAt).getTime()
      const completed = new Date(assignment.completedAt!).getTime()
      return sum + (completed - assigned)
    }, 0)
    const averageTime = completedAssignments.length > 0 ? totalTime / completedAssignments.length / (1000 * 60 * 60 * 24) : 0 // in days
    
    return {
      total,
      assigned,
      inProgress,
      completed,
      overdue,
      completionRate,
      averageTime
    }
  }

  const calculateCompletionTrend = (assignments: FormAssignment[], days: number): CompletionTrend[] => {
    const trend: CompletionTrend[] = []
    const endDate = new Date()
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(endDate, i)
      const dateStr = format(date, 'MMM dd')
      
      const assignedOnDate = assignments.filter(a => 
        format(new Date(a.assignedAt), 'MMM dd') === dateStr
      ).length
      
      const completedOnDate = assignments.filter(a => 
        a.completedAt && format(new Date(a.completedAt), 'MMM dd') === dateStr
      ).length
      
      trend.push({
        date: dateStr,
        assigned: assignedOnDate,
        completed: completedOnDate
      })
    }
    
    return trend
  }

  const getStatusColor = (status: FormAssignmentStatus) => {
    switch (status) {
      case FormAssignmentStatus.ASSIGNED:
        return 'bg-blue-100 text-blue-800'
      case FormAssignmentStatus.IN_PROGRESS:
        return 'bg-yellow-100 text-yellow-800'
      case FormAssignmentStatus.COMPLETED:
        return 'bg-green-100 text-green-800'
      case FormAssignmentStatus.OVERDUE:
        return 'bg-red-100 text-red-800'
      case FormAssignmentStatus.CANCELLED:
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: FormAssignmentStatus) => {
    switch (status) {
      case FormAssignmentStatus.ASSIGNED:
        return <FileText className="h-4 w-4" />
      case FormAssignmentStatus.IN_PROGRESS:
        return <Clock className="h-4 w-4" />
      case FormAssignmentStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4" />
      case FormAssignmentStatus.OVERDUE:
        return <AlertTriangle className="h-4 w-4" />
      case FormAssignmentStatus.CANCELLED:
        return <Archive className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const handleSendReminder = async (assignment: FormAssignment) => {
    try {
      await notificationService.sendFormReminderNotification(
        assignment, 
        `Form: ${assignment.formId}` // In real app, would get form name
      )
      // Refresh assignment to update notification count
      await loadDashboardData()
    } catch (error) {
      setError('Failed to send reminder')
      console.error('Failed to send reminder:', error)
    }
  }

  const handleCancelAssignment = async (assignmentId: string) => {
    try {
      await assignmentSystem.cancelAssignment(assignmentId)
      await loadDashboardData()
    } catch (error) {
      setError('Failed to cancel assignment')
      console.error('Failed to cancel assignment:', error)
    }
  }

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = searchTerm === '' || 
      assignment.clientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.formId.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const pieData = [
    { name: 'Completed', value: overview.completed, color: '#10b981' },
    { name: 'In Progress', value: overview.inProgress, color: '#f59e0b' },
    { name: 'Assigned', value: overview.assigned, color: '#3b82f6' },
    { name: 'Overdue', value: overview.overdue, color: '#ef4444' }
  ]

  return (
    <div className={cn("space-y-6", className)}>
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Assignment Dashboard</h2>
          <p className="text-muted-foreground">
            Track form assignments and completion rates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadDashboardData} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Assignments</p>
                <p className="text-2xl font-bold">{overview.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{overview.completionRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <Progress value={overview.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Completion Time</p>
                <p className="text-2xl font-bold">{overview.averageTime.toFixed(1)} days</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{overview.overdue}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Assignment Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completion Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={completionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="assigned" stroke="#3b82f6" name="Assigned" />
                <Line type="monotone" dataKey="completed" stroke="#10b981" name="Completed" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Assignment List */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Details</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={FormAssignmentStatus.ASSIGNED}>Assigned</SelectItem>
                <SelectItem value={FormAssignmentStatus.IN_PROGRESS}>In Progress</SelectItem>
                <SelectItem value={FormAssignmentStatus.COMPLETED}>Completed</SelectItem>
                <SelectItem value={FormAssignmentStatus.OVERDUE}>Overdue</SelectItem>
                <SelectItem value={FormAssignmentStatus.CANCELLED}>Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredAssignments.map(assignment => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  {getStatusIcon(assignment.status)}
                  <div>
                    <p className="font-medium">Form: {assignment.formId}</p>
                    <p className="text-sm text-muted-foreground">
                      Client: {assignment.clientId}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Assigned: {format(new Date(assignment.assignedAt), "MMM d, yyyy")}
                      </span>
                      {assignment.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          • Due: {format(new Date(assignment.dueDate), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <Badge className={getStatusColor(assignment.status)}>
                      {assignment.status}
                    </Badge>
                    {assignment.notificationsSent > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {assignment.notificationsSent} reminder(s) sent
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedAssignment(assignment)
                        setShowAssignmentDetails(true)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {assignment.status === FormAssignmentStatus.ASSIGNED && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSendReminder(assignment)}
                        disabled={isLoading}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelAssignment(assignment.id)}
                      disabled={isLoading || assignment.status === FormAssignmentStatus.COMPLETED}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Details Dialog */}
      <Dialog open={showAssignmentDetails} onOpenChange={setShowAssignmentDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assignment Details</DialogTitle>
            <DialogDescription>
              View detailed information about this assignment
            </DialogDescription>
          </DialogHeader>
          
          {selectedAssignment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Form</Label>
                  <p className="text-sm text-muted-foreground">{selectedAssignment.formId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Client</Label>
                  <p className="text-sm text-muted-foreground">{selectedAssignment.clientId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={getStatusColor(selectedAssignment.status)}>
                    {selectedAssignment.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <p className="text-sm text-muted-foreground">{selectedAssignment.priority}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Assigned</Label>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedAssignment.assignedAt), "PPP 'at' p")}
                </p>
              </div>

              {selectedAssignment.dueDate && (
                <div>
                  <Label className="text-sm font-medium">Due Date</Label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedAssignment.dueDate), "PPP 'at' p")}
                  </p>
                </div>
              )}

              {selectedAssignment.completedAt && (
                <div>
                  <Label className="text-sm font-medium">Completed</Label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedAssignment.completedAt), "PPP 'at' p")}
                  </p>
                </div>
              )}

              {selectedAssignment.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedAssignment.notes}</p>
                </div>
              )}

              {selectedAssignment.customInstructions && (
                <div>
                  <Label className="text-sm font-medium">Custom Instructions</Label>
                  <p className="text-sm text-muted-foreground">{selectedAssignment.customInstructions}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Notifications Sent</Label>
                <p className="text-sm text-muted-foreground">{selectedAssignment.notificationsSent}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignmentDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}