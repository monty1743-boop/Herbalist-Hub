"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { PracticeInfoStep } from "./PracticeInfoStep"
import { 
  herbalistRegistrationSchema,
  clientRegistrationSchema,
  publicRegistrationSchema,
  type RegistrationInput,
  type PracticeInfoInput,
  type ConsentInput,
  type FileUploadInput
} from "@/lib/validation/registration"
import { Role } from "@prisma/client"
import { ChevronLeft, ChevronRight, Check, FileText, Shield, User, Building } from "lucide-react"

interface RegistrationFormProps {
  initialRole?: Role
}

export function RegistrationForm({ initialRole }: RegistrationFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  // Form data state
  const [formData, setFormData] = useState({
    // Base registration data
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: initialRole || Role.CLIENT,
    phone: "",
    
    // Practice information (for herbalists)
    practiceInfo: {} as Partial<PracticeInfoInput>,
    
    // Client information (for clients)
    dateOfBirth: "",
    emergencyContact: {
      name: "",
      phone: "",
      relationship: "",
    },
    
    // Consent and terms
    consent: {
      termsOfService: false,
      privacyPolicy: false,
      hipaaConsent: false,
      communicationConsent: false,
      dataProcessingConsent: false,
    } as ConsentInput,
  })

  const [uploadedFiles, setUploadedFiles] = useState<FileUploadInput>({})

  const totalSteps = formData.role === Role.HERBALIST ? 4 : 3
  const progress = (currentStep / totalSteps) * 100

  const getStepIcon = (step: number) => {
    if (step < currentStep) return <Check className="h-4 w-4" />
    switch (step) {
      case 1: return <User className="h-4 w-4" />
      case 2: return formData.role === Role.HERBALIST ? <Building className="h-4 w-4" /> : <FileText className="h-4 w-4" />
      case 3: return formData.role === Role.HERBALIST ? <FileText className="h-4 w-4" /> : <Shield className="h-4 w-4" />
      case 4: return <Shield className="h-4 w-4" />
      default: return <div className="h-4 w-4 rounded-full bg-muted" />
    }
  }

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    setFieldErrors({}) // Clear errors when user makes changes
  }

  const updatePracticeInfo = (practiceInfo: Partial<PracticeInfoInput>) => {
    updateFormData({ practiceInfo: { ...formData.practiceInfo, ...practiceInfo } })
  }

  const updateConsent = (field: keyof ConsentInput, value: boolean) => {
    updateFormData({
      consent: { ...formData.consent, [field]: value }
    })
  }

  const handleFileUpload = (files: FileUploadInput) => {
    setUploadedFiles(prev => ({ ...prev, ...files }))
  }

  const validateCurrentStep = (): boolean => {
    setFieldErrors({})
    
    switch (currentStep) {
      case 1: // Basic information
        const baseErrors: Record<string, string> = {}
        if (!formData.name.trim()) baseErrors.name = "Name is required"
        if (!formData.email.trim()) baseErrors.email = "Email is required"
        if (!formData.password) baseErrors.password = "Password is required"
        if (formData.password !== formData.confirmPassword) {
          baseErrors.confirmPassword = "Passwords don't match"
        }
        
        if (Object.keys(baseErrors).length > 0) {
          setFieldErrors(baseErrors)
          return false
        }
        break

      case 2: // Role-specific information
        if (formData.role === Role.HERBALIST) {
          // Validate practice info
          const practiceResult = herbalistRegistrationSchema.shape.practiceInfo.safeParse(formData.practiceInfo)
          if (!practiceResult.success) {
            const practiceErrors: Record<string, string> = {}
            practiceResult.error.errors.forEach(error => {
              const field = error.path.join(".")
              practiceErrors[field] = error.message
            })
            setFieldErrors(practiceErrors)
            return false
          }
        } else if (formData.role === Role.CLIENT) {
          // Validate client info if provided
          const clientErrors: Record<string, string> = {}
          if (formData.emergencyContact.name && !formData.emergencyContact.phone) {
            clientErrors["emergencyContact.phone"] = "Phone is required for emergency contact"
          }
          if (Object.keys(clientErrors).length > 0) {
            setFieldErrors(clientErrors)
            return false
          }
        }
        break

      case 3: // Terms and consent (for non-herbalists) or verification (for herbalists)
        if (formData.role !== Role.HERBALIST) {
          const consentErrors: Record<string, string> = {}
          if (!formData.consent.termsOfService) consentErrors.termsOfService = "You must accept the Terms of Service"
          if (!formData.consent.privacyPolicy) consentErrors.privacyPolicy = "You must accept the Privacy Policy"
          if (!formData.consent.dataProcessingConsent) consentErrors.dataProcessingConsent = "Data processing consent is required"
          
          if (Object.keys(consentErrors).length > 0) {
            setFieldErrors(consentErrors)
            return false
          }
        }
        break

      case 4: // Final consent for herbalists
        if (formData.role === Role.HERBALIST) {
          const consentErrors: Record<string, string> = {}
          if (!formData.consent.termsOfService) consentErrors.termsOfService = "You must accept the Terms of Service"
          if (!formData.consent.privacyPolicy) consentErrors.privacyPolicy = "You must accept the Privacy Policy"
          if (!formData.consent.hipaaConsent) consentErrors.hipaaConsent = "HIPAA consent is required"
          if (!formData.consent.dataProcessingConsent) consentErrors.dataProcessingConsent = "Data processing consent is required"
          
          if (Object.keys(consentErrors).length > 0) {
            setFieldErrors(consentErrors)
            return false
          }
        }
        break
    }

    return true
  }

  const nextStep = () => {
    if (validateCurrentStep() && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return

    setIsLoading(true)
    setError("")

    try {
      // Prepare registration data based on role
      let registrationData: RegistrationInput

      if (formData.role === Role.HERBALIST) {
        registrationData = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          role: formData.role,
          phone: formData.phone,
          practiceInfo: formData.practiceInfo as PracticeInfoInput,
          consent: formData.consent,
        }
      } else if (formData.role === Role.CLIENT) {
        registrationData = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          role: formData.role,
          phone: formData.phone,
          consent: formData.consent,
          dateOfBirth: formData.dateOfBirth || undefined,
          emergencyContact: formData.emergencyContact.name ? formData.emergencyContact : undefined,
        }
      } else {
        registrationData = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          role: formData.role,
          phone: formData.phone,
          consent: formData.consent,
        }
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.details) {
          const errors: Record<string, string> = {}
          data.details.forEach((error: any) => {
            if (error.path.length > 0) {
              errors[error.path.join(".")] = error.message
            }
          })
          setFieldErrors(errors)
        } else {
          setError(data.error || "Registration failed")
        }
        return
      }

      setSuccess(true)
      // Redirect to verification page after a brief delay
      setTimeout(() => {
        router.push("/auth/verify-email")
      }, 2000)
    } catch (error) {
      setError("An error occurred during registration")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-green-600">Registration Successful!</CardTitle>
          <CardDescription>
            Please check your email for verification instructions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>
              We've sent a verification email to {formData.email}. Please click the link in the email to verify your account and complete the registration process.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Create Your Account</h2>
              <p className="text-muted-foreground">
                Let's start with your basic information
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  disabled={isLoading}
                  className={fieldErrors.name ? "border-red-500" : ""}
                />
                {fieldErrors.name && (
                  <p className="text-sm text-red-600">{fieldErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => updateFormData({ email: e.target.value })}
                  disabled={isLoading}
                  className={fieldErrors.email ? "border-red-500" : ""}
                />
                {fieldErrors.email && (
                  <p className="text-sm text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => updateFormData({ phone: e.target.value })}
                  disabled={isLoading}
                  className={fieldErrors.phone ? "border-red-500" : ""}
                />
                {fieldErrors.phone && (
                  <p className="text-sm text-red-600">{fieldErrors.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Account Type</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => updateFormData({ role: value as Role })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Role.CLIENT}>
                      <div className="flex flex-col">
                        <span>Client</span>
                        <span className="text-xs text-muted-foreground">Seeking herbal consultations</span>
                      </div>
                    </SelectItem>
                    <SelectItem value={Role.HERBALIST}>
                      <div className="flex flex-col">
                        <span>Herbalist</span>
                        <span className="text-xs text-muted-foreground">Licensed herbal practitioner</span>
                      </div>
                    </SelectItem>
                    <SelectItem value={Role.PUBLIC}>
                      <div className="flex flex-col">
                        <span>Public User</span>
                        <span className="text-xs text-muted-foreground">Browse educational content</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.role && (
                  <p className="text-sm text-red-600">{fieldErrors.role}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => updateFormData({ password: e.target.value })}
                  disabled={isLoading}
                  className={fieldErrors.password ? "border-red-500" : ""}
                />
                {fieldErrors.password && (
                  <p className="text-sm text-red-600">{fieldErrors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData({ confirmPassword: e.target.value })}
                  disabled={isLoading}
                  className={fieldErrors.confirmPassword ? "border-red-500" : ""}
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-sm text-red-600">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>
          </div>
        )

      case 2:
        if (formData.role === Role.HERBALIST) {
          return (
            <PracticeInfoStep
              data={formData.practiceInfo}
              onChange={updatePracticeInfo}
              errors={fieldErrors}
              onFileUpload={handleFileUpload}
              disabled={isLoading}
            />
          )
        } else {
          // Client or Public additional info step
          return (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Additional Information</h2>
                <p className="text-muted-foreground">
                  {formData.role === Role.CLIENT 
                    ? "Help us provide better care with some optional details"
                    : "Almost done! Just a few more details"
                  }
                </p>
              </div>

              {formData.role === Role.CLIENT && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Personal Information</CardTitle>
                    <CardDescription>Optional information for better care</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth (Optional)</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => updateFormData({ dateOfBirth: e.target.value })}
                        disabled={isLoading}
                        className={fieldErrors.dateOfBirth ? "border-red-500" : ""}
                      />
                      {fieldErrors.dateOfBirth && (
                        <p className="text-sm text-red-600">{fieldErrors.dateOfBirth}</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <Label>Emergency Contact (Optional)</Label>
                      <div className="grid gap-2">
                        <Input
                          placeholder="Emergency contact name"
                          value={formData.emergencyContact.name}
                          onChange={(e) => updateFormData({
                            emergencyContact: { ...formData.emergencyContact, name: e.target.value }
                          })}
                          disabled={isLoading}
                          className={fieldErrors["emergencyContact.name"] ? "border-red-500" : ""}
                        />
                        <Input
                          placeholder="Emergency contact phone"
                          value={formData.emergencyContact.phone}
                          onChange={(e) => updateFormData({
                            emergencyContact: { ...formData.emergencyContact, phone: e.target.value }
                          })}
                          disabled={isLoading}
                          className={fieldErrors["emergencyContact.phone"] ? "border-red-500" : ""}
                        />
                        <Input
                          placeholder="Relationship (e.g., spouse, parent)"
                          value={formData.emergencyContact.relationship}
                          onChange={(e) => updateFormData({
                            emergencyContact: { ...formData.emergencyContact, relationship: e.target.value }
                          })}
                          disabled={isLoading}
                          className={fieldErrors["emergencyContact.relationship"] ? "border-red-500" : ""}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )
        }

      case 3:
        if (formData.role === Role.HERBALIST) {
          // Document verification step for herbalists
          return (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Document Verification</h2>
                <p className="text-muted-foreground">
                  Upload your professional credentials for verification
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Professional Documents</CardTitle>
                  <CardDescription>
                    These documents help verify your professional credentials
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      Document verification may take 1-3 business days. You'll receive email updates on the status.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          )
        } else {
          // Terms and consent for non-herbalists
          return renderConsentStep()
        }

      case 4:
        // Final consent step for herbalists
        return renderConsentStep()

      default:
        return null
    }
  }

  const renderConsentStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Terms and Consent</h2>
        <p className="text-muted-foreground">
          Please review and accept our terms to complete registration
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Legal Agreements</CardTitle>
          <CardDescription>
            Required agreements for using HerbalistHub
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="termsOfService"
                checked={formData.consent.termsOfService}
                onCheckedChange={(checked) => updateConsent("termsOfService", checked as boolean)}
                disabled={isLoading}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="termsOfService"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I accept the <a href="/terms" className="text-primary hover:underline" target="_blank">Terms of Service</a>
                </Label>
                {fieldErrors.termsOfService && (
                  <p className="text-sm text-red-600">{fieldErrors.termsOfService}</p>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="privacyPolicy"
                checked={formData.consent.privacyPolicy}
                onCheckedChange={(checked) => updateConsent("privacyPolicy", checked as boolean)}
                disabled={isLoading}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="privacyPolicy"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I accept the <a href="/privacy" className="text-primary hover:underline" target="_blank">Privacy Policy</a>
                </Label>
                {fieldErrors.privacyPolicy && (
                  <p className="text-sm text-red-600">{fieldErrors.privacyPolicy}</p>
                )}
              </div>
            </div>

            {formData.role === Role.HERBALIST && (
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="hipaaConsent"
                  checked={formData.consent.hipaaConsent}
                  onCheckedChange={(checked) => updateConsent("hipaaConsent", checked as boolean)}
                  disabled={isLoading}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="hipaaConsent"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I consent to HIPAA-compliant handling of health information
                  </Label>
                  {fieldErrors.hipaaConsent && (
                    <p className="text-sm text-red-600">{fieldErrors.hipaaConsent}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-start space-x-2">
              <Checkbox
                id="dataProcessingConsent"
                checked={formData.consent.dataProcessingConsent}
                onCheckedChange={(checked) => updateConsent("dataProcessingConsent", checked as boolean)}
                disabled={isLoading}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="dataProcessingConsent"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I consent to the processing of my personal data as described in the Privacy Policy
                </Label>
                {fieldErrors.dataProcessingConsent && (
                  <p className="text-sm text-red-600">{fieldErrors.dataProcessingConsent}</p>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="communicationConsent"
                checked={formData.consent.communicationConsent}
                onCheckedChange={(checked) => updateConsent("communicationConsent", checked as boolean)}
                disabled={isLoading}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="communicationConsent"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I would like to receive promotional emails and updates (optional)
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Progress Indicator */}
      <div className="space-y-4">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
        
        {/* Step indicators */}
        <div className="flex justify-between">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
            <div
              key={step}
              className={`flex items-center space-x-2 ${
                step <= currentStep ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  step < currentStep
                    ? "bg-primary border-primary text-primary-foreground"
                    : step === currentStep
                    ? "border-primary"
                    : "border-muted"
                }`}
              >
                {getStepIcon(step)}
              </div>
              <span className="hidden sm:inline text-sm font-medium">
                {step === 1 && "Basic Info"}
                {step === 2 && (formData.role === Role.HERBALIST ? "Practice" : "Details")}
                {step === 3 && (formData.role === Role.HERBALIST ? "Verification" : "Terms")}
                {step === 4 && "Terms"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {renderStepContent()}

          {error && (
            <Alert variant="destructive" className="mt-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            {currentStep === totalSteps ? (
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            ) : (
              <Button onClick={nextStep} disabled={isLoading}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Links */}
      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Button
          variant="link"
          className="p-0 h-auto"
          onClick={() => router.push("/auth/signin")}
        >
          Sign in
        </Button>
      </div>
    </div>
  )
}