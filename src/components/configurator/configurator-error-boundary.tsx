'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ConfiguratorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    console.error('Configurator error:', error, errorInfo)

    // In production, you could send this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking (Sentry, etc.)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <div className="w-16 h-16 mb-4 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Nastala chyba
          </h2>
          <p className="text-slate-600 mb-6 max-w-md">
            Omlouváme se, při zpracování konfigurace došlo k chybě.
            Zkuste to prosím znovu.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={this.handleReset}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Zkusit znovu
            </Button>
            <Button
              onClick={this.handleReload}
              className="gap-2 bg-gradient-to-r from-[#01384B] to-[#025a6e]"
            >
              Obnovit stránku
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mt-6 p-4 bg-slate-100 rounded-lg text-left text-xs text-red-600 max-w-full overflow-auto">
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack}
            </pre>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
