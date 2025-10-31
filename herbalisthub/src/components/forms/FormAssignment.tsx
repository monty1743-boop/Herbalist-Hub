'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Calendar as CalendarIcon, Users, FileText, Send, Clock, CheckCircle, AlertTriangle, Filter, Search, Download } from 'lucide-react'
import { format, addDays, isAfter, isBefore } from 'date-fns'
import { cn } from '@/lib/utils'
import { FormAssignmentSystem, FormAssignment, FormAssignmentStatus, AssignmentTemplate, BulkAssignmentRequest } from '@/lib/forms/assignment-system'
import { FormNotificationService } from '@/lib/notifications/form-notifications'

interface FormAssignmentProps {
  practitionerId: string
  clientId?: string
  appointmentId?: string
  onAssignmentCreated?: (assignment: FormAssignment) => void
  className?: string
}

interface FormOption {
  id: string
  name: string
  description: string
  estimatedTime: number
  category: string
}

interface ClientOption {
  id: string
  name: string
  email: string
  phone: string
  lastSeen: string
}

interface AppointmentOption {
  id: string
  clientId: string
  clientName: string
  type: string
  date: string
  status: string
}

export function FormAssignment({
  practitionerId,
  clientId,
  appointmentId,
  onAssignmentCreated,
  className
}: FormAssignmentProps) {
  const [assignmentSystem] = useState(() => new FormAssignmentSystem())
  const [notificationService] = useState(() => new FormNotificationService())
  
  // State for assignment creation
  const [selectedFormId, setSelectedFormId] = useState<string>('')
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>(clientId ? [clientId] : [])
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>(appointmentId || '')
  const [dueDate, setDueDate] = useState<Date | undefined>(addDays(new Date(), 7))
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal')
  const [notes, setNotes] = useState('')
  const [sendNotification, setSendNotification] = useState(true)
  const [customInstructions, setCustomInstructions] = useState('')
  
  // State for bulk operations
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  
  // State for data
  const [forms, setForms] = useState<FormOption[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [appointments, setAppointments] = useState<AppointmentOption[]>([])
  const [templates, setTemplates] = useState<AssignmentTemplate[]>([])
  const [assignments, setAssignments] = useState<FormAssignment[]>([])
  
  // State for UI
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<FormAssignmentStatus | 'all'>('all')

  useEffect(() => {
    loadData()
  }, [practitionerId])

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Load forms, clients, appointments, templates, and assignments
      const [formsData, clientsData, appointmentsData, templatesData, assignmentsData] = await Promise.all([
        fetch('/api/intake-forms').then(res => res.json()),
        fetch('/api/clients').then(res => res.json()),
        fetch('/api/appointments').then(res => res.json()),
        assignmentSystem.getAssignmentTemplates(practitionerId),
        assignmentSystem.getAssignments(practitionerId)
      ])
      
      setForms(formsData)
      setClients(clientsData)
      setAppointments(appointmentsData)
      setTemplates(templatesData)
      setAssignments(assignmentsData)
    } catch (error) {
      setError('Failed to load assignment data')
      console.error('Failed to load assignment data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAssignment = async () => {
    if (!selectedFormId || selectedClientIds.length === 0) {
      setError('Please select a form and at least one client')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const assignments: FormAssignment[] = []

      for (const clientId of selectedClientIds) {
        const assignment = await assignmentSystem.createAssignment({
          formId: selectedFormId,
          clientId,
          practitionerId,
          appointmentId: selectedAppointmentId || undefined,
          dueDate: dueDate?.toISOString(),
          priority,
          notes,
          customInstructions
        })

        assignments.push(assignment)

        if (sendNotification) {
          const form = forms.find(f => f.id === selectedFormId)
          if (form) {
            await notificationService.sendFormAssignmentNotification(assignment, form.name)
          }
        }
      }

      // Reset form
      setSelectedFormId('')
      setSelectedClientIds(clientId ? [clientId] : [])
      setSelectedAppointmentId(appointmentId || '')
      setDueDate(addDays(new Date(), 7))
      setPriority('normal')
      setNotes('')
      setCustomInstructions('')

      // Reload assignments
      await loadData()

      // Notify parent
      assignments.forEach(assignment => {
        onAssignmentCreated?.(assignment)
      })
    } catch (error) {
      setError('Failed to create assignment')
      console.error('Failed to create assignment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkAssignment = async () => {
    if (!selectedTemplate || selectedClientIds.length === 0) {
      setError('Please select a template and at least one client')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const template = templates.find(t => t.id === selectedTemplate)
      if (!template) {
        throw new Error('Template not found')
      }

      const bulkRequest: BulkAssignmentRequest = {
        templateId: selectedTemplate,
        clientIds: selectedClientIds,
        practitionerId,
        dueDate: dueDate?.toISOString(),
        sendNotifications: sendNotification,
        customInstructions
      }

      const result = await assignmentSystem.createBulkAssignment(bulkRequest)

      // Reset form
      setSelectedTemplate('')
      setSelectedClientIds([])
      setDueDate(addDays(new Date(), 7))
      setCustomInstructions('')
      setShowBulkDialog(false)

      // Reload assignments
      await loadData()
    } catch (error) {
      setError('Failed to create bulk assignment')
      console.error('Failed to create bulk assignment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTemplateAssignment = async (templateId: string) => {
    try {
      setIsLoading(true)
      setError(null)

      await assignmentSystem.assignFromTemplate(templateId, practitionerId)
      await loadData()
    } catch (error) {
      setError('Failed to assign from template')
      console.error('Failed to assign from template:', error)
    } finally {
      setIsLoading(false)
    }
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
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = searchTerm === '' || 
      assignment.clientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.formId.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || assignment.status === filterStatus
    
    return matchesSearch && matchesStatus
  })

  return (
    <div className={cn("space-y-6", className)}>
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="assign" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assign">Assign Forms</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="assign" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Assign Form to Client(s)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="form">Form</Label>
                  <Select value={selectedFormId} onValueChange={setSelectedFormId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a form" />
                    </SelectTrigger>
                    <SelectContent>
                      {forms.map(form => (
                        <SelectItem key={form.id} value={form.id}>
                          <div className="flex flex-col">
                            <span>{form.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {form.category} • ~{form.estimatedTime} min
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Clients</Label>
                {!clientId && (
                  <Select
                    value={selectedClientIds[0] || ''}
                    onValueChange={(value) => setSelectedClientIds([value])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client(s)" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          <div className="flex flex-col">
                            <span>{client.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {client.email}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox
                    id="bulk-mode"
                    checked={bulkMode}
                    onCheckedChange={setBulkMode}
                  />
                  <Label htmlFor="bulk-mode">Bulk assignment mode</Label>
                </div>

                {bulkMode && (
                  <Button
                    variant="outline"
                    onClick={() => setShowBulkDialog(true)}
                    className="w-full"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Select Multiple Clients
                  </Button>
                )}
              </div>

              {selectedAppointmentId && (
                <div className="space-y-2">
                  <Label>Linked Appointment</Label>
                  <div className="p-3 border rounded-md bg-muted">
                    {appointments.find(apt => apt.id === selectedAppointmentId)?.clientName} - 
                    {appointments.find(apt => apt.id === selectedAppointmentId)?.type}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-8">
                  <Checkbox
                    id="send-notification"
                    checked={sendNotification}
                    onCheckedChange={setSendNotification}
                  />
                  <Label htmlFor="send-notification">Send notification</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes for this assignment"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Custom Instructions</Label>
                <Textarea
                  id="instructions"
                  placeholder="Special instructions for the client"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                />
              </div>

              <Button
                onClick={handleCreateAssignment}
                disabled={isLoading || !selectedFormId || selectedClientIds.length === 0}
                className="w-full"
              >
                <Send className="mr-2 h-4 w-4" />
                {isLoading ? 'Assigning...' : 'Assign Form'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(template => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{template.name}</h4>
                        <Badge variant="outline">{template.appointmentType}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {template.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {template.formIds.length} forms
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleTemplateAssignment(template.id)}
                          disabled={isLoading}
                        >
                          Use Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Assignments</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search assignments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
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
                        <p className="font-medium">
                          {forms.find(f => f.id === assignment.formId)?.name || assignment.formId}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {clients.find(c => c.id === assignment.clientId)?.name || assignment.clientId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {assignment.dueDate && (
                        <span className="text-sm text-muted-foreground">
                          Due: {format(new Date(assignment.dueDate), "MMM d")}
                        </span>
                      )}
                      <Badge className={getStatusColor(assignment.status)}>
                        {assignment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Assignment Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Assignment</DialogTitle>
            <DialogDescription>
              Select multiple clients and assignment template
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Clients ({selectedClientIds.length} selected)</Label>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {clients.map(client => (
                  <div key={client.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`client-${client.id}`}
                      checked={selectedClientIds.includes(client.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedClientIds([...selectedClientIds, client.id])
                        } else {
                          setSelectedClientIds(selectedClientIds.filter(id => id !== client.id))
                        }
                      }}
                    />
                    <Label htmlFor={`client-${client.id}`} className="text-sm">
                      {client.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAssignment} disabled={isLoading}>
              Assign to {selectedClientIds.length} client(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}