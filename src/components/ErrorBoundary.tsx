import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Known DOM errors that can be safely ignored or recovered from
const RECOVERABLE_DOM_ERRORS = [
  'insertBefore',
  'removeChild',
  'appendChild',
  'Failed to execute',
  'Node was not found',
  'not a child of this node',
];

function isRecoverableDOMError(error: Error): boolean {
  const message = error.message || '';
  return RECOVERABLE_DOM_ERRORS.some(pattern => message.includes(pattern));
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  private errorHandler: ((event: ErrorEvent) => void) | null = null;
  private unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // For recoverable DOM errors, don't trigger error state immediately
    if (isRecoverableDOMError(error)) {
      console.warn('[ErrorBoundary] Recoverable DOM error intercepted:', error.message);
      return {};
    }
    return { hasError: true, error };
  }

  public componentDidMount() {
    // Global error handler for uncaught errors
    this.errorHandler = (event: ErrorEvent) => {
      const error = event.error;
      if (error && isRecoverableDOMError(error)) {
        console.warn('[ErrorBoundary] Global DOM error caught and suppressed:', error.message);
        event.preventDefault();
        return;
      }
      console.error('[ErrorBoundary] Global error:', event.message);
    };
    
    // Unhandled promise rejection handler
    this.unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      if (error && error.message && isRecoverableDOMError(error)) {
        console.warn('[ErrorBoundary] Unhandled promise rejection (DOM) suppressed:', error.message);
        event.preventDefault();
        return;
      }
    };

    window.addEventListener('error', this.errorHandler);
    window.addEventListener('unhandledrejection', this.unhandledRejectionHandler);
  }

  public componentWillUnmount() {
    if (this.errorHandler) {
      window.removeEventListener('error', this.errorHandler);
    }
    if (this.unhandledRejectionHandler) {
      window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error but don't crash for recoverable DOM errors
    if (isRecoverableDOMError(error)) {
      console.warn('[ErrorBoundary] Recoverable error in componentDidCatch:', error.message);
      // Auto-recover after a short delay
      setTimeout(() => {
        this.setState({ hasError: false, error: null, errorInfo: null });
      }, 100);
      return;
    }
    
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Coś poszło nie tak</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę lub wrócić do poprzedniej strony.
              </p>
              
              {this.state.error && (
                <details className="text-xs bg-muted p-2 rounded">
                  <summary className="cursor-pointer text-muted-foreground">Szczegóły błędu</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-destructive">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={this.handleRetry}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Spróbuj ponownie
                </Button>
                <Button onClick={this.handleReload}>
                  Odśwież stronę
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
