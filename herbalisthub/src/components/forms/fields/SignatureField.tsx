"use client"

import { useRef, useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  PenTool, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Shield,
  Undo2,
  Download,
  Trash2
} from "lucide-react"
import { FormField } from "../FormRenderer"
import { cn } from "@/lib/utils"

interface SignatureFieldProps {
  field: FormField
  value: any
  onChange: (value: any) => void
  error?: string
  disabled?: boolean
}

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void
  onCancel: () => void
  initialSignature?: string
}

function SignatureCanvas({ onSave, onCancel, initialSignature }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(!initialSignature)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Set drawing style
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2

    // Load initial signature if provided
    if (initialSignature) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0)
        setIsEmpty(false)
      }
      img.src = initialSignature
    }
  }, [initialSignature])

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const touch = e.touches[0]
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    }
  }

  const startDrawing = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    setIsEmpty(false)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (x: number, y: number) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
  }

  const saveSignature = () => {
    if (isEmpty) return

    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')
    onSave(dataUrl)
  }

  const downloadSignature = () => {
    if (isEmpty) return

    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = 'signature.png'
    link.href = dataUrl
    link.click()
  }

  return (
    <div className="space-y-4">
      <div className="border border-gray-300 rounded-lg bg-white relative">
        <canvas
          ref={canvasRef}
          className="w-full h-48 cursor-crosshair rounded-lg"
          onMouseDown={(e) => {
            const pos = getMousePos(e)
            startDrawing(pos.x, pos.y)
          }}
          onMouseMove={(e) => {
            const pos = getMousePos(e)
            draw(pos.x, pos.y)
          }}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(e) => {
            e.preventDefault()
            const pos = getTouchPos(e)
            startDrawing(pos.x, pos.y)
          }}
          onTouchMove={(e) => {
            e.preventDefault()
            const pos = getTouchPos(e)
            draw(pos.x, pos.y)
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            stopDrawing()
          }}
        />
        
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-400 text-sm">Sign here</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearSignature}
            disabled={isEmpty}
          >
            <Undo2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadSignature}
            disabled={isEmpty}
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={saveSignature} disabled={isEmpty}>
            <CheckCircle className="h-4 w-4 mr-1" />
            Save Signature
          </Button>
        </div>
      </div>
    </div>
  )
}

export function SignatureField({ field, value, onChange, error, disabled }: SignatureFieldProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleSaveSignature = (dataUrl: string) => {
    onChange({
      dataUrl,
      timestamp: new Date().toISOString(),
      type: 'signature'
    })
    setIsDialogOpen(false)
  }

  const handleClearSignature = () => {
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={field.id} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Badge variant="outline" className="text-xs flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Legal Document
        </Badge>
      </div>

      {field.description && (
        <p className="text-sm text-gray-600">{field.description}</p>
      )}

      <Card className="p-4">
        {value ? (
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <img 
                src={value.dataUrl} 
                alt="Digital signature" 
                className="max-w-full h-auto max-h-32"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Signature captured</span>
              </div>
              
              <div className="flex gap-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={disabled}>
                      <PenTool className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Edit Digital Signature</DialogTitle>
                    </DialogHeader>
                    <SignatureCanvas
                      onSave={handleSaveSignature}
                      onCancel={() => setIsDialogOpen(false)}
                      initialSignature={value.dataUrl}
                    />
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSignature}
                  className="text-red-500 hover:text-red-700"
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {value.timestamp && (
              <p className="text-xs text-gray-500">
                Signed on {new Date(value.timestamp).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
              <PenTool className="h-8 w-8 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500 text-sm mb-3">
                {field.placeholder || "Digital signature required"}
              </p>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={disabled}>
                    <PenTool className="h-4 w-4 mr-2" />
                    Open Signature Pad
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Digital Signature</DialogTitle>
                  </DialogHeader>
                  <SignatureCanvas
                    onSave={handleSaveSignature}
                    onCancel={() => setIsDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </Card>

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>• By providing your digital signature, you acknowledge and agree to the terms</p>
        <p>• This signature has the same legal effect as a handwritten signature</p>
        <p>• Your signature is encrypted and securely stored</p>
      </div>
    </div>
  )
}

export function InitialsField({ field, value, onChange, error, disabled }: SignatureFieldProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleSaveInitials = (dataUrl: string) => {
    onChange({
      dataUrl,
      timestamp: new Date().toISOString(),
      type: 'initials'
    })
    setIsDialogOpen(false)
  }

  const handleClearInitials = () => {
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={field.id} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      </div>

      {field.description && (
        <p className="text-sm text-gray-600">{field.description}</p>
      )}

      <Card className="p-3">
        {value ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="border border-gray-200 rounded p-2 bg-gray-50">
                <img 
                  src={value.dataUrl} 
                  alt="Initials" 
                  className="h-8 w-auto"
                />
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Initials captured</span>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearInitials}
              className="text-red-500 hover:text-red-700"
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="text-center py-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={disabled}>
                  <PenTool className="h-4 w-4 mr-2" />
                  Add Initials
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Your Initials</DialogTitle>
                </DialogHeader>
                <SignatureCanvas
                  onSave={handleSaveInitials}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </Card>

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}