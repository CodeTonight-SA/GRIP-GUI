'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary — prevents full-page crashes during live demo.
 * Swiss Nihilism: minimal, monospace, sharp. Shows error + retry button.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[GRIP] Error boundary caught:', error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[200px] p-8">
          <div className="max-w-md w-full border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-[var(--warning)]" strokeWidth={1.5} />
              <span className="font-mono text-sm font-bold tracking-widest text-[var(--foreground)]">
                COMPONENT ERROR
              </span>
            </div>
            <p className="font-mono text-xs text-[var(--muted-foreground)] mb-4 leading-relaxed">
              {this.props.fallbackMessage || 'Something went wrong rendering this section.'}
            </p>
            {this.state.error && (
              <pre className="font-mono text-[10px] text-[var(--muted-foreground)] bg-[var(--secondary)] p-3 mb-4 overflow-x-auto max-h-24">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] font-mono text-xs tracking-wider text-[var(--foreground)] hover:border-[var(--primary)] transition-colors"
            >
              <RotateCw className="w-3 h-3" strokeWidth={1.5} />
              RETRY
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
