'use client';


import { IProductDocument } from '@/lib/models/Product';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Package, IndianRupee, Tag, Palette, Ruler } from 'lucide-react';
import Image from 'next/image';
import { formatPrice, formatDate } from '@/lib/format-utils';

interface ProductReviewDialogProps {
    product: IProductDocument | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onPublish: (productId: string) => void;
    isPublishing?: boolean;
}

export default function ProductReviewDialog({
    product,
    open,
    onOpenChange,
    onPublish,
    isPublishing = false,
}: ProductReviewDialogProps) {
    if (!product) return null;

    const handlePublish = () => {
        onPublish(product.productId);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Review Product: {product.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Product Images */}
                    {product.images && product.images.length > 0 && (
                        <div>
                            <h3 className="text-lg font-medium mb-3">Product Images</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {product.images.map((image, index) => (
                                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                                        <Image
                                            src={image}
                                            alt={`${product.name} - Image ${index + 1}`}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 50vw, 33vw"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Basic Information */}
                    <div>
                        <h3 className="text-lg font-medium mb-3">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Product Name</label>
                                <p className="text-sm mt-1">{product.name}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Category</label>
                                <div className="mt-1">
                                    <Badge variant="outline">{product.category}</Badge>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Price</label>
                                <div className="flex items-center gap-1 mt-1">
                                    <IndianRupee className="h-4 w-4" />
                                    <span className="font-semibold">{formatPrice(product.price)}</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Quantity</label>
                                <p className="text-sm mt-1">{product.inventory.quantity} units</p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Description */}
                    <div>
                        <h3 className="text-lg font-medium mb-3">Description</h3>
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                    </div>

                    {/* Specifications */}
                    {product.specifications && (
                        <>
                            <Separator />
                            <div>
                                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                                    <Ruler className="h-4 w-4" />
                                    Specifications
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {product.specifications.materials && product.specifications.materials.length > 0 && (
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Materials</label>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {product.specifications.materials.map((material, index) => (
                                                    <Badge key={index} variant="secondary" className="text-xs">
                                                        {material}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {product.specifications.colors && product.specifications.colors.length > 0 && (
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                                <Palette className="h-3 w-3" />
                                                Colors
                                            </label>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {product.specifications.colors.map((color, index) => (
                                                    <Badge key={index} variant="secondary" className="text-xs">
                                                        {color}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {product.specifications.dimensions && (
                                        <div className="md:col-span-2">
                                            <label className="text-sm font-medium text-muted-foreground">Dimensions</label>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                                                {product.specifications.dimensions.length && (
                                                    <div className="text-xs">
                                                        <span className="text-muted-foreground">Length:</span> {product.specifications.dimensions.length}cm
                                                    </div>
                                                )}
                                                {product.specifications.dimensions.width && (
                                                    <div className="text-xs">
                                                        <span className="text-muted-foreground">Width:</span> {product.specifications.dimensions.width}cm
                                                    </div>
                                                )}
                                                {product.specifications.dimensions.height && (
                                                    <div className="text-xs">
                                                        <span className="text-muted-foreground">Height:</span> {product.specifications.dimensions.height}cm
                                                    </div>
                                                )}
                                                {product.specifications.dimensions.weight && (
                                                    <div className="text-xs">
                                                        <span className="text-muted-foreground">Weight:</span> {product.specifications.dimensions.weight}g
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Tags */}
                    {product.tags && product.tags.length > 0 && (
                        <>
                            <Separator />
                            <div>
                                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                                    <Tag className="h-4 w-4" />
                                    Tags
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {product.tags.map((tag, index) => (
                                        <Badge key={index} variant="secondary">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Story */}
                    {product.story && (
                        <>
                            <Separator />
                            <div>
                                <h3 className="text-lg font-medium mb-3">Product Story</h3>
                                <div className="space-y-4">
                                    {product.story.englishStory && (
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">English Story</label>
                                            <p className="text-sm mt-1">{product.story.englishStory}</p>
                                            {product.story.englishCaption && (
                                                <p className="text-xs text-muted-foreground mt-1 italic">
                                                    Caption: {product.story.englishCaption}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Metadata */}
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                        <div>
                            <span className="font-medium">Created:</span> {formatDate(product.createdAt)}
                        </div>
                        <div>
                            <span className="font-medium">Last Updated:</span> {formatDate(product.updatedAt)}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handlePublish} disabled={isPublishing}>
                        {isPublishing ? (
                            <>Publishing...</>
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Publish Product
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}