"use client"

import { useRef, useState } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Upload, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Shield,
  File,
  Image,
  FileText,
  Music,
  Video
} from "lucide-react"
import { FormField } from "../FormRenderer"
import { cn } from "@/lib/utils"

interface FileUploadFieldProps {
  field: FormField
  value: any
  onChange: (value: any) => void
  error?: string
  disabled?: boolean
}

export function FileUploadField({ field, value, onChange, error, disabled }: FileUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return <Image className="h-5 w-5" />
    }
    if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension || '')) {
      return <FileText className="h-5 w-5" />
    }
    if (['mp3', 'wav', 'ogg', 'flac'].includes(extension || '')) {
      return <Music className="h-5 w-5" />
    }
    if (['mp4', 'avi', 'mov', 'wmv'].includes(extension || '')) {
      return <Video className="h-5 w-5" />
    }
    
    return <File className="h-5 w-5" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateFile = (file: File): string | null => {
    // Check file size
    if (field.validation?.maxFileSize && file.size > field.validation.maxFileSize) {
      return `File size must be less than ${formatFileSize(field.validation.maxFileSize)}`
    }

    // Check file type
    if (field.validation?.allowedExtensions) {
      const extension = "." + file.name.split(".").pop()?.toLowerCase()
      if (!field.validation.allowedExtensions.includes(extension)) {
        return `File type not allowed. Allowed types: ${field.validation.allowedExtensions.join(", ")}`
      }
    }

    // Check MIME type
    if (field.validation?.allowedMimeTypes) {
      if (!field.validation.allowedMimeTypes.includes(file.type)) {
        return `File type not allowed. Allowed types: ${field.validation.allowedMimeTypes.join(", ")}`
      }
    }

    return null
  }

  const handleFileSelect = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      alert(validationError)
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      // In a real implementation, you would upload to a server here
      // For now, we'll just simulate the upload and store the file object
      await new Promise(resolve => setTimeout(resolve, 1000))

      setUploadProgress(100)
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
        onChange({
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString()
        })
      }, 500)

    } catch (error) {
      console.error("Upload failed:", error)
      setIsUploading(false)
      setUploadProgress(0)
      alert("Upload failed. Please try again.")
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled || isUploading) return

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const removeFile = () => {
    onChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={field.id} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {field.metadata?.isHealthData && (
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Shield className="h-3 w-3" />
            PHI
          </Badge>
        )}
      </div>

      {field.description && (
        <p className="text-sm text-gray-600">{field.description}</p>
      )}

      {!value && !isUploading && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
            "hover:border-primary hover:bg-primary/5",
            dragActive && "border-primary bg-primary/10",
            error ? "border-red-500" : "border-gray-300",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleInputChange}
            accept={field.validation?.allowedExtensions?.join(",")}
            disabled={disabled}
          />
          
          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 mb-2">
            {dragActive 
              ? "Drop the file here" 
              : "Click to upload or drag and drop"
            }
          </p>
          
          {field.validation?.allowedExtensions && (
            <p className="text-xs text-gray-500 mb-1">
              Allowed: {field.validation.allowedExtensions.join(", ")}
            </p>
          )}
          
          {field.validation?.maxFileSize && (
            <p className="text-xs text-gray-500">
              Max size: {formatFileSize(field.validation.maxFileSize)}
            </p>
          )}
        </div>
      )}

      {isUploading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-blue-800">Uploading...</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-blue-600 mt-1">{uploadProgress}% complete</p>
        </div>
      )}
      
      {value && !isUploading && (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="text-green-600">
              {getFileIcon(value.name || value)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800 truncate">
                {value.name || value}
              </p>
              {value.size && (
                <p className="text-xs text-green-600">
                  {formatFileSize(value.size)}
                </p>
              )}
            </div>
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={removeFile}
            className="text-red-500 hover:text-red-700 ml-2"
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {field.validation?.multiple && (
        <p className="text-xs text-gray-500">
          You can upload multiple files
        </p>
      )}
    </div>
  )
}

export function MultipleFileUploadField({ field, value, onChange, error, disabled }: FileUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const files = Array.isArray(value) ? value : []

  const validateFile = (file: File): string | null => {
    if (field.validation?.maxFileSize && file.size > field.validation.maxFileSize) {
      return `File size must be less than ${Math.round(field.validation.maxFileSize / (1024 * 1024))}MB`
    }

    if (field.validation?.allowedExtensions) {
      const extension = "." + file.name.split(".").pop()?.toLowerCase()
      if (!field.validation.allowedExtensions.includes(extension)) {
        return `File type not allowed. Allowed types: ${field.validation.allowedExtensions.join(", ")}`
      }
    }

    return null
  }

  const handleFileSelect = (newFiles: FileList) => {
    const validFiles: any[] = []
    const errors: string[] = []

    Array.from(newFiles).forEach(file => {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else {
        validFiles.push({
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString()
        })
      }
    })

    if (errors.length > 0) {
      alert(errors.join('\n'))
    }

    if (validFiles.length > 0) {
      const maxFiles = field.validation?.maxFiles || 10
      const currentFiles = files.slice()
      const newFileList = [...currentFiles, ...validFiles].slice(0, maxFiles)
      onChange(newFileList)
    }
  }

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    onChange(newFiles.length > 0 ? newFiles : null)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled) return

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles) {
      handleFileSelect(droppedFiles)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label htmlFor={field.id} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {field.metadata?.isHealthData && (
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Shield className="h-3 w-3" />
            PHI
          </Badge>
        )}
      </div>

      {field.description && (
        <p className="text-sm text-gray-600">{field.description}</p>
      )}

      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
          "hover:border-primary hover:bg-primary/5",
          dragActive && "border-primary bg-primary/10",
          error ? "border-red-500" : "border-gray-300",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          accept={field.validation?.allowedExtensions?.join(",")}
          disabled={disabled}
        />
        
        <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 mb-1">
          {dragActive 
            ? "Drop files here" 
            : "Click to upload or drag and drop multiple files"
          }
        </p>
        
        {field.validation?.allowedExtensions && (
          <p className="text-xs text-gray-500">
            Allowed: {field.validation.allowedExtensions.join(", ")}
          </p>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Uploaded Files ({files.length}
            {field.validation?.maxFiles && ` / ${field.validation.maxFiles}`})
          </p>
          
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <File className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  {file.size && (
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="text-red-500 hover:text-red-700"
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}