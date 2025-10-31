"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Share,
  Users,
  Link,
  Mail,
  Copy,
  Check,
  X,
  Shield,
  Clock,
  Globe,
  UserPlus,
  Settings,
  Eye,
  Edit3,
  MessageSquare,
  Crown,
  AlertTriangle
} from "lucide-react"
import { toast } from "sonner"

interface SharingControlsProps {
  formulaId: string
  formulaName: string
  isOwner: boolean
  currentShares?: FormulaShare[]
  onShareUpdate?: () => void
}

interface FormulaShare {
  id: string
  shareType: string
  accessLevel: string
  sharedWith?: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  shareToken?: string
  expiresAt?: string
  isActive: boolean
  createdAt: string
  shareNotes?: string
}

interface ShareInvite {
  email: string
  role: string
  message: string
  expiresIn: string
}

const accessLevels = [
  { value: "read", label: "View Only", icon: Eye, description: "Can view formula details" },
  { value: "comment", label: "Comment", icon: MessageSquare, description: "Can view and comment" },
  { value: "edit", label: "Edit", icon: Edit3, description: "Can view, comment, and edit" },
  { value: "admin", label: "Admin", icon: Crown, description: "Full access including sharing" }
]

const shareTypes = [
  { value: "user", label: "Specific Users", icon: Users, description: "Share with individual users" },
  { value: "practice", label: "Practice Team", icon: Shield, description: "Share with practice members" },
  { value: "link", label: "Share Link", icon: Link, description: "Anyone with the link" },
  { value: "public", label: "Public", icon: Globe, description: "Publicly discoverable" }
]

export function SharingControls({ 
  formulaId, 
  formulaName, 
  isOwner, 
  currentShares = [], 
  onShareUpdate 
}: SharingControlsProps) {
  const [loading, setLoading] = useState(false)
  const [shares, setShares] = useState<FormulaShare[]>(currentShares)
  const [newInvite, setNewInvite] = useState<ShareInvite>({
    email: "",
    role: "read",
    message: "",
    expiresIn: "30d"
  })
  const [linkShare, setLinkShare] = useState<{
    token?: string
    url?: string
    accessLevel: string
    expiresIn: string
    requiresAuth: boolean
  }>({
    accessLevel: "read",
    expiresIn: "30d",
    requiresAuth: true
  })
  const [copiedLink, setCopiedLink] = useState(false)
  const [searchUsers, setSearchUsers] = useState("")
  const [availableUsers, setAvailableUsers] = useState<Array<{
    id: string
    name: string
    email: string
    avatar?: string
  }>>([])

  useEffect(() => {
    fetchShares()
    fetchAvailableUsers()
  }, [formulaId])

  const fetchShares = async () => {
    try {
      const response = await fetch(`/api/formulas/${formulaId}/shares`)
      if (response.ok) {
        const data = await response.json()
        setShares(data.shares || [])
      }
    } catch (error) {
      console.error("Error fetching shares:", error)
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch(`/api/users/search?q=${searchUsers}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        setAvailableUsers(data.users || [])
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const handleInviteUser = async () => {
    if (!newInvite.email.trim()) {
      toast.error("Please enter an email address")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/formulas/${formulaId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareType: "user",
          email: newInvite.email,
          accessLevel: newInvite.role,
          message: newInvite.message,
          expiresIn: newInvite.expiresIn
        })
      })

      if (response.ok) {
        toast.success("Invitation sent successfully")
        setNewInvite({ email: "", role: "read", message: "", expiresIn: "30d" })
        fetchShares()
        onShareUpdate?.()
      } else {
        const error = await response.json()
        toast.error(error.message || "Failed to send invitation")
      }
    } catch (error) {
      console.error("Error sending invitation:", error)
      toast.error("Failed to send invitation")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLinkShare = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/formulas/${formulaId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareType: "link",
          accessLevel: linkShare.accessLevel,
          expiresIn: linkShare.expiresIn,
          requiresAuth: linkShare.requiresAuth
        })
      })

      if (response.ok) {
        const data = await response.json()
        setLinkShare(prev => ({
          ...prev,
          token: data.share.shareToken,
          url: `${window.location.origin}/formulas/shared/${data.share.shareToken}`
        }))
        toast.success("Share link created")
        fetchShares()
        onShareUpdate?.()
      } else {
        const error = await response.json()
        toast.error(error.message || "Failed to create share link")
      }
    } catch (error) {
      console.error("Error creating share link:", error)
      toast.error("Failed to create share link")
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (linkShare.url) {
      try {
        await navigator.clipboard.writeText(linkShare.url)
        setCopiedLink(true)
        toast.success("Link copied to clipboard")
        setTimeout(() => setCopiedLink(false), 2000)
      } catch (error) {
        toast.error("Failed to copy link")
      }
    }
  }

  const handleRevokeShare = async (shareId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/formulas/${formulaId}/shares/${shareId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        toast.success("Access revoked")
        fetchShares()
        onShareUpdate?.()
      } else {
        toast.error("Failed to revoke access")
      }
    } catch (error) {
      console.error("Error revoking share:", error)
      toast.error("Failed to revoke access")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateAccess = async (shareId: string, newAccessLevel: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/formulas/${formulaId}/shares/${shareId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessLevel: newAccessLevel })
      })

      if (response.ok) {
        toast.success("Access level updated")
        fetchShares()
        onShareUpdate?.()
      } else {
        toast.error("Failed to update access")
      }
    } catch (error) {
      console.error("Error updating access:", error)
      toast.error("Failed to update access")
    } finally {
      setLoading(false)
    }
  }

  const getAccessLevelInfo = (level: string) => {
    return accessLevels.find(al => al.value === level) || accessLevels[0]
  }

  const getShareTypeInfo = (type: string) => {
    return shareTypes.find(st => st.value === type) || shareTypes[0]
  }

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Only the formula owner can manage sharing settings.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share className="h-5 w-5" />
          Sharing & Collaboration
        </CardTitle>
        <CardDescription>
          Share "{formulaName}" with colleagues and manage collaboration settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="invite" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="invite">Invite Users</TabsTrigger>
            <TabsTrigger value="link">Share Link</TabsTrigger>
            <TabsTrigger value="manage">Manage Access</TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="inviteEmail">Email Address</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="Enter email address..."
                  value={newInvite.email}
                  onChange={(e) => setNewInvite(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="inviteRole">Access Level</Label>
                <Select 
                  value={newInvite.role} 
                  onValueChange={(value) => setNewInvite(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accessLevels.map((level) => {
                      const Icon = level.icon
                      return (
                        <SelectItem key={level.value} value={level.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{level.label}</div>
                              <div className="text-xs text-muted-foreground">{level.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="inviteMessage">Personal Message (Optional)</Label>
                <Textarea
                  id="inviteMessage"
                  placeholder="Add a personal message to the invitation..."
                  value={newInvite.message}
                  onChange={(e) => setNewInvite(prev => ({ ...prev, message: e.target.value }))}
                  className="mt-2"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="inviteExpires">Link Expires</Label>
                <Select 
                  value={newInvite.expiresIn} 
                  onValueChange={(value) => setNewInvite(prev => ({ ...prev, expiresIn: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">7 days</SelectItem>
                    <SelectItem value="30d">30 days</SelectItem>
                    <SelectItem value="90d">90 days</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleInviteUser} 
                disabled={loading || !newInvite.email.trim()}
                className="w-full"
              >
                <Mail className="h-4 w-4 mr-2" />
                {loading ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Access Level for Link</Label>
                <Select 
                  value={linkShare.accessLevel} 
                  onValueChange={(value) => setLinkShare(prev => ({ ...prev, accessLevel: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accessLevels.slice(0, 2).map((level) => {
                      const Icon = level.icon
                      return (
                        <SelectItem key={level.value} value={level.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{level.label}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Link Expires</Label>
                <Select 
                  value={linkShare.expiresIn} 
                  onValueChange={(value) => setLinkShare(prev => ({ ...prev, expiresIn: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1d">1 day</SelectItem>
                    <SelectItem value="7d">7 days</SelectItem>
                    <SelectItem value="30d">30 days</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="requiresAuth"
                  checked={linkShare.requiresAuth}
                  onCheckedChange={(checked) => setLinkShare(prev => ({ ...prev, requiresAuth: checked }))}
                />
                <Label htmlFor="requiresAuth">Require login to access</Label>
              </div>

              {linkShare.url ? (
                <div className="space-y-3">
                  <Label>Share Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={linkShare.url}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={handleCopyLink}
                      className="flex-shrink-0"
                    >
                      {copiedLink ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Anyone with this link can {linkShare.accessLevel === "read" ? "view" : "comment on"} the formula
                  </p>
                </div>
              ) : (
                <Button 
                  onClick={handleCreateLinkShare} 
                  disabled={loading}
                  className="w-full"
                >
                  <Link className="h-4 w-4 mr-2" />
                  {loading ? "Creating..." : "Create Share Link"}
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            {shares.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No active shares</h3>
                <p className="text-muted-foreground">
                  Use the tabs above to invite users or create share links
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {shares.map((share) => {
                  const shareTypeInfo = getShareTypeInfo(share.shareType)
                  const accessInfo = getAccessLevelInfo(share.accessLevel)
                  const ShareIcon = shareTypeInfo.icon
                  const AccessIcon = accessInfo.icon

                  return (
                    <div key={share.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <ShareIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          {share.sharedWith ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={share.sharedWith.avatar} />
                                <AvatarFallback className="text-xs">
                                  {share.sharedWith.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{share.sharedWith.name}</p>
                                <p className="text-sm text-muted-foreground">{share.sharedWith.email}</p>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="font-medium">{shareTypeInfo.label}</p>
                              <p className="text-sm text-muted-foreground">{shareTypeInfo.description}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <AccessIcon className="h-3 w-3" />
                          {accessInfo.label}
                        </Badge>

                        {share.expiresAt && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expires {new Date(share.expiresAt).toLocaleDateString()}
                          </Badge>
                        )}

                        <div className="flex items-center gap-1">
                          <Select
                            value={share.accessLevel}
                            onValueChange={(value) => handleUpdateAccess(share.id, value)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {accessLevels.map((level) => (
                                <SelectItem key={level.value} value={level.value}>
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeShare(share.id)}
                            disabled={loading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}