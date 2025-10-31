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
import { useOffline } from '@/hooks/use-offline';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';

interface ProductCardProps {
    product: IProductDocument;
}

export default function ProductCard({ product }: ProductCardProps) {
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    
    const { isOnline, storeOffline } = useOffline();
    const { toast } = useToast();
    const { user } = useAuth();
    
    // Determine if product is trending (example logic - you can adjust this)
    const isTrending = Math.random() > 0.7; // 30% chance to be trending
    const isNew = new Date(product.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;

    const handleWishlistToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!user) {
            toast({
                title: "Login Required",
                description: "Please login to add items to wishlist.",
                variant: "destructive",
            });
            return;
        }

        const newWishlistState = !isWishlisted;
        setIsWishlisted(newWishlistState);

        try {
            if (isOnline) {
                // Add/remove from wishlist via API
                const method = newWishlistState ? 'POST' : 'DELETE';
                const url = newWishlistState 
                    ? '/api/wishlist'
                    : `/api/wishlist?userId=${user.uid}&productId=${product.productId}`;
                
                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: newWishlistState ? JSON.stringify({
                        userId: user.uid,
                        productId: product.productId
                    }) : undefined,
                });

                if (!response.ok) throw new Error('Failed to update wishlist');

                toast({
                    title: newWishlistState ? "Added to Wishlist" : "Removed from Wishlist",
                    description: newWishlistState 
                        ? `${product.name} added to your wishlist.`
                        : `${product.name} removed from your wishlist.`,
                });
            } else {
                // Store offline
                if (newWishlistState) {
                    await storeOffline('wishlist', {
                        userId: user.uid,
                        productId: product.productId,
                        product: product,
                        addedAt: new Date().toISOString(),
                    }, `${user.uid}-${product.productId}`);
                }

                toast({
                    title: newWishlistState ? "Added to Wishlist (Offline)" : "Removed from Wishlist (Offline)",
                    description: "Changes will sync when you're back online.",
                });
            }
        } catch (error) {
            console.error('Wishlist error:', error);
            setIsWishlisted(!newWishlistState); // Revert on error
            
            toast({
                title: "Error",
                description: "Failed to update wishlist. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleAddToCart = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!user) {
            toast({
                title: "Login Required",
                description: "Please login to add items to cart.",
                variant: "destructive",
            });
            return;
        }

        setIsAddingToCart(true);

        try {
            if (isOnline) {
                // Add to cart via API
                const response = await fetch('/api/cart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.uid,
                        productId: product.productId,
                        quantity: 1,
                    }),
                });

                if (!response.ok) throw new Error('Failed to add to cart');

                toast({
                    title: "Added to Cart",
                    description: `${product.name} added to your cart.`,
                });
            } else {
                // Store offline
                await storeOffline('cart', {
                    userId: user.uid,
                    productId: product.productId,
                    product: product,
                    quantity: 1,
                    addedAt: new Date().toISOString(),
                }, `${user.uid}-${product.productId}`);

                toast({
                    title: "Added to Cart (Offline)",
                    description: "Item will sync when you're back online.",
                });
            }
        } catch (error) {
            console.error('Cart error:', error);
            
            // Fallback to offline storage
            try {
                await storeOffline('cart', {
                    userId: user.uid,
                    productId: product.productId,
                    product: product,
                    quantity: 1,
                    addedAt: new Date().toISOString(),
                }, `${user.uid}-${product.productId}`);

                toast({
                    title: "Saved Offline",
                    description: "Item saved locally and will sync later.",
                    variant: "destructive",
                });
            } catch (offlineError) {
                toast({
                    title: "Error",
                    description: "Failed to add to cart. Please try again.",
                    variant: "destructive",
                });
            }
        } finally {
            setIsAddingToCart(false);
        }
    };

    return (
        <Link href={`/marketplace/products/${product.productId}`}>
            <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-white border border-gray-100 shadow-lg flex flex-col rounded-xl h-full">
                {/* Product Image */}
                <div className="relative aspect-square overflow-hidden rounded-t-xl">
                    {product.images && product.images.length > 0 && !imageError ? (
                        <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center">
                            <Package className="h-12 w-12 sm:h-16 sm:w-16 text-orange-300" />
                        </div>
                    )}

                    {/* Wishlist Button */}
                    <button
                        onClick={handleWishlistToggle}
                        className="absolute top-2 sm:top-3 right-2 sm:right-3 p-1.5 sm:p-2 bg-white/95 hover:bg-white rounded-full shadow-lg transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110"
                    >
                        <Heart
                            className={`h-3 w-3 sm:h-4 sm:w-4 transition-colors ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'
                                }`}
                        />
                    </button>

                    {/* Availability Badge */}
                    {!product.inventory.isAvailable && (
                        <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
                            <Badge variant="destructive" className="text-xs px-2 py-1 rounded-full">
                                Out of Stock
                            </Badge>
                        </div>
                    )}

                    {/* Trending/New Badges */}
                    {(isTrending || isNew) && (
                        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-col gap-1">
                            {isTrending && (
                                <Badge className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg">
                                    🔥 Trending
                                </Badge>
                            )}
                            {isNew && !isTrending && (
                                <Badge className="text-xs px-2 py-1 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg">
                                    ✨ New
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* Quick View Button */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end justify-center pb-4">
                        <Button variant="secondary" size="sm" className="shadow-xl bg-white/95 hover:bg-white text-gray-900 rounded-full px-4">
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="text-xs sm:text-sm">Quick View</span>
                        </Button>
                    </div>
                </div>

                <CardContent className="p-3 space-y-2 flex-1 flex flex-col">
                    {/* Category Badge */}
                    <Badge variant="outline" className="text-xs w-fit border-orange-200 text-orange-700 bg-orange-50">
                        {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
                    </Badge>

                    {/* Product Name - Reduced height */}
                    <h3 className="font-semibold text-sm sm:text-base line-clamp-2 group-hover:text-orange-600 transition-colors leading-tight">
                        {product.name}
                    </h3>

                    {/* Description - Reduced height */}
                    <p className="text-gray-600 line-clamp-2 text-xs leading-relaxed">
                        {product.description}
                    </p>

                    {/* Tags - Compact */}
                    {product.tags && product.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {product.tags.slice(0, 2).map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 hover:bg-gray-200">
                                    {tag}
                                </Badge>
                            ))}
                            {product.tags.length > 2 && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600">
                                    +{product.tags.length - 2}
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* Spacer - Reduced */}
                    <div className="flex-1 min-h-[0.5rem]" />

                    {/* Rating and Stock - Compact */}
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                            <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className="h-3 w-3 fill-yellow-400 text-yellow-400"
                                    />
                                ))}
                            </div>
                            <span className="text-gray-500 ml-1">(24)</span>
                        </div>
                        <span className="text-gray-500">
                            {product.inventory.quantity} left
                        </span>
                    </div>

                    {/* Price - Compact */}
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="font-bold text-base sm:text-lg text-orange-600">
                                    {formatPrice(product.price)}
                                </span>
                                <div className="text-xs text-gray-500">Free shipping</div>
                            </div>
                            <div className="text-right text-xs">
                                <div className="text-gray-500">Handmade</div>
                                <div className="text-green-600 font-medium">✓ Authentic</div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons - Compact */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300 transition-all duration-200 h-8"
                        onClick={handleAddToCart}
                        disabled={!product.inventory.isAvailable}
                    >
                        <ShoppingBag className="h-3 w-3 mr-1" />
                        <span className="text-xs">Add to Cart</span>
                    </Button>
                </CardContent>
            </Card>
        </Link>
    );
}