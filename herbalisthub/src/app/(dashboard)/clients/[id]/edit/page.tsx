"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Save, Plus, X, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import Link from "next/link"
import { Role } from "@prisma/client"

interface ClientFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  allergies: string[]
  medications: string[]
  conditions: string[]
  healthGoals: string
  emergencyContact: {
    name: string
    relationship: string
    phone: string
    email: string
  }
  communicationPreferences: {
    email: boolean
    sms: boolean
    phone: boolean
    marketing: boolean
  }
  notes: string
}

export default function EditClientPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const clientId = params.id as string

  const [formData, setFormData] = useState<ClientFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    status: "ACTIVE",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "US",
    },
    allergies: [],
    medications: [],
    conditions: [],
    healthGoals: "",
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
      email: "",
    },
    communicationPreferences: {
      email: true,
      sms: false,
      phone: false,
      marketing: false,
    },
    notes: "",
  })

  // For managing dynamic arrays
  const [newAllergy, setNewAllergy] = useState("")
  const [newMedication, setNewMedication] = useState("")
  const [newCondition, setNewCondition] = useState("")

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
      const client = data.client
      
      // Format date for input field
      const dateOfBirth = client.dateOfBirth 
        ? new Date(client.dateOfBirth).toISOString().split('T')[0]
        : ""

      setFormData({
        firstName: client.firstName || "",
        lastName: client.lastName || "",
        email: client.email || "",
        phone: client.phone || "",
        dateOfBirth,
        status: client.status || "ACTIVE",
        address: {
          street: client.address?.street || "",
          city: client.address?.city || "",
          state: client.address?.state || "",
          zipCode: client.address?.zipCode || "",
          country: client.address?.country || "US",
        },
        allergies: client.allergies || [],
        medications: client.medications || [],
        conditions: client.conditions || [],
        healthGoals: client.healthGoals || "",
        emergencyContact: {
          name: client.emergencyContact?.name || "",
          relationship: client.emergencyContact?.relationship || "",
          phone: client.emergencyContact?.phone || "",
          email: client.emergencyContact?.email || "",
        },
        communicationPreferences: {
          email: client.communicationPreferences?.email ?? true,
          sms: client.communicationPreferences?.sms ?? false,
          phone: client.communicationPreferences?.phone ?? false,
          marketing: client.communicationPreferences?.marketing ?? false,
        },
        notes: client.notes || "",
      })
    } catch (error) {
      console.error("Error fetching client:", error)
      toast.error("Failed to load client details")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    
    if (name.includes(".")) {
      const [parent, child] = name.split(".")
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof ClientFormData],
          [child]: value,
        },
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      communicationPreferences: {
        ...prev.communicationPreferences,
        [name]: checked,
      },
    }))
  }

  const addToArray = (field: "allergies" | "medications" | "conditions", value: string) => {
    if (value.trim() && !formData[field].includes(value.trim())) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()],
      }))
    }
  }

  const removeFromArray = (field: "allergies" | "medications" | "conditions", index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Prepare data for submission
      const submitData = {
        ...formData,
        // Remove empty fields or set to undefined
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        address: Object.values(formData.address).some(v => v.trim()) ? formData.address : undefined,
        emergencyContact: Object.values(formData.emergencyContact).some(v => v.trim()) 
          ? formData.emergencyContact 
          : undefined,
        healthGoals: formData.healthGoals || undefined,
        notes: formData.notes || undefined,
        allergies: formData.allergies.length > 0 ? formData.allergies : undefined,
        medications: formData.medications.length > 0 ? formData.medications : undefined,
        conditions: formData.conditions.length > 0 ? formData.conditions : undefined,
      }

      const response = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update client")
      }

      toast.success("Client profile updated successfully")
      router.push(`/clients/${clientId}`)
    } catch (error) {
      console.error("Error updating client:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update client")
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async () => {
    setArchiving(true)

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to archive client")
      }

      toast.success("Client profile archived successfully")
      router.push("/clients")
    } catch (error) {
      console.error("Error archiving client:", error)
      toast.error(error instanceof Error ? error.message : "Failed to archive client")
    } finally {
      setArchiving(false)
    }
  }

  if (!session) {
    return <div>Please sign in to access this page.</div>
  }

  // Only herbalists and admins can edit client profiles
  if (session.user.role !== Role.HERBALIST && session.user.role !== Role.ADMIN) {
    return <div>You don't have permission to access this page.</div>
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-[300px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        <Skeleton className="h-[600px]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/clients/${clientId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Edit {formData.firstName} {formData.lastName}
          </h1>
          <p className="text-muted-foreground">
            Update client profile and health information
          </p>
        </div>
        {(session.user.role === Role.HERBALIST || session.user.role === Role.ADMIN) && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={archiving}>
                <Trash2 className="h-4 w-4 mr-2" />
                Archive Client
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive Client Profile</AlertDialogTitle>
                <AlertDialogDescription>
                  This will archive the client profile. The data will be preserved for compliance
                  but the client will no longer appear in active client lists. This action can be reversed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleArchive}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {archiving ? "Archiving..." : "Archive Client"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="health">Health Info</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Basic client details and contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as "ACTIVE" | "INACTIVE" | "ARCHIVED" }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader>
                <CardTitle>Address</CardTitle>
                <CardDescription>Client's primary address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address.street">Street Address</Label>
                  <Input
                    id="address.street"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address.city">City</Label>
                    <Input
                      id="address.city"
                      name="address.city"
                      value={formData.address.city}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address.state">State</Label>
                    <Input
                      id="address.state"
                      name="address.state"
                      value={formData.address.state}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address.zipCode">ZIP Code</Label>
                    <Input
                      id="address.zipCode"
                      name="address.zipCode"
                      value={formData.address.zipCode}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health" className="space-y-6">
            {/* Health Goals */}
            <Card>
              <CardHeader>
                <CardTitle>Health Goals</CardTitle>
                <CardDescription>Client's health objectives and goals</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  name="healthGoals"
                  value={formData.healthGoals}
                  onChange={handleInputChange}
                  placeholder="Describe the client's health goals and objectives..."
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Allergies */}
            <Card>
              <CardHeader>
                <CardTitle>Allergies</CardTitle>
                <CardDescription>Known allergies and sensitivities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    placeholder="Add an allergy..."
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addToArray("allergies", newAllergy)
                        setNewAllergy("")
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      addToArray("allergies", newAllergy)
                      setNewAllergy("")
                    }}
                    disabled={!newAllergy.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.allergies.map((allergy, index) => (
                    <Badge key={index} variant="destructive" className="flex items-center gap-1">
                      {allergy}
                      <button
                        type="button"
                        onClick={() => removeFromArray("allergies", index)}
                        className="ml-1 hover:bg-red-700 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Medications */}
            <Card>
              <CardHeader>
                <CardTitle>Current Medications</CardTitle>
                <CardDescription>Medications and supplements currently being taken</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    placeholder="Add a medication..."
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addToArray("medications", newMedication)
                        setNewMedication("")
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      addToArray("medications", newMedication)
                      setNewMedication("")
                    }}
                    disabled={!newMedication.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.medications.map((medication, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {medication}
                      <button
                        type="button"
                        onClick={() => removeFromArray("medications", index)}
                        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Conditions */}
            <Card>
              <CardHeader>
                <CardTitle>Health Conditions</CardTitle>
                <CardDescription>Current health conditions and diagnoses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    placeholder="Add a condition..."
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addToArray("conditions", newCondition)
                        setNewCondition("")
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      addToArray("conditions", newCondition)
                      setNewCondition("")
                    }}
                    disabled={!newCondition.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.conditions.map((condition, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {condition}
                      <button
                        type="button"
                        onClick={() => removeFromArray("conditions", index)}
                        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emergency" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
                <CardDescription>Primary emergency contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact.name">Contact Name</Label>
                    <Input
                      id="emergencyContact.name"
                      name="emergencyContact.name"
                      value={formData.emergencyContact.name}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact.relationship">Relationship</Label>
                    <Input
                      id="emergencyContact.relationship"
                      name="emergencyContact.relationship"
                      value={formData.emergencyContact.relationship}
                      onChange={handleInputChange}
                      placeholder="e.g., Spouse, Parent, Friend"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact.phone">Phone Number</Label>
                    <Input
                      id="emergencyContact.phone"
                      name="emergencyContact.phone"
                      type="tel"
                      value={formData.emergencyContact.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact.email">Email</Label>
                    <Input
                      id="emergencyContact.email"
                      name="emergencyContact.email"
                      type="email"
                      value={formData.emergencyContact.email}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            {/* Communication Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>Communication Preferences</CardTitle>
                <CardDescription>How the client prefers to be contacted</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Communications</Label>
                    <p className="text-sm text-muted-foreground">
                      Appointment reminders and general communications
                    </p>
                  </div>
                  <Switch
                    checked={formData.communicationPreferences.email}
                    onCheckedChange={(checked) => handleSwitchChange("email", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS/Text Messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Quick reminders and updates via text
                    </p>
                  </div>
                  <Switch
                    checked={formData.communicationPreferences.sms}
                    onCheckedChange={(checked) => handleSwitchChange("sms", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Phone Calls</Label>
                    <p className="text-sm text-muted-foreground">
                      Phone calls for important communications
                    </p>
                  </div>
                  <Switch
                    checked={formData.communicationPreferences.phone}
                    onCheckedChange={(checked) => handleSwitchChange("phone", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Marketing Communications</Label>
                    <p className="text-sm text-muted-foreground">
                      Newsletters, promotions, and health tips
                    </p>
                  </div>
                  <Switch
                    checked={formData.communicationPreferences.marketing}
                    onCheckedChange={(checked) => handleSwitchChange("marketing", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Clinical Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Clinical Notes</CardTitle>
                <CardDescription>Private notes about this client (HIPAA protected)</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Add any relevant clinical notes or observations..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t">
          <Button variant="outline" asChild>
            <Link href={`/clients/${clientId}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}