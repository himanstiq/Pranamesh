'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs errors, and displays a fallback UI instead of crashing.
 * 
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        // Update state so the next render shows the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // Log error to console for debugging
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

        this.setState({ errorInfo });

        // In production, you could send this to an error reporting service
        // Example: logErrorToService(error, errorInfo);
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleReload = (): void => {
        window.location.reload();
    };

    render(): ReactNode {
        const { hasError, error } = this.state;
        const { children, fallback } = this.props;

        if (hasError) {
            // Custom fallback UI if provided
            if (fallback) {
                return fallback;
            }

            // Default professional error UI
            return (
                <div className="min-h-[400px] flex items-center justify-center p-8">
                    <div className="max-w-md w-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-8 text-center shadow-lg">
                        {/* Error Icon */}
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>

                        {/* Error Title */}
                        <h2 className="text-xl font-bold text-text-dark dark:text-text-light mb-2">
                            Something went wrong
                        </h2>

                        {/* Error Message */}
                        <p className="text-text-muted-light dark:text-text-muted mb-6">
                            We encountered an unexpected error. Please try again or refresh the page.
                        </p>

                        {/* Error Details (Development Only) */}
                        {process.env.NODE_ENV === 'development' && error && (
                            <div className="mb-6 p-4 bg-red-500/5 border border-red-500/20 rounded-lg text-left">
                                <p className="text-xs font-mono text-red-500 break-all">
                                    {error.message}
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={this.handleReset}
                                className="flex items-center gap-2 px-4 py-2.5 bg-primary-light-theme dark:bg-primary text-white font-medium rounded-lg hover:opacity-90 transition-all"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="px-4 py-2.5 border border-border-light dark:border-border-dark text-text-dark dark:text-text-light font-medium rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                            >
                                Reload Page
                            </button>
                        </div>

                        {/* Support Link */}
                        <p className="mt-6 text-xs text-text-muted-light dark:text-text-muted">
                            If this problem persists, please contact{' '}
                            <a href="mailto:feedback@aqi.gov.in" className="text-primary-light-theme dark:text-primary hover:underline">
                                support
                            </a>
                            .
                        </p>
                    </div>
                </div>
            );
        }

        return children;
    }
}

export default ErrorBoundary;
