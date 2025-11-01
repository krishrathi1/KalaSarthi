'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Package, ShoppingCart, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { IProductDocument } from '@/lib/models/Product';
import { useOrders } from '@/hooks/use-orders';
import ProductTable from './product-table';
import OrderTable from './order-table';
import IntegrationsTab from './integration-tag';
import ProductGrid from '@/components/profile/ProductGrid';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useOffline } from '@/hooks/use-offline';
import { notificationManager, notifySyncComplete } from '@/lib/notifications';

interface InventoryDashboardProps {
    artisanId: string;
}

interface DashboardStats {
    totalProducts: number;
    publishedProducts: number;
    totalStock: number;
    lowStockProducts: number;
    amazonListedProducts: number;
}

export default function InventoryDashboard({ artisanId }: InventoryDashboardProps) {
    const [products, setProducts] = useState<IProductDocument[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [productError, setProductError] = useState<string | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [updating, setUpdating] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    // Offline support
    const {
        isOnline,
        isSyncing,
        storeOffline,
        getOfflineData,
        sync,
    } = useOffline();

    // Track previous online state
    const previousOnlineState = useRef(isOnline);

    const {
        orders,
        loading: ordersLoading,
        error: ordersError,
        fetchOrders
    } = useOrders(artisanId);

    // Request notification permission on mount
    useEffect(() => {
        if (notificationManager.isSupported() && notificationManager.getPermission() === 'default') {
            setTimeout(() => {
                notificationManager.requestPermission();
            }, 3000);
        }
    }, []);

    // Detect connection restoration
    useEffect(() => {
        if (!previousOnlineState.current && isOnline) {
            if (notificationManager.getPermission() === 'granted') {
                notificationManager.notifyConnectionRestored();
            }
            toast({
                title: "Connection Restored",
                description: "You're back online! Refreshing inventory...",
            });
            fetchProducts();
        }
        previousOnlineState.current = isOnline;
    }, [isOnline]);

    // Fetch products from API with offline support
    const fetchProducts = useCallback(async () => {
        if (!artisanId) {
            console.log('No artisanId provided');
            return;
        }

        setIsLoadingProducts(true);
        setProductError(null);

        try {
            if (isOnline) {
                // Fetch from API when online
                console.log('Fetching products for artisan:', artisanId);
                const response = await fetch(`/api/products?artisanId=${artisanId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                const data = await response.json();
                console.log('Products API response:', data);

                if (response.ok && data.success) {
                    setProducts(data.data || []);
                    setLastUpdated(new Date());
                    console.log('Products loaded successfully:', data.data?.length || 0);

                    // Cache products for offline use
                    for (const product of data.data || []) {
                        await storeOffline('product', product, product.productId, true);
                    }
                } else {
                    const errorMessage = data.error || `Failed to fetch products: ${response.statusText}`;
                    setProductError(errorMessage);
                    console.error('Products API error:', errorMessage);
                }
            } else {
                // Load from offline storage when offline
                const offlineProducts = await getOfflineData('product') as IProductDocument[];
                const artisanProducts = offlineProducts.filter(p => p.artisanId === artisanId);

                if (artisanProducts.length > 0) {
                    setProducts(artisanProducts);
                    toast({
                        title: "Working Offline",
                        description: `Showing ${artisanProducts.length} cached products.`,
                        duration: 5000,
                    });
                } else {
                    setProductError('No offline data available');
                    toast({
                        title: "No Offline Data",
                        description: "Please connect to the internet to load products.",
                        variant: "destructive",
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching products:', error);

            // Fallback to offline data on error
            try {
                const offlineProducts = await getOfflineData('product') as IProductDocument[];
                const artisanProducts = offlineProducts.filter(p => p.artisanId === artisanId);

                if (artisanProducts.length > 0) {
                    setProducts(artisanProducts);
                    toast({
                        title: "Using Cached Data",
                        description: "Couldn't reach server. Showing cached products.",
                        variant: "destructive",
                    });
                } else {
                    setProductError('Network error occurred');
                }
            } catch (offlineError) {
                console.error('Error loading offline products:', offlineError);
                setProductError('Network error occurred while fetching products');
            }
        } finally {
            setIsLoadingProducts(false);
        }
    }, [artisanId, isOnline, storeOffline, getOfflineData, toast]);

    // Calculate dashboard statistics
    const calculateStats = useCallback((products: IProductDocument[]): DashboardStats => {
        return {
            totalProducts: products.length,
            publishedProducts: products.filter(p => p.status === 'published').length,
            totalStock: products.reduce((sum, p) => sum + (p.inventory?.quantity || 0), 0),
            lowStockProducts: products.filter(p => (p.inventory?.quantity || 0) <= 5).length,
            amazonListedProducts: products.filter(p => p.amazonListing?.isListed).length,
        };
    }, []);

    // Update product stock
    const updateProductStock = async (productId: string, newQuantity: number) => {
        try {
            console.log(`Updating stock for product ${productId} to ${newQuantity}`);

            const response = await fetch(`/api/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inventory: {
                        quantity: newQuantity,
                        isAvailable: newQuantity > 0,
                    },
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Update local state
                setProducts(prev =>
                    prev.map(product => {
                        if (product.productId === productId) {
                            // Directly mutate the inventory fields
                            if (product.inventory) {
                                product.inventory.quantity = newQuantity;
                                product.inventory.isAvailable = newQuantity > 0;
                            }
                        }
                        return product;
                    })
                );
                console.log('Stock updated successfully');
                return { success: true };
            } else {
                console.error('Failed to update stock:', data.error);
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Network error updating stock:', error);
            return { success: false, error: 'Network error occurred' };
        }
    };

    // Product status change
    const handleProductStatusChange = async (productId: string, newStatus: 'published' | 'draft' | 'archived') => {
        setUpdating(productId);
        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                setProducts(prev => prev.map(p => p.productId === productId ? ({ ...p, status: newStatus } as IProductDocument) : p));
                toast({ title: 'Status updated', description: `Product moved to ${newStatus}.` });
            } else {
                toast({ title: 'Failed to update', description: data.error || 'Try again later', variant: 'destructive' });
            }
        } catch (e) {
            toast({ title: 'Network error', description: 'Could not update product status', variant: 'destructive' });
        } finally {
            setUpdating(null);
        }
    };

    const handleEditProduct = (productId: string) => {
        router.push(`/smart-product-creator?edit=${productId}`);
    };

    const handleDeleteProduct = async (productId: string) => {
        setDeleting(productId);
        try {
            const response = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
            const data = await response.json();
            if (response.ok && data.success) {
                setProducts(prev => prev.filter(p => p.productId !== productId));
                toast({ title: 'Product deleted', description: 'The product was removed.' });
            } else {
                toast({ title: 'Delete failed', description: data.error || 'Try again later', variant: 'destructive' });
            }
        } catch (e) {
            toast({ title: 'Network error', description: 'Could not delete product', variant: 'destructive' });
        } finally {
            setDeleting(null);
        }
    };

    // Update Amazon listing
    const updateAmazonListing = async (productId: string, listingData: any) => {
        try {
            console.log(`Updating Amazon listing for product ${productId}`);

            const response = await fetch(`/api/products/${productId}/amazon`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(listingData),
            });

            const data = await response.json();

            if (response.ok) {
                // Update local state
                setProducts(prev =>
                    prev.map(product => {
                        if (product.productId === productId) {
                            if (product.amazonListing) {
                                Object.assign(product.amazonListing, {
                                    ...listingData,
                                    isListed: true,
                                    lastSync: new Date(),
                                });
                            } else {
                                product.amazonListing = {
                                    ...listingData,
                                    isListed: true,
                                    lastSync: new Date(),
                                };
                            }
                        }
                        return product;
                    })
                );
                console.log('Amazon listing updated successfully');
                return { success: true };
            } else {
                console.error('Failed to update Amazon listing:', data.error);
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Network error updating Amazon listing:', error);
            return { success: false, error: 'Network error occurred' };
        }
    };

    // Refresh all data
    const refreshData = async () => {
        console.log('Refreshing all inventory data...');
        await Promise.all([
            fetchProducts(),
            fetchOrders && fetchOrders()
        ]);
    };

    // Initialize data on mount and when artisanId changes
    useEffect(() => {
        console.log('InventoryDashboard effect: artisanId changed:', artisanId);
        if (artisanId) {
            fetchProducts();
        } else {
            setProducts([]);
            setStats(null);
        }
    }, [artisanId, fetchProducts]);

    // Update stats when products change
    useEffect(() => {
        if (products.length >= 0) {
            const newStats = calculateStats(products);
            setStats(newStats);
            console.log('Dashboard stats updated:', newStats);
        }
    }, [products, calculateStats]);

    if (!artisanId) {
        return (
            <div className="container mx-auto py-8">
                <Alert>
                    <AlertDescription>
                        No artisan ID provided. Please log in to access your inventory.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with refresh button and offline indicator */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Inventory Management</h1>
                        <p className="text-muted-foreground">
                            Last updated: {lastUpdated.toLocaleString()}
                        </p>
                    </div>

                    {/* Offline/Online Indicator */}
                    {isOnline ? (
                        <Badge variant="outline" className="gap-1 border-green-200 text-green-700 bg-green-50">
                            <Wifi className="h-3 w-3" />
                            Online
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="gap-1 border-red-200 text-red-700 bg-red-50">
                            <WifiOff className="h-3 w-3" />
                            Offline
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Sync Button */}
                    {isOnline && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                                const result = await sync();
                                if (result) {
                                    toast({
                                        title: "Sync Complete",
                                        description: "All data synchronized successfully.",
                                    });

                                    if (notificationManager.getPermission() === 'granted') {
                                        await notifySyncComplete(result.synced || 0);
                                    }
                                }
                            }}
                            disabled={isSyncing}
                        >
                            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        </Button>
                    )}

                    <Button
                        onClick={refreshData}
                        variant="outline"
                        disabled={isLoadingProducts || ordersLoading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${(isLoadingProducts || ordersLoading) ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Offline Banner */}
            {!isOnline && (
                <Alert className="bg-yellow-50 border-yellow-200">
                    <WifiOff className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                        You're working offline. Showing cached inventory data. Changes will sync when you're back online.
                    </AlertDescription>
                </Alert>
            )}

            {/* Dashboard Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalProducts}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats.publishedProducts} published
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalStock}</div>
                            <p className="text-xs text-muted-foreground">
                                Items in inventory
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                            <Package className="h-4 w-4 text-yellow-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">{stats.lowStockProducts}</div>
                            <p className="text-xs text-muted-foreground">
                                ≤ 5 items remaining
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Amazon Listed</CardTitle>
                            <ShoppingCart className="h-4 w-4 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.amazonListedProducts}</div>
                            <p className="text-xs text-muted-foreground">
                                Active listings
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{orders?.length || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                All time orders
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Error Alerts */}
            {productError && (
                <Alert variant="destructive">
                    <AlertDescription>
                        Error loading products: {productError}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchProducts}
                            className="ml-2"
                        >
                            Retry
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {ordersError && (
                <Alert variant="destructive">
                    <AlertDescription>
                        Error loading orders: {ordersError}
                    </AlertDescription>
                </Alert>
            )}

            {/* Main Content Tabs */}
            <Tabs defaultValue="published" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="published">Published ({products.filter(p => p.status === 'published').length})</TabsTrigger>
                    <TabsTrigger value="drafts">Drafts ({products.filter(p => p.status === 'draft').length})</TabsTrigger>
                    <TabsTrigger value="archived">Archived ({products.filter(p => p.status === 'archived').length})</TabsTrigger>
                    <TabsTrigger value="orders">Orders ({orders?.length || 0})</TabsTrigger>
                    <TabsTrigger value="integrations">Integrations</TabsTrigger>
                </TabsList>

                <TabsContent value="published">
                    <Card>
                        <CardHeader>
                            <CardTitle>Published Products</CardTitle>
                            <p className="text-sm text-muted-foreground">Manage published products and listings</p>
                        </CardHeader>
                        <CardContent className="overflow-hidden">
                            {isLoadingProducts ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                    Loading products...
                                </div>
                            ) : (
                                <ProductTable
                                    products={products.filter(p => p.status === 'published')}
                                    onUpdateStock={updateProductStock}
                                    onUpdateAmazonListing={updateAmazonListing}
                                    onStatusChange={handleProductStatusChange}
                                    isLoading={isLoadingProducts}
                                    isOnline={isOnline}
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="drafts">
                    <Card>
                        <CardHeader>
                            <CardTitle>Draft Products</CardTitle>
                            <p className="text-sm text-muted-foreground">Review and publish drafts</p>
                        </CardHeader>
                        <CardContent className="overflow-hidden">
                            {isLoadingProducts ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                    Loading products...
                                </div>
                            ) : (
                                <ProductGrid
                                    products={products.filter(p => p.status === 'draft')}
                                    showActions
                                    isDraft
                                    onStatusChange={handleProductStatusChange}
                                    onEdit={handleEditProduct}
                                    onDelete={handleDeleteProduct}
                                    updating={updating}
                                    deleting={deleting}
                                    isOnline={isOnline}
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="archived">
                    <Card>
                        <CardHeader>
                            <CardTitle>Archived Products</CardTitle>
                            <p className="text-sm text-muted-foreground">Restore or manage archived products</p>
                        </CardHeader>
                        <CardContent className="overflow-hidden">
                            {isLoadingProducts ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                    Loading products...
                                </div>
                            ) : (
                                <ProductGrid
                                    products={products.filter(p => p.status === 'archived')}
                                    showActions
                                    onStatusChange={handleProductStatusChange}
                                    onEdit={handleEditProduct}
                                    onDelete={handleDeleteProduct}
                                    updating={updating}
                                    isOnline={isOnline}
                                    deleting={deleting}
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="orders">
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Management</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                View and manage your orders from all sales channels
                            </p>
                        </CardHeader>
                        <CardContent>
                            {ordersLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                    Loading orders...
                                </div>
                            ) : (
                                <OrderTable orders={orders || []} isOnline={isOnline} />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="integrations">
                    <IntegrationsTab isOnline={isOnline} />
                </TabsContent>
            </Tabs>
        </div>
    );
}