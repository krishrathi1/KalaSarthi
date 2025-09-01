'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { IProductDocument } from '@/lib/models/Product';
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

export default function ProductDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [product, setProduct] = useState<IProductDocument | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [isWishlisted, setIsWishlisted] = useState(false);

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

    const handleAddToCart = () => {
        if (!product) return;
        // TODO: Implement add to cart functionality
        console.log('Add to cart:', { productId: product.productId, quantity });
    };

    const handleWishlistToggle = () => {
        setIsWishlisted(!isWishlisted);
        // TODO: Implement wishlist API call
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: product?.name,
                text: product?.description,
                url: window.location.href,
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href);
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
                            <div className="grid grid-cols-3 gap-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-20" />
                                ))}
                            </div>
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
        <div className="min-h-screen ">
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
                                        className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
                                            selectedImageIndex === index 
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
                                disabled={!product.inventory.isAvailable}
                            >
                                <ShoppingBag className="h-5 w-5 mr-2" />
                                Add to Cart
                            </Button>
                            
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    className="flex-1"
                                    onClick={handleWishlistToggle}
                                >
                                    <Heart className={`h-4 w-4 mr-2 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
                                    {isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}
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

                {/* Product Information Tabs */}
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
                                        
                                        {/* Tags */}
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
                                    
                                    {product.specifications ? (
                                        <div className="space-y-6">
                                            {/* Materials */}
                                            {product.specifications.materials && product.specifications.materials.length > 0 && (
                                                <div>
                                                    <h4 className="font-medium mb-2">Materials</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {product.specifications.materials.map((material, index) => (
                                                            <Badge key={index} variant="outline">
                                                                {material}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Dimensions */}
                                            {product.specifications.dimensions && (
                                                <div>
                                                    <h4 className="font-medium mb-2">Dimensions</h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {product.specifications.dimensions.length && (
                                                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                                                <div className="font-semibold">{product.specifications.dimensions.length}</div>
                                                                <div className="text-sm text-gray-600">Length (cm)</div>
                                                            </div>
                                                        )}
                                                        {product.specifications.dimensions.width && (
                                                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                                                <div className="font-semibold">{product.specifications.dimensions.width}</div>
                                                                <div className="text-sm text-gray-600">Width (cm)</div>
                                                            </div>
                                                        )}
                                                        {product.specifications.dimensions.height && (
                                                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                                                <div className="font-semibold">{product.specifications.dimensions.height}</div>
                                                                <div className="text-sm text-gray-600">Height (cm)</div>
                                                            </div>
                                                        )}
                                                        {product.specifications.dimensions.weight && (
                                                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                                                <div className="font-semibold">{product.specifications.dimensions.weight}</div>
                                                                <div className="text-sm text-gray-600">Weight (g)</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Colors */}
                                            {product.specifications.colors && product.specifications.colors.length > 0 && (
                                                <div>
                                                    <h4 className="font-medium mb-2">Available Colors</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {product.specifications.colors.map((color, index) => (
                                                            <Badge key={index} variant="outline">
                                                                {color}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-gray-600">No specifications available for this product.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="story" className="mt-6">
                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="text-xl font-semibold mb-4">Artisan Story</h3>
                                    
                                    {product.story?.englishStory ? (
                                        <div className="space-y-4">
                                            <div className="prose prose-gray max-w-none">
                                                <p className="text-gray-700 leading-relaxed">
                                                    {product.story.englishStory}
                                                </p>
                                            </div>
                                            
                                            {product.story.englishCaption && (
                                                <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                                                    <p className="text-orange-800 font-medium">
                                                        "{product.story.englishCaption}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-gray-600">
                                            The artisan hasn't shared a story for this product yet.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="reviews" className="mt-6">
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-semibold">Customer Reviews</h3>
                                        <Button variant="outline">Write a Review</Button>
                                    </div>
                                    
                                    {/* Overall Rating */}
                                    <div className="bg-gray-50 p-6 rounded-lg mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <div className="text-4xl font-bold text-gray-900">4.8</div>
                                                <div className="flex items-center justify-center mt-1">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star 
                                                            key={star} 
                                                            className="h-4 w-4 fill-yellow-400 text-yellow-400" 
                                                        />
                                                    ))}
                                                </div>
                                                <div className="text-sm text-gray-600 mt-1">24 reviews</div>
                                            </div>
                                            
                                            <div className="flex-1">
                                                {[5, 4, 3, 2, 1].map((rating) => (
                                                    <div key={rating} className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm w-3">{rating}</span>
                                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                            <div 
                                                                className="bg-yellow-400 h-2 rounded-full" 
                                                                style={{ width: `${rating * 20}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm text-gray-600 w-8">{rating * 2}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sample Reviews */}
                                    <div className="space-y-6">
                                        {[
                                            {
                                                name: "Sarah Johnson",
                                                rating: 5,
                                                date: "2024-01-15",
                                                comment: "Absolutely beautiful craftsmanship! The attention to detail is incredible and it arrived perfectly packaged."
                                            },
                                            {
                                                name: "Michael Chen",
                                                rating: 5,
                                                date: "2024-01-10",
                                                comment: "Exceeded my expectations. The quality is outstanding and it looks even better in person."
                                            },
                                            {
                                                name: "Emily Davis",
                                                rating: 4,
                                                date: "2024-01-08",
                                                comment: "Very happy with my purchase. Fast shipping and exactly as described. Highly recommend!"
                                            }
                                        ].map((review, index) => (
                                            <div key={index} className="border-b pb-6 last:border-b-0">
                                                <div className="flex items-center gap-4 mb-3">
                                                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                                        <User className="h-5 w-5 text-orange-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{review.name}</div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <Star 
                                                                        key={star} 
                                                                        className={`h-3 w-3 ${
                                                                            star <= review.rating 
                                                                                ? 'fill-yellow-400 text-yellow-400' 
                                                                                : 'text-gray-300'
                                                                        }`}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <span className="text-sm text-gray-600">
                                                                {formatDate(review.date)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-gray-700">{review.comment}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Product Metadata */}
                <Card className="mt-8">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
                            <div>
                                <span className="font-medium">Product ID:</span> {product.productId}
                            </div>
                            <div>
                                <span className="font-medium">Category:</span> {product.category}
                            </div>
                            <div>
                                <span className="font-medium">Created:</span> {formatDate(product.createdAt)}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}