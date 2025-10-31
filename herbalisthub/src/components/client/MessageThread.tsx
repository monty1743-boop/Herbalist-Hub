"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  Paperclip,
  Smile,
  Shield,
  Lock,
  CheckCircle,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Phone,
  Video
} from "lucide-react"
import { MessageComposer } from "./MessageComposer"
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns"
import { toast } from "sonner"

interface MessageThreadProps {
  userId: string
}

interface Conversation {
  id: string
  participants: Array<{
    id: string
    name: string
    role: string
    image?: string
    isOnline: boolean
    lastSeen?: Date
  }>
  lastMessage?: {
    id: string
    content: string
    senderId: string
    timestamp: Date
    isEncrypted: boolean
  }
  unreadCount: number
  isPinned: boolean
  isArchived: boolean
  createdAt: Date
}

interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  timestamp: Date
  isEncrypted: boolean
  encryptionData?: {
    encryptedMessage: string
    encryptedKey: string
    iv: string
  }
  status: "sending" | "sent" | "delivered" | "read" | "failed"
  attachments?: Array<{
    id: string
    name: string
    type: string
    size: number
    url?: string
  }>
  replyTo?: {
    id: string
    content: string
    senderName: string
  }
  isEdited: boolean
  editedAt?: Date
}

export function MessageThread({ userId }: MessageThreadProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isComposing, setIsComposing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConversations()
  }, [userId])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchConversations = async () => {
    try {
      // Mock data for now - replace with actual API call
      setTimeout(() => {
        const mockConversations: Conversation[] = [
          {
            id: "conv1",
            participants: [
              {
                id: userId,
                name: "You",
                role: "CLIENT",
                isOnline: true
              },
              {
                id: "dr1",
                name: "Dr. Sarah Chen",
                role: "HERBALIST",
                image: "/avatars/dr-chen.jpg",
                isOnline: true,
                lastSeen: new Date()
              }
            ],
            lastMessage: {
              id: "msg3",
              content: "Your lab results look great! The herbal protocol is working well.",
              senderId: "dr1",
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
              isEncrypted: true
            },
            unreadCount: 1,
            isPinned: true,
            isArchived: false,
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          },
          {
            id: "conv2",
            participants: [
              {
                id: userId,
                name: "You",
                role: "CLIENT",
                isOnline: true
              },
              {
                id: "dr2",
                name: "Dr. Michael Torres",
                role: "HERBALIST",
                image: "/avatars/dr-torres.jpg",
                isOnline: false,
                lastSeen: new Date(Date.now() - 4 * 60 * 60 * 1000)
              }
            ],
            lastMessage: {
              id: "msg2",
              content: "Thanks for the update on your symptoms. Let's schedule a follow-up.",
              senderId: "dr2",
              timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
              isEncrypted: true
            },
            unreadCount: 0,
            isPinned: false,
            isArchived: false,
            createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
          }
        ]
        
        setConversations(mockConversations)
        setLoading(false)
        
        // Auto-select first conversation
        if (mockConversations.length > 0) {
          setSelectedConversation(mockConversations[0].id)
        }
      }, 600)
    } catch (error) {
      console.error("Error fetching conversations:", error)
      setLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    setLoadingMessages(true)
    try {
      // Mock data for now - replace with actual API call
      setTimeout(() => {
        const mockMessages: Message[] = [
          {
            id: "msg1",
            conversationId,
            senderId: userId,
            content: "Hi Dr. Chen, I wanted to update you on my progress. I've been feeling much better over the past week.",
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            isEncrypted: true,
            status: "read",
            isEdited: false
          },
          {
            id: "msg2",
            conversationId,
            senderId: "dr1",
            content: "That's wonderful to hear! Can you tell me more about the specific improvements you've noticed?",
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
            isEncrypted: true,
            status: "read",
            isEdited: false
          },
          {
            id: "msg3",
            conversationId,
            senderId: userId,
            content: "My energy levels are much more stable throughout the day. I'm not experiencing the afternoon crashes anymore. Also, my digestive issues have improved significantly - less bloating and discomfort after meals.",
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            isEncrypted: true,
            status: "read",
            isEdited: false
          },
          {
            id: "msg4",
            conversationId,
            senderId: "dr1",
            content: "Your lab results look great! The herbal protocol is working well. Let's continue with the current formulas for another month and then reassess.",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            isEncrypted: true,
            status: "delivered",
            isEdited: false
          }
        ]
        
        setMessages(mockMessages.filter(m => m.conversationId === conversationId))
        setLoadingMessages(false)
      }, 400)
    } catch (error) {
      console.error("Error fetching messages:", error)
      setLoadingMessages(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!selectedConversation || !content.trim()) return

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: selectedConversation,
      senderId: userId,
      content: content.trim(),
      timestamp: new Date(),
      isEncrypted: true,
      status: "sending",
      isEdited: false
    }

    // Optimistically add message to UI
    setMessages(prev => [...prev, tempMessage])

    try {
      // In production, this would encrypt the message and send to API
      // For now, simulate successful sending
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id 
              ? { ...msg, id: `msg-${Date.now()}`, status: "sent" as const }
              : msg
          )
        )
        
        // Update conversation last message
        setConversations(prev =>
          prev.map(conv =>
            conv.id === selectedConversation
              ? {
                  ...conv,
                  lastMessage: {
                    id: `msg-${Date.now()}`,
                    content: content.trim(),
                    senderId: userId,
                    timestamp: new Date(),
                    isEncrypted: true
                  }
                }
              : conv
          )
        )
        
        toast.success("Message sent securely")
      }, 1000)
    } catch (error) {
      console.error("Error sending message:", error)
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, status: "failed" as const }
            : msg
        )
      )
      toast.error("Failed to send message")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sending":
        return <Clock className="h-3 w-3 text-gray-400" />
      case "sent":
        return <CheckCircle className="h-3 w-3 text-gray-400" />
      case "delivered":
        return <CheckCircle className="h-3 w-3 text-blue-500" />
      case "read":
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case "failed":
        return <AlertCircle className="h-3 w-3 text-red-500" />
      default:
        return null
    }
  }

  const formatMessageTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, "h:mm a")
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "h:mm a")}`
    } else {
      return format(date, "MMM d, h:mm a")
    }
  }

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => p.id !== userId)
  }

  const filteredConversations = conversations.filter(conv => {
    const otherParticipant = getOtherParticipant(conv)
    return otherParticipant?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           conv.lastMessage?.content.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const selectedConv = conversations.find(c => c.id === selectedConversation)
  const otherParticipant = selectedConv ? getOtherParticipant(selectedConv) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" text="Loading conversations..." />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-white rounded-lg border overflow-hidden">
      {/* Conversations Sidebar */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Messages
            </h2>
            <Button size="sm" onClick={() => setIsComposing(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => {
            const participant = getOtherParticipant(conversation)
            if (!participant) return null

            return (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation === conversation.id ? "bg-blue-50 border-blue-200" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={participant.image} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {participant.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {participant.isOnline && (
                      <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{participant.name}</p>
                      <div className="flex items-center gap-1">
                        {conversation.isPinned && (
                          <div className="h-1 w-1 bg-blue-500 rounded-full" />
                        )}
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 mt-1">
                      {conversation.lastMessage?.isEncrypted && (
                        <Lock className="h-3 w-3 text-green-600" />
                      )}
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.lastMessage?.content || "No messages yet"}
                      </p>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-1">
                      {conversation.lastMessage 
                        ? formatDistanceToNow(conversation.lastMessage.timestamp, { addSuffix: true })
                        : formatDistanceToNow(conversation.createdAt, { addSuffix: true })
                      }
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 flex flex-col">
        {selectedConversation && otherParticipant ? (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={otherParticipant.image} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {otherParticipant.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{otherParticipant.name}</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3 text-green-600" />
                        <span className="text-xs text-green-600">End-to-end encrypted</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {otherParticipant.isOnline 
                          ? "Online now" 
                          : `Last seen ${formatDistanceToNow(otherParticipant.lastSeen!, { addSuffix: true })}`
                        }
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" text="Loading messages..." />
                </div>
              ) : messages.length > 0 ? (
                messages.map((message) => {
                  const isOwn = message.senderId === userId
                  const participant = selectedConv?.participants.find(p => p.id === message.senderId)
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      {!isOwn && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={participant?.image} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {participant?.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className={`max-w-md ${isOwn ? "text-right" : "text-left"}`}>
                        <div
                          className={`inline-block p-3 rounded-lg ${
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          {message.isEncrypted && (
                            <div className="flex items-center gap-1 mt-2 opacity-70">
                              <Lock className="h-3 w-3" />
                              <span className="text-xs">Encrypted</span>
                            </div>
                          )}
                        </div>
                        
                        <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${
                          isOwn ? "justify-end" : "justify-start"
                        }`}>
                          <span>{formatMessageTime(message.timestamp)}</span>
                          {isOwn && getStatusIcon(message.status)}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No messages yet</p>
                    <p className="text-sm">Start a conversation below</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer */}
            <div className="border-t border-gray-200 p-4">
              <MessageComposer
                onSend={handleSendMessage}
                disabled={loadingMessages}
                placeholder={`Send a secure message to ${otherParticipant.name}...`}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p>Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Compose New Message Modal would go here */}
      {isComposing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>New Message</CardTitle>
              <CardDescription>Start a new secure conversation</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                New message composition will be implemented in a future update.
              </p>
              <Button 
                onClick={() => setIsComposing(false)} 
                className="mt-4 w-full"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}