'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Star, MessageSquare, IndianRupee } from 'lucide-react';
import Image from 'next/image';
import { formatPrice } from '@/lib/format-utils';

interface ScrapedProduct {
    title: string;
    url: string;
    price: number;
    rating?: number;
    reviewCount?: number;
    image?: string;
}

interface ScrapedProductGridProps {
    products: ScrapedProduct[];
    platform: string;
}

export default function ScrapedProductGrid({ products, platform }: ScrapedProductGridProps) {
    if (products.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="h-12 w-12 text-muted-foreground mx-auto mb-4">
                    <ExternalLink className="h-full w-full" />
                </div>
                <h3 className="text-lg font-medium mb-2">No products found</h3>
                <p className="text-muted-foreground">
                    No products were found for the search query on {platform}.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product, index) => (
                <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Product Image */}
                    <div className="relative aspect-square">
                        {product.image ? (
                            <Image
                                src={product.image}
                                alt={product.title}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                onError={(e) => {
                                    // Fallback to placeholder if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/placeholder-product.jpg';
                                }}
                            />
                        ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                <div className="text-muted-foreground">
                                    <ExternalLink className="h-12 w-12" />
                                </div>
                            </div>
                        )}

                        {/* Platform Badge */}
                        <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="text-xs">
                                {platform}
                            </Badge>
                        </div>
                    </div>

                    <CardContent className="p-4">
                        {/* Product Info */}
                        <div className="space-y-2">
                            <h3 className="font-semibold line-clamp-2 text-sm">
                                {product.title}
                            </h3>

                            {/* Price */}
                            <div className="flex items-center gap-1">
                                <IndianRupee className="h-4 w-4" />
                                <span className="font-semibold">
                                    {formatPrice(product.price)}
                                </span>
                            </div>

                            {/* Rating and Reviews */}
                            {(product.rating || product.reviewCount) && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    {product.rating && (
                                        <div className="flex items-center gap-1">
                                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                            <span>{product.rating}</span>
                                        </div>
                                    )}
                                    {product.reviewCount && (
                                        <div className="flex items-center gap-1">
                                            <MessageSquare className="h-3 w-3" />
                                            <span>{product.reviewCount}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* External Link */}
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => window.open(product.url, '_blank')}
                            >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View on {platform}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}