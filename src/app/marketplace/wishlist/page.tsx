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
        <div className="min-h-screen ">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/marketplace">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Continue Shopping
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">Your Wishlist</h1>
                            <p className="text-gray-600">{wishlist.products.length} items saved</p>
                        </div>
                    </div>

                    {wishlist.products.length > 0 && (
                        <Button variant="outline" onClick={handleClearWishlist}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear Wishlist
                        </Button>
                    )}
                </div>

                {/* Wishlist Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {wishlist.products.map((item) => (
                        <Card key={item.productId} className="group hover:shadow-lg transition-shadow">
                            <CardContent className="p-0">
                                {/* Product Image */}
                                <div className="relative aspect-square bg-white overflow-hidden rounded-t-lg">
                                    {item.product?.images && item.product.images.length > 0 ? (
                                        <Image
                                            src={item.product.images[0]}
                                            alt={item.product.name}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                            <Package className="h-12 w-12 text-gray-400" />
                                        </div>
                                    )}

                                    {/* Remove from Wishlist Button */}
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleRemoveItem(item.productId)}
                                        disabled={removingItems.has(item.productId)}
                                    >
                                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                                    </Button>

                                    {/* Availability Badge */}
                                    {item.product?.inventory && !item.product.inventory.isAvailable && (
                                        <Badge
                                            variant="secondary"
                                            className="absolute top-2 left-2 bg-gray-900/80 text-white"
                                        >
                                            Out of Stock
                                        </Badge>
                                    )}
                                </div>

                                {/* Product Details */}
                                <div className="p-4">
                                    <Badge variant="outline" className="mb-2">
                                        {item.product?.category}
                                    </Badge>

                                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                                        {item.product?.name}
                                    </h3>

                                    <div className="flex items-center mb-3">
                                        <IndianRupee className="h-4 w-4 text-orange-600" />
                                        <span className="text-xl font-bold text-orange-600">
                                            {formatPrice(item.product?.price || 0)}
                                        </span>
                                    </div>

                                    <p className="text-sm text-gray-500 mb-4">
                                        Added {formatDate(item.addedAt)}
                                    </p>

                                    {/* Action Buttons */}
                                    <div className="space-y-2">
                                        <Button
                                            className="w-full bg-orange-600 hover:bg-orange-700"
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
                                                    <ShoppingBag className="h-4 w-4 mr-2" />
                                                    Move to Cart
                                                </>
                                            )}
                                        </Button>

                                        <Link href={`/marketplace/product/${item.productId}`}>
                                            <Button variant="outline" className="w-full">
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
                    <Card className="mt-8">
                        <CardContent className="p-6">
                            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                <div>
                                    <h3 className="font-semibold mb-1">Quick Actions</h3>
                                    <p className="text-sm text-gray-600">
                                        Manage all your wishlist items at once
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
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
                                    >
                                        <ShoppingBag className="h-4 w-4 mr-2" />
                                        Add All to Cart
                                    </Button>

                                    <Button variant="outline" onClick={handleClearWishlist}>
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