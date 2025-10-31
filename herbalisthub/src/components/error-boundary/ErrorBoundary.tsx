"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  enableReset?: boolean
  resetText?: string
  showDetails?: boolean
  customTitle?: string
  customMessage?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substring(2, 15),
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    })

    // Log error details
    console.error("ErrorBoundary caught an error:", error, errorInfo)

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // In production, you might want to send this to a logging service
    if (process.env.NODE_ENV === "production") {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, { extra: errorInfo })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = "/dashboard"
  }

  handleGoBack = () => {
    window.history.back()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      const {
        customTitle = "Something went wrong",
        customMessage = "We're sorry, but something unexpected happened. Please try again.",
        enableReset = true,
        resetText = "Try again",
        showDetails = process.env.NODE_ENV === "development",
      } = this.props

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 px-4">
          <div className="w-full max-w-2xl">
            <Card className="border-red-200">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-red-900">{customTitle}</CardTitle>
                <CardDescription className="text-red-700">
                  {customMessage}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {this.state.errorId && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <strong>Error ID:</strong> {this.state.errorId}
                      <br />
                      Please include this ID when contacting support.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {enableReset && (
                    <Button onClick={this.handleReset} variant="default">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {resetText}
                    </Button>
                  )}
                  <Button onClick={this.handleReload} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload Page
                  </Button>
                  <Button onClick={this.handleGoHome} variant="outline">
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                  <Button onClick={this.handleGoBack} variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Go Back
                  </Button>
                </div>

                {showDetails && this.state.error && (
                  <details className="mt-6">
                    <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
                      Technical Details (Development Only)
                    </summary>
                    <div className="mt-3 p-4 bg-gray-50 rounded-md text-sm font-mono">
                      <div className="mb-4">
                        <strong>Error Message:</strong>
                        <div className="text-red-600 mt-1">{this.state.error.message}</div>
                      </div>
                      
                      {this.state.error.stack && (
                        <div className="mb-4">
                          <strong>Stack Trace:</strong>
                          <pre className="text-xs mt-1 whitespace-pre-wrap text-gray-600 max-h-48 overflow-y-auto">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}

                      {this.state.errorInfo?.componentStack && (
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="text-xs mt-1 whitespace-pre-wrap text-gray-600 max-h-48 overflow-y-auto">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                <div className="text-center text-sm text-gray-500 mt-6">
                  If this problem persists, please contact our support team with the error ID above.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for functional components to handle errors
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error("Error caught by useErrorHandler:", error, errorInfo)
    
    // In a real app, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === "production") {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, { extra: errorInfo })
    }
  }
}

// Higher-order component to wrap components with error boundary
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}