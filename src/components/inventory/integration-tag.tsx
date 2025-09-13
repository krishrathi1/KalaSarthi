'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
    Store,
    ShoppingCart,
    Palette,
    CheckCircle,
    AlertCircle,
    Loader2,
    ExternalLink,
    Settings,
    RefreshCw,
    Globe
} from 'lucide-react';
import { useAmazonSPAPI } from '@/hooks/use-amazon';
import { useMounted } from '@/hooks/use-mounted';
import { useToast } from "@/hooks/use-toast";

interface IntegrationStatus {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    status: 'connected' | 'disconnected' | 'error' | 'pending';
    isAvailable: boolean;
    features?: string[];
    lastSync?: Date;
    errorMessage?: string;
}

export default function IntegrationsTab() {
    const mounted = useMounted();
    const { toast } = useToast();
    const [syncing, setSyncing] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);

    // Amazon SP-API hook
    const {
        config: amazonConfig,
        isConnected: isAmazonConnected,
        isLoading: isAmazonLoading,
        error: amazonError,
        authenticate,
        testConnection,
        getMarketplaceParticipation,
        clearError
    } = useAmazonSPAPI();

    // Initialize Amazon connection on component mount
    useEffect(() => {
        const initialize = async () => {
            setIsInitializing(true);
            try {
                if (mounted) {
                    await authenticate();
                }
            } catch (error) {
                console.error('Failed to initialize Amazon connection:', error);
            } finally {
                setIsInitializing(false);
            }
        };

        initialize();
    }, [mounted, authenticate]);

    const handleConnect = async (integrationId: string) => {
        if (integrationId === 'amazon') {
            try {
                clearError();
                const authResult = await authenticate();
                
                if (authResult.success) {
                    toast({
                        title: 'Connected Successfully',
                        description: 'Amazon SP-API connected successfully.',
                        variant: 'default'
                    });
                } else {
                    toast({
                        title: 'Connection Failed',
                        description: authResult.error || 'Failed to connect to Amazon SP-API.',
                        variant: 'destructive'
                    });
                }
            } catch (error) {
                toast({
                    title: 'Connection Error',
                    description: error instanceof Error ? error.message : 'An unexpected error occurred.',
                    variant: 'destructive'
                });
            }
        } else {
            // Handle other integrations
            toast({
                title: 'Coming Soon',
                description: `${integrationId} integration is not available yet.`,
                variant: 'default'
            });
        }
    };

    const handleTestConnection = async () => {
        try {
            setSyncing(true);
            const isConnected = await testConnection();
            
            if (isConnected) {
                toast({
                    title: 'Connection Test Successful',
                    description: 'Amazon SP-API is working correctly.',
                    variant: 'default'
                });
            } else {
                toast({
                    title: 'Connection Test Failed',
                    description: 'Unable to connect to Amazon SP-API. Please check your credentials.',
                    variant: 'destructive'
                });
            }
        } catch (error) {
            toast({
                title: 'Test Failed',
                description: error instanceof Error ? error.message : 'Connection test failed.',
                variant: 'destructive'
            });
        } finally {
            setSyncing(false);
        }
    };

    const handleSync = async () => {
        if (!isAmazonConnected) {
            toast({
                title: 'Not Connected',
                description: 'Please connect to Amazon SP-API first.',
                variant: 'destructive'
            });
            return;
        }

        setSyncing(true);
        try {
            // Test the connection and get marketplace participation
            const participationData = await getMarketplaceParticipation();
            
            if (participationData && participationData.length > 0) {
                toast({
                    title: 'Sync Successful',
                    description: `Found ${participationData.length} active marketplace(s).`,
                    variant: 'default'
                });
            } else {
                toast({
                    title: 'Sync Warning',
                    description: 'No active marketplaces found. Check your seller account status.',
                    variant: 'destructive'
                });
            }
        } catch (error) {
            toast({
                title: 'Sync Failed',
                description: error instanceof Error ? error.message : 'Failed to sync with Amazon.',
                variant: 'destructive'
            });
        } finally {
            setSyncing(false);
        }
    };

    // Determine Amazon integration status
    const getAmazonStatus = (): 'connected' | 'disconnected' | 'error' | 'pending' => {
        if (isInitializing || isAmazonLoading) return 'pending';
        if (amazonError) return 'error';
        if (isAmazonConnected) return 'connected';
        return 'disconnected';
    };

    const integrations: IntegrationStatus[] = [
        {
            id: 'amazon',
            name: 'Amazon Marketplace',
            description: 'Sell your handcrafted products to millions of Amazon customers worldwide.',
            icon: <Store className="h-6 w-6 text-orange-500" />,
            status: getAmazonStatus(),
            isAvailable: true,
            features: [
                'Automatic product listing',
                'Inventory synchronization',
                'Order management',
                'Real-time sales data'
            ],
            lastSync: isAmazonConnected ? new Date(Date.now() - 1000 * 60 * 30) : undefined, // 30 min ago
            errorMessage: amazonError || undefined,
        },
        {
            id: 'flipkart',
            name: 'Flipkart',
            description: 'Reach India\'s largest e-commerce marketplace with over 300 million customers.',
            icon: <ShoppingCart className="h-6 w-6 text-blue-600" />,
            status: 'disconnected',
            isAvailable: false,
            features: [
                'Product catalog management',
                'Multi-language support',
                'Regional shipping options',
                'Local payment methods'
            ],
        },
        {
            id: 'etsy',
            name: 'Etsy',
            description: 'Perfect marketplace for unique, handcrafted, and vintage items.',
            icon: <Palette className="h-6 w-6 text-orange-600" />,
            status: 'disconnected',
            isAvailable: false,
            features: [
                'Artisan-focused audience',
                'Story-driven listings',
                'Global shipping tools',
                'Marketing analytics'
            ],
        },
        {
            id: 'shopify',
            name: 'Shopify',
            description: 'Create your own online store with powerful e-commerce tools.',
            icon: <Globe className="h-6 w-6 text-green-600" />,
            status: 'disconnected',
            isAvailable: false,
            features: [
                'Custom storefront',
                'Payment processing',
                'SEO optimization',
                'Mobile responsive'
            ],
        }
    ];

    const getStatusIcon = (status: IntegrationStatus['status']) => {
        switch (status) {
            case 'connected':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'error':
                return <AlertCircle className="h-4 w-4 text-red-600" />;
            case 'pending':
                return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
            default:
                return <AlertCircle className="h-4 w-4 text-gray-400" />;
        }
    };

    const getStatusBadge = (status: IntegrationStatus['status']) => {
        switch (status) {
            case 'connected':
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Connected</Badge>;
            case 'error':
                return <Badge variant="destructive">Error</Badge>;
            case 'pending':
                return <Badge variant="secondary">Connecting...</Badge>;
            default:
                return <Badge variant="outline">Not Connected</Badge>;
        }
    };

    const getConnectionStatus = () => {
        if (isInitializing || isAmazonLoading) {
            return { status: 'Connecting...', color: 'bg-orange-500' };
        } else if (isAmazonConnected) {
            return { status: 'Ready', color: 'bg-green-500' };
        } else {
            return { status: 'Disconnected', color: 'bg-red-500' };
        }
    };

    const connectionStatus = getConnectionStatus();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Marketplace Integrations</h2>
                    <p className="text-muted-foreground">
                        Connect your inventory to multiple sales channels and expand your reach.
                    </p>
                </div>
                <Button onClick={handleSync} disabled={syncing || !isAmazonConnected} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Sync All'}
                </Button>
            </div>

            {/* Amazon Connection Status - Enhanced */}
            <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${connectionStatus.color}`} />
                        <div>
                            <span className="font-medium">
                                Amazon SP-API: {connectionStatus.status}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                    Sandbox Mode
                                </Badge>
                                {isAmazonConnected && (
                                    <Badge variant="outline" className="text-xs">
                                        India Marketplace
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {isAmazonConnected && (
                            <Button size="sm" variant="outline" onClick={handleTestConnection} disabled={syncing}>
                                {syncing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    'Test Connection'
                                )}
                            </Button>
                        )}
                    </div>
                </div>
                {amazonError && (
                    <Alert variant="destructive" className="mt-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            {amazonError}
                        </AlertDescription>
                    </Alert>
                )}
                {isAmazonConnected && (
                    <div className="mt-3 text-sm text-muted-foreground">
                        Connected and ready to publish products to Amazon India marketplace.
                        {integrations[0]?.lastSync && (
                            <span className="ml-2">
                                Last synced: {integrations[0].lastSync.toLocaleString()}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Integration Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Active Integrations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-2xl font-bold">
                            {integrations.filter(i => i.status === 'connected').length}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Available Channels
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-2xl font-bold">
                            {integrations.filter(i => i.isAvailable).length}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Coming Soon
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-2xl font-bold">
                            {integrations.filter(i => !i.isAvailable).length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Integrations List */}
            <div className="space-y-4">
                {integrations.map((integration) => (
                    <Card key={integration.id} className={integration.isAvailable ? '' : 'opacity-60'}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-muted rounded-lg">
                                        {integration.icon}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-lg">{integration.name}</h3>
                                            {getStatusIcon(integration.status)}
                                            {getStatusBadge(integration.status)}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {integration.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {integration.status === 'connected' && (
                                        <>
                                            <Button variant="outline" size="sm">
                                                <Settings className="h-4 w-4 mr-1" />
                                                Configure
                                            </Button>
                                        </>
                                    )}

                                    {integration.status !== 'connected' && integration.isAvailable && (
                                        <Button
                                            onClick={() => handleConnect(integration.id)}
                                            disabled={
                                                (isAmazonLoading && integration.id === 'amazon') ||
                                                (integration.status === 'pending')
                                            }
                                            size="sm"
                                        >
                                            {(isAmazonLoading && integration.id === 'amazon') || integration.status === 'pending' ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                    Connecting...
                                                </>
                                            ) : (
                                                'Connect'
                                            )}
                                        </Button>
                                    )}

                                    {!integration.isAvailable && (
                                        <Button variant="outline" size="sm" disabled>
                                            Coming Soon
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                            {/* Error Message */}
                            {integration.errorMessage && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        {integration.errorMessage}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Connection Details */}
                            {integration.status === 'connected' && integration.lastSync && (
                                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Last synchronized:</span>
                                        <span>{integration.lastSync.toLocaleString()}</span>
                                    </div>
                                    {integration.id === 'amazon' && isAmazonConnected && (
                                        <div className="flex items-center justify-between text-sm mt-1">
                                            <span className="text-muted-foreground">Marketplace:</span>
                                            <span>Amazon India (A21TJRUUN4KGV)</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Features */}
                            {integration.features && (
                                <div>
                                    <h4 className="font-medium mb-2 text-sm">Features:</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {integration.features.map((feature, index) => (
                                            <div key={index} className="flex items-center gap-2 text-sm">
                                                <CheckCircle className="h-3 w-3 text-green-600" />
                                                <span>{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Additional Actions */}
                            {integration.status === 'connected' && (
                                <div className="mt-4 pt-4 border-t flex items-center gap-2">
                                    <Button variant="outline" size="sm">
                                        <ExternalLink className="h-4 w-4 mr-1" />
                                        View on {integration.name}
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={integration.id === 'amazon' ? handleSync : undefined}
                                        disabled={syncing}
                                    >
                                        <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                                        Sync Now
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Help Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Need Help?</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Having trouble connecting to a marketplace? Check out our integration guides:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Amazon Setup Guide
                            </Button>
                            <Button variant="outline" size="sm">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                API Documentation
                            </Button>
                            <Button variant="outline" size="sm">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Contact Support
                            </Button>
                        </div>
                        {amazonError && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                <p className="text-sm text-yellow-800">
                                    <strong>Troubleshooting Tip:</strong> Amazon SP-API connection issues are often related to:
                                </p>
                                <ul className="list-disc list-inside text-sm text-yellow-700 mt-2 space-y-1">
                                    <li>Incorrect client ID or secret</li>
                                    <li>Invalid or expired refresh token</li>
                                    <li>Missing marketplace permissions</li>
                                    <li>Sandbox vs production environment mismatch</li>
                                </ul>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}