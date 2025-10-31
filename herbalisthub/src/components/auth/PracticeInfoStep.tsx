"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileUpload } from "@/components/forms/FileUpload"
import { 
  PracticeInfoInput, 
  RegistrationOptions,
  type FileUploadInput 
} from "@/lib/validation/registration"

interface PracticeInfoStepProps {
  data: Partial<PracticeInfoInput>
  onChange: (data: Partial<PracticeInfoInput>) => void
  errors: Record<string, string>
  onFileUpload: (files: FileUploadInput) => void
  disabled?: boolean
}

export function PracticeInfoStep({
  data,
  onChange,
  errors,
  onFileUpload,
  disabled = false
}: PracticeInfoStepProps) {
  const [newCertification, setNewCertification] = useState("")
  const [newSpecialty, setNewSpecialty] = useState("")

  const updateField = (field: keyof PracticeInfoInput, value: any) => {
    onChange({ ...data, [field]: value })
  }

  const updateAddressField = (field: string, value: string) => {
    const currentAddress = data.businessAddress || {}
    updateField("businessAddress", {
      ...currentAddress,
      [field]: value
    })
  }

  const addCertification = (cert: string) => {
    if (!cert.trim()) return
    const currentCerts = data.certifications || []
    if (!currentCerts.includes(cert) && currentCerts.length < 10) {
      updateField("certifications", [...currentCerts, cert])
    }
    setNewCertification("")
  }

  const removeCertification = (cert: string) => {
    const currentCerts = data.certifications || []
    updateField("certifications", currentCerts.filter(c => c !== cert))
  }

  const addSpecialty = (specialty: string) => {
    if (!specialty.trim()) return
    const currentSpecialties = data.specialties || []
    if (!currentSpecialties.includes(specialty) && currentSpecialties.length < 5) {
      updateField("specialties", [...currentSpecialties, specialty])
    }
    setNewSpecialty("")
  }

  const removeSpecialty = (specialty: string) => {
    const currentSpecialties = data.specialties || []
    updateField("specialties", currentSpecialties.filter(s => s !== specialty))
  }

  const handleLicenseUpload = (files: File[]) => {
    if (files.length > 0) {
      onFileUpload({
        licenseDocument: {
          file: files[0],
          fileName: files[0].name,
          fileSize: files[0].size,
        }
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Practice Information</h2>
        <p className="text-muted-foreground">
          Tell us about your herbal practice to complete your professional profile
        </p>
      </div>

      {/* License Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">License & Credentials</CardTitle>
          <CardDescription>
            Verify your professional credentials and licensing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">
                License Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="licenseNumber"
                placeholder="e.g., HL-2024-001"
                value={data.licenseNumber || ""}
                onChange={(e) => updateField("licenseNumber", e.target.value.toUpperCase())}
                disabled={disabled}
                className={errors.licenseNumber ? "border-red-500" : ""}
              />
              {errors.licenseNumber && (
                <p className="text-sm text-red-600">{errors.licenseNumber}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenseState">
                License State <span className="text-red-500">*</span>
              </Label>
              <Select
                value={data.licenseState || ""}
                onValueChange={(value) => updateField("licenseState", value)}
                disabled={disabled}
              >
                <SelectTrigger className={errors.licenseState ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {RegistrationOptions.states.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.licenseState && (
                <p className="text-sm text-red-600">{errors.licenseState}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="licenseExpiration">
              License Expiration Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="licenseExpiration"
              type="date"
              value={data.licenseExpiration || ""}
              onChange={(e) => updateField("licenseExpiration", e.target.value)}
              disabled={disabled}
              className={errors.licenseExpiration ? "border-red-500" : ""}
            />
            {errors.licenseExpiration && (
              <p className="text-sm text-red-600">{errors.licenseExpiration}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>License Document Upload</Label>
            <FileUpload
              accept=".pdf,.png,.jpg,.jpeg"
              maxSize={5 * 1024 * 1024}
              maxFiles={1}
              onFilesChange={handleLicenseUpload}
              disabled={disabled}
              label="Upload License Document"
              description="Upload a copy of your professional license (PDF, PNG, or JPEG)"
            />
          </div>
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Certifications</CardTitle>
          <CardDescription>
            Add your professional certifications and credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select
              value={newCertification}
              onValueChange={setNewCertification}
              disabled={disabled}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a certification" />
              </SelectTrigger>
              <SelectContent>
                {RegistrationOptions.certifications.map((cert) => (
                  <SelectItem key={cert} value={cert}>
                    {cert}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={() => addCertification(newCertification)}
              disabled={disabled || !newCertification || (data.certifications || []).length >= 10}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          <div className="space-y-2">
            <Input
              placeholder="Or enter a custom certification"
              value={newCertification}
              onChange={(e) => setNewCertification(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addCertification(newCertification)
                }
              }}
              disabled={disabled}
            />
          </div>

          {(data.certifications || []).length > 0 && (
            <div className="space-y-2">
              <Label>Selected Certifications</Label>
              <div className="flex flex-wrap gap-2">
                {(data.certifications || []).map((cert) => (
                  <Badge key={cert} variant="secondary" className="text-sm">
                    {cert}
                    {!disabled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                        onClick={() => removeCertification(cert)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {errors.certifications && (
            <p className="text-sm text-red-600">{errors.certifications}</p>
          )}
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Business Information</CardTitle>
          <CardDescription>
            Provide details about your herbal practice or business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">
              Business Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="businessName"
              placeholder="e.g., Green Valley Herbal Wellness"
              value={data.businessName || ""}
              onChange={(e) => updateField("businessName", e.target.value)}
              disabled={disabled}
              className={errors.businessName ? "border-red-500" : ""}
            />
            {errors.businessName && (
              <p className="text-sm text-red-600">{errors.businessName}</p>
            )}
          </div>

          <div className="space-y-4">
            <Label>Business Address <span className="text-red-500">*</span></Label>
            
            <div className="space-y-2">
              <Input
                placeholder="Street Address"
                value={data.businessAddress?.street || ""}
                onChange={(e) => updateAddressField("street", e.target.value)}
                disabled={disabled}
                className={errors["businessAddress.street"] ? "border-red-500" : ""}
              />
              {errors["businessAddress.street"] && (
                <p className="text-sm text-red-600">{errors["businessAddress.street"]}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <Input
                  placeholder="City"
                  value={data.businessAddress?.city || ""}
                  onChange={(e) => updateAddressField("city", e.target.value)}
                  disabled={disabled}
                  className={errors["businessAddress.city"] ? "border-red-500" : ""}
                />
                {errors["businessAddress.city"] && (
                  <p className="text-sm text-red-600">{errors["businessAddress.city"]}</p>
                )}
              </div>
              
              <div>
                <Select
                  value={data.businessAddress?.state || ""}
                  onValueChange={(value) => updateAddressField("state", value)}
                  disabled={disabled}
                >
                  <SelectTrigger className={errors["businessAddress.state"] ? "border-red-500" : ""}>
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {RegistrationOptions.states.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors["businessAddress.state"] && (
                  <p className="text-sm text-red-600">{errors["businessAddress.state"]}</p>
                )}
              </div>
              
              <div>
                <Input
                  placeholder="ZIP Code"
                  value={data.businessAddress?.zipCode || ""}
                  onChange={(e) => updateAddressField("zipCode", e.target.value)}
                  disabled={disabled}
                  className={errors["businessAddress.zipCode"] ? "border-red-500" : ""}
                />
                {errors["businessAddress.zipCode"] && (
                  <p className="text-sm text-red-600">{errors["businessAddress.zipCode"]}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website (Optional)</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://www.yourpractice.com"
              value={data.website || ""}
              onChange={(e) => updateField("website", e.target.value)}
              disabled={disabled}
              className={errors.website ? "border-red-500" : ""}
            />
            {errors.website && (
              <p className="text-sm text-red-600">{errors.website}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Professional Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Professional Details</CardTitle>
          <CardDescription>
            Optional information to help clients understand your expertise
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Specialties */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                value={newSpecialty}
                onValueChange={setNewSpecialty}
                disabled={disabled}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a specialty" />
                </SelectTrigger>
                <SelectContent>
                  {RegistrationOptions.specialties.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={() => addSpecialty(newSpecialty)}
                disabled={disabled || !newSpecialty || (data.specialties || []).length >= 5}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {(data.specialties || []).length > 0 && (
              <div className="space-y-2">
                <Label>Specialties</Label>
                <div className="flex flex-wrap gap-2">
                  {(data.specialties || []).map((specialty) => (
                    <Badge key={specialty} variant="outline" className="text-sm">
                      {specialty}
                      {!disabled && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                          onClick={() => removeSpecialty(specialty)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="yearsExperience">Years of Experience</Label>
            <Input
              id="yearsExperience"
              type="number"
              min="0"
              max="50"
              placeholder="e.g., 5"
              value={data.yearsExperience || ""}
              onChange={(e) => updateField("yearsExperience", parseInt(e.target.value) || 0)}
              disabled={disabled}
              className={errors.yearsExperience ? "border-red-500" : ""}
            />
            {errors.yearsExperience && (
              <p className="text-sm text-red-600">{errors.yearsExperience}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="professionalBio">Professional Bio</Label>
            <Textarea
              id="professionalBio"
              placeholder="Tell potential clients about your background, approach, and expertise..."
              value={data.professionalBio || ""}
              onChange={(e) => updateField("professionalBio", e.target.value)}
              disabled={disabled}
              rows={4}
              maxLength={1000}
              className={errors.professionalBio ? "border-red-500" : ""}
            />
            <div className="text-xs text-muted-foreground text-right">
              {(data.professionalBio || "").length}/1000 characters
            </div>
            {errors.professionalBio && (
              <p className="text-sm text-red-600">{errors.professionalBio}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}