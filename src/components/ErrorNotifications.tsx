'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Info, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { globalErrorService, ErrorNotification } from '@/lib/service/GlobalErrorService';
import { ErrorRecoveryAction } from '@/lib/error-handler';

interface ErrorNotificationsProps {
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    maxVisible?: number;
    autoHide?: boolean;
    autoHideDelay?: number;
}

export function ErrorNotifications({
    position = 'top-right',
    maxVisible = 3,
    autoHide = true,
    autoHideDelay = 5000
}: ErrorNotificationsProps) {
    const [notifications, setNotifications] = useState<ErrorNotification[]>([]);
    const [hiddenNotifications, setHiddenNotifications] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Subscribe to notification updates
        const unsubscribe = globalErrorService.onNotificationsChange((newNotifications) => {
            setNotifications(newNotifications.filter(n => !n.dismissed));
        });

        // Load initial notifications
        setNotifications(globalErrorService.getNotifications().filter(n => !n.dismissed));

        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!autoHide) return;

        // Auto-hide notifications after delay
        const timers: NodeJS.Timeout[] = [];

        notifications.forEach((notification) => {
            if (notification.error.severity === 'low' || notification.error.severity === 'medium') {
                const timer = setTimeout(() => {
                    handleDismiss(notification.id);
                }, autoHideDelay);
                timers.push(timer);
            }
        });

        return () => {
            timers.forEach(timer => clearTimeout(timer));
        };
    }, [notifications, autoHide, autoHideDelay]);

    const handleDismiss = (id: string) => {
        globalErrorService.dismissNotification(id);
        setHiddenNotifications(prev => new Set(prev).add(id));
    };

    const handleRecoveryAction = (notification: ErrorNotification, action: ErrorRecoveryAction) => {
        try {
            action.action();
            if (action.type === 'retry') {
                handleDismiss(notification.id);
            }
        } catch (e) {
            console.error('Recovery action failed:', e);
        }
    };

    const getPositionClasses = () => {
        switch (position) {
            case 'top-left':
                return 'top-4 left-4';
            case 'bottom-right':
                return 'bottom-4 right-4';
            case 'bottom-left':
                return 'bottom-4 left-4';
            default:
                return 'top-4 right-4';
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical':
                return <XCircle className="h-5 w-5 text-red-600" />;
            case 'high':
                return <AlertCircle className="h-5 w-5 text-orange-600" />;
            case 'medium':
                return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
            case 'low':
                return <Info className="h-5 w-5 text-blue-600" />;
            default:
                return <AlertTriangle className="h-5 w-5 text-gray-600" />;
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'border-red-200 bg-red-50';
            case 'high':
                return 'border-orange-200 bg-orange-50';
            case 'medium':
                return 'border-yellow-200 bg-yellow-50';
            case 'low':
                return 'border-blue-200 bg-blue-50';
            default:
                return 'border-gray-200 bg-gray-50';
        }
    };

    const getBadgeColor = (severity: string) => {
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

    const visibleNotifications = notifications
        .filter(n => !hiddenNotifications.has(n.id))
        .slice(0, maxVisible);

    if (visibleNotifications.length === 0) {
        return null;
    }

    return (
        <div className={`fixed ${getPositionClasses()} z-50 space-y-2 max-w-sm w-full`}>
            {visibleNotifications.map((notification) => (
                <Card
                    key={notification.id}
                    className={`${getSeverityColor(notification.error.severity)} border shadow-lg animate-in slide-in-from-right-full duration-300`}
                >
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                                {getSeverityIcon(notification.error.severity)}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge
                                            variant="outline"
                                            className={`text-xs ${getBadgeColor(notification.error.severity)}`}
                                        >
                                            {notification.error.severity.toUpperCase()}
                                        </Badge>
                                        {notification.error.code && (
                                            <span className="text-xs text-gray-500 font-mono">
                                                {notification.error.code}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-gray-900 mb-1">
                                        {notification.error.userMessage}
                                    </p>
                                    {notification.error.context && (
                                        <p className="text-xs text-gray-600">
                                            Context: {notification.error.context}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDismiss(notification.id)}
                                className="h-6 w-6 p-0 hover:bg-gray-200"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Recovery Actions */}
                        {notification.error.recoveryActions && notification.error.recoveryActions.length > 0 && (
                            <div className="flex gap-2 mt-3">
                                {notification.error.recoveryActions.slice(0, 2).map((action, index) => (
                                    <Button
                                        key={index}
                                        variant={action.type === 'retry' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => handleRecoveryAction(notification, action)}
                                        className="text-xs h-7"
                                    >
                                        {action.type === 'retry' && <RefreshCw className="h-3 w-3 mr-1" />}
                                        {action.label}
                                    </Button>
                                ))}
                            </div>
                        )}

                        {/* Timestamp */}
                        <div className="text-xs text-gray-500 mt-2">
                            {new Date(notification.timestamp).toLocaleTimeString()}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// Hook for managing error notifications
export function useErrorNotifications() {
    const [notifications, setNotifications] = useState<ErrorNotification[]>([]);
    const [stats, setStats] = useState({
        totalErrors: 0,
        errorsBySeverity: {} as Record<string, number>,
        errorsByCode: {} as Record<string, number>,
        retryQueueSize: 0
    });

    useEffect(() => {
        const unsubscribe = globalErrorService.onNotificationsChange(setNotifications);

        // Update stats periodically
        const updateStats = () => {
            const errorStats = globalErrorService.getErrorStats();
            setStats({
                totalErrors: errorStats.totalErrors,
                errorsBySeverity: errorStats.errorsBySeverity,
                errorsByCode: errorStats.errorsByCode,
                retryQueueSize: errorStats.retryQueueSize
            });
        };

        updateStats();
        const statsInterval = setInterval(updateStats, 5000);

        return () => {
            unsubscribe();
            clearInterval(statsInterval);
        };
    }, []);

    const dismissNotification = (id: string) => {
        globalErrorService.dismissNotification(id);
    };

    const clearAllNotifications = () => {
        globalErrorService.clearNotifications();
    };

    const reportError = (error: Error, context: string, userId?: string) => {
        globalErrorService.reportError(error, context, userId);
    };

    const testError = (severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
        globalErrorService.testError(severity);
    };

    return {
        notifications,
        stats,
        dismissNotification,
        clearAllNotifications,
        reportError,
        testError
    };
}