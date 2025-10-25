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
    const [currentSrc, setCurrentSrc] = useState(src || 'https://via.placeholder.com/400x400/6366f1/ffffff?text=Product+Image');
    const [fallbackAttempts, setFallbackAttempts] = useState(0);

    // Fallback image sources - more reliable options
    const fallbackImages = [
        'https://via.placeholder.com/400x400/6366f1/ffffff?text=Handmade+Product',
        'https://via.placeholder.com/400x400/10b981/ffffff?text=Artisan+Craft',
        'https://via.placeholder.com/400x400/f59e0b/ffffff?text=Trending+Item',
        'https://via.placeholder.com/400x400/ef4444/ffffff?text=Popular+Product',
        'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=Craft+Item',
        'https://via.placeholder.com/400x400/06b6d4/ffffff?text=Handcrafted'
    ];

    const getFallbackImage = () => {
        const randomIndex = Math.floor(Math.random() * fallbackImages.length);
        return fallbackImages[randomIndex];
    };

    const handleError = () => {
        // Try fallback images before giving up
        if (fallbackAttempts < fallbackImages.length) {
            const fallbackSrc = fallbackImages[fallbackAttempts];
            setCurrentSrc(fallbackSrc);
            setFallbackAttempts(prev => prev + 1);
            setImageLoading(true);
        } else {
            // If all fallbacks fail, show a simple colored placeholder
            setCurrentSrc('https://via.placeholder.com/400x400/6366f1/ffffff?text=Product');
            setImageLoading(false);
        }
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
                src={currentSrc}
                alt={alt}
                fill={fill}
                width={width}
                height={height}
                className={`${className} ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
                sizes={sizes}
                onError={handleError}
                onLoad={handleLoad}
                priority={false}
                unoptimized={currentSrc.includes('placeholder') || currentSrc.includes('picsum')}
            />
        </div>
    );
}
