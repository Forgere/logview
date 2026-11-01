import {
  Show,
  ErrorBoundary as SolidErrorBoundary,
  createSignal,
} from 'solid-js'
import { RefreshCw, TriangleAlert } from 'lucide-solid'
import type { Component, JSX } from 'solid-js'

interface ErrorBoundaryProps {
  children: JSX.Element
  fallback?: (error: Error, reset: () => void) => JSX.Element
  onError?: (error: Error, errorInfo: string) => void
  resetKeys?: Array<any>
  title?: string
  description?: string
}

interface ErrorFallbackProps {
  error: Error
  reset: () => void
  title?: string
  description?: string
}

const DefaultErrorFallback: Component<ErrorFallbackProps> = (props) => {
  const [showDetails, setShowDetails] = createSignal(false)

  const handleReset = () => {
    props.reset()
  }

  return (
    <div class="flex items-center justify-center min-h-[200px] p-6 bg-surface border border-border rounded-lg">
      <div class="max-w-md w-full text-center">
        <div class="flex justify-center mb-4">
          <div class="p-3 bg-level-error/20 rounded-full border border-level-error/50">
            <TriangleAlert size={24} class="text-level-error" />
          </div>
        </div>

        <h3 class="text-lg font-medium text-foreground mb-2">
          {props.title || 'Something went wrong'}
        </h3>

        <p class="text-sm text-muted-foreground mb-4">
          {props.description ||
            'An unexpected error occurred. Please try refreshing the component.'}
        </p>

        <div class="flex justify-center gap-3 mb-4">
          <button
            onClick={handleReset}
            class="inline-flex items-center gap-2 px-4 py-2 bg-accent-brand hover:bg-accent-brand/80 text-accent-brand-foreground rounded-md text-sm font-medium transition-colors"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>

        <Show when={props.error.message}>
          <div class="text-left">
            <button
              onClick={() => setShowDetails(!showDetails())}
              class="text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              {showDetails() ? 'Hide' : 'Show'} error details
            </button>

            <Show when={showDetails()}>
              <div class="p-3 bg-surface-2 border border-border rounded text-xs text-muted-foreground font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                {props.error.message}
                {'\n\n'}
                {props.error.stack}
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  )
}

export const ErrorBoundary: Component<ErrorBoundaryProps> = (props) => {
  return (
    <SolidErrorBoundary
      fallback={(err, reset) => {
        if (props.fallback) {
          return props.fallback(err, reset)
        }
        return (
          <DefaultErrorFallback
            error={err}
            reset={reset}
            title={props.title}
            description={props.description}
          />
        )
      }}
    >
      {props.children}
    </SolidErrorBoundary>
  )
}

// Specialized error boundaries for different components
export const LogViewerErrorBoundary: Component<{ children: JSX.Element }> = (
  props,
) => {
  return (
    <ErrorBoundary
      title="Log Viewer Error"
      description="Unable to render the log viewer. This might be due to invalid log data or editor issues."
      onError={(error) => {
        console.error('LogViewer error:', error)
      }}
    >
      {props.children}
    </ErrorBoundary>
  )
}

export const SearchErrorBoundary: Component<{ children: JSX.Element }> = (
  props,
) => {
  return (
    <ErrorBoundary
      title="Search Error"
      description="Unable to process search. The search query might contain invalid patterns."
      onError={(error) => {
        console.error('Search error:', error)
      }}
    >
      {props.children}
    </ErrorBoundary>
  )
}

export const FileOperationsErrorBoundary: Component<{
  children: JSX.Element
}> = (props) => {
  return (
    <ErrorBoundary
      title="File Operations Error"
      description="Unable to handle file operations. The file might be corrupted or inaccessible."
      onError={(error) => {
        console.error('File operations error:', error)
      }}
    >
      {props.children}
    </ErrorBoundary>
  )
}

export const ModalErrorBoundary: Component<{ children: JSX.Element }> = (
  props,
) => {
  return (
    <ErrorBoundary
      title="Modal Error"
      description="Unable to display this modal. Please try again."
      onError={(error) => {
        console.error('Modal error:', error)
      }}
    >
      {props.children}
    </ErrorBoundary>
  )
}
