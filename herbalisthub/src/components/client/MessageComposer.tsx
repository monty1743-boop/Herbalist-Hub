"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Send,
  Paperclip,
  Smile,
  Bold,
  Italic,
  Link,
  Image,
  FileText,
  X
} from "lucide-react"
import { toast } from "sonner"

interface MessageComposerProps {
  onSend: (content: string, attachments?: File[]) => Promise<void>
  disabled?: boolean
  placeholder?: string
  maxLength?: number
}

export function MessageComposer({ 
  onSend, 
  disabled = false, 
  placeholder = "Type a message...",
  maxLength = 2000
}: MessageComposerProps) {
  const [content, setContent] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [isSending, setIsSending] = useState(false)
  const [showFormatting, setShowFormatting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = async () => {
    if (!content.trim() && attachments.length === 0) return
    if (content.length > maxLength) {
      toast.error(`Message too long. Maximum ${maxLength} characters allowed.`)
      return
    }

    setIsSending(true)
    try {
      await onSend(content, attachments.length > 0 ? attachments : undefined)
      setContent("")
      setAttachments([])
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast.error("Failed to send message")
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const maxFileSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]

    const validFiles = files.filter(file => {
      if (file.size > maxFileSize) {
        toast.error(`File "${file.name}" is too large. Maximum size is 10MB.`)
        return false
      }
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File type "${file.type}" is not allowed.`)
        return false
      }
      return true
    })

    if (attachments.length + validFiles.length > 5) {
      toast.error("Maximum 5 files allowed per message.")
      return
    }

    setAttachments(prev => [...prev, ...validFiles])
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const insertFormatting = (format: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    
    let formattedText = ""
    switch (format) {
      case "bold":
        formattedText = `**${selectedText || "bold text"}**`
        break
      case "italic":
        formattedText = `*${selectedText || "italic text"}*`
        break
      case "link":
        formattedText = `[${selectedText || "link text"}](url)`
        break
      default:
        return
    }

    const newContent = content.substring(0, start) + formattedText + content.substring(end)
    setContent(newContent)

    // Focus back to textarea and set cursor position
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + formattedText.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const handleTextareaResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    setContent(textarea.value)
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return <Image className="h-4 w-4" />
    } else {
      return <FileText className="h-4 w-4" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-3">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm"
            >
              {getFileIcon(file.type)}
              <span className="truncate max-w-32">{file.name}</span>
              <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeAttachment(index)}
                className="h-4 w-4 p-0 hover:bg-red-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Message Input */}
      <div className="border border-gray-200 rounded-lg focus-within:border-primary transition-colors">
        {/* Formatting Toolbar */}
        {showFormatting && (
          <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting("bold")}
              className="h-8 w-8 p-0"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting("italic")}
              className="h-8 w-8 p-0"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting("link")}
              className="h-8 w-8 p-0"
            >
              <Link className="h-4 w-4" />
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowFormatting(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextareaResize}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          className="border-0 resize-none focus-visible:ring-0 min-h-[2.5rem] max-h-[120px]"
          style={{ height: "auto" }}
        />

        {/* Bottom Toolbar */}
        <div className="flex items-center justify-between p-2 bg-gray-50">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isSending}
              className="h-8 w-8 p-0"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowFormatting(!showFormatting)}
              disabled={disabled || isSending}
              className="h-8 w-8 p-0"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {content.length}/{maxLength}
            </span>
            <Button
              type="button"
              onClick={handleSend}
              disabled={disabled || isSending || (!content.trim() && attachments.length === 0) || content.length > maxLength}
              size="sm"
              className="h-8"
            >
              {isSending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-500">
        Press Enter to send, Shift+Enter for new line. Messages are encrypted end-to-end.
      </p>
    </div>
  )
}