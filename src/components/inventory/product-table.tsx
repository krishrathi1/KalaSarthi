'use client';

import { useState, useEffect } from 'react';
import { IProductDocument } from '@/lib/models/Product';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { formatPrice, formatDate } from '@/lib/format-utils';
import {
    Store,
    Edit2,
    Eye,
    Package,
    AlertTriangle,
    CheckCircle,
    ExternalLink,
    Loader2,
    ShoppingCart,
    AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAmazonSPAPI } from '@/hooks/use-amazon';
import { useMounted } from '@/hooks/use-mounted';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useState as useReactState } from 'react';

interface ProductTableProps {
    products: IProductDocument[];
    onUpdateStock?: (productId: string, quantity: number) => Promise<{ success: boolean; error?: string }>;
    onUpdateAmazonListing?: (productId: string, listingData: any) => Promise<{ success: boolean; error?: string }>;
    onStatusChange?: (productId: string, newStatus: 'published' | 'draft' | 'archived') => void;
    isLoading?: boolean;
    isOnline?: boolean;
}

interface AmazonListingStatus {
    [productId: string]: {
        isListed: boolean;
        asin?: string;
        sku?: string;
        listingId?: string;
        status?: string;
        submissionId?: string;
        isPublishing?: boolean;
    };
}

export default function ProductTable({
    products,
    onUpdateStock,
    onUpdateAmazonListing,
    onStatusChange,
    isLoading = false,
    isOnline = true
}: ProductTableProps) {
    const mounted = useMounted();
    const [stock, setStock] = useState<Record<string, number>>({});
    const [updatingStock, setUpdatingStock] = useState<Record<string, boolean>>({});
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [amazonListings, setAmazonListings] = useState<AmazonListingStatus>({});
    const [isInitializing, setIsInitializing] = useState(true);
    const { toast } = useToast();
    const [viewProduct, setViewProduct] = useState<IProductDocument | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);

    // Amazon SP-API hook
    const {
        config: amazonConfig,
        isConnected: isAmazonConnected,
        isLoading: isAmazonLoading,
        error: amazonError,
        authenticate,
        createListing,
        testConnection,
        clearError
    } = useAmazonSPAPI();

    // Initialize Amazon connection and listing statuses on component mount
    useEffect(() => {
        const initialize = async () => {
            setIsInitializing(true);
            // Initialize local state from persisted product data
            const initialListingStatus: AmazonListingStatus = {};
            products.forEach(product => {
                if (product.amazonListing && product.amazonListing.isListed) {
                    initialListingStatus[product.productId] = {
                        isListed: true,
                        asin: product.amazonListing.asin,
                        sku: product.amazonListing.sku,
                        listingId: product.amazonListing.listingId,
                        status: product.amazonListing.status,
                        submissionId: product.amazonListing.submissionId,
                        isPublishing: false,
                    };
                }
            });
            setAmazonListings(initialListingStatus);

            // Then, connect to Amazon if needed
            try {
                await authenticate();
            } catch (error) {
                console.error('Failed to initialize Amazon connection:', error);
            }
            setIsInitializing(false);
        };

        if (mounted) {
            initialize();
        }
    }, [mounted, products, authenticate]);

    const handleStockChange = (productId: string, quantity: number) => {
        const validQuantity = Math.max(0, quantity || 0);
        setStock(prev => ({ ...prev, [productId]: validQuantity }));
    };

    const handleUpdateStock = async (product: IProductDocument) => {
        if (!onUpdateStock) return;

        if (!isOnline) {
            toast({
                title: "Offline Mode",
                description: "Stock updates require an internet connection.",
                variant: "destructive",
            });
            return;
        }

        const newQuantity = stock[product.productId] ?? product.inventory.quantity;

        if (newQuantity === product.inventory.quantity) {
            toast({
                title: "No Changes",
                description: "Stock quantity is already up to date.",
            });
            return;
        }

        setUpdatingStock(prev => ({ ...prev, [product.productId]: true }));

        try {
            const result = await onUpdateStock(product.productId, newQuantity);

            if (result.success) {
                toast({
                    title: "Stock Updated",
                    description: `Stock for "${product.name}" updated to ${newQuantity} items.`,
                });
                // Clear the local state since it's now synced
                setStock(prev => {
                    const newState = { ...prev };
                    delete newState[product.productId];
                    return newState;
                });
            } else {
                toast({
                    title: "Update Failed",
                    description: result.error || "Failed to update stock quantity.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Update Failed",
                description: "An error occurred while updating stock.",
                variant: "destructive",
            });
        } finally {
            setUpdatingStock(prev => ({ ...prev, [product.productId]: false }));
        }
    };

    // Handle Amazon listing publication
    const handlePublishOnAmazon = async (product: IProductDocument) => {
        if (!isOnline) {
            toast({
                title: 'Offline Mode',
                description: 'Amazon listing requires an internet connection.',
                variant: "destructive",
            });
            return;
        }

        if (!isAmazonConnected) {
            toast({
                title: 'Amazon SP-API not connected',
                description: 'Amazon SP-API not connected. Please configure your credentials.',
                variant: "destructive",
            });
            return;
        }

        // Update local state to show loading
        setAmazonListings(prev => ({
            ...prev,
            [product.productId]: {
                ...prev[product.productId],
                isPublishing: true
            }
        }));

        try {
            clearError();
            
            const result = await createListing(product);
            
            if (result.success) {
                // Update local listing status
                setAmazonListings(prev => ({
                    ...prev,
                    [product.productId]: {
                        isListed: true,
                        asin: result.asin, // This might be undefined initially
                        sku: result.sku,
                        listingId: result.listingId,
                        submissionId: result.submissionId,
                        status: result.status,
                        isPublishing: false
                    }
                }));

                toast({
                    title: 'Product successfully submitted to Amazon!',
                    description: result.asin 
                        ? `ASIN: ${result.asin}` 
                        : `Submission ID: ${result.submissionId || result.listingId}. ASIN will be available once processed.`,
                    variant: 'default'
                });
                
            } else {
                throw new Error(result.errors?.join(', ') || 'Failed to create Amazon listing');
            }
        } catch (error) {
            setAmazonListings(prev => ({
                ...prev,
                [product.productId]: {
                    ...prev[product.productId],
                    isPublishing: false
                }
            }));

            const errorMessage = error instanceof Error ? error.message : 'Failed to publish on Amazon';
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive'
            });
        }
    };

    const handleToggleAmazonListing = async (product: IProductDocument) => {
        const isCurrentlyListed = isListedOnAmazon(product.productId);

        if (!isCurrentlyListed) {
            // Create new listing
            await handlePublishOnAmazon(product);
        } else {
            // Remove listing (you may want to implement actual delisting logic here)
            setAmazonListings(prev => ({
                ...prev,
                [product.productId]: {
                    ...prev[product.productId],
                    isListed: false,
                    status: 'INACTIVE'
                }
            }));

            toast({
                title: "Listing Removed",
                description: `Product "${product.name}" removed from Amazon.`,
            });

            // Call the optional callback if provided
            if (onUpdateAmazonListing) {
                await onUpdateAmazonListing(product.productId, {
                    isListed: false,
                    status: 'INACTIVE',
                });
            }
        }
    };

    // Check if product is already listed on Amazon
    const isListedOnAmazon = (productId: string): boolean => {
        return amazonListings[productId]?.isListed || false;
    };

    // Check if product is being published to Amazon
    const isPublishingToAmazon = (productId: string): boolean => {
        return amazonListings[productId]?.isPublishing || false;
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status.toLowerCase()) {
            case 'published':
                return 'default';
            case 'draft':
                return 'secondary';
            case 'archived':
                return 'outline';
            default:
                return 'outline';
        }
    };

    const getAmazonStatusBadgeVariant = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'ACTIVE':
            case 'BUYABLE':
            case 'DISCOVERABLE':
                return 'default';
            case 'SUBMITTED':
            case 'PROCESSING':
                return 'secondary';
            case 'ERROR':
            case 'INVALID':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    const getStockStatusIcon = (quantity: number) => {
        if (quantity === 0) {
            return <AlertTriangle className="h-4 w-4 text-red-500" />;
        } else if (quantity <= 5) {
            return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
        }
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    };

    // Filter products based on status and search term
    const filteredProducts = products.filter(product => {
        const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
        const matchesSearch = !searchTerm ||
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.productId.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesStatus && matchesSearch;
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading products...</span>
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Products Found</h3>
                <p className="text-muted-foreground">
                    You haven't created any products yet. Start by adding your first product.
                </p>
            </div>
        );
    }

    // Get connection status display
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
        <div className="space-y-4 w-full">
            {/* Amazon Connection Status */}
            <div className="bg-muted/50 rounded-lg p-3 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${connectionStatus.color}`} />
                        <span className="text-sm font-medium">
                            Amazon SP-API: {connectionStatus.status}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                            Sandbox Mode
                        </Badge>
                    </div>
                </div>
                {amazonError && (
                    <div className="mt-2 text-sm text-destructive flex items-start gap-1">
                        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span className="break-words flex-1 min-w-0">{amazonError}</span>
                    </div>
                )}
                {isAmazonConnected && (
                    <div className="mt-2 text-xs text-muted-foreground">
                        Marketplace: Amazon.in (India) • Ready to publish products
                    </div>
                )}
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between w-full">
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full sm:flex-1 sm:max-w-md">
                    <Input
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:flex-1"
                    />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-36 flex-shrink-0">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">
                    Showing {filteredProducts.length} of {products.length} products
                </div>
            </div>

            {/* Products Table */}
            {filteredProducts.length === 0 ? (
                <div className="text-center py-8 w-full">
                    <p className="text-muted-foreground">No products match your current filters.</p>
                </div>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden lg:block w-full">
                        <div className="border rounded-lg overflow-hidden w-full">
                            <div className="overflow-x-auto w-full">
                                <Table className="w-full min-w-[900px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="min-w-[250px] p-2 text-xs font-medium">Product</TableHead>
                                            <TableHead className="min-w-[100px] p-2 text-xs font-medium">Category</TableHead>
                                            <TableHead className="min-w-[90px] p-2 text-xs font-medium">Status</TableHead>
                                            <TableHead className="min-w-[150px] p-2 text-xs font-medium">Stock</TableHead>
                                            <TableHead className="min-w-[140px] p-2 text-xs font-medium">Amazon</TableHead>
                                            <TableHead className="min-w-[80px] p-2 text-xs font-medium text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProducts.map(product => (
                                            <TableRow key={product.productId}>
                                                {/* Product Info */}
                                                <TableCell className="p-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className="relative w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
                                                            {product.images && product.images.length > 0 ? (
                                                                <Image
                                                                    src={product.images[0]}
                                                                    alt={product.name}
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="40px"
                                                                />
                                                            ) : (
                                                                <Package className="w-5 h-5 text-muted-foreground absolute inset-0 m-auto" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-medium text-sm truncate" title={product.name}>
                                                                {product.name}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {formatPrice(product.price)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                    {/* Category */}
                                    <TableCell className="p-2">
                                        <Badge variant="outline" className="text-xs px-1 py-0">{product.category}</Badge>
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell className="p-2">
                                        <Badge variant={getStatusBadgeVariant(product.status)} className="text-xs px-1 py-0">
                                            {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                                        </Badge>
                                    </TableCell>

                                    {/* Stock Management */}
                                    <TableCell className="p-2">
                                        <div className="flex items-center gap-1">
                                            {getStockStatusIcon(product.inventory.quantity)}
                                            <Input
                                                type="number"
                                                min="0"
                                                value={stock[product.productId] ?? product.inventory.quantity}
                                                onChange={(e) => handleStockChange(product.productId, parseInt(e.target.value) || 0)}
                                                className="w-12 h-6 text-xs p-1"
                                                disabled={!isOnline || updatingStock[product.productId]}
                                                placeholder={!isOnline ? "Offline" : ""}
                                            />
                                            <Button
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => handleUpdateStock(product)}
                                                disabled={!isOnline || updatingStock[product.productId] ||
                                                    (stock[product.productId] ?? product.inventory.quantity) === product.inventory.quantity}
                                            >
                                                {updatingStock[product.productId] ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <span className="text-xs">✓</span>
                                                )}
                                            </Button>
                                        </div>
                                    </TableCell>

                                    {/* Amazon Listing */}
                                    <TableCell className="p-2">
                                        <div className="space-y-1">
                                            {isListedOnAmazon(product.productId) ? (
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1">
                                                        <Store className="h-3 w-3 text-orange-500" />
                                                        <Badge variant={getAmazonStatusBadgeVariant(amazonListings[product.productId]?.status || '')} className="text-xs px-1 py-0">
                                                            {amazonListings[product.productId]?.status || 'Listed'}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground truncate" title={amazonListings[product.productId]?.asin || amazonListings[product.productId]?.submissionId}>
                                                        {amazonListings[product.productId]?.asin ? `ASIN: ${amazonListings[product.productId]?.asin}` : `ID: ${amazonListings[product.productId]?.submissionId}`}
                                                    </div>
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="text-xs px-1 py-0">Not Listed</Badge>
                                            )}

                                            <Button
                                                size="sm"
                                                variant={isListedOnAmazon(product.productId) ? "outline" : "default"}
                                                onClick={() => handleToggleAmazonListing(product)}
                                                disabled={!isOnline || product.status !== 'published' || isPublishingToAmazon(product.productId) || !isAmazonConnected || isAmazonLoading}
                                                className={`h-6 px-1 text-xs ${!isListedOnAmazon(product.productId) ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                                            >
                                                {isPublishingToAmazon(product.productId) ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : isListedOnAmazon(product.productId) ? (
                                                    'Remove'
                                                ) : (
                                                    'List'
                                                )}
                                            </Button>
                                        </div>
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="text-right p-2">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0"
                                                onClick={() => {
                                                    setViewProduct(product);
                                                    setIsViewOpen(true);
                                                }}
                                            >
                                                <Eye className="h-3 w-3" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                                <Edit2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="lg:hidden space-y-3">
                        {filteredProducts.map(product => (
                            <div key={product.productId} className="border rounded-lg p-3 space-y-2">
                                {/* Product Header */}
                                <div className="flex items-start gap-2">
                                    <div className="relative w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
                                        {product.images && product.images.length > 0 ? (
                                            <Image
                                                src={product.images[0]}
                                                alt={product.name}
                                                fill
                                                className="object-cover"
                                                sizes="40px"
                                            />
                                        ) : (
                                            <Package className="w-5 h-5 text-muted-foreground absolute inset-0 m-auto" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-sm truncate" title={product.name}>
                                            {product.name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            {formatPrice(product.price)}
                                        </p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <Badge variant="outline" className="text-xs px-1 py-0">{product.category}</Badge>
                                            <Badge variant={getStatusBadgeVariant(product.status)} className="text-xs px-1 py-0">
                                                {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* Stock Management */}
                                <div className="flex items-center gap-2">
                                    {getStockStatusIcon(product.inventory.quantity)}
                                    <Input
                                        type="number"
                                        min="0"
                                        value={stock[product.productId] ?? product.inventory.quantity}
                                        onChange={(e) => handleStockChange(product.productId, parseInt(e.target.value) || 0)}
                                        className="w-16 h-7 text-xs p-1"
                                        disabled={!isOnline || updatingStock[product.productId]}
                                        placeholder={!isOnline ? "Offline" : ""}
                                    />
                                    <Button
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => handleUpdateStock(product)}
                                        disabled={!isOnline || updatingStock[product.productId] ||
                                            (stock[product.productId] ?? product.inventory.quantity) === product.inventory.quantity}
                                    >
                                        {updatingStock[product.productId] ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            '✓'
                                        )}
                                    </Button>
                                    <span className="text-xs text-muted-foreground">
                                        {product.inventory.isAvailable ? 'Available' : 'Out of Stock'}
                                    </span>
                                </div>

                                {/* Amazon Listing */}
                                <div className="space-y-1">
                                    {isListedOnAmazon(product.productId) ? (
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1">
                                                <Store className="h-3 w-3 text-orange-500" />
                                                <Badge variant={getAmazonStatusBadgeVariant(amazonListings[product.productId]?.status || '')} className="text-xs px-1 py-0">
                                                    {amazonListings[product.productId]?.status || 'Listed'}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {amazonListings[product.productId]?.asin ? `ASIN: ${amazonListings[product.productId]?.asin}` : `ID: ${amazonListings[product.productId]?.submissionId}`}
                                            </div>
                                        </div>
                                    ) : (
                                        <Badge variant="outline" className="text-xs px-1 py-0">Not Listed</Badge>
                                    )}
                                    
                                    <Button
                                        size="sm"
                                        variant={isListedOnAmazon(product.productId) ? "outline" : "default"}
                                        onClick={() => handleToggleAmazonListing(product)}
                                        disabled={!isOnline || product.status !== 'published' || isPublishingToAmazon(product.productId) || !isAmazonConnected || isAmazonLoading}
                                        className={`h-7 px-2 text-xs ${!isListedOnAmazon(product.productId) ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                                    >
                                        {isPublishingToAmazon(product.productId) ? (
                                            <>
                                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                Publishing...
                                            </>
                                        ) : isListedOnAmazon(product.productId) ? (
                                            'Remove'
                                        ) : (
                                            'List on Amazon'
                                        )}
                                    </Button>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-1 pt-1 border-t">
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                        <Eye className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                        <Edit2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* View Dialog */}
            <ProductViewDialog
                open={isViewOpen}
                onOpenChange={(v) => {
                    if (!v) setViewProduct(null);
                    setIsViewOpen(v);
                }}
                product={viewProduct}
                onArchive={() => viewProduct && onStatusChange && onStatusChange(viewProduct.productId, 'archived')}
                onPublish={() => viewProduct && onStatusChange && onStatusChange(viewProduct.productId, 'published')}
                onRestore={() => viewProduct && onStatusChange && onStatusChange(viewProduct.productId, 'published')}
                onPublishInstagram={async () => {
                    if (!viewProduct) return;
                    try {
                        const imageUrl = viewProduct.images?.[0];
                        if (!imageUrl) {
                            toast({ title: 'No image', description: 'Product has no image to post', variant: 'destructive' });
                            return;
                        }
                        const captionBase = viewProduct.description || viewProduct.name || '';
                        const hashtags = (viewProduct.tags || []).map(t => `#${String(t).replace(/\s+/g, '')}`).join(' ');
                        const caption = `${captionBase}\n\n${hashtags}`.trim();
                        const res = await fetch('/api/instagram/publish', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ imageUrl, caption })
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                            toast({ title: 'Posted to Instagram', description: `Media ID: ${data.mediaId}` });
                        } else {
                            toast({ title: 'Instagram post failed', description: data.error || 'Unknown error', variant: 'destructive' });
                        }
                    } catch (e: any) {
                        toast({ title: 'Instagram post error', description: e?.message || 'Unexpected error', variant: 'destructive' });
                    }
                }}
            />
        </div>
    );
}

// Render the view dialog at root of this module so ProductTable can toggle it
export function ProductTableViewLayer({ open, onOpenChange, product }: { open: boolean; onOpenChange: (v: boolean) => void; product: IProductDocument | null }) {
    return <ProductViewDialog open={open} onOpenChange={onOpenChange} product={product} />
}

// View Dialog rendering at the bottom to avoid nested table structure issues
function ProductViewDialog({ open, onOpenChange, product, onArchive, onPublish, onRestore, onPublishInstagram }: { open: boolean; onOpenChange: (v: boolean) => void; product: IProductDocument | null; onArchive?: () => void; onPublish?: () => void; onRestore?: () => void; onPublishInstagram?: () => Promise<void> }) {
    if (!product) return null;
    const [expandDesc, setExpandDesc] = useState(false);
    const [posting, setPosting] = useState(false);
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{product.name}</DialogTitle>
                    <DialogDescription>Product details and listing status</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Image Card */}
                    <div className="border rounded-lg overflow-hidden">
                        <div className="relative aspect-square bg-muted">
                            {product.images && product.images[0] ? (
                                <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Package className="h-10 w-10 text-muted-foreground" />
                                </div>
                            )}
                        </div>
                        <div className="p-3 text-sm">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">{product.category}</Badge>
                                <Badge variant="outline">{product.status}</Badge>
                            </div>
                            <div className="mt-2 text-muted-foreground">ID: {product.productId}</div>
                            <div className="mt-1">Price: {formatPrice(product.price)}</div>
                            <div className="mt-1 text-muted-foreground text-xs">Created {formatDate(product.createdAt)}</div>
                        </div>
                    </div>

                    {/* Info Card */}
                    <div className="border rounded-lg p-3 space-y-3">
                        {product.description && (
                            <div>
                                <div className="text-sm font-medium mb-1">Description</div>
                                <div className={expandDesc ? "" : "max-h-40 overflow-hidden"}>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{product.description}</p>
                                </div>
                                {product.description.length > 400 && (
                                    <Button variant="ghost" size="sm" onClick={() => setExpandDesc(v => !v)} className="mt-1 px-2 h-7">
                                        {expandDesc ? 'Show less' : 'Show more'}
                                    </Button>
                                )}
                            </div>
                        )}
                        <div>
                            <div className="text-sm font-medium mb-1">Stock</div>
                            <div className="text-sm text-muted-foreground">Qty: {product.inventory?.quantity ?? 0} • {product.inventory?.isAvailable ? 'Available' : 'Out of stock'}</div>
                        </div>
                        {product.tags && product.tags.length > 0 && (
                            <div>
                                <div className="text-sm font-medium mb-1">Tags</div>
                                <div className="flex flex-wrap gap-1">
                                    {product.tags.map((t, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div>
                            <div className="text-sm font-medium mb-1">Amazon Listing</div>
                            {product.amazonListing?.isListed ? (
                                <div className="text-sm">
                                    <div>Status: {product.amazonListing.status || 'ACTIVE'}</div>
                                    {product.amazonListing.asin && <div>ASIN: {product.amazonListing.asin}</div>}
                                    {product.amazonListing.sku && <div>SKU: {product.amazonListing.sku}</div>}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">Not listed</div>
                            )}
                        </div>
                    </div>
                </div>
                <DialogFooter className="flex items-center justify-between gap-2">
                    <div>
                        <Button
                            variant="outline"
                            disabled={posting}
                            onClick={async () => {
                                if (!onPublishInstagram) return;
                                try {
                                    setPosting(true);
                                    await onPublishInstagram();
                                } finally {
                                    setPosting(false);
                                }
                            }}
                        >
                            {posting ? 'Posting…' : 'Post to Instagram'}
                        </Button>
                    </div>
                    {product.status === 'draft' && (
                        <Button onClick={onPublish}>Review & Publish</Button>
                    )}
                    {product.status === 'published' && (
                        <Button variant="destructive" onClick={onArchive}>Archive</Button>
                    )}
                    {product.status === 'archived' && (
                        <Button variant="outline" onClick={onRestore}>Restore</Button>
                    )}
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}