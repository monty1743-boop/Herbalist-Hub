import { z } from 'zod'
import { FormResponseData } from './response-encryption'
import { FormResponseAudit } from './response-audit'

export interface ClientProfile {
  id: string
  personalInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
    dateOfBirth: string
    address: {
      street: string
      city: string
      state: string
      zipCode: string
      country: string
    }
  }
  healthData: {
    emergencyContact: {
      name: string
      relationship: string
      phone: string
    }
    insuranceInfo?: {
      provider: string
      policyNumber: string
      groupNumber: string
    }
    allergies: Array<{
      allergen: string
      severity: 'mild' | 'moderate' | 'severe'
      reaction: string
    }>
    medications: Array<{
      name: string
      dosage: string
      frequency: string
      prescribedBy: string
      startDate: string
      endDate?: string
    }>
    conditions: Array<{
      condition: string
      diagnosedDate: string
      status: 'active' | 'resolved' | 'managed'
      notes: string
    }>
    vitalSigns: {
      height?: string
      weight?: string
      bloodPressure?: string
      heartRate?: number
      temperature?: number
      lastUpdated: string
    }
  }
  preferences: {
    communicationPreferences: {
      email: boolean
      sms: boolean
      phone: boolean
      inApp: boolean
    }
    appointmentPreferences: {
      preferredTimes: string[]
      reminderSettings: {
        enabled: boolean
        timeBefore: number // hours
        methods: string[]
      }
    }
    treatmentPreferences: {
      herbPreferences: string[]
      dietaryRestrictions: string[]
      lifestyleFactors: string[]
    }
  }
  metadata: {
    createdAt: string
    updatedAt: string
    lastFormSubmission?: string
    totalFormSubmissions: number
    practitionerId: string
  }
}

export interface ProfileUpdateRequest {
  clientId: string
  practitionerId: string
  formResponseData: FormResponseData
  formSchema: any
  updateReason: string
  userId: string
  userRole: string
}

export interface ProfileUpdateResult {
  success: boolean
  updatedFields: string[]
  conflicts: Array<{
    field: string
    existingValue: any
    newValue: any
    resolution: 'kept_existing' | 'updated' | 'merged'
  }>
  errors: string[]
  warnings: string[]
}

export interface FormToProfileMapping {
  formFieldId: string
  profilePath: string
  mappingType: 'direct' | 'computed' | 'conditional' | 'append'
  transformation?: (value: any) => any
  condition?: (formData: any) => boolean
  mergeStrategy?: 'replace' | 'append' | 'merge' | 'latest'
}

export interface ProfileAnalytics {
  completeness: {
    overall: number
    personalInfo: number
    healthData: number
    preferences: number
  }
  lastUpdated: {
    personalInfo: string
    healthData: string
    preferences: string
  }
  dataQuality: {
    missingRequired: string[]
    inconsistencies: Array<{
      field: string
      issue: string
      severity: 'low' | 'medium' | 'high'
    }>
    outdatedFields: string[]
  }
  formContributions: {
    totalSubmissions: number
    lastSubmission: string
    fieldUpdatesFromForms: Record<string, number>
  }
}

/**
 * Client Profile Integration Service
 * Manages integration of form responses with client profiles
 */
export class ClientProfileIntegration {
  
  /**
   * Update client profile with form response data
   */
  static async updateProfileFromFormResponse(request: ProfileUpdateRequest): Promise<ProfileUpdateResult> {
    try {
      // Get current client profile
      const currentProfile = await this.getClientProfile(request.clientId)
      if (!currentProfile) {
        throw new Error('Client profile not found')
      }

      // Get field mappings for this form
      const fieldMappings = await this.getFormFieldMappings(request.formSchema)
      
      // Process form responses and create profile updates
      const profileUpdates = await this.processFormResponsesForProfile(
        request.formResponseData,
        fieldMappings,
        currentProfile
      )

      // Validate profile updates
      const validationResult = await this.validateProfileUpdates(
        currentProfile,
        profileUpdates
      )

      if (!validationResult.isValid) {
        return {
          success: false,
          updatedFields: [],
          conflicts: [],
          errors: validationResult.errors,
          warnings: validationResult.warnings
        }
      }

      // Apply updates to profile
      const updateResult = await this.applyProfileUpdates(
        currentProfile,
        profileUpdates,
        request.updateReason
      )

      // Save updated profile
      await this.saveClientProfile(updateResult.updatedProfile)

      // Create audit log
      await FormResponseAudit.logProfileUpdate({
        clientId: request.clientId,
        practitionerId: request.practitionerId,
        userId: request.userId,
        userRole: request.userRole,
        updatedFields: updateResult.updatedFields,
        updateReason: request.updateReason,
        formSubmissionId: request.formResponseData.metadata.submittedAt,
        updatedAt: new Date().toISOString()
      })

      // Generate profile analytics
      const analytics = await this.generateProfileAnalytics(updateResult.updatedProfile)
      
      // Send update notifications if significant changes
      if (updateResult.significantChanges) {
        await this.sendProfileUpdateNotifications(request, updateResult)
      }

      return {
        success: true,
        updatedFields: updateResult.updatedFields,
        conflicts: updateResult.conflicts,
        errors: [],
        warnings: validationResult.warnings
      }

    } catch (error) {
      console.error('Error updating profile from form response:', error)
      
      // Create audit log for failed update
      await FormResponseAudit.logProfileUpdateFailure({
        clientId: request.clientId,
        practitionerId: request.practitionerId,
        userId: request.userId,
        userRole: request.userRole,
        updateReason: request.updateReason,
        error: error instanceof Error ? error.message : 'Unknown error',
        attemptedAt: new Date().toISOString()
      })

      return {
        success: false,
        updatedFields: [],
        conflicts: [],
        errors: [error instanceof Error ? error.message : 'Profile update failed'],
        warnings: []
      }
    }
  }

  /**
   * Get profile completion analysis
   */
  static async getProfileCompleteness(clientId: string): Promise<ProfileAnalytics> {
    try {
      const profile = await this.getClientProfile(clientId)
      if (!profile) {
        throw new Error('Client profile not found')
      }

      return await this.generateProfileAnalytics(profile)
    } catch (error) {
      console.error('Error getting profile completeness:', error)
      throw error
    }
  }

  /**
   * Suggest forms based on incomplete profile data
   */
  static async suggestFormsForProfile(
    clientId: string,
    practitionerId: string
  ): Promise<Array<{
    formId: string
    formName: string
    reason: string
    missingFields: string[]
    priority: 'low' | 'medium' | 'high'
  }>> {
    try {
      const analytics = await this.getProfileCompleteness(clientId)
      const availableForms = await this.getAvailableForms(practitionerId)
      
      const suggestions = []

      // Suggest forms based on missing required fields
      if (analytics.dataQuality.missingRequired.length > 0) {
        for (const form of availableForms) {
          const formMappings = await this.getFormFieldMappings(form.schema)
          const canFillMissing = formMappings.filter(mapping => 
            analytics.dataQuality.missingRequired.includes(mapping.profilePath)
          )

          if (canFillMissing.length > 0) {
            suggestions.push({
              formId: form.id,
              formName: form.name,
              reason: 'Complete missing required information',
              missingFields: canFillMissing.map(m => m.profilePath),
              priority: 'high' as const
            })
          }
        }
      }

      // Suggest forms based on outdated information
      if (analytics.dataQuality.outdatedFields.length > 0) {
        for (const form of availableForms) {
          const formMappings = await this.getFormFieldMappings(form.schema)
          const canUpdateOutdated = formMappings.filter(mapping => 
            analytics.dataQuality.outdatedFields.includes(mapping.profilePath)
          )

          if (canUpdateOutdated.length > 0) {
            suggestions.push({
              formId: form.id,
              formName: form.name,
              reason: 'Update outdated information',
              missingFields: canUpdateOutdated.map(m => m.profilePath),
              priority: 'medium' as const
            })
          }
        }
      }

      // Suggest specialized forms based on health conditions
      const healthConditions = profile?.healthData.conditions || []
      for (const condition of healthConditions) {
        const specializedForms = availableForms.filter(form => 
          form.tags?.includes(condition.condition.toLowerCase()) ||
          form.category?.includes('specialized')
        )

        for (const form of specializedForms) {
          suggestions.push({
            formId: form.id,
            formName: form.name,
            reason: `Specialized form for ${condition.condition}`,
            missingFields: [],
            priority: 'low' as const
          })
        }
      }

      // Remove duplicates and sort by priority
      const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
        index === self.findIndex(s => s.formId === suggestion.formId)
      )

      return uniqueSuggestions.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })

    } catch (error) {
      console.error('Error suggesting forms for profile:', error)
      return []
    }
  }

  /**
   * Create profile diff between two versions
   */
  static createProfileDiff(
    oldProfile: ClientProfile,
    newProfile: ClientProfile
  ): Array<{
    path: string
    oldValue: any
    newValue: any
    changeType: 'added' | 'modified' | 'removed'
  }> {
    const changes: Array<any> = []
    
    this.compareObjects(oldProfile, newProfile, '', changes)
    
    return changes
  }

  // Private helper methods

  private static async getClientProfile(clientId: string): Promise<ClientProfile | null> {
    try {
      const response = await fetch(`/api/clients/${clientId}/profile`)
      if (!response.ok) {
        return null
      }
      return await response.json()
    } catch (error) {
      console.error('Error getting client profile:', error)
      return null
    }
  }

  private static async getFormFieldMappings(formSchema: any): Promise<FormToProfileMapping[]> {
    const mappings: FormToProfileMapping[] = []
    
    if (!formSchema?.sections) {
      return mappings
    }

    // Define standard field mappings
    const standardMappings: Record<string, string> = {
      'first_name': 'personalInfo.firstName',
      'last_name': 'personalInfo.lastName',
      'email': 'personalInfo.email',
      'phone': 'personalInfo.phone',
      'date_of_birth': 'personalInfo.dateOfBirth',
      'address_street': 'personalInfo.address.street',
      'address_city': 'personalInfo.address.city',
      'address_state': 'personalInfo.address.state',
      'address_zip': 'personalInfo.address.zipCode',
      'emergency_contact_name': 'healthData.emergencyContact.name',
      'emergency_contact_phone': 'healthData.emergencyContact.phone',
      'emergency_contact_relationship': 'healthData.emergencyContact.relationship',
      'height': 'healthData.vitalSigns.height',
      'weight': 'healthData.vitalSigns.weight',
      'blood_pressure': 'healthData.vitalSigns.bloodPressure'
    }

    formSchema.sections.forEach((section: any) => {
      if (section.fields) {
        section.fields.forEach((field: any) => {
          // Check for explicit mapping in field metadata
          if (field.metadata?.profileMapping) {
            mappings.push({
              formFieldId: field.id,
              profilePath: field.metadata.profileMapping,
              mappingType: field.metadata.mappingType || 'direct',
              transformation: field.metadata.transformation,
              condition: field.metadata.condition,
              mergeStrategy: field.metadata.mergeStrategy || 'replace'
            })
          }
          // Use standard mappings
          else if (standardMappings[field.id]) {
            mappings.push({
              formFieldId: field.id,
              profilePath: standardMappings[field.id],
              mappingType: 'direct'
            })
          }
          // Handle special field types
          else if (field.type === 'medication') {
            mappings.push({
              formFieldId: field.id,
              profilePath: 'healthData.medications',
              mappingType: 'append',
              mergeStrategy: 'merge'
            })
          }
          else if (field.type === 'allergy') {
            mappings.push({
              formFieldId: field.id,
              profilePath: 'healthData.allergies',
              mappingType: 'append',
              mergeStrategy: 'merge'
            })
          }
          else if (field.type === 'condition') {
            mappings.push({
              formFieldId: field.id,
              profilePath: 'healthData.conditions',
              mappingType: 'append',
              mergeStrategy: 'merge'
            })
          }
        })
      }
    })

    return mappings
  }

  private static async processFormResponsesForProfile(
    formResponseData: FormResponseData,
    fieldMappings: FormToProfileMapping[],
    currentProfile: ClientProfile
  ): Promise<Record<string, any>> {
    const profileUpdates: Record<string, any> = {}

    for (const mapping of fieldMappings) {
      const formValue = formResponseData.responses[mapping.formFieldId]
      
      if (formValue == null) continue

      // Apply condition if specified
      if (mapping.condition && !mapping.condition(formResponseData.responses)) {
        continue
      }

      // Apply transformation if specified
      let processedValue = formValue
      if (mapping.transformation) {
        processedValue = mapping.transformation(formValue)
      }

      // Handle different mapping types
      switch (mapping.mappingType) {
        case 'direct':
          profileUpdates[mapping.profilePath] = processedValue
          break
          
        case 'computed':
          // For computed fields, apply special logic
          profileUpdates[mapping.profilePath] = this.computeFieldValue(
            processedValue,
            formResponseData.responses,
            currentProfile
          )
          break
          
        case 'conditional':
          // Only update if condition is met
          if (this.evaluateCondition(mapping.condition, formResponseData.responses)) {
            profileUpdates[mapping.profilePath] = processedValue
          }
          break
          
        case 'append':
          // Append to array field
          const currentArray = this.getNestedValue(currentProfile, mapping.profilePath) || []
          profileUpdates[mapping.profilePath] = [...currentArray, processedValue]
          break
      }
    }

    return profileUpdates
  }

  private static async validateProfileUpdates(
    currentProfile: ClientProfile,
    profileUpdates: Record<string, any>
  ): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate required fields
    const requiredFields = [
      'personalInfo.firstName',
      'personalInfo.lastName',
      'personalInfo.email'
    ]

    for (const field of requiredFields) {
      if (profileUpdates[field] === null || profileUpdates[field] === '') {
        errors.push(`Required field ${field} cannot be empty`)
      }
    }

    // Validate email format
    if (profileUpdates['personalInfo.email']) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(profileUpdates['personalInfo.email'])) {
        errors.push('Invalid email format')
      }
    }

    // Validate phone format
    if (profileUpdates['personalInfo.phone']) {
      const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/
      if (!phoneRegex.test(profileUpdates['personalInfo.phone'])) {
        warnings.push('Phone number format may be invalid')
      }
    }

    // Validate date of birth
    if (profileUpdates['personalInfo.dateOfBirth']) {
      const dob = new Date(profileUpdates['personalInfo.dateOfBirth'])
      const now = new Date()
      if (dob > now) {
        errors.push('Date of birth cannot be in the future')
      }
      if (now.getFullYear() - dob.getFullYear() > 150) {
        warnings.push('Date of birth indicates age over 150 years')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private static async applyProfileUpdates(
    currentProfile: ClientProfile,
    profileUpdates: Record<string, any>,
    updateReason: string
  ): Promise<{
    updatedProfile: ClientProfile
    updatedFields: string[]
    conflicts: Array<any>
    significantChanges: boolean
  }> {
    const updatedProfile = JSON.parse(JSON.stringify(currentProfile))
    const updatedFields: string[] = []
    const conflicts: Array<any> = []
    let significantChanges = false

    for (const [path, newValue] of Object.entries(profileUpdates)) {
      const currentValue = this.getNestedValue(currentProfile, path)
      
      // Check for conflicts
      if (currentValue != null && currentValue !== newValue) {
        const conflict = {
          field: path,
          existingValue: currentValue,
          newValue: newValue,
          resolution: 'updated' as const
        }

        // Determine if this is a significant change
        if (this.isSignificantChange(path, currentValue, newValue)) {
          significantChanges = true
        }

        conflicts.push(conflict)
      }

      // Apply the update
      this.setNestedValue(updatedProfile, path, newValue)
      updatedFields.push(path)
    }

    // Update metadata
    updatedProfile.metadata.updatedAt = new Date().toISOString()
    updatedProfile.metadata.lastFormSubmission = new Date().toISOString()
    updatedProfile.metadata.totalFormSubmissions += 1

    return {
      updatedProfile,
      updatedFields,
      conflicts,
      significantChanges
    }
  }

  private static async saveClientProfile(profile: ClientProfile): Promise<void> {
    try {
      const response = await fetch(`/api/clients/${profile.id}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save client profile')
      }
    } catch (error) {
      console.error('Error saving client profile:', error)
      throw error
    }
  }

  private static async generateProfileAnalytics(profile: ClientProfile): Promise<ProfileAnalytics> {
    // Calculate completeness scores
    const personalInfoFields = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth']
    const personalInfoComplete = personalInfoFields.filter(field => 
      this.getNestedValue(profile, `personalInfo.${field}`)
    ).length
    const personalInfoCompleteness = (personalInfoComplete / personalInfoFields.length) * 100

    const healthDataFields = ['emergencyContact.name', 'emergencyContact.phone']
    const healthDataComplete = healthDataFields.filter(field => 
      this.getNestedValue(profile, `healthData.${field}`)
    ).length
    const healthDataCompleteness = (healthDataComplete / healthDataFields.length) * 100

    const preferencesFields = ['communicationPreferences', 'appointmentPreferences']
    const preferencesComplete = preferencesFields.filter(field => 
      this.getNestedValue(profile, `preferences.${field}`)
    ).length
    const preferencesCompleteness = (preferencesComplete / preferencesFields.length) * 100

    const overallCompleteness = (personalInfoCompleteness + healthDataCompleteness + preferencesCompleteness) / 3

    // Identify missing required fields
    const missingRequired: string[] = []
    if (!profile.personalInfo.firstName) missingRequired.push('personalInfo.firstName')
    if (!profile.personalInfo.lastName) missingRequired.push('personalInfo.lastName')
    if (!profile.personalInfo.email) missingRequired.push('personalInfo.email')

    // Identify inconsistencies
    const inconsistencies: Array<any> = []
    
    // Check for outdated vital signs
    const vitalSignsAge = profile.healthData.vitalSigns.lastUpdated ? 
      Date.now() - new Date(profile.healthData.vitalSigns.lastUpdated).getTime() : 
      Date.now()
    
    if (vitalSignsAge > 365 * 24 * 60 * 60 * 1000) { // 1 year
      inconsistencies.push({
        field: 'healthData.vitalSigns',
        issue: 'Vital signs are over 1 year old',
        severity: 'medium' as const
      })
    }

    return {
      completeness: {
        overall: overallCompleteness,
        personalInfo: personalInfoCompleteness,
        healthData: healthDataCompleteness,
        preferences: preferencesCompleteness
      },
      lastUpdated: {
        personalInfo: profile.metadata.updatedAt,
        healthData: profile.healthData.vitalSigns.lastUpdated,
        preferences: profile.metadata.updatedAt
      },
      dataQuality: {
        missingRequired,
        inconsistencies,
        outdatedFields: vitalSignsAge > 365 * 24 * 60 * 60 * 1000 ? ['healthData.vitalSigns'] : []
      },
      formContributions: {
        totalSubmissions: profile.metadata.totalFormSubmissions,
        lastSubmission: profile.metadata.lastFormSubmission || '',
        fieldUpdatesFromForms: {} // Would track which fields were last updated from forms
      }
    }
  }

  private static async sendProfileUpdateNotifications(
    request: ProfileUpdateRequest,
    updateResult: any
  ): Promise<void> {
    try {
      // Send notification to practitioner about significant profile changes
      await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'profile_updated',
          recipientId: request.practitionerId,
          data: {
            clientId: request.clientId,
            updatedFields: updateResult.updatedFields,
            updateReason: request.updateReason
          }
        }),
      })
    } catch (error) {
      console.error('Error sending profile update notifications:', error)
      // Don't throw here as this is not critical
    }
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => 
      current && current[key] !== undefined ? current[key] : null, obj
    )
  }

  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    const lastKey = keys.pop()!
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {}
      return current[key]
    }, obj)
    target[lastKey] = value
  }

  private static isSignificantChange(path: string, oldValue: any, newValue: any): boolean {
    // Define which fields constitute significant changes
    const significantFields = [
      'personalInfo.email',
      'personalInfo.phone',
      'healthData.emergencyContact',
      'healthData.allergies',
      'healthData.medications',
      'healthData.conditions'
    ]
    
    return significantFields.some(field => path.startsWith(field))
  }

  private static computeFieldValue(value: any, formData: any, profile: ClientProfile): any {
    // Implement computed field logic
    return value
  }

  private static evaluateCondition(condition: any, formData: any): boolean {
    if (typeof condition === 'function') {
      return condition(formData)
    }
    return true
  }

  private static async getAvailableForms(practitionerId: string): Promise<any[]> {
    try {
      const response = await fetch(`/api/practitioners/${practitionerId}/forms`)
      if (!response.ok) {
        return []
      }
      return await response.json()
    } catch (error) {
      console.error('Error getting available forms:', error)
      return []
    }
  }

  private static compareObjects(
    oldObj: any,
    newObj: any,
    basePath: string,
    changes: Array<any>
  ): void {
    // Recursively compare objects and track changes
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})])
    
    for (const key of allKeys) {
      const currentPath = basePath ? `${basePath}.${key}` : key
      const oldValue = oldObj?.[key]
      const newValue = newObj?.[key]
      
      if (oldValue === undefined && newValue !== undefined) {
        changes.push({
          path: currentPath,
          oldValue: undefined,
          newValue,
          changeType: 'added'
        })
      } else if (oldValue !== undefined && newValue === undefined) {
        changes.push({
          path: currentPath,
          oldValue,
          newValue: undefined,
          changeType: 'removed'
        })
      } else if (typeof oldValue === 'object' && typeof newValue === 'object' && oldValue !== null && newValue !== null) {
        this.compareObjects(oldValue, newValue, currentPath, changes)
      } else if (oldValue !== newValue) {
        changes.push({
          path: currentPath,
          oldValue,
          newValue,
          changeType: 'modified'
        })
      }
    }
  }
}

// Zod schemas for validation
export const ProfileUpdateRequestSchema = z.object({
  clientId: z.string(),
  practitionerId: z.string(),
  formResponseData: z.any(), // FormResponseData schema would be imported
  formSchema: z.any(),
  updateReason: z.string(),
  userId: z.string(),
  userRole: z.string()
})

export const ClientProfileSchema = z.object({
  id: z.string(),
  personalInfo: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string(),
    dateOfBirth: z.string(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zipCode: z.string(),
      country: z.string()
    })
  }),
  healthData: z.object({
    emergencyContact: z.object({
      name: z.string(),
      relationship: z.string(),
      phone: z.string()
    }),
    insuranceInfo: z.object({
      provider: z.string(),
      policyNumber: z.string(),
      groupNumber: z.string()
    }).optional(),
    allergies: z.array(z.object({
      allergen: z.string(),
      severity: z.enum(['mild', 'moderate', 'severe']),
      reaction: z.string()
    })),
    medications: z.array(z.object({
      name: z.string(),
      dosage: z.string(),
      frequency: z.string(),
      prescribedBy: z.string(),
      startDate: z.string(),
      endDate: z.string().optional()
    })),
    conditions: z.array(z.object({
      condition: z.string(),
      diagnosedDate: z.string(),
      status: z.enum(['active', 'resolved', 'managed']),
      notes: z.string()
    })),
    vitalSigns: z.object({
      height: z.string().optional(),
      weight: z.string().optional(),
      bloodPressure: z.string().optional(),
      heartRate: z.number().optional(),
      temperature: z.number().optional(),
      lastUpdated: z.string()
    })
  }),
  preferences: z.object({
    communicationPreferences: z.object({
      email: z.boolean(),
      sms: z.boolean(),
      phone: z.boolean(),
      inApp: z.boolean()
    }),
    appointmentPreferences: z.object({
      preferredTimes: z.array(z.string()),
      reminderSettings: z.object({
        enabled: z.boolean(),
        timeBefore: z.number(),
        methods: z.array(z.string())
      })
    }),
    treatmentPreferences: z.object({
      herbPreferences: z.array(z.string()),
      dietaryRestrictions: z.array(z.string()),
      lifestyleFactors: z.array(z.string())
    })
  }),
  metadata: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    lastFormSubmission: z.string().optional(),
    totalFormSubmissions: z.number(),
    practitionerId: z.string()
  })
})