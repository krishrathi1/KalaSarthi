'use client'

import React, { useState } from 'react';
import { useCart } from '@/hooks/use-cart';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Heart,
    ShoppingBag,
    IndianRupee,
    ArrowLeft,
    Package,
    Trash2
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice, formatDate } from '@/lib/format-utils';
import { useWishlist } from '@/hooks/use-wishlist';
import { useAuth } from '@/context/auth-context';

interface WishlistPageProps {
    userId: string; // In real app, get from auth context
}

export default function WishlistPage() {

    const { user } = useAuth();

    const userId = user?.uid;


    const { wishlist, loading, error, removeFromWishlist, clearWishlist } = useWishlist(userId!);
    const { addToCart } = useCart(userId!);
    const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
    const [addingToCart, setAddingToCart] = useState<Set<string>>(new Set());

    console.log("Wishlist: ", JSON.stringify(wishlist?.products, null, 2));
    console.log(wishlist?.products[0]?.productId);

    const handleRemoveItem = async (productId: string) => {
        setRemovingItems(prev => new Set(prev).add(productId));
        await removeFromWishlist(productId);
        setRemovingItems(prev => {
            const updated = new Set(prev);
            updated.delete(productId);
            return updated;
        });
    };

    const handleAddToCart = async (productId: string) => {
        setAddingToCart(prev => new Set(prev).add(productId));
        const success = await addToCart(productId, 1);
        if (success) {
            await removeFromWishlist(productId);
        }
        setAddingToCart(prev => {
            const updated = new Set(prev);
            updated.delete(productId);
            return updated;
        });
    };

    const handleClearWishlist = async () => {
        if (window.confirm('Are you sure you want to clear your wishlist?')) {
            await clearWishlist();
        }
    };

    if (loading && !wishlist) {
        return (
            <div className="min-h-screen ">
                <div className="container mx-auto px-4 py-8">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-80 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen  flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="p-6 text-center">
                        <Heart className="h-16 w-16 text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Error Loading Wishlist</h2>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <Button onClick={() => window.location.reload()}>Try Again</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!wishlist || wishlist.products.length === 0) {
        return (
            <div className="min-h-screen ">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center gap-4 mb-8">
                        <Link href="/marketplace">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Continue Shopping
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold">Your Wishlist</h1>
                    </div>

                    <div className="flex flex-col items-center justify-center py-16">
                        <Heart className="h-24 w-24 text-gray-300 mb-6" />
                        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Your wishlist is empty</h2>
                        <p className="text-gray-500 mb-8 text-center max-w-md">
                            Save items you love for later by adding them to your wishlist.
                        </p>
                        <Link href="/marketplace">
                            <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
                                <Heart className="h-5 w-5 mr-2" />
                                Start Browsing
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 w-full overflow-x-hidden">
            <div className="container mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 max-w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8 bg-white/80 backdrop-blur-sm border rounded-xl p-4 sm:p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <Link href="/marketplace">
                            <Button variant="ghost" size="sm" className="flex-shrink-0">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Continue Shopping</span>
                                <span className="sm:hidden">Shop</span>
                            </Button>
                        </Link>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-600 to-red-600 bg-clip-text text-transparent truncate">Your Wishlist</h1>
                            <p className="text-sm sm:text-base text-gray-600 truncate">{wishlist.products.length} items saved</p>
                        </div>
                    </div>

                    {wishlist.products.length > 0 && (
                        <Button variant="outline" onClick={handleClearWishlist} className="flex-shrink-0 w-full sm:w-auto">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear Wishlist
                        </Button>
                    )}
                </div>

                {/* Wishlist Items Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 w-full">
                    {wishlist.products.map((item) => (
                        <Card key={item.productId} className="group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 bg-white/80 backdrop-blur-sm border-pink-100 w-full max-w-full">
                            <CardContent className="p-0">
                                {/* Product Image */}
                                <div className="relative aspect-square bg-white overflow-hidden rounded-t-lg">
                                    {item.product?.images && item.product.images.length > 0 ? (
                                        <Image
                                            src={item.product.images[0]}
                                            alt={item.product.name}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center">
                                            <Package className="h-12 w-12 text-pink-300" />
                                        </div>
                                    )}

                                    {/* Remove from Wishlist Button */}
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm hover:bg-white"
                                        onClick={() => handleRemoveItem(item.productId)}
                                        disabled={removingItems.has(item.productId)}
                                    >
                                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                                    </Button>

                                    {/* Availability Badge */}
                                    {item.product?.inventory && !item.product.inventory.isAvailable && (
                                        <Badge
                                            variant="secondary"
                                            className="absolute top-2 left-2 bg-gray-900/90 text-white backdrop-blur-sm"
                                        >
                                            Out of Stock
                                        </Badge>
                                    )}
                                </div>

                                {/* Product Details */}
                                <div className="p-3 sm:p-4">
                                    <Badge variant="outline" className="mb-2 text-xs border-pink-200 text-pink-700">
                                        {item.product?.category}
                                    </Badge>

                                    <h3 className="font-semibold text-base sm:text-lg mb-2 line-clamp-2 min-h-[3rem]">
                                        {item.product?.name}
                                    </h3>

                                    <div className="flex items-center mb-2 sm:mb-3">
                                        <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-pink-600 to-red-600 bg-clip-text text-transparent">
                                            {formatPrice(item.product?.price || 0)}
                                        </span>
                                    </div>

                                    <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4 truncate">
                                        Added {formatDate(item.addedAt)}
                                    </p>

                                    {/* Action Buttons */}
                                    <div className="space-y-2">
                                        <Button
                                            className="w-full bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-xs sm:text-sm"
                                            size="sm"
                                            onClick={() => handleAddToCart(item.productId)}
                                            disabled={
                                                !item.product?.inventory?.isAvailable ||
                                                addingToCart.has(item.productId)
                                            }
                                        >
                                            {addingToCart.has(item.productId) ? (
                                                'Adding...'
                                            ) : (
                                                <>
                                                    <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                                    Move to Cart
                                                </>
                                            )}
                                        </Button>

                                        <Link href={`/marketplace/product/${item.productId}`} className="block">
                                            <Button variant="outline" className="w-full text-xs sm:text-sm border-pink-200 hover:bg-pink-50" size="sm">
                                                View Details
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Quick Actions */}
                {wishlist.products.length > 0 && (
                    <Card className="mt-6 sm:mt-8 bg-white/80 backdrop-blur-sm border-pink-100 shadow-sm w-full">
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between w-full">
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-base sm:text-lg mb-1">Quick Actions</h3>
                                    <p className="text-xs sm:text-sm text-gray-600">
                                        Manage all your wishlist items at once
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                            const availableItems = wishlist.products.filter(
                                                item => item.product?.inventory?.isAvailable
                                            );
                                            for (const item of availableItems) {
                                                await handleAddToCart(item.productId);
                                            }
                                        }}
                                        disabled={
                                            !wishlist.products.some(
                                                item => item.product?.inventory?.isAvailable
                                            )
                                        }
                                        className="w-full sm:w-auto border-pink-200 hover:bg-pink-50"
                                    >
                                        <ShoppingBag className="h-4 w-4 mr-2" />
                                        Add All to Cart
                                    </Button>

                                    <Button variant="outline" size="sm" onClick={handleClearWishlist} className="w-full sm:w-auto border-pink-200 hover:bg-pink-50">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Clear All
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}