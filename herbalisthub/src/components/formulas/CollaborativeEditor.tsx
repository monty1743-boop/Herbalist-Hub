"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { 
  Users,
  Edit,
  Eye,
  Crown,
  Clock,
  Activity,
  UserPlus,
  AlertCircle,
  CheckCircle,
  X
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

interface CollaborativeEditorProps {
  formulaId: string
  formulaName: string
  isOwner: boolean
  onCollaborationChange?: () => void
}

interface Collaborator {
  id: string
  userId: string
  role: string
  isAccepted: boolean
  isActive: boolean
  invitedAt: string
  acceptedAt?: string
  user: {
    id: string
    name: string
    email: string
    avatar?: string
    role: string
  }
  inviter: {
    id: string
    name: string
  }
}

interface Activity {
  id: string
  type: string
  description: string
  userId: string
  createdAt: string
  user: {
    id: string
    name: string
    avatar?: string
  }
}

const roleInfo = {
  viewer: {
    label: "Viewer",
    description: "Can view formula details",
    icon: Eye,
    color: "blue"
  },
  commenter: {
    label: "Commenter", 
    description: "Can view and add comments",
    icon: Activity,
    color: "green"
  },
  editor: {
    label: "Editor",
    description: "Can view, comment, and edit",
    icon: Edit,
    color: "yellow"
  },
  "co-owner": {
    label: "Co-Owner",
    description: "Full access including sharing",
    icon: Crown,
    color: "purple"
  }
}

export function CollaborativeEditor({ 
  formulaId, 
  formulaName, 
  isOwner, 
  onCollaborationChange 
}: CollaborativeEditorProps) {
  const { data: session } = useSession()
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeUsers, setActiveUsers] = useState<Array<{
    id: string
    name: string
    avatar?: string
    lastSeen: string
  }>>([])

  useEffect(() => {
    fetchCollaborators()
    fetchActivities()
    // In a real implementation, this would use WebSocket or similar for real-time updates
    setupRealTimeUpdates()
  }, [formulaId])

  const fetchCollaborators = async () => {
    try {
      const response = await fetch(`/api/formulas/${formulaId}/collaborators`)
      if (response.ok) {
        const data = await response.json()
        setCollaborators(data.collaborators || [])
      }
    } catch (error) {
      console.error("Error fetching collaborators:", error)
    }
  }

  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/formulas/${formulaId}/activities?limit=10`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
      }
    } catch (error) {
      console.error("Error fetching activities:", error)
    } finally {
      setLoading(false)
    }
  }

  const setupRealTimeUpdates = () => {
    // Simulate real-time updates with polling for now
    // In production, this would use WebSocket connections
    const interval = setInterval(() => {
      // Update active users based on recent activity
      const now = new Date()
      const activeWindow = 5 * 60 * 1000 // 5 minutes
      
      const recentCollaborators = collaborators
        .filter(c => c.isAccepted && c.isActive)
        .map(c => ({
          id: c.user.id,
          name: c.user.name,
          avatar: c.user.avatar,
          lastSeen: now.toISOString() // This would come from real activity tracking
        }))
        .filter(u => u.id !== session?.user?.id) // Don't show current user
      
      setActiveUsers(recentCollaborators)
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }

  const handleAcceptInvitation = async (collaboratorId: string) => {
    try {
      const response = await fetch(`/api/formulas/${formulaId}/collaborators/${collaboratorId}/accept`, {
        method: "POST"
      })

      if (response.ok) {
        toast.success("Invitation accepted")
        fetchCollaborators()
        onCollaborationChange?.()
      } else {
        toast.error("Failed to accept invitation")
      }
    } catch (error) {
      console.error("Error accepting invitation:", error)
      toast.error("Failed to accept invitation")
    }
  }

  const handleDeclineInvitation = async (collaboratorId: string) => {
    try {
      const response = await fetch(`/api/formulas/${formulaId}/collaborators/${collaboratorId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        toast.success("Invitation declined")
        fetchCollaborators()
        onCollaborationChange?.()
      } else {
        toast.error("Failed to decline invitation")
      }
    } catch (error) {
      console.error("Error declining invitation:", error)
      toast.error("Failed to decline invitation")
    }
  }

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!confirm("Are you sure you want to remove this collaborator?")) {
      return
    }

    try {
      const response = await fetch(`/api/formulas/${formulaId}/collaborators/${collaboratorId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        toast.success("Collaborator removed")
        fetchCollaborators()
        onCollaborationChange?.()
      } else {
        toast.error("Failed to remove collaborator")
      }
    } catch (error) {
      console.error("Error removing collaborator:", error)
      toast.error("Failed to remove collaborator")
    }
  }

  const handleUpdateRole = async (collaboratorId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/formulas/${formulaId}/collaborators/${collaboratorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      })

      if (response.ok) {
        toast.success("Role updated")
        fetchCollaborators()
        onCollaborationChange?.()
      } else {
        toast.error("Failed to update role")
      }
    } catch (error) {
      console.error("Error updating role:", error)
      toast.error("Failed to update role")
    }
  }

  const getRoleInfo = (role: string) => {
    return roleInfo[role as keyof typeof roleInfo] || roleInfo.viewer
  }

  const getTimestamp = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  }

  // Check if current user has pending invitations
  const pendingInvitations = collaborators.filter(c => 
    c.user.id === session?.user?.id && !c.isAccepted
  )

  const activeCollaborators = collaborators.filter(c => 
    c.isAccepted && c.isActive
  )

  return (
    <div className="space-y-6">
      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Alert>
          <UserPlus className="h-4 w-4" />
          <AlertDescription className="space-y-3">
            <p>You have pending collaboration invitations for this formula:</p>
            {pendingInvitations.map((invitation) => {
              const roleData = getRoleInfo(invitation.role)
              return (
                <div key={invitation.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div>
                    <p className="font-medium">
                      {invitation.inviter.name} invited you as {roleData.label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {roleData.description} • Invited {getTimestamp(invitation.invitedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleAcceptInvitation(invitation.id)}
                    >
                      Accept
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeclineInvitation(invitation.id)}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              )
            })}
          </AlertDescription>
        </Alert>
      )}

      {/* Active Users */}
      {activeUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Currently Active
            </CardTitle>
            <CardDescription>
              Users currently working on this formula
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 flex-wrap">
              {activeUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="text-xs">
                        {user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                  </div>
                  <span className="text-sm font-medium">{user.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collaborators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Collaborators
          </CardTitle>
          <CardDescription>
            People with access to "{formulaName}"
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeCollaborators.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No collaborators yet</h3>
              <p className="text-muted-foreground">
                {isOwner 
                  ? "Use the Sharing tab to invite people to collaborate"
                  : "This formula doesn't have any active collaborators"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeCollaborators.map((collaborator) => {
                const roleData = getRoleInfo(collaborator.role)
                const RoleIcon = roleData.icon
                const canManage = isOwner && collaborator.user.id !== session?.user?.id

                return (
                  <div key={collaborator.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={collaborator.user.avatar} />
                        <AvatarFallback>
                          {collaborator.user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{collaborator.user.name}</p>
                          {collaborator.user.id === session?.user?.id && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{collaborator.user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {getTimestamp(collaborator.acceptedAt || collaborator.invitedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1 bg-${roleData.color}-50 text-${roleData.color}-700`}
                      >
                        <RoleIcon className="h-3 w-3" />
                        {roleData.label}
                      </Badge>

                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCollaborator(collaborator.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest changes and interactions with this formula
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No recent activity</h3>
              <p className="text-muted-foreground">
                Activity will appear here as people interact with the formula
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={activity.user.avatar} />
                    <AvatarFallback className="text-xs">
                      {activity.user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user.name}</span>{" "}
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getTimestamp(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}