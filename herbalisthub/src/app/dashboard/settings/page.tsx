"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Save, 
  Upload,
  AlertCircle,
  CheckCircle2
} from "lucide-react"

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  image?: string
  phone?: string
  emailVerified: boolean
  practiceInfo?: {
    licenseNumber?: string
    certifications?: string[]
    businessName?: string
    businessAddress?: string
    website?: string
  }
}

interface UserSettings {
  communicationPrefs: {
    email: boolean
    sms: boolean
    phone: boolean
    marketing: boolean
    appointmentReminders: boolean
    followUpReminders: boolean
  }
  privacyPrefs: {
    shareDataForResearch: boolean
    allowTestimonialUse: boolean
    publicProfile: boolean
  }
  notificationPrefs: {
    emailNotifications: boolean
    pushNotifications: boolean
    smsNotifications: boolean
    inAppNotifications: boolean
  }
  displayPrefs: {
    theme: "light" | "dark" | "system"
    language: "en" | "es" | "fr"
    timezone: string
    dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD"
    timeFormat: "12h" | "24h"
  }
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [activeTab, setActiveTab] = useState("profile")

  useEffect(() => {
    if (session?.user) {
      loadUserData()
    }
  }, [session])

  const loadUserData = async () => {
    try {
      setIsLoading(true)
      setError("")

      const [profileResponse, settingsResponse] = await Promise.all([
        fetch("/api/user/profile"),
        fetch("/api/user/settings")
      ])

      if (!profileResponse.ok || !settingsResponse.ok) {
        throw new Error("Failed to load user data")
      }

      const profileData = await profileResponse.json()
      const settingsData = await settingsResponse.json()

      setProfile(profileData.data)
      setSettings(settingsData.data)
    } catch (error) {
      setError("Failed to load user settings. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (updatedProfile: Partial<UserProfile>) => {
    try {
      setIsSaving(true)
      setError("")
      setSuccess("")

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedProfile),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      const data = await response.json()
      setProfile(data.data)
      setSuccess("Profile updated successfully!")
    } catch (error) {
      setError("Failed to update profile. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const updateSettings = async (updatedSettings: Partial<UserSettings>) => {
    try {
      setIsSaving(true)
      setError("")
      setSuccess("")

      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedSettings),
      })

      if (!response.ok) {
        throw new Error("Failed to update settings")
      }

      const data = await response.json()
      setSettings(data.data)
      setSuccess("Settings updated successfully!")
    } catch (error) {
      setError("Failed to update settings. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!profile) return

    const formData = new FormData(e.currentTarget)
    const updatedProfile = {
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      ...(profile.role === "HERBALIST" && {
        practiceInfo: {
          licenseNumber: formData.get("licenseNumber") as string,
          businessName: formData.get("businessName") as string,
          businessAddress: formData.get("businessAddress") as string,
          website: formData.get("website") as string,
        }
      })
    }

    updateProfile(updatedProfile)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences.</p>
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    )
  }

  if (!profile || !settings) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences.</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load user settings. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="display" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Display
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and professional details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.image} />
                    <AvatarFallback>
                      {profile.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Button type="button" variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Change Photo
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      JPG, PNG up to 2MB
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={profile.name}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={profile.email}
                        disabled
                      />
                      {profile.emailVerified && (
                        <Badge className="absolute right-2 top-2 text-xs">
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      defaultValue={profile.phone || ""}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      name="role"
                      defaultValue={profile.role}
                      disabled
                    />
                  </div>
                </div>

                {profile.role === "HERBALIST" && (
                  <div className="space-y-4">
                    <Separator />
                    <h3 className="text-lg font-medium">Practice Information</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="licenseNumber">License Number</Label>
                        <Input
                          id="licenseNumber"
                          name="licenseNumber"
                          defaultValue={profile.practiceInfo?.licenseNumber || ""}
                          placeholder="Enter your license number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="businessName">Business Name</Label>
                        <Input
                          id="businessName"
                          name="businessName"
                          defaultValue={profile.practiceInfo?.businessName || ""}
                          placeholder="Your practice name"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="businessAddress">Business Address</Label>
                        <Textarea
                          id="businessAddress"
                          name="businessAddress"
                          defaultValue={profile.practiceInfo?.businessAddress || ""}
                          placeholder="Your practice address"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          name="website"
                          type="url"
                          defaultValue={profile.practiceInfo?.website || ""}
                          placeholder="https://your-website.com"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={isSaving} className="w-full md:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to receive notifications and updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Communication</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-notif">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      id="email-notif"
                      checked={settings.notificationPrefs.emailNotifications}
                      onCheckedChange={(checked) =>
                        updateSettings({
                          notificationPrefs: {
                            ...settings.notificationPrefs,
                            emailNotifications: checked,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="push-notif">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive push notifications in your browser
                      </p>
                    </div>
                    <Switch
                      id="push-notif"
                      checked={settings.notificationPrefs.pushNotifications}
                      onCheckedChange={(checked) =>
                        updateSettings({
                          notificationPrefs: {
                            ...settings.notificationPrefs,
                            pushNotifications: checked,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="sms-notif">SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive text message notifications
                      </p>
                    </div>
                    <Switch
                      id="sms-notif"
                      checked={settings.notificationPrefs.smsNotifications}
                      onCheckedChange={(checked) =>
                        updateSettings({
                          notificationPrefs: {
                            ...settings.notificationPrefs,
                            smsNotifications: checked,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Reminders</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="appointment-reminders">Appointment Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Get reminded about upcoming appointments
                      </p>
                    </div>
                    <Switch
                      id="appointment-reminders"
                      checked={settings.communicationPrefs.appointmentReminders}
                      onCheckedChange={(checked) =>
                        updateSettings({
                          communicationPrefs: {
                            ...settings.communicationPrefs,
                            appointmentReminders: checked,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="followup-reminders">Follow-up Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Get reminded about follow-up tasks and care
                      </p>
                    </div>
                    <Switch
                      id="followup-reminders"
                      checked={settings.communicationPrefs.followUpReminders}
                      onCheckedChange={(checked) =>
                        updateSettings({
                          communicationPrefs: {
                            ...settings.communicationPrefs,
                            followUpReminders: checked,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Marketing</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="marketing">Marketing Communications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about new features and promotions
                    </p>
                  </div>
                  <Switch
                    id="marketing"
                    checked={settings.communicationPrefs.marketing}
                    onCheckedChange={(checked) =>
                      updateSettings({
                        communicationPrefs: {
                          ...settings.communicationPrefs,
                          marketing: checked,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy Settings
              </CardTitle>
              <CardDescription>
                Control your privacy and data sharing preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="public-profile">Public Profile</Label>
                    <p className="text-sm text-muted-foreground">
                      Make your profile visible to other users
                    </p>
                  </div>
                  <Switch
                    id="public-profile"
                    checked={settings.privacyPrefs.publicProfile}
                    onCheckedChange={(checked) =>
                      updateSettings({
                        privacyPrefs: {
                          ...settings.privacyPrefs,
                          publicProfile: checked,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="research-data">Share Data for Research</Label>
                    <p className="text-sm text-muted-foreground">
                      Help improve our services by sharing anonymized data
                    </p>
                  </div>
                  <Switch
                    id="research-data"
                    checked={settings.privacyPrefs.shareDataForResearch}
                    onCheckedChange={(checked) =>
                      updateSettings({
                        privacyPrefs: {
                          ...settings.privacyPrefs,
                          shareDataForResearch: checked,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="testimonials">Allow Testimonial Use</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow us to use your feedback in promotional materials
                    </p>
                  </div>
                  <Switch
                    id="testimonials"
                    checked={settings.privacyPrefs.allowTestimonialUse}
                    onCheckedChange={(checked) =>
                      updateSettings({
                        privacyPrefs: {
                          ...settings.privacyPrefs,
                          allowTestimonialUse: checked,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">HIPAA Compliance</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      All your health information is protected under HIPAA regulations. 
                      We never share personal health information without your explicit consent.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="display" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Display Settings
              </CardTitle>
              <CardDescription>
                Customize how the application looks and behaves.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={settings.displayPrefs.theme}
                    onValueChange={(value: "light" | "dark" | "system") =>
                      updateSettings({
                        displayPrefs: {
                          ...settings.displayPrefs,
                          theme: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={settings.displayPrefs.language}
                    onValueChange={(value: "en" | "es" | "fr") =>
                      updateSettings({
                        displayPrefs: {
                          ...settings.displayPrefs,
                          language: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select
                    value={settings.displayPrefs.dateFormat}
                    onValueChange={(value: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD") =>
                      updateSettings({
                        displayPrefs: {
                          ...settings.displayPrefs,
                          dateFormat: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeFormat">Time Format</Label>
                  <Select
                    value={settings.displayPrefs.timeFormat}
                    onValueChange={(value: "12h" | "24h") =>
                      updateSettings({
                        displayPrefs: {
                          ...settings.displayPrefs,
                          timeFormat: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12 Hour</SelectItem>
                      <SelectItem value="24h">24 Hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={settings.displayPrefs.timezone}
                    onValueChange={(value) =>
                      updateSettings({
                        displayPrefs: {
                          ...settings.displayPrefs,
                          timezone: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">GMT</SelectItem>
                      <SelectItem value="Europe/Paris">CET</SelectItem>
                      <SelectItem value="Asia/Tokyo">JST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}