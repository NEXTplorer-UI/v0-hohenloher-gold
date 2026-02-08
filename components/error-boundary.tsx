"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[v0] ErrorBoundary caught error:", error.message)
    console.error("[v0] ErrorBoundary error stack:", error.stack)
    console.error("[v0] ErrorBoundary componentStack:", errorInfo.componentStack)
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle>Etwas ist schiefgelaufen</CardTitle>
              <CardDescription>Es gab einen unerwarteten Fehler beim Laden der Seite.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={this.resetError} className="w-full bg-transparent" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Erneut versuchen
              </Button>
              <Button onClick={() => (window.location.href = "/")} className="w-full">
                Zur Startseite
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook-basierte Alternative für funktionale Komponenten
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error("Error handled:", error.message)
  }
}
