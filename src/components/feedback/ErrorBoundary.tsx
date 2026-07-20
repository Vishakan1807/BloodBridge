import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props  { children: ReactNode; }
interface State  { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[BloodBridge ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center gap-6 text-center px-4">
          <div className="w-20 h-20 rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center">
            <AlertOctagon size={36} className="text-warning" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-muted text-sm max-w-sm mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-xs text-danger/80 bg-surface-800 border border-surface-600 rounded-lg p-4 max-w-lg overflow-x-auto">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <Button
            variant="primary"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
