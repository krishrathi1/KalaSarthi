'use client';

import { useState, useEffect } from 'react';
import { IProductDocument } from '@/lib/models/Product';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { formatPrice } from '@/lib/format-utils';
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

interface ProductTableProps {
    products: IProductDocument[];
    onUpdateStock?: (productId: string, quantity: number) => Promise<{ success: boolean; error?: string }>;
    onUpdateAmazonListing?: (productId: string, listingData: any) => Promise<{ success: boolean; error?: string }>;
    isLoading?: boolean;
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
    isLoading = false
}: ProductTableProps) {
    const mounted = useMounted();
    const [stock, setStock] = useState<Record<string, number>>({});
    const [updatingStock, setUpdatingStock] = useState<Record<string, boolean>>({});
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [amazonListings, setAmazonListings] = useState<AmazonListingStatus>({});
    const [isInitializing, setIsInitializing] = useState(true);
    const { toast } = useToast();

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
        <div className="space-y-4 ">
            {/* Amazon Connection Status */}
            <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${connectionStatus.color}`} />
                        <span className="text-sm font-medium">
                            Amazon SP-API: {connectionStatus.status}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                            Sandbox Mode
                        </Badge>
                    </div>
                </div>
                {amazonError && (
                    <div className="mt-2 text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {amazonError}
                    </div>
                )}
                {isAmazonConnected && (
                    <div className="mt-2 text-xs text-muted-foreground">
                        Marketplace: Amazon.in (India) • Ready to publish products
                    </div>
                )}
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex gap-2 items-center">
                    <Input
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-64"
                    />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-36">
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

                <div className="text-sm text-muted-foreground">
                    Showing {filteredProducts.length} of {products.length} products
                </div>
            </div>

            {/* Products Table */}
            {filteredProducts.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-muted-foreground">No products match your current filters.</p>
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Stock</TableHead>
                                <TableHead>Amazon Listing</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProducts.map(product => (
                                <TableRow key={product.productId}>
                                    {/* Product Info */}
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted">
                                                {product.images && product.images.length > 0 ? (
                                                    <Image
                                                        src={product.images[0]}
                                                        alt={product.name}
                                                        fill
                                                        className="object-cover"
                                                        sizes="48px"
                                                    />
                                                ) : (
                                                    <Package className="w-6 h-6 text-muted-foreground absolute inset-0 m-auto" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium truncate">{product.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {formatPrice(product.price)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    ID: {product.productId}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Category */}
                                    <TableCell>
                                        <Badge variant="outline">{product.category}</Badge>
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell>
                                        <Badge variant={getStatusBadgeVariant(product.status)}>
                                            {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                                        </Badge>
                                    </TableCell>

                                    {/* Stock Management */}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {getStockStatusIcon(product.inventory.quantity)}
                                            <Input
                                                type="number"
                                                min="0"
                                                value={stock[product.productId] ?? product.inventory.quantity}
                                                onChange={(e) => handleStockChange(product.productId, parseInt(e.target.value) || 0)}
                                                className="w-20"
                                                disabled={updatingStock[product.productId]}
                                            />
                                            <Button
                                                size="sm"
                                                onClick={() => handleUpdateStock(product)}
                                                disabled={updatingStock[product.productId] ||
                                                    (stock[product.productId] ?? product.inventory.quantity) === product.inventory.quantity}
                                            >
                                                {updatingStock[product.productId] ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    'Update'
                                                )}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {product.inventory.isAvailable ? 'Available' : 'Out of Stock'}
                                        </p>
                                    </TableCell>

                                    {/* Amazon Listing */}
                                    <TableCell>
                                        <div className="space-y-2">
                                            {isListedOnAmazon(product.productId) ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <Store className="h-4 w-4 text-orange-500" />
                                                        <Badge variant={getAmazonStatusBadgeVariant(amazonListings[product.productId]?.status || '')}>
                                                            {amazonListings[product.productId]?.status || 'Listed'}
                                                        </Badge>
                                                    </div>

                                                    {/* Amazon listing details */}
                                                    <div className="bg-orange-50 border border-orange-200 rounded p-2">
                                                        <div className="text-xs text-orange-700 space-y-1">
                                                            {amazonListings[product.productId]?.asin ? (
                                                                <div>ASIN: {amazonListings[product.productId]?.asin}</div>
                                                            ) : (
                                                                <div>Submission ID: {amazonListings[product.productId]?.submissionId}</div>
                                                            )}
                                                            <div>SKU: {amazonListings[product.productId]?.sku}</div>
                                                            <div>Status: {amazonListings[product.productId]?.status}</div>
                                                            {!amazonListings[product.productId]?.asin && (
                                                                <div className="text-orange-600 font-medium">
                                                                    ⏳ ASIN pending (processing)
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Badge variant="outline">Not Listed</Badge>
                                            )}

                                            <Button
                                                size="sm"
                                                variant={isListedOnAmazon(product.productId) ? "outline" : "default"}
                                                onClick={() => handleToggleAmazonListing(product)}
                                                disabled={product.status !== 'published' || isPublishingToAmazon(product.productId) || !isAmazonConnected || isAmazonLoading}
                                                className={!isListedOnAmazon(product.productId) ? "bg-orange-500 hover:bg-orange-600" : ""}
                                            >
                                                {isPublishingToAmazon(product.productId) ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                        Publishing...
                                                    </>
                                                ) : isListedOnAmazon(product.productId) ? (
                                                    'Remove Listing'
                                                ) : (
                                                    <>
                                                        <ShoppingCart className="h-4 w-4 mr-1" />
                                                        List on Amazon
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button size="sm" variant="ghost">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost">
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}