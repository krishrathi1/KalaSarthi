'use client';

import { IProductDocument } from '@/lib/models/Product';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Package, IndianRupee, CheckCircle, Archive, RotateCcw, FileText, Trash2, ShoppingCart, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice, formatDate } from '@/lib/format-utils';
import { useState, useEffect } from 'react';
import { useMounted } from '@/hooks/use-mounted';
import ProductReviewDialog from './ProductReviewDialog';
import { useToast } from "@/hooks/use-toast";
import { useAmazonSPAPI } from '@/hooks/use-amazon';

interface ProductGridProps {
    products: IProductDocument[];
    showActions?: boolean;
    isDraft?: boolean;
    isCompact?: boolean;
    onStatusChange?: (productId: string, newStatus: 'published' | 'draft' | 'archived') => void;
    onEdit?: (productId: string) => void;
    onDelete?: (productId: string) => void;
    updating?: string | null;
    deleting?: string | null;
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

export default function ProductGrid({
    products,
    showActions = false,
    isDraft = false,
    isCompact = false,
    onStatusChange,
    onEdit,
    onDelete,
    updating,
    deleting,
    isOnline = true
}: ProductGridProps) {
    const mounted = useMounted();
    const [reviewProduct, setReviewProduct] = useState<IProductDocument | null>(null);
    const [showReviewDialog, setShowReviewDialog] = useState(false);
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
            if (showActions) {
                try {
                    await authenticate();
                } catch (error) {
                    console.error('Failed to initialize Amazon connection:', error);
                }
            }
            setIsInitializing(false);
        };

        if (mounted) {
            initialize();
        }
    }, [mounted, products, authenticate, showActions]);

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

                // In a real app, you'd also update the product in your database
                // to store the Amazon listing information

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

    // Check if product is already listed on Amazon
    const isListedOnAmazon = (productId: string): boolean => {
        return amazonListings[productId]?.isListed || false;
    };

    // Check if product is being published to Amazon
    const isPublishingToAmazon = (productId: string): boolean => {
        return amazonListings[productId]?.isPublishing || false;
    };

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

    if (products.length === 0) {
        const emptyMessage = isDraft
            ? "No draft products found"
            : "No products found";
        const emptyDescription = isDraft
            ? "Products you create will appear here as drafts before publishing."
            : "Start creating your first product to showcase your craft.";

        return (
            <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{emptyMessage}</h3>
                <p className="text-muted-foreground mb-4">
                    {emptyDescription}
                </p>
                <Link href="/smart-product-creator">
                    <Button>Create Product</Button>
                </Link>
            </div>
        );
    }

    const handleStatusChange = (productId: string, newStatus: 'published' | 'draft' | 'archived') => {
        if (onStatusChange) {
            onStatusChange(productId, newStatus);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published':
                return 'default';
            case 'draft':
                return 'secondary';
            case 'archived':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'published':
                return 'Published';
            case 'draft':
                return 'Draft';
            case 'archived':
                return 'Archived';
            default:
                return status;
        }
    };

    const connectionStatus = getConnectionStatus();

    return (
        <div className="space-y-4">
            {/* Amazon Connection Status - Improved */}
            {showActions && (
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
            )}

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((product) => (
                    <Card key={product.productId} className="overflow-hidden hover:shadow-lg transition-shadow">
                        {/* Product Image */}
                        <div className="relative aspect-square">
                            {product.images && product.images.length > 0 ? (
                                <Image
                                    src={product.images[0]}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                            ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                    <Package className="h-12 w-12 text-muted-foreground" />
                                </div>
                            )}

                            {/* Status Badges */}
                            <div className="absolute top-2 right-2 flex flex-col gap-1">
                                <Badge variant={getStatusColor(product.status)}>
                                    {getStatusLabel(product.status)}
                                </Badge>
                                {isListedOnAmazon(product.productId) && (
                                    <Badge variant="default" className="bg-orange-500">
                                        Amazon Listed
                                    </Badge>
                                )}
                                {!isOnline && (
                                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                        Cached
                                    </Badge>
                                )}
                            </div>

                            {/* Availability Badge */}
                            {!product.inventory.isAvailable && (
                                <div className="absolute top-2 left-2">
                                    <Badge variant="destructive">
                                        Out of Stock
                                    </Badge>
                                </div>
                            )}
                        </div>

                        <CardContent className="p-4">
                            {/* Product Info */}
                            <div className="space-y-2">
                                <h3 className="font-semibold line-clamp-2">{product.name}</h3>
                                <p className="text-muted-foreground line-clamp-2 text-sm">
                                    {product.description}
                                </p>

                                {/* Category */}
                                <Badge variant="outline" className="text-xs">
                                    {product.category}
                                </Badge>

                                {/* Price and Quantity */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold">
                                            {formatPrice(product.price)}
                                        </span>
                                    </div>
                                    <span className="text-muted-foreground text-sm">
                                        Qty: {product.inventory.quantity}
                                    </span>
                                </div>

                                {/* Amazon Listing Info */}
                                {isListedOnAmazon(product.productId) && (
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
                                )}

                                {/* Tags */}
                                {product.tags && product.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {product.tags.slice(0, 3).map((tag, index) => (
                                            <Badge key={index} variant="secondary" className="text-xs">
                                                {tag}
                                            </Badge>
                                        ))}
                                        {product.tags.length > 3 && (
                                            <Badge variant="secondary" className="text-xs">
                                                +{product.tags.length - 3}
                                            </Badge>
                                        )}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-col gap-2 pt-2">
                                    {showActions ? (
                                        <>
                                            {/* Amazon Publishing Action */}
                                            {product.status === 'published' && !isListedOnAmazon(product.productId) && (
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => handlePublishOnAmazon(product)}
                                                    disabled={!isOnline || !isAmazonConnected || isPublishingToAmazon(product.productId) || isAmazonLoading}
                                                    className="bg-orange-500 hover:bg-orange-600"
                                                >
                                                    <ShoppingCart className="h-4 w-4 mr-1" />
                                                    {isPublishingToAmazon(product.productId) ? 'Publishing...' : 'Publish on Amazon'}
                                                </Button>
                                            )}

                                            {/* Status-specific actions */}
                                            {product.status === 'draft' && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => {
                                                            setReviewProduct(product);
                                                            setShowReviewDialog(true);
                                                        }}
                                                        disabled={updating === product.productId}
                                                    >
                                                        <FileText className="h-4 w-4 mr-1" />
                                                        Review
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => handleStatusChange(product.productId, 'published')}
                                                        disabled={!isOnline || updating === product.productId}
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Publish
                                                    </Button>
                                                </div>
                                            )}

                                            {product.status === 'published' && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => handleStatusChange(product.productId, 'archived')}
                                                        disabled={!isOnline || updating === product.productId}
                                                    >
                                                        <Archive className="h-4 w-4 mr-1" />
                                                        Archive
                                                    </Button>
                                                </div>
                                            )}

                                            {product.status === 'archived' && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => handleStatusChange(product.productId, 'published')}
                                                        disabled={!isOnline || updating === product.productId}
                                                    >
                                                        <RotateCcw className="h-4 w-4 mr-1" />
                                                        Restore
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Edit and Delete actions - always available */}
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => onEdit && onEdit(product.productId)}
                                                    disabled={updating === product.productId || deleting === product.productId}
                                                >
                                                    <Edit className="h-4 w-4 mr-1" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => onDelete && onDelete(product.productId)}
                                                    disabled={!isOnline || updating === product.productId || deleting === product.productId}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1" />
                                                    {deleting === product.productId ? 'Deleting...' : 'Delete'}
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" className="flex-1">
                                                <Eye className="h-4 w-4 mr-1" />
                                                View
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => onEdit && onEdit(product.productId)}
                                            >
                                                <Edit className="h-4 w-4 mr-1" />
                                                Edit
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Created Date */}
                                <p className="text-xs text-muted-foreground mt-2">
                                    Created {formatDate(product.createdAt)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Review Dialog for Draft Products */}
            <ProductReviewDialog
                product={reviewProduct}
                open={showReviewDialog}
                onOpenChange={setShowReviewDialog}
                onPublish={(productId) => {
                    handleStatusChange(productId, 'published');
                    setShowReviewDialog(false);
                    setReviewProduct(null);
                }}
                isPublishing={updating === reviewProduct?.productId}
            />
        </div>
    );
}