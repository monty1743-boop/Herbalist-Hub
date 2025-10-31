"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  MessageSquare,
  Send,
  Reply,
  MoreVertical,
  Flag,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  User,
  Lock,
  Lightbulb,
  HelpCircle,
  Star,
  ThumbsUp,
  ThumbsDown
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

interface FormulaDiscussionProps {
  formulaId: string
  formulaName: string
  canComment: boolean
  canModerate: boolean
}

interface Comment {
  id: string
  content: string
  type: string
  isEdited: boolean
  isPrivate: boolean
  isResolved: boolean
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
    avatar?: string
    role: string
  }
  replies: Comment[]
  parentId?: string
}

const commentTypes = [
  { value: "comment", label: "General Comment", icon: MessageSquare, color: "blue" },
  { value: "suggestion", label: "Suggestion", icon: Lightbulb, color: "yellow" },
  { value: "question", label: "Question", icon: HelpCircle, color: "purple" },
  { value: "review", label: "Review", icon: Star, color: "green" }
]

export function FormulaDiscussion({ 
  formulaId, 
  formulaName, 
  canComment, 
  canModerate 
}: FormulaDiscussionProps) {
  const { data: session } = useSession()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [newComment, setNewComment] = useState({
    content: "",
    type: "comment",
    isPrivate: false
  })
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [sortBy, setSortBy] = useState("newest")

  useEffect(() => {
    fetchComments()
  }, [formulaId, filterType, sortBy])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        type: filterType !== "all" ? filterType : "",
        sortBy
      })
      
      const response = await fetch(`/api/formulas/${formulaId}/comments?${params}`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error("Error fetching comments:", error)
      toast.error("Failed to load comments")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.content.trim()) {
      toast.error("Please enter a comment")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/formulas/${formulaId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newComment)
      })

      if (response.ok) {
        toast.success("Comment added successfully")
        setNewComment({ content: "", type: "comment", isPrivate: false })
        fetchComments()
      } else {
        const error = await response.json()
        toast.error(error.message || "Failed to add comment")
      }
    } catch (error) {
      console.error("Error submitting comment:", error)
      toast.error("Failed to add comment")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim()) {
      toast.error("Please enter a reply")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/formulas/${formulaId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyContent,
          type: "comment",
          parentId
        })
      })

      if (response.ok) {
        toast.success("Reply added successfully")
        setReplyingTo(null)
        setReplyContent("")
        fetchComments()
      } else {
        toast.error("Failed to add reply")
      }
    } catch (error) {
      console.error("Error submitting reply:", error)
      toast.error("Failed to add reply")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) {
      toast.error("Please enter content")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/formulas/${formulaId}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent })
      })

      if (response.ok) {
        toast.success("Comment updated successfully")
        setEditingComment(null)
        setEditContent("")
        fetchComments()
      } else {
        toast.error("Failed to update comment")
      }
    } catch (error) {
      console.error("Error updating comment:", error)
      toast.error("Failed to update comment")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) {
      return
    }

    try {
      const response = await fetch(`/api/formulas/${formulaId}/comments/${commentId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        toast.success("Comment deleted successfully")
        fetchComments()
      } else {
        toast.error("Failed to delete comment")
      }
    } catch (error) {
      console.error("Error deleting comment:", error)
      toast.error("Failed to delete comment")
    }
  }

  const handleResolveComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/formulas/${formulaId}/comments/${commentId}/resolve`, {
        method: "POST"
      })

      if (response.ok) {
        toast.success("Comment marked as resolved")
        fetchComments()
      } else {
        toast.error("Failed to resolve comment")
      }
    } catch (error) {
      console.error("Error resolving comment:", error)
      toast.error("Failed to resolve comment")
    }
  }

  const getCommentTypeInfo = (type: string) => {
    return commentTypes.find(ct => ct.value === type) || commentTypes[0]
  }

  const getTimestamp = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  }

  const canEditComment = (comment: Comment) => {
    return session?.user?.id === comment.user.id || canModerate
  }

  const canDeleteComment = (comment: Comment) => {
    return session?.user?.id === comment.user.id || canModerate
  }

  const renderComment = (comment: Comment, isReply = false) => {
    const typeInfo = getCommentTypeInfo(comment.type)
    const TypeIcon = typeInfo.icon
    const isEditing = editingComment === comment.id

    return (
      <div key={comment.id} className={`${isReply ? "ml-12 mt-4" : ""}`}>
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={comment.user.avatar} />
            <AvatarFallback className="text-xs">
              {comment.user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{comment.user.name}</span>
              <Badge variant="outline" className="text-xs">
                {comment.user.role}
              </Badge>
              <Badge 
                variant="secondary" 
                className={`text-xs bg-${typeInfo.color}-100 text-${typeInfo.color}-800`}
              >
                <TypeIcon className="h-3 w-3 mr-1" />
                {typeInfo.label}
              </Badge>
              {comment.isPrivate && (
                <Badge variant="outline" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  Private
                </Badge>
              )}
              {comment.isResolved && (
                <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Resolved
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {getTimestamp(comment.createdAt)}
                {comment.isEdited && " (edited)"}
              </span>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Edit your comment..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleEditComment(comment.id)}
                    disabled={submitting}
                  >
                    Save Changes
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setEditingComment(null)
                      setEditContent("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{comment.content}</p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              {canComment && !isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReplyingTo(replyingTo === comment.id ? null : comment.id)
                    setReplyContent("")
                  }}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              )}

              {canEditComment(comment) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingComment(comment.id)
                    setEditContent(comment.content)
                  }}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}

              {canDeleteComment(comment) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteComment(comment.id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              )}

              {canModerate && (comment.type === "suggestion" || comment.type === "question") && !comment.isResolved && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResolveComment(comment.id)}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Mark Resolved
                </Button>
              )}
            </div>

            {replyingTo === comment.id && (
              <div className="mt-4 space-y-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={submitting || !replyContent.trim()}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setReplyingTo(null)
                      setReplyContent("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-4 space-y-4">
                {comment.replies.map(reply => renderComment(reply, true))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Discussion
            </CardTitle>
            <CardDescription>
              Collaborate and share feedback on "{formulaName}"
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Comments</SelectItem>
                {commentTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="replies">Most Replies</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {canComment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Comment Type</Label>
                <Select 
                  value={newComment.type} 
                  onValueChange={(value) => setNewComment(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {commentTypes.map(type => {
                      const Icon = type.icon
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={newComment.isPrivate}
                  onChange={(e) => setNewComment(prev => ({ ...prev, isPrivate: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="isPrivate" className="text-sm">
                  Private comment (visible only to formula owner)
                </Label>
              </div>
            </div>

            <div>
              <Textarea
                value={newComment.content}
                onChange={(e) => setNewComment(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Share your thoughts, suggestions, or questions..."
                rows={4}
              />
            </div>

            <Button 
              onClick={handleSubmitComment}
              disabled={submitting || !newComment.content.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Posting..." : "Post Comment"}
            </Button>
          </div>
        )}

        {!canComment && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              You need comment permissions to participate in this discussion. Contact the formula owner for access.
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-8 w-8 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-16 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No comments yet</h3>
            <p className="text-muted-foreground">
              {canComment 
                ? "Be the first to share your thoughts on this formula"
                : "No discussion has started for this formula yet"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map(comment => renderComment(comment))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}