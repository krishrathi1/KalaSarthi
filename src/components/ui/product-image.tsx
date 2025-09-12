"use client";

import Image from "next/image";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";

interface ProductImageProps {
    src: string;
    alt: string;
    className?: string;
    fill?: boolean;
    sizes?: string;
    width?: number;
    height?: number;
    fallbackIcon?: React.ReactNode;
}

export function ProductImage({
    src,
    alt,
    className = "object-cover",
    fill = false,
    sizes,
    width,
    height,
    fallbackIcon = <ShoppingBag className="size-6 text-muted-foreground" />
}: ProductImageProps) {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);

    // Fallback image sources
    const fallbackImages = [
        'https://picsum.photos/400/400?random=1',
        'https://picsum.photos/400/400?random=2',
        'https://picsum.photos/400/400?random=3',
        'https://via.placeholder.com/400x400/6366f1/ffffff?text=Product',
        'https://via.placeholder.com/400x400/10b981/ffffff?text=Handmade',
        'https://via.placeholder.com/400x400/f59e0b/ffffff?text=Artisan'
    ];

    const getFallbackImage = () => {
        const randomIndex = Math.floor(Math.random() * fallbackImages.length);
        return fallbackImages[randomIndex];
    };

    const handleError = () => {
        setImageError(true);
        setImageLoading(false);
    };

    const handleLoad = () => {
        setImageLoading(false);
    };

    if (imageError) {
        return (
            <div className={`${fill ? 'w-full h-full' : ''} bg-muted flex items-center justify-center rounded-lg`}>
                {fallbackIcon}
            </div>
        );
    }

    return (
        <div className="relative">
            {imageLoading && (
                <div className={`${fill ? 'absolute inset-0' : ''} bg-muted animate-pulse rounded-lg flex items-center justify-center`}>
                    <div className="w-6 h-6 bg-muted-foreground/20 rounded"></div>
                </div>
            )}
            <Image
                src={src}
                alt={alt}
                fill={fill}
                width={width}
                height={height}
                className={`${className} ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
                sizes={sizes}
                onError={handleError}
                onLoad={handleLoad}
                priority={false}
            />
        </div>
    );
}
