import { z } from 'zod'

export interface FormTemplate {
  id: string
  name: string
  description: string
  category: string
  specialty: string[]
  version: string
  author: {
    id: string
    name: string
    type: 'practitioner' | 'official' | 'community'
    verified: boolean
  }
  metadata: {
    createdAt: string
    updatedAt: string
    downloads: number
    rating: number
    reviewCount: number
    tags: string[]
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    estimatedTime: number // in minutes
    language: string
    compliance: string[] // e.g., ['HIPAA', 'GDPR']
  }
  preview: {
    thumbnail: string
    screenshots: string[]
    fieldCount: number
    sectionCount: number
    hasConditionalLogic: boolean
    supportedDevices: string[]
  }
  schema: {
    version: string
    sections: Array<{
      id: string
      title: string
      description?: string
      fields: Array<{
        id: string
        type: string
        label: string
        required: boolean
        options?: any[]
        validation?: any
        conditionalLogic?: any
      }>
    }>
    styling?: {
      theme: string
      colors: Record<string, string>
      fonts: Record<string, string>
      spacing: Record<string, string>
    }
    settings: {
      allowSaveProgress: boolean
      showProgressBar: boolean
      requireAuthentication: boolean
      enableNotifications: boolean
      autoAssignToAppointments: boolean
    }
  }
  customization: {
    allowedModifications: Array<'fields' | 'styling' | 'logic' | 'settings'>
    requiredFields: string[]
    lockedFields: string[]
    variableFields: Array<{
      fieldId: string
      variableName: string
      defaultValue: any
      description: string
    }>
  }
  sharing: {
    isPublic: boolean
    shareCode?: string
    permissions: {
      view: string[]
      download: string[]
      modify: string[]
    }
    pricing?: {
      type: 'free' | 'paid' | 'subscription'
      amount?: number
      currency?: string
    }
  }
  analytics: {
    usageCount: number
    successRate: number
    averageCompletionTime: number
    popularModifications: Array<{
      type: string
      count: number
      description: string
    }>
  }
}

export interface TemplateSearchRequest {
  query?: string
  category?: string
  specialty?: string[]
  author?: string
  difficulty?: string
  rating?: number
  tags?: string[]
  compliance?: string[]
  sortBy?: 'popularity' | 'rating' | 'newest' | 'name' | 'downloads'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface TemplateCustomization {
  templateId: string
  practitionerId: string
  name: string
  description?: string
  modifications: {
    fields: Array<{
      action: 'add' | 'remove' | 'modify'
      fieldId: string
      data?: any
    }>
    styling?: {
      theme?: string
      colors?: Record<string, string>
      fonts?: Record<string, string>
    }
    settings?: Record<string, any>
    variables?: Record<string, any>
  }
  savedAt: string
}

export interface TemplateReview {
  id: string
  templateId: string
  reviewerId: string
  reviewerName: string
  rating: number // 1-5
  title: string
  content: string
  pros: string[]
  cons: string[]
  useCase: string
  verifiedPurchase: boolean
  helpful: number
  createdAt: string
  updatedAt: string
}

export interface TemplateCollection {
  id: string
  name: string
  description: string
  practitionerId: string
  templateIds: string[]
  isPublic: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
}

/**
 * Form Template Manager
 * Handles template creation, sharing, customization, and management
 */
export class FormTemplateManager {
  
  /**
   * Search and browse templates
   */
  static async searchTemplates(request: TemplateSearchRequest): Promise<{
    templates: FormTemplate[]
    totalCount: number
    hasMore: boolean
    facets: {
      categories: Array<{ name: string; count: number }>
      specialties: Array<{ name: string; count: number }>
      tags: Array<{ name: string; count: number }>
      authors: Array<{ name: string; count: number }>
    }
  }> {
    try {
      const queryParams = new URLSearchParams()
      
      Object.entries(request).forEach(([key, value]) => {
        if (value != null) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, String(v)))
          } else {
            queryParams.append(key, String(value))
          }
        }
      })

      const response = await fetch(`/api/form-templates/search?${queryParams}`)
      if (!response.ok) {
        throw new Error('Failed to search templates')
      }

      return await response.json()
    } catch (error) {
      console.error('Error searching templates:', error)
      throw error
    }
  }

  /**
   * Get template by ID
   */
  static async getTemplate(templateId: string): Promise<FormTemplate | null> {
    try {
      const response = await fetch(`/api/form-templates/${templateId}`)
      if (!response.ok) {
        return null
      }
      return await response.json()
    } catch (error) {
      console.error('Error getting template:', error)
      return null
    }
  }

  /**
   * Create new template from form
   */
  static async createTemplate(data: {
    formId: string
    practitionerId: string
    name: string
    description: string
    category: string
    specialty: string[]
    tags: string[]
    isPublic: boolean
    allowedModifications: Array<'fields' | 'styling' | 'logic' | 'settings'>
    pricing?: {
      type: 'free' | 'paid' | 'subscription'
      amount?: number
      currency?: string
    }
  }): Promise<FormTemplate> {
    try {
      // Get form schema
      const formResponse = await fetch(`/api/intake-forms/${data.formId}`)
      if (!formResponse.ok) {
        throw new Error('Failed to get form data')
      }
      const formData = await formResponse.json()

      // Create template
      const template: Omit<FormTemplate, 'id'> = {
        name: data.name,
        description: data.description,
        category: data.category,
        specialty: data.specialty,
        version: '1.0.0',
        author: {
          id: data.practitionerId,
          name: 'Practitioner', // Would get actual name
          type: 'practitioner',
          verified: false
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          downloads: 0,
          rating: 0,
          reviewCount: 0,
          tags: data.tags,
          difficulty: 'intermediate',
          estimatedTime: this.calculateEstimatedTime(formData),
          language: 'en',
          compliance: ['HIPAA']
        },
        preview: {
          thumbnail: '', // Would generate thumbnail
          screenshots: [],
          fieldCount: this.countFields(formData),
          sectionCount: formData.sections?.length || 0,
          hasConditionalLogic: this.hasConditionalLogic(formData),
          supportedDevices: ['desktop', 'tablet', 'mobile']
        },
        schema: {
          version: '1.0',
          sections: formData.sections || [],
          styling: formData.styling,
          settings: formData.settings || {
            allowSaveProgress: true,
            showProgressBar: true,
            requireAuthentication: true,
            enableNotifications: true,
            autoAssignToAppointments: false
          }
        },
        customization: {
          allowedModifications: data.allowedModifications,
          requiredFields: this.getRequiredFields(formData),
          lockedFields: [],
          variableFields: []
        },
        sharing: {
          isPublic: data.isPublic,
          shareCode: this.generateShareCode(),
          permissions: {
            view: data.isPublic ? ['*'] : [data.practitionerId],
            download: data.isPublic ? ['*'] : [data.practitionerId],
            modify: [data.practitionerId]
          },
          pricing: data.pricing
        },
        analytics: {
          usageCount: 0,
          successRate: 0,
          averageCompletionTime: 0,
          popularModifications: []
        }
      }

      const response = await fetch('/api/form-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      })

      if (!response.ok) {
        throw new Error('Failed to create template')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating template:', error)
      throw error
    }
  }

  /**
   * Customize template
   */
  static async customizeTemplate(customization: TemplateCustomization): Promise<{
    success: boolean
    formId?: string
    errors?: string[]
  }> {
    try {
      const template = await this.getTemplate(customization.templateId)
      if (!template) {
        throw new Error('Template not found')
      }

      // Apply customizations
      const customizedForm = await this.applyCustomizations(template, customization)

      // Validate customized form
      const validation = await this.validateCustomizedForm(customizedForm, template)
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        }
      }

      // Create new form from customized template
      const formResponse = await fetch('/api/intake-forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...customizedForm,
          practitionerId: customization.practitionerId,
          name: customization.name,
          description: customization.description,
          templateId: customization.templateId
        }),
      })

      if (!formResponse.ok) {
        throw new Error('Failed to create form from template')
      }

      const newForm = await formResponse.json()

      // Save customization for future reference
      await this.saveCustomization(customization)

      // Track template usage
      await this.trackTemplateUsage(customization.templateId, customization.practitionerId)

      return {
        success: true,
        formId: newForm.id
      }
    } catch (error) {
      console.error('Error customizing template:', error)
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Customization failed']
      }
    }
  }

  /**
   * Get featured templates
   */
  static async getFeaturedTemplates(): Promise<FormTemplate[]> {
    try {
      const response = await fetch('/api/form-templates/featured')
      if (!response.ok) {
        throw new Error('Failed to get featured templates')
      }
      return await response.json()
    } catch (error) {
      console.error('Error getting featured templates:', error)
      return []
    }
  }

  /**
   * Get popular templates
   */
  static async getPopularTemplates(limit: number = 10): Promise<FormTemplate[]> {
    try {
      const response = await fetch(`/api/form-templates/popular?limit=${limit}`)
      if (!response.ok) {
        throw new Error('Failed to get popular templates')
      }
      return await response.json()
    } catch (error) {
      console.error('Error getting popular templates:', error)
      return []
    }
  }

  /**
   * Get templates by category
   */
  static async getTemplatesByCategory(category: string): Promise<FormTemplate[]> {
    try {
      const response = await fetch(`/api/form-templates/category/${category}`)
      if (!response.ok) {
        throw new Error('Failed to get templates by category')
      }
      return await response.json()
    } catch (error) {
      console.error('Error getting templates by category:', error)
      return []
    }
  }

  /**
   * Get my templates
   */
  static async getMyTemplates(practitionerId: string): Promise<FormTemplate[]> {
    try {
      const response = await fetch(`/api/practitioners/${practitionerId}/templates`)
      if (!response.ok) {
        throw new Error('Failed to get my templates')
      }
      return await response.json()
    } catch (error) {
      console.error('Error getting my templates:', error)
      return []
    }
  }

  /**
   * Download template
   */
  static async downloadTemplate(templateId: string, practitionerId: string): Promise<{
    success: boolean
    shareCode?: string
    downloadUrl?: string
    errors?: string[]
  }> {
    try {
      const template = await this.getTemplate(templateId)
      if (!template) {
        throw new Error('Template not found')
      }

      // Check download permissions
      if (!this.canDownloadTemplate(template, practitionerId)) {
        throw new Error('No permission to download this template')
      }

      // Handle paid templates
      if (template.sharing.pricing?.type === 'paid') {
        const payment = await this.processTemplatePayment(templateId, practitionerId)
        if (!payment.success) {
          return {
            success: false,
            errors: ['Payment required to download this template']
          }
        }
      }

      // Generate download URL or share code
      const downloadResponse = await fetch(`/api/form-templates/${templateId}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ practitionerId }),
      })

      if (!downloadResponse.ok) {
        throw new Error('Failed to generate download')
      }

      const downloadData = await downloadResponse.json()

      // Track download
      await this.trackTemplateDownload(templateId, practitionerId)

      return {
        success: true,
        shareCode: downloadData.shareCode,
        downloadUrl: downloadData.downloadUrl
      }
    } catch (error) {
      console.error('Error downloading template:', error)
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Download failed']
      }
    }
  }

  /**
   * Rate and review template
   */
  static async reviewTemplate(review: Omit<TemplateReview, 'id' | 'createdAt' | 'updatedAt'>): Promise<TemplateReview> {
    try {
      const response = await fetch('/api/form-templates/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...review,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit review')
      }

      const newReview = await response.json()

      // Update template rating
      await this.updateTemplateRating(review.templateId)

      return newReview
    } catch (error) {
      console.error('Error submitting review:', error)
      throw error
    }
  }

  /**
   * Get template reviews
   */
  static async getTemplateReviews(
    templateId: string, 
    options?: { limit?: number; offset?: number; sortBy?: 'newest' | 'oldest' | 'rating' }
  ): Promise<{
    reviews: TemplateReview[]
    totalCount: number
    averageRating: number
  }> {
    try {
      const queryParams = new URLSearchParams({ templateId })
      if (options?.limit) queryParams.append('limit', options.limit.toString())
      if (options?.offset) queryParams.append('offset', options.offset.toString())
      if (options?.sortBy) queryParams.append('sortBy', options.sortBy)

      const response = await fetch(`/api/form-templates/reviews?${queryParams}`)
      if (!response.ok) {
        throw new Error('Failed to get reviews')
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting reviews:', error)
      return {
        reviews: [],
        totalCount: 0,
        averageRating: 0
      }
    }
  }

  /**
   * Create template collection
   */
  static async createCollection(data: {
    name: string
    description: string
    practitionerId: string
    templateIds: string[]
    isPublic: boolean
    tags: string[]
  }): Promise<TemplateCollection> {
    try {
      const collection: Omit<TemplateCollection, 'id'> = {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const response = await fetch('/api/form-templates/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collection),
      })

      if (!response.ok) {
        throw new Error('Failed to create collection')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating collection:', error)
      throw error
    }
  }

  /**
   * Import template from share code
   */
  static async importFromShareCode(
    shareCode: string, 
    practitionerId: string
  ): Promise<{
    success: boolean
    formId?: string
    templateInfo?: Partial<FormTemplate>
    errors?: string[]
  }> {
    try {
      const response = await fetch('/api/form-templates/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shareCode, practitionerId }),
      })

      if (!response.ok) {
        throw new Error('Failed to import template')
      }

      const result = await response.json()
      
      if (result.success) {
        // Track import
        await this.trackTemplateImport(result.templateId, practitionerId)
      }

      return result
    } catch (error) {
      console.error('Error importing template:', error)
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Import failed']
      }
    }
  }

  // Private helper methods

  private static calculateEstimatedTime(formData: any): number {
    // Estimate based on field count and complexity
    const fieldCount = this.countFields(formData)
    const baseTime = fieldCount * 0.5 // 30 seconds per field
    const conditionalMultiplier = this.hasConditionalLogic(formData) ? 1.5 : 1
    return Math.round(baseTime * conditionalMultiplier)
  }

  private static countFields(formData: any): number {
    if (!formData.sections) return 0
    return formData.sections.reduce((count: number, section: any) => {
      return count + (section.fields?.length || 0)
    }, 0)
  }

  private static hasConditionalLogic(formData: any): boolean {
    if (!formData.sections) return false
    return formData.sections.some((section: any) => {
      return section.fields?.some((field: any) => field.conditionalLogic)
    })
  }

  private static getRequiredFields(formData: any): string[] {
    if (!formData.sections) return []
    const requiredFields: string[] = []
    
    formData.sections.forEach((section: any) => {
      section.fields?.forEach((field: any) => {
        if (field.required) {
          requiredFields.push(field.id)
        }
      })
    })
    
    return requiredFields
  }

  private static generateShareCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  private static async applyCustomizations(
    template: FormTemplate, 
    customization: TemplateCustomization
  ): Promise<any> {
    const customizedForm = JSON.parse(JSON.stringify(template.schema))

    // Apply field modifications
    if (customization.modifications.fields) {
      for (const fieldMod of customization.modifications.fields) {
        switch (fieldMod.action) {
          case 'add':
            this.addFieldToForm(customizedForm, fieldMod)
            break
          case 'remove':
            this.removeFieldFromForm(customizedForm, fieldMod.fieldId)
            break
          case 'modify':
            this.modifyFieldInForm(customizedForm, fieldMod.fieldId, fieldMod.data)
            break
        }
      }
    }

    // Apply styling modifications
    if (customization.modifications.styling) {
      customizedForm.styling = {
        ...customizedForm.styling,
        ...customization.modifications.styling
      }
    }

    // Apply settings modifications
    if (customization.modifications.settings) {
      customizedForm.settings = {
        ...customizedForm.settings,
        ...customization.modifications.settings
      }
    }

    // Apply variable substitutions
    if (customization.modifications.variables) {
      this.applyVariableSubstitutions(customizedForm, customization.modifications.variables)
    }

    return customizedForm
  }

  private static addFieldToForm(form: any, fieldMod: any): void {
    // Find appropriate section and add field
    if (form.sections && form.sections.length > 0) {
      const targetSection = form.sections[0] // Default to first section
      if (!targetSection.fields) targetSection.fields = []
      targetSection.fields.push(fieldMod.data)
    }
  }

  private static removeFieldFromForm(form: any, fieldId: string): void {
    if (!form.sections) return
    
    form.sections.forEach((section: any) => {
      if (section.fields) {
        section.fields = section.fields.filter((field: any) => field.id !== fieldId)
      }
    })
  }

  private static modifyFieldInForm(form: any, fieldId: string, modifications: any): void {
    if (!form.sections) return
    
    form.sections.forEach((section: any) => {
      if (section.fields) {
        const field = section.fields.find((f: any) => f.id === fieldId)
        if (field) {
          Object.assign(field, modifications)
        }
      }
    })
  }

  private static applyVariableSubstitutions(form: any, variables: Record<string, any>): void {
    // Replace variables in form content
    const formStr = JSON.stringify(form)
    let modifiedStr = formStr
    
    Object.entries(variables).forEach(([variable, value]) => {
      const placeholder = `{{${variable}}}`
      modifiedStr = modifiedStr.replace(new RegExp(placeholder, 'g'), String(value))
    })
    
    return JSON.parse(modifiedStr)
  }

  private static async validateCustomizedForm(form: any, template: FormTemplate): Promise<{
    isValid: boolean
    errors: string[]
  }> {
    const errors: string[] = []

    // Check required fields are not removed
    template.customization.requiredFields.forEach(fieldId => {
      if (!this.formHasField(form, fieldId)) {
        errors.push(`Required field '${fieldId}' cannot be removed`)
      }
    })

    // Check locked fields are not modified
    template.customization.lockedFields.forEach(fieldId => {
      if (this.fieldWasModified(form, template.schema, fieldId)) {
        errors.push(`Locked field '${fieldId}' cannot be modified`)
      }
    })

    // Validate allowed modifications
    // This would include more sophisticated validation logic

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  private static formHasField(form: any, fieldId: string): boolean {
    if (!form.sections) return false
    
    return form.sections.some((section: any) => {
      return section.fields?.some((field: any) => field.id === fieldId)
    })
  }

  private static fieldWasModified(form: any, originalForm: any, fieldId: string): boolean {
    // Compare field in both forms to detect modifications
    // This is a simplified check - real implementation would be more thorough
    return false
  }

  private static async saveCustomization(customization: TemplateCustomization): Promise<void> {
    try {
      await fetch('/api/form-templates/customizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customization),
      })
    } catch (error) {
      console.error('Error saving customization:', error)
    }
  }

  private static async trackTemplateUsage(templateId: string, practitionerId: string): Promise<void> {
    try {
      await fetch('/api/form-templates/analytics/usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateId, practitionerId, action: 'use' }),
      })
    } catch (error) {
      console.error('Error tracking template usage:', error)
    }
  }

  private static async trackTemplateDownload(templateId: string, practitionerId: string): Promise<void> {
    try {
      await fetch('/api/form-templates/analytics/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateId, practitionerId }),
      })
    } catch (error) {
      console.error('Error tracking template download:', error)
    }
  }

  private static async trackTemplateImport(templateId: string, practitionerId: string): Promise<void> {
    try {
      await fetch('/api/form-templates/analytics/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateId, practitionerId }),
      })
    } catch (error) {
      console.error('Error tracking template import:', error)
    }
  }

  private static canDownloadTemplate(template: FormTemplate, practitionerId: string): boolean {
    // Check if user has permission to download
    const downloadPermissions = template.sharing.permissions.download
    return downloadPermissions.includes('*') || downloadPermissions.includes(practitionerId)
  }

  private static async processTemplatePayment(templateId: string, practitionerId: string): Promise<{
    success: boolean
    transactionId?: string
  }> {
    // Handle payment processing for paid templates
    // This would integrate with payment gateway
    return { success: true, transactionId: 'mock-transaction' }
  }

  private static async updateTemplateRating(templateId: string): Promise<void> {
    try {
      await fetch(`/api/form-templates/${templateId}/rating`, {
        method: 'POST'
      })
    } catch (error) {
      console.error('Error updating template rating:', error)
    }
  }
}

// Zod schemas for validation
export const FormTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  specialty: z.array(z.string()),
  version: z.string(),
  author: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['practitioner', 'official', 'community']),
    verified: z.boolean()
  }),
  metadata: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    downloads: z.number(),
    rating: z.number(),
    reviewCount: z.number(),
    tags: z.array(z.string()),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    estimatedTime: z.number(),
    language: z.string(),
    compliance: z.array(z.string())
  }),
  preview: z.object({
    thumbnail: z.string(),
    screenshots: z.array(z.string()),
    fieldCount: z.number(),
    sectionCount: z.number(),
    hasConditionalLogic: z.boolean(),
    supportedDevices: z.array(z.string())
  }),
  schema: z.object({
    version: z.string(),
    sections: z.array(z.any()),
    styling: z.any().optional(),
    settings: z.any()
  }),
  customization: z.object({
    allowedModifications: z.array(z.enum(['fields', 'styling', 'logic', 'settings'])),
    requiredFields: z.array(z.string()),
    lockedFields: z.array(z.string()),
    variableFields: z.array(z.any())
  }),
  sharing: z.object({
    isPublic: z.boolean(),
    shareCode: z.string().optional(),
    permissions: z.object({
      view: z.array(z.string()),
      download: z.array(z.string()),
      modify: z.array(z.string())
    }),
    pricing: z.object({
      type: z.enum(['free', 'paid', 'subscription']),
      amount: z.number().optional(),
      currency: z.string().optional()
    }).optional()
  }),
  analytics: z.object({
    usageCount: z.number(),
    successRate: z.number(),
    averageCompletionTime: z.number(),
    popularModifications: z.array(z.any())
  })
})

export const TemplateSearchRequestSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  specialty: z.array(z.string()).optional(),
  author: z.string().optional(),
  difficulty: z.string().optional(),
  rating: z.number().optional(),
  tags: z.array(z.string()).optional(),
  compliance: z.array(z.string()).optional(),
  sortBy: z.enum(['popularity', 'rating', 'newest', 'name', 'downloads']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.number().optional(),
  offset: z.number().optional()
})