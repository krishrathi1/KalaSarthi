'use client';

import { IProductDocument } from '@/lib/models/Product';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Package, IndianRupee, Star, Heart, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/format-utils';
import { useState } from 'react';

interface ProductCardProps {
    product: IProductDocument;
}

export default function ProductCard({ product }: ProductCardProps) {
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [imageError, setImageError] = useState(false);

    const handleWishlistToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsWishlisted(!isWishlisted);
        // TODO: Implement wishlist API call
    };

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // TODO: Implement add to cart functionality
        console.log('Add to cart:', product.productId);
    };

    return (
        <Link href={`/marketplace/products/${product.productId}`}>
            <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white border-0 shadow-md h-full flex flex-col">
                {/* Product Image */}
                <div className="relative aspect-square overflow-hidden">
                    {product.images && product.images.length > 0 && !imageError ? (
                        <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                            <Package className="h-16 w-16 text-gray-400" />
                        </div>
                    )}
                    
                    {/* Wishlist Button */}
                    <button
                        onClick={handleWishlistToggle}
                        className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-all duration-200 opacity-0 group-hover:opacity-100"
                    >
                        <Heart 
                            className={`h-4 w-4 transition-colors ${
                                isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'
                            }`} 
                        />
                    </button>

                    {/* Availability Badge */}
                    {!product.inventory.isAvailable && (
                        <div className="absolute top-3 left-3">
                            <Badge variant="destructive" className="text-xs">
                                Out of Stock
                            </Badge>
                        </div>
                    )}

                    {/* Quick View Button */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <Button variant="secondary" size="sm" className="shadow-lg">
                            <Eye className="h-4 w-4 mr-2" />
                            Quick View
                        </Button>
                    </div>
                </div>

                <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
                    {/* Category Badge */}
                    <Badge variant="outline" className="text-xs w-fit">
                        {product.category}
                    </Badge>

                    {/* Product Name - Fixed height */}
                    <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-orange-600 transition-colors min-h-[3.5rem] flex items-start">
                        {product.name}
                    </h3>

                    {/* Description - Fixed height */}
                    <p className="text-gray-600 line-clamp-2 text-sm min-h-[2.5rem] flex items-start">
                        {product.description}
                    </p>

                    {/* Tags - Fixed height */}
                    <div className="min-h-[1.75rem] flex items-start">
                        {product.tags && product.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {product.tags.slice(0, 2).map((tag, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                        {tag}
                                    </Badge>
                                ))}
                                {product.tags.length > 2 && (
                                    <Badge variant="secondary" className="text-xs">
                                        +{product.tags.length - 2}
                                    </Badge>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Spacer to push content to bottom */}
                    <div className="flex-1" />

                    {/* Price and Availability */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <IndianRupee className="h-4 w-4 text-orange-600" />
                            <span className="font-bold text-lg text-orange-600">
                                {formatPrice(product.price)}
                            </span>
                        </div>
                        <span className="text-gray-500 text-sm">
                            {product.inventory.quantity} available
                        </span>
                    </div>

                    {/* Rating (placeholder for now) */}
                    <div className="flex items-center gap-1">
                        <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                    key={star} 
                                    className="h-3 w-3 fill-yellow-400 text-yellow-400" 
                                />
                            ))}
                        </div>
                        <span className="text-xs text-gray-500 ml-1">(24 reviews)</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={handleAddToCart}
                            disabled={!product.inventory.isAvailable}
                        >
                            <ShoppingBag className="h-4 w-4 mr-1" />
                            Add to Cart
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}