"use client"

import { useState, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { 
  Upload, 
  File, 
  FileText, 
  Image, 
  X, 
  Check,
  AlertCircle,
  Download 
} from "lucide-react"

interface FileUploadProps {
  accept?: string
  maxSize?: number // in bytes
  maxFiles?: number
  onFilesChange: (files: File[]) => void
  error?: string
  disabled?: boolean
  className?: string
  label?: string
  description?: string
  required?: boolean
  value?: File[]
  multiple?: boolean
}

interface UploadedFile extends File {
  id: string
  preview?: string
  progress?: number
  status?: "uploading" | "success" | "error"
  error?: string
}

export function FileUpload({
  accept = ".pdf,.png,.jpg,.jpeg",
  maxSize = 5 * 1024 * 1024, // 5MB default
  maxFiles = 1,
  onFilesChange,
  error,
  disabled = false,
  className,
  label,
  description,
  required = false,
  value = [],
  multiple = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadError, setUploadError] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return <FileText className="h-8 w-8 text-red-500" />
    if (fileType.includes("image")) return <Image className="h-8 w-8 text-blue-500" />
    return <File className="h-8 w-8 text-gray-500" />
  }

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size must be less than ${formatFileSize(maxSize)}`
    }

    // Check file type
    const acceptedTypes = accept.split(",").map(type => type.trim())
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
    const mimeTypeAccepted = acceptedTypes.some(type => {
      if (type.startsWith(".")) {
        return type === fileExtension
      }
      return file.type.match(new RegExp(type.replace("*", ".*")))
    })

    if (!mimeTypeAccepted) {
      return `File type not supported. Accepted types: ${accept}`
    }

    return null
  }

  const processFiles = useCallback((newFiles: FileList | File[]) => {
    setUploadError("")
    const fileArray = Array.from(newFiles)
    
    // Check file count
    if (files.length + fileArray.length > maxFiles) {
      setUploadError(`Maximum ${maxFiles} file${maxFiles > 1 ? "s" : ""} allowed`)
      return
    }

    const validFiles: UploadedFile[] = []
    const errors: string[] = []

    fileArray.forEach(file => {
      const validationError = validateFile(file)
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`)
      } else {
        const uploadedFile: UploadedFile = {
          ...file,
          id: Math.random().toString(36).substr(2, 9),
          status: "success",
        }

        // Create preview for images
        if (file.type.startsWith("image/")) {
          const reader = new FileReader()
          reader.onload = (e) => {
            uploadedFile.preview = e.target?.result as string
            setFiles(prev => 
              prev.map(f => f.id === uploadedFile.id ? uploadedFile : f)
            )
          }
          reader.readAsDataURL(file)
        }

        validFiles.push(uploadedFile)
      }
    })

    if (errors.length > 0) {
      setUploadError(errors.join("; "))
    }

    if (validFiles.length > 0) {
      const updatedFiles = multiple ? [...files, ...validFiles] : validFiles
      setFiles(updatedFiles)
      onFilesChange(updatedFiles)
    }
  }, [files, maxFiles, maxSize, accept, multiple, onFilesChange])

  const removeFile = (fileId: string) => {
    const updatedFiles = files.filter(f => f.id !== fileId)
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (disabled) return

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles)
    }
    // Reset input value to allow selecting same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {label && (
        <div className="space-y-1">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      {/* File Drop Zone */}
      <Card
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragOver && !disabled
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25",
          disabled && "opacity-50 cursor-not-allowed",
          error && "border-red-500"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
          <Upload className={cn(
            "h-10 w-10 mb-4 text-muted-foreground",
            isDragOver && "text-primary"
          )} />
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {isDragOver ? "Drop files here" : "Click to upload or drag and drop"}
            </p>
            <p className="text-xs text-muted-foreground">
              {accept} files up to {formatFileSize(maxSize)}
              {maxFiles > 1 && ` (max ${maxFiles} files)`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        disabled={disabled}
        className="hidden"
      />

      {/* Error Display */}
      {(error || uploadError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || uploadError}</AlertDescription>
        </Alert>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploaded Files</h4>
          <div className="space-y-2">
            {files.map((file) => (
              <Card key={file.id} className="p-3">
                <div className="flex items-center space-x-3">
                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="h-8 w-8 object-cover rounded"
                      />
                    ) : (
                      getFileIcon(file.type)
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex items-center space-x-2">
                    {file.status === "uploading" && file.progress !== undefined && (
                      <div className="w-16">
                        <Progress value={file.progress} className="h-2" />
                      </div>
                    )}
                    
                    {file.status === "success" && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    
                    {file.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}

                    {/* Remove Button */}
                    {!disabled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(file.id)
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Error Message */}
                {file.status === "error" && file.error && (
                  <p className="text-xs text-red-500 mt-2">{file.error}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}