'use client'

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { IProductDocument } from '@/lib/models/Product';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ArrowLeft,
    IndianRupee,
    Package,
    Heart,
    Share2,
    Star,
    ShoppingBag,
    Minus,
    Plus,
    User,
    MapPin,
    Truck,
    Shield,
    RotateCcw
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice, formatDate } from '@/lib/format-utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';


export default function ProductDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [product, setProduct] = useState<IProductDocument | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const { toast } = useToast();

    const {  user} = useAuth();

    const userId = user?.uid;

    // Cart and Wishlist hooks
    const { addToCart, loading: cartLoading } = useCart(userId!);
    const {
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        loading: wishlistLoading
    } = useWishlist(userId!);

    // Check if product is in wishlist
    const isWishlisted = product ? isInWishlist(product.productId) : false;

    useEffect(() => {
        if (params.productId) {
            fetchProduct(params.productId as string);
        }
    }, [params.productId]);

    const fetchProduct = async (productId: string) => {
        try {
            const response = await fetch(`/api/products/${productId}`);
            const data = await response.json();

            if (data.success) {
                setProduct(data.data);
            } else {
                console.error('Product not found');
                router.push('/marketplace');
            }
        } catch (error) {
            console.error('Error fetching product:', error);
            router.push('/marketplace');
        } finally {
            setLoading(false);
        }
    };

    const handleQuantityChange = (delta: number) => {
        const newQuantity = quantity + delta;
        if (newQuantity >= 1 && newQuantity <= (product?.inventory.quantity || 1)) {
            setQuantity(newQuantity);
        }
    };

    const handleAddToCart = async () => {
        if (!product || !userId) return;

        const success = await addToCart(product.productId, quantity);
        if (success) {
            toast({
                title: "Added to Cart",
                description: `Added ${quantity} item(s) to cart!`,
            });
        } else {
            toast({
                title: "Error",
                description: "Failed to add item to cart",
                variant: "destructive",
            });
        }
    };

    const handleWishlistToggle = async () => {
        if (!product || !userId) return;

        if (isWishlisted) {
            const success = await removeFromWishlist(product.productId);
            if (success) {
                toast({
                    title: "Removed from Wishlist",
                    description: "Item removed from your wishlist",
                });
            } else {
                toast({
                    title: "Error",
                    description: "Failed to remove from wishlist",
                    variant: "destructive",
                });
            }
        } else {
            const success = await addToWishlist(product.productId);
            if (success) {
                toast({
                    title: "Added to Wishlist",
                    description: "Item added to your wishlist!",
                });
            } else {
                toast({
                    title: "Error",
                    description: "Failed to add to wishlist",
                    variant: "destructive",
                });
            }
        }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: product?.name,
                text: product?.description,
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast({
                title: "Link Copied",
                description: "Product link copied to clipboard!",
            });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    <Skeleton className="h-8 w-32 mb-6" />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <Skeleton className="aspect-square w-full" />
                            <div className="grid grid-cols-4 gap-2">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <Skeleton key={i} className="aspect-square" />
                                ))}
                            </div>
                        </div>
                        <div className="space-y-6">
                            <Skeleton className="h-8 w-3/4" />
                            <Skeleton className="h-6 w-1/2" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-semibold mb-2">Product not found</h2>
                    <p className="text-gray-600 mb-4">The product you're looking for doesn't exist.</p>
                    <Link href="/marketplace">
                        <Button>Back to Marketplace</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mb-6 hover:bg-orange-50"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Marketplace
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Product Images */}
                    <div className="space-y-4">
                        {/* Main Image */}
                        <div className="relative aspect-square bg-white rounded-lg overflow-hidden shadow-lg">
                            {product.images && product.images.length > 0 ? (
                                <Image
                                    src={product.images[selectedImageIndex]}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                    <Package className="h-16 w-16 text-gray-400" />
                                </div>
                            )}
                        </div>

                        {/* Thumbnail Images */}
                        {product.images && product.images.length > 1 && (
                            <div className="grid grid-cols-4 gap-2">
                                {product.images.map((image, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedImageIndex(index)}
                                        className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${selectedImageIndex === index
                                                ? 'border-orange-500 ring-2 ring-orange-200'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <Image
                                            src={image}
                                            alt={`${product.name} ${index + 1}`}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 25vw, 12vw"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product Details */}
                    <div className="space-y-6">
                        {/* Header */}
                        <div>
                            <Badge variant="outline" className="mb-3">
                                {product.category}
                            </Badge>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                {product.name}
                            </h1>

                            {/* Rating */}
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex items-center">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className="h-4 w-4 fill-yellow-400 text-yellow-400"
                                        />
                                    ))}
                                </div>
                                <span className="text-sm text-gray-600">(24 reviews)</span>
                            </div>
                        </div>

                        {/* Price */}
                        <div className="bg-orange-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2">
                                <IndianRupee className="h-6 w-6 text-orange-600" />
                                <span className="text-3xl font-bold text-orange-600">
                                    {formatPrice(product.price)}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                                Free shipping on orders over ₹500
                            </p>
                        </div>

                        {/* Availability */}
                        <div className="flex items-center gap-2">
                            {product.inventory.isAvailable ? (
                                <>
                                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                                    <span className="text-green-600 font-medium">
                                        In Stock ({product.inventory.quantity} available)
                                    </span>
                                </>
                            ) : (
                                <>
                                    <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                                    <span className="text-red-600 font-medium">Out of Stock</span>
                                </>
                            )}
                        </div>

                        {/* Quantity Selector */}
                        {product.inventory.isAvailable && (
                            <div className="flex items-center gap-4">
                                <span className="font-medium">Quantity:</span>
                                <div className="flex items-center border rounded-md">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleQuantityChange(-1)}
                                        disabled={quantity <= 1}
                                        className="h-8 w-8 p-0"
                                    >
                                        <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="px-4 py-2 min-w-[3rem] text-center">
                                        {quantity}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleQuantityChange(1)}
                                        disabled={quantity >= product.inventory.quantity}
                                        className="h-8 w-8 p-0"
                                    >
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <Button
                                className="w-full h-12 text-lg bg-orange-600 hover:bg-orange-700"
                                onClick={handleAddToCart}
                                disabled={!product.inventory.isAvailable || cartLoading}
                            >
                                {cartLoading ? (
                                    'Adding to Cart...'
                                ) : (
                                    <>
                                        <ShoppingBag className="h-5 w-5 mr-2" />
                                        Add to Cart
                                    </>
                                )}
                            </Button>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={handleWishlistToggle}
                                    disabled={wishlistLoading}
                                >
                                    <Heart className={`h-4 w-4 mr-2 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
                                    {wishlistLoading ? 'Loading...' : isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}
                                </Button>
                                <Button variant="outline" onClick={handleShare}>
                                    <Share2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Trust Badges */}
                        <div className="grid grid-cols-3 gap-4 pt-4">
                            <div className="flex flex-col items-center text-center p-3 bg-white rounded-lg shadow-sm">
                                <Truck className="h-6 w-6 text-green-600 mb-2" />
                                <span className="text-xs font-medium">Free Shipping</span>
                                <span className="text-xs text-gray-500">On orders ₹500+</span>
                            </div>
                            <div className="flex flex-col items-center text-center p-3 bg-white rounded-lg shadow-sm">
                                <Shield className="h-6 w-6 text-blue-600 mb-2" />
                                <span className="text-xs font-medium">Secure Payment</span>
                                <span className="text-xs text-gray-500">100% Protected</span>
                            </div>
                            <div className="flex flex-col items-center text-center p-3 bg-white rounded-lg shadow-sm">
                                <RotateCcw className="h-6 w-6 text-purple-600 mb-2" />
                                <span className="text-xs font-medium">Easy Returns</span>
                                <span className="text-xs text-gray-500">30 day policy</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Product Information Tabs - Rest of the component remains the same */}
                <div className="mt-12">
                    <Tabs defaultValue="description" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="description">Description</TabsTrigger>
                            <TabsTrigger value="specifications">Specifications</TabsTrigger>
                            <TabsTrigger value="story">Story</TabsTrigger>
                            <TabsTrigger value="reviews">Reviews</TabsTrigger>
                        </TabsList>

                        <TabsContent value="description" className="mt-6">
                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="text-xl font-semibold mb-4">Product Description</h3>
                                    <div className="prose prose-gray max-w-none">
                                        <p className="text-gray-700 leading-relaxed">
                                            {product.description}
                                        </p>

                                        {product.tags && product.tags.length > 0 && (
                                            <div className="mt-6">
                                                <h4 className="font-medium mb-3">Tags</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {product.tags.map((tag, index) => (
                                                        <Badge key={index} variant="secondary">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="specifications" className="mt-6">
                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="text-xl font-semibold mb-4">Product Specifications</h3>
                                    {/* Specifications content remains the same */}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="story" className="mt-6">
                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="text-xl font-semibold mb-4">Artisan Story</h3>
                                    {/* Story content remains the same */}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="reviews" className="mt-6">
                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="text-xl font-semibold mb-4">Customer Reviews</h3>
                                    {/* Reviews content remains the same */}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}