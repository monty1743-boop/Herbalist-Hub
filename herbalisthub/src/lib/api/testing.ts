import { NextRequest } from "next/server"
import { ApiError, ApiErrorCode } from "./errors"

/**
 * API testing utilities for development and testing environments
 */
export class ApiTestingUtils {
  /**
   * Create a mock NextRequest for testing
   */
  static createMockRequest(options: {
    method?: string
    url?: string
    body?: any
    headers?: Record<string, string>
    params?: Record<string, string>
  } = {}): NextRequest {
    const {
      method = "GET",
      url = "http://localhost:3000/api/test",
      body,
      headers = {},
      params = {},
    } = options

    const requestInit: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    }

    if (body && method !== "GET") {
      requestInit.body = JSON.stringify(body)
    }

    const request = new NextRequest(url, requestInit)
    
    // Add params to the request (simulating Next.js behavior)
    ;(request as any).params = params

    return request
  }

  /**
   * Validate API response format
   */
  static validateApiResponse(response: any): {
    isValid: boolean
    errors: string[]
    type: "success" | "error" | "unknown"
  } {
    const errors: string[] = []
    let type: "success" | "error" | "unknown" = "unknown"

    if (!response) {
      errors.push("Response is null or undefined")
      return { isValid: false, errors, type }
    }

    // Check if it's a success response
    if (response.success === true) {
      type = "success"
      
      // Validate success response structure
      if (!response.data && !response.message) {
        errors.push("Success response should have either data or message")
      }

      if (response.meta && typeof response.meta !== "object") {
        errors.push("Meta field should be an object")
      }

      if (response.meta?.pagination) {
        const { page, limit, total, totalPages } = response.meta.pagination
        if (typeof page !== "number" || page < 1) {
          errors.push("Invalid pagination page number")
        }
        if (typeof limit !== "number" || limit < 1) {
          errors.push("Invalid pagination limit")
        }
        if (typeof total !== "number" || total < 0) {
          errors.push("Invalid pagination total")
        }
        if (typeof totalPages !== "number" || totalPages < 0) {
          errors.push("Invalid pagination totalPages")
        }
      }
    }
    // Check if it's an error response
    else if (response.success === false) {
      type = "error"
      
      // Validate error response structure
      if (!response.error) {
        errors.push("Error response must have error field")
      } else {
        if (!response.error.code) {
          errors.push("Error response must have error code")
        }
        if (!response.error.message) {
          errors.push("Error response must have error message")
        }
        if (!response.error.timestamp) {
          errors.push("Error response must have timestamp")
        }
        
        // Validate error code is valid
        if (response.error.code && !Object.values(ApiErrorCode).includes(response.error.code)) {
          errors.push(`Invalid error code: ${response.error.code}`)
        }
      }

      if (!response.statusCode || typeof response.statusCode !== "number") {
        errors.push("Error response must have valid statusCode")
      }
    } else {
      errors.push("Response must have success field set to true or false")
    }

    return {
      isValid: errors.length === 0,
      errors,
      type,
    }
  }

  /**
   * Performance testing helper
   */
  static async measureApiPerformance<T>(
    apiCall: () => Promise<T>,
    iterations: number = 10
  ): Promise<{
    averageTime: number
    minTime: number
    maxTime: number
    totalTime: number
    iterations: number
    results: T[]
  }> {
    const times: number[] = []
    const results: T[] = []

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now()
      try {
        const result = await apiCall()
        results.push(result)
      } catch (error) {
        console.error(`API call ${i + 1} failed:`, error)
        results.push(error as T)
      }
      const endTime = performance.now()
      times.push(endTime - startTime)
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0)
    const averageTime = totalTime / iterations
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)

    return {
      averageTime,
      minTime,
      maxTime,
      totalTime,
      iterations,
      results,
    }
  }

  /**
   * Load testing simulation
   */
  static async simulateLoad(
    apiCall: () => Promise<any>,
    options: {
      concurrentUsers: number
      requestsPerUser: number
      delayBetweenRequests?: number
    }
  ): Promise<{
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    averageResponseTime: number
    errors: any[]
  }> {
    const { concurrentUsers, requestsPerUser, delayBetweenRequests = 100 } = options
    const totalRequests = concurrentUsers * requestsPerUser
    
    let successfulRequests = 0
    let failedRequests = 0
    const responseTimes: number[] = []
    const errors: any[] = []

    // Create concurrent user simulations
    const userPromises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
      for (let requestIndex = 0; requestIndex < requestsPerUser; requestIndex++) {
        const startTime = performance.now()
        
        try {
          await apiCall()
          successfulRequests++
        } catch (error) {
          failedRequests++
          errors.push({
            user: userIndex,
            request: requestIndex,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          })
        }
        
        const endTime = performance.now()
        responseTimes.push(endTime - startTime)

        // Add delay between requests
        if (requestIndex < requestsPerUser - 1 && delayBetweenRequests > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenRequests))
        }
      }
    })

    await Promise.all(userPromises)

    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      errors,
    }
  }

  /**
   * API endpoint documentation generator
   */
  static generateApiDocumentation(endpoint: {
    path: string
    method: string
    description: string
    authentication?: boolean
    parameters?: {
      name: string
      type: string
      required: boolean
      description: string
      example?: any
    }[]
    requestBody?: {
      type: string
      properties: Record<string, {
        type: string
        required: boolean
        description: string
        example?: any
      }>
    }
    responses?: {
      status: number
      description: string
      example: any
    }[]
    examples?: {
      name: string
      description: string
      request: any
      response: any
    }[]
  }): string {
    const {
      path,
      method,
      description,
      authentication = false,
      parameters = [],
      requestBody,
      responses = [],
      examples = [],
    } = endpoint

    let doc = `## ${method.toUpperCase()} ${path}\n\n`
    doc += `${description}\n\n`

    if (authentication) {
      doc += `**Authentication:** Required\n\n`
    }

    if (parameters.length > 0) {
      doc += `### Parameters\n\n`
      doc += `| Name | Type | Required | Description | Example |\n`
      doc += `|------|------|----------|-------------|----------|\n`
      
      for (const param of parameters) {
        doc += `| ${param.name} | ${param.type} | ${param.required ? "Yes" : "No"} | ${param.description} | ${param.example ? JSON.stringify(param.example) : ""} |\n`
      }
      doc += `\n`
    }

    if (requestBody) {
      doc += `### Request Body\n\n`
      doc += `Type: \`${requestBody.type}\`\n\n`
      doc += `| Property | Type | Required | Description | Example |\n`
      doc += `|----------|------|----------|-------------|----------|\n`
      
      for (const [name, prop] of Object.entries(requestBody.properties)) {
        doc += `| ${name} | ${prop.type} | ${prop.required ? "Yes" : "No"} | ${prop.description} | ${prop.example ? JSON.stringify(prop.example) : ""} |\n`
      }
      doc += `\n`
    }

    if (responses.length > 0) {
      doc += `### Responses\n\n`
      
      for (const response of responses) {
        doc += `#### ${response.status}\n`
        doc += `${response.description}\n\n`
        doc += `\`\`\`json\n${JSON.stringify(response.example, null, 2)}\n\`\`\`\n\n`
      }
    }

    if (examples.length > 0) {
      doc += `### Examples\n\n`
      
      for (const example of examples) {
        doc += `#### ${example.name}\n`
        doc += `${example.description}\n\n`
        doc += `**Request:**\n`
        doc += `\`\`\`json\n${JSON.stringify(example.request, null, 2)}\n\`\`\`\n\n`
        doc += `**Response:**\n`
        doc += `\`\`\`json\n${JSON.stringify(example.response, null, 2)}\n\`\`\`\n\n`
      }
    }

    return doc
  }

  /**
   * API contract testing
   */
  static validateApiContract(
    response: any,
    expectedSchema: {
      type: "success" | "error"
      properties?: Record<string, string>
      required?: string[]
    }
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Basic response validation
    const validation = this.validateApiResponse(response)
    if (!validation.isValid) {
      errors.push(...validation.errors)
    }

    // Type validation
    if (validation.type !== expectedSchema.type) {
      errors.push(`Expected ${expectedSchema.type} response, got ${validation.type}`)
    }

    // Property validation
    if (expectedSchema.properties && response.data) {
      for (const [property, expectedType] of Object.entries(expectedSchema.properties)) {
        const value = response.data[property]
        const actualType = Array.isArray(value) ? "array" : typeof value

        if (actualType !== expectedType) {
          errors.push(`Property '${property}' expected type '${expectedType}', got '${actualType}'`)
        }
      }
    }

    // Required fields validation
    if (expectedSchema.required && response.data) {
      for (const requiredField of expectedSchema.required) {
        if (!(requiredField in response.data)) {
          errors.push(`Required field '${requiredField}' is missing`)
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}

/**
 * Development-only API testing routes
 */
export const ApiTestRoutes = {
  /**
   * Test route for validating error handling
   */
  testErrors: async (request: NextRequest) => {
    const url = new URL(request.url)
    const errorType = url.searchParams.get("type")

    switch (errorType) {
      case "validation":
        throw new ApiError(ApiErrorCode.VALIDATION_ERROR, "Test validation error", 400)
      case "auth":
        throw new ApiError(ApiErrorCode.UNAUTHORIZED, "Test auth error", 401)
      case "rate-limit":
        throw new ApiError(ApiErrorCode.RATE_LIMIT_EXCEEDED, "Test rate limit error", 429)
      case "internal":
        throw new ApiError(ApiErrorCode.INTERNAL_SERVER_ERROR, "Test internal error", 500)
      default:
        return new Response(JSON.stringify({
          success: true,
          message: "Error testing endpoint - use ?type=validation|auth|rate-limit|internal",
        }))
    }
  },

  /**
   * Test route for performance monitoring
   */
  testPerformance: async (request: NextRequest) => {
    const url = new URL(request.url)
    const delay = parseInt(url.searchParams.get("delay") || "0")
    const size = parseInt(url.searchParams.get("size") || "1000")

    // Simulate processing time
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    // Generate response data of specified size
    const data = Array.from({ length: size }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random(),
      timestamp: new Date().toISOString(),
    }))

    return new Response(JSON.stringify({
      success: true,
      data,
      meta: {
        delay,
        size: data.length,
        responseSize: JSON.stringify(data).length,
        timestamp: new Date().toISOString(),
      },
    }))
  },
}