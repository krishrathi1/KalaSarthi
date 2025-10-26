'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, MessageCircle, Bug, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { errorHandler, EnhancedErrorInfo, ErrorRecoveryAction } from '@/lib/error-handler';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: EnhancedErrorInfo) => void;
    showTechnicalDetails?: boolean;
    userId?: string;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
    enhancedError?: EnhancedErrorInfo;
    showDetails: boolean;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
    private unsubscribe?: () => void;

    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            showDetails: false
        };
    }

    componentDidMount() {
        // Subscribe to error handler events
        this.unsubscribe = errorHandler.onError((enhancedError) => {
            if (this.props.onError) {
                this.props.onError(enhancedError);
            }
        });
    }

    componentWillUnmount() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            showDetails: false
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('EnhancedErrorBoundary caught an error:', error, errorInfo);

        // Create enhanced error info
        const enhancedError = errorHandler.handleApiError(
            error,
            'error-boundary',
            this.props.userId
        );

        this.setState({
            error,
            errorInfo,
            enhancedError
        });

        if (this.props.onError) {
            this.props.onError(enhancedError);
        }
    }

    handleRetry = () => {
        this.setState({
            hasError: false,
            error: undefined,
            errorInfo: undefined,
            enhancedError: undefined,
            showDetails: false
        });
    };

    handleRecoveryAction = (action: ErrorRecoveryAction) => {
        try {
            action.action();
            if (action.type === 'retry') {
                this.handleRetry();
            }
        } catch (e) {
            console.error('Recovery action failed:', e);
        }
    };

    getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical':
                return <AlertTriangle className="h-5 w-5 text-red-600" />;
            case 'high':
                return <AlertTriangle className="h-5 w-5 text-orange-600" />;
            case 'medium':
                return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
            case 'low':
                return <AlertTriangle className="h-5 w-5 text-blue-600" />;
            default:
                return <AlertTriangle className="h-5 w-5 text-gray-600" />;
        }
    };

    getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'high':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const { enhancedError, error, errorInfo } = this.state;

            return (
                <Card className="w-full max-w-2xl mx-auto mt-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {enhancedError ?
                                this.getSeverityIcon(enhancedError.severity) :
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            }
                            Something went wrong
                            {enhancedError && (
                                <Badge
                                    variant="outline"
                                    className={this.getSeverityColor(enhancedError.severity)}
                                >
                                    {enhancedError.severity.toUpperCase()}
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            {enhancedError?.userMessage || 'An unexpected error occurred. Please try again.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Recovery Actions */}
                        {enhancedError?.recoveryActions && enhancedError.recoveryActions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {enhancedError.recoveryActions.map((action, index) => (
                                    <Button
                                        key={index}
                                        variant={action.type === 'retry' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => this.handleRecoveryAction(action)}
                                        className="flex items-center gap-2"
                                    >
                                        {action.type === 'retry' && <RefreshCw className="h-4 w-4" />}
                                        {action.type === 'fallback' && <MessageCircle className="h-4 w-4" />}
                                        {action.type === 'refresh' && <RefreshCw className="h-4 w-4" />}
                                        {action.label}
                                    </Button>
                                ))}
                            </div>
                        )}

                        {/* Default retry button if no recovery actions */}
                        {(!enhancedError?.recoveryActions || enhancedError.recoveryActions.length === 0) && (
                            <Button onClick={this.handleRetry} className="w-full">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Try Again
                            </Button>
                        )}

                        {/* Error Details (Development or if enabled) */}
                        {(process.env.NODE_ENV === 'development' || this.props.showTechnicalDetails) && (
                            <Collapsible
                                open={this.state.showDetails}
                                onOpenChange={(open) => this.setState({ showDetails: open })}
                            >
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="w-full justify-start">
                                        <Bug className="h-4 w-4 mr-2" />
                                        {this.state.showDetails ? 'Hide' : 'Show'} Technical Details
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-3">
                                    {enhancedError && (
                                        <div className="p-3 bg-gray-50 rounded-md space-y-2">
                                            <div className="text-sm">
                                                <strong>Error Code:</strong> {enhancedError.code}
                                            </div>
                                            <div className="text-sm">
                                                <strong>Context:</strong> {enhancedError.context}
                                            </div>
                                            <div className="text-sm">
                                                <strong>Timestamp:</strong> {new Date(enhancedError.timestamp).toLocaleString()}
                                            </div>
                                            {enhancedError.technicalDetails && (
                                                <div className="text-sm">
                                                    <strong>Stack Trace:</strong>
                                                    <pre className="text-xs mt-1 p-2 bg-white rounded border overflow-auto max-h-32">
                                                        {enhancedError.technicalDetails}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {error && !enhancedError && (
                                        <div className="p-3 bg-red-50 rounded-md">
                                            <p className="text-sm text-red-800 font-mono">
                                                {error.message}
                                            </p>
                                            {error.stack && (
                                                <pre className="text-xs mt-2 text-red-700 overflow-auto max-h-32">
                                                    {error.stack}
                                                </pre>
                                            )}
                                        </div>
                                    )}
                                </CollapsibleContent>
                            </Collapsible>
                        )}

                        {/* Security Notice for Critical Errors */}
                        {enhancedError?.severity === 'critical' && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                                <Shield className="h-5 w-5 text-red-600 mt-0.5" />
                                <div className="text-sm text-red-800">
                                    <strong>Security Notice:</strong> This error has been logged for security monitoring.
                                    If you continue to experience issues, please contact support.
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            );
        }

        return this.props.children;
    }
}

// Hook version for functional components with enhanced error handling
export function useEnhancedErrorHandler(userId?: string) {
    const [error, setError] = React.useState<EnhancedErrorInfo | null>(null);

    const resetError = React.useCallback(() => {
        setError(null);
    }, []);

    const handleError = React.useCallback((error: Error, context: string = 'component') => {
        console.error('Error caught by useEnhancedErrorHandler:', error);
        const enhancedError = errorHandler.handleApiError(error, context, userId);
        setError(enhancedError);
    }, [userId]);

    const handleRecoveryAction = React.useCallback((action: ErrorRecoveryAction) => {
        try {
            action.action();
            if (action.type === 'retry') {
                resetError();
            }
        } catch (e) {
            console.error('Recovery action failed:', e);
        }
    }, [resetError]);

    React.useEffect(() => {
        if (error && error.severity === 'critical') {
            throw new Error(error.message);
        }
    }, [error]);

    return {
        error,
        handleError,
        resetError,
        handleRecoveryAction
    };
}

// Higher-order component for enhanced error handling
export function withEnhancedErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    options?: {
        fallback?: ReactNode;
        showTechnicalDetails?: boolean;
        onError?: (error: EnhancedErrorInfo) => void;
    }
) {
    return function WithEnhancedErrorBoundaryComponent(props: P & { userId?: string }) {
        return (
            <EnhancedErrorBoundary
                fallback={options?.fallback}
                showTechnicalDetails={options?.showTechnicalDetails}
                onError={options?.onError}
                userId={props.userId}
            >
                <Component {...props} />
            </EnhancedErrorBoundary>
        );
    };
}