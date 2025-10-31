"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  User, 
  Heart, 
  Pill, 
  AlertTriangle,
  Target,
  FileText,
  Clock,
  Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { Role } from "@prisma/client"

interface ClientDetail {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  dateOfBirth?: string
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
  createdAt: string
  updatedAt: string
  lastContactAt?: string
  nextAppointmentAt?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country: string
  }
  allergies?: string[]
  medications?: string[]
  conditions?: string[]
  healthGoals?: string
  emergencyContact?: {
    name: string
    relationship: string
    phone: string
    email?: string
  }
  communicationPreferences?: {
    email: boolean
    sms: boolean
    phone: boolean
    marketing: boolean
  }
  notes?: string
  herbalistId: string
  herbalist?: {
    id: string
    name: string
    email: string
  }
  consultationNotes: Array<{
    id: string
    createdAt: string
    updatedAt: string
    type: string
    status: string
  }>
  appointments: Array<{
    id: string
    startTime: string
    endTime: string
    status: string
    type: string
  }>
  _count: {
    consultationNotes: number
    appointments: number
    intakeSubmissions: number
  }
}

const statusColors = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-yellow-100 text-yellow-800",
  ARCHIVED: "bg-gray-100 text-gray-800",
}

const statusLabels = {
  ACTIVE: "Active",
  INACTIVE: "Inactive", 
  ARCHIVED: "Archived",
}

export default function ClientDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const clientId = params.id as string

  useEffect(() => {
    fetchClient()
  }, [clientId])

  const fetchClient = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients/${clientId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Client not found")
          router.push("/clients")
          return
        }
        throw new Error("Failed to fetch client")
      }

      const data = await response.json()
      setClient(data.client)
    } catch (error) {
      console.error("Error fetching client:", error)
      toast.error("Failed to load client details")
    } finally {
      setLoading(false)
    }
  }

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  if (!session) {
    return <div>Please sign in to access this page.</div>
  }

  // Only herbalists and admins can access client data
  if (session.user.role !== Role.HERBALIST && session.user.role !== Role.ADMIN) {
    return <div>You don't have permission to access this page.</div>
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-[300px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px] md:col-span-2" />
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold mb-2">Client not found</h3>
        <p className="text-muted-foreground mb-4">
          The client you're looking for doesn't exist or you don't have access to it.
        </p>
        <Button asChild>
          <Link href="/clients">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {client.firstName} {client.lastName}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Badge className={statusColors[client.status]}>
                  {statusLabels[client.status]}
                </Badge>
                {client.dateOfBirth && (
                  <span>Age {calculateAge(client.dateOfBirth)}</span>
                )}
                {session.user.role === Role.ADMIN && client.herbalist && (
                  <span>• Herbalist: {client.herbalist.name}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/consultations/new?clientId=${client.id}`}>
              <Plus className="h-4 w-4 mr-2" />
              New Consultation
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/clients/${client.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Contact & Basic Info */}
        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{client.phone}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    {client.address.street && <div>{client.address.street}</div>}
                    <div>
                      {[client.address.city, client.address.state, client.address.zipCode]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                    {client.address.country && client.address.country !== "US" && (
                      <div>{client.address.country}</div>
                    )}
                  </div>
                </div>
              )}
              {client.dateOfBirth && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <div>Born {format(new Date(client.dateOfBirth), "MMMM d, yyyy")}</div>
                    <div className="text-muted-foreground">Age {calculateAge(client.dateOfBirth)}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          {client.emergencyContact && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="font-medium">{client.emergencyContact.name}</div>
                <div className="text-sm text-muted-foreground">
                  {client.emergencyContact.relationship}
                </div>
                <div className="text-sm">{client.emergencyContact.phone}</div>
                {client.emergencyContact.email && (
                  <div className="text-sm text-muted-foreground">
                    {client.emergencyContact.email}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Communication Preferences */}
          {client.communicationPreferences && (
            <Card>
              <CardHeader>
                <CardTitle>Communication Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Email</span>
                    <Badge variant={client.communicationPreferences.email ? "default" : "secondary"}>
                      {client.communicationPreferences.email ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">SMS</span>
                    <Badge variant={client.communicationPreferences.sms ? "default" : "secondary"}>
                      {client.communicationPreferences.sms ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Phone</span>
                    <Badge variant={client.communicationPreferences.phone ? "default" : "secondary"}>
                      {client.communicationPreferences.phone ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Marketing</span>
                    <Badge variant={client.communicationPreferences.marketing ? "default" : "secondary"}>
                      {client.communicationPreferences.marketing ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Health Information & Activity */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="health" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="health">Health Information</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="health" className="space-y-6">
              {/* Health Goals */}
              {client.healthGoals && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Health Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{client.healthGoals}</p>
                  </CardContent>
                </Card>
              )}

              {/* Conditions */}
              {client.conditions && client.conditions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Conditions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {client.conditions.map((condition, index) => (
                        <Badge key={index} variant="outline">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Medications */}
              {client.medications && client.medications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Pill className="h-4 w-4" />
                      Current Medications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {client.medications.map((medication, index) => (
                        <Badge key={index} variant="outline">
                          {medication}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Allergies */}
              {client.allergies && client.allergies.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Allergies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {client.allergies.map((allergy, index) => (
                        <Badge key={index} variant="destructive">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              {/* Activity Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Consultation Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{client._count.consultationNotes}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Appointments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{client._count.appointments}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Intake Forms</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{client._count.intakeSubmissions}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Consultation Notes */}
              {client.consultationNotes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Recent Consultation Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {client.consultationNotes.map((note) => (
                        <div key={note.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">{note.type}</div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(note.createdAt), "MMM d, yyyy")}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline">{note.status}</Badge>
                        </div>
                      ))}
                      {client._count.consultationNotes > client.consultationNotes.length && (
                        <Button variant="outline" className="w-full" asChild>
                          <Link href={`/clients/${client.id}/consultations`}>
                            View All Consultation Notes
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Upcoming Appointments */}
              {client.appointments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Upcoming Appointments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {client.appointments.map((appointment) => (
                        <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                              <Calendar className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <div className="font-medium">{appointment.type}</div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(appointment.startTime), "MMM d, yyyy 'at' h:mm a")}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline">{appointment.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Last Contact */}
              {client.lastContactAt && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Last Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(client.lastContactAt), { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Clinical Notes
                  </CardTitle>
                  <CardDescription>
                    Private notes about this client
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {client.notes ? (
                    <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No notes available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}