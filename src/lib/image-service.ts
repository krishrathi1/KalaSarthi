/**
 * Dynamic Image Service for Trend Spotter
 * Generates appropriate images based on product queries and categories
 */

export interface ImageGenerationOptions {
    query: string;
    productTitle?: string;
    category?: string;
    index?: number;
    width?: number;
    height?: number;
}

export class ImageService {
    private static readonly IMAGE_SOURCES = {
        // Primary sources
        unsplash: 'https://images.unsplash.com/photo',
        picsum: 'https://picsum.photos',
        placeholder: 'https://via.placeholder.com',

        // Fallback sources
        loremflickr: 'https://loremflickr.com',
        placeholderApi: 'https://placehold.co'
    };

    private static readonly CATEGORY_KEYWORDS = {
        jewelry: ['jewelry', 'necklace', 'ring', 'earring', 'bracelet', 'pendant', 'chain', 'bangle'],
        textile: ['fabric', 'saree', 'dress', 'cloth', 'textile', 'scarf', 'shawl', 'dupatta', 'cushion'],
        pottery: ['pottery', 'ceramic', 'pot', 'vase', 'bowl', 'plate', 'mug', 'cup', 'dish'],
        wood: ['wood', 'furniture', 'table', 'chair', 'wooden', 'shelf', 'box', 'frame', 'toy'],
        art: ['painting', 'art', 'canvas', 'sculpture', 'artwork', 'drawing', 'sketch', 'print'],
        craft: ['handmade', 'craft', 'decorative', 'ornament', 'gift', 'handicraft', 'traditional']
    };

    private static readonly IMAGE_IDS = {
        jewelry: [
            '1515562141207-7a88fb7ce338', '1605100804763-247f67b3557e', '1599643478518-a784e5dc4c8f',
            '1535632066927-ab7c9ab60908', '1515372039744-b8f02a3ae446', '1515562141207-7a88fb7ce338'
        ],
        textile: [
            '1586023492125-27b2c045efd7', '1558769132-cb1aea458c5e', '1594736797933-d0401ba2fe65',
            '1610030469983-98e550d6193c', '1601924582970-9238bcb495d9', '1586023492125-27b2c045efd7'
        ],
        pottery: [
            '1578662996442-48f61c03fc96', '1578749556568-bc2c40e68b61', '1544551763-46a013bb70d5',
            '1586023492125-27b2c045efd7', '1578321272176-b7bbc0679853', '1578662996442-48f61c03fc96'
        ],
        wood: [
            '1586023492125-27b2c045efd7', '1558618666-fcd25c85cd64', '1541961017774-22349e4a1262',
            '1601762603332-db5e4b90cc5d', '1452860606245-08befc0ff44b', '1586023492125-27b2c045efd7'
        ],
        art: [
            '1541961017774-22349e4a1262', '1578321272176-b7bbc0679853', '1601762603332-db5e4b90cc5d',
            '1544966503-7cc5ac882d5e', '1578662996442-48f61c03fc96', '1541961017774-22349e4a1262'
        ],
        craft: [
            '1601762603332-db5e4b90cc5d', '1452860606245-08befc0ff44b', '1544966503-7cc5ac882d5e',
            '1586023492125-27b2c045efd7', '1578662996442-48f61c03fc96', '1601762603332-db5e4b90cc5d'
        ]
    };

    /**
     * Generate a dynamic image URL based on query and product details
     */
    static generateImage(options: ImageGenerationOptions): string {
        const {
            query,
            productTitle = '',
            category,
            index = 0,
            width = 400,
            height = 400
        } = options;

        // Detect category if not provided
        const detectedCategory = category || this.detectCategory(query, productTitle);

        // Generate unique identifier for this image
        const uniqueId = this.generateUniqueId(query, productTitle, index);

        // Try different image generation strategies
        const strategies = [
            () => this.generateUnsplashImage(detectedCategory, query, index, width, height),
            () => this.generatePicsumImage(query, index, width, height),
            () => this.generatePlaceholderImage(query, width, height),
            () => this.generateFallbackImage(detectedCategory, width, height)
        ];

        // Try each strategy until one works
        for (const strategy of strategies) {
            try {
                const imageUrl = strategy();
                if (imageUrl) return imageUrl;
            } catch (error) {
                console.warn('Image generation strategy failed:', error);
                continue;
            }
        }

        // Ultimate fallback
        return this.generateFallbackImage('craft', width, height);
    }

    /**
     * Detect category based on query and product title
     */
    private static detectCategory(query: string, productTitle: string): string {
        const combinedText = `${query.toLowerCase()} ${productTitle.toLowerCase()}`;

        for (const [category, keywords] of Object.entries(this.CATEGORY_KEYWORDS)) {
            if (keywords.some(keyword => combinedText.includes(keyword))) {
                return category;
            }
        }

        return 'craft';
    }

    /**
     * Generate Unsplash image URL
     */
    private static generateUnsplashImage(
        category: string,
        query: string,
        index: number,
        width: number,
        height: number
    ): string {
        const imageIds = this.IMAGE_IDS[category as keyof typeof this.IMAGE_IDS] || this.IMAGE_IDS.craft;
        const imageId = imageIds[index % imageIds.length];
        const timestamp = Date.now() + index;

        return `${this.IMAGE_SOURCES.unsplash}-${imageId}?w=${width}&h=${height}&fit=crop&q=${encodeURIComponent(query)}&t=${timestamp}`;
    }

    /**
     * Generate Picsum random image
     */
    private static generatePicsumImage(query: string, index: number, width: number, height: number): string {
        const seed = this.generateSeed(query, index);
        return `${this.IMAGE_SOURCES.picsum}/${width}/${height}?random=${seed}`;
    }

    /**
     * Generate placeholder image with text
     */
    private static generatePlaceholderImage(query: string, width: number, height: number): string {
        const text = encodeURIComponent(query.substring(0, 20));
        const color = this.getColorForQuery(query);
        return `${this.IMAGE_SOURCES.placeholder}/${width}x${height}/${color}/ffffff?text=${text}`;
    }

    /**
     * Generate fallback image
     */
    private static generateFallbackImage(category: string, width: number, height: number): string {
        const colors = {
            jewelry: '8B5CF6', // Purple
            textile: '10B981', // Green
            pottery: 'F59E0B', // Orange
            wood: 'D97706',    // Amber
            art: 'EF4444',     // Red
            craft: '6366F1'    // Indigo
        };

        const color = colors[category as keyof typeof colors] || colors.craft;
        return `${this.IMAGE_SOURCES.placeholder}/${width}x${height}/${color}/ffffff?text=Product`;
    }

    /**
     * Generate unique identifier for image
     */
    private static generateUniqueId(query: string, productTitle: string, index: number): string {
        const combined = `${query}-${productTitle}-${index}`;
        return btoa(combined).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
    }

    /**
     * Generate seed for random image generation
     */
    private static generateSeed(query: string, index: number): number {
        let hash = 0;
        const str = `${query}-${index}`;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Get color for query-based placeholder
     */
    private static getColorForQuery(query: string): string {
        const colors = ['6366F1', '10B981', 'F59E0B', 'EF4444', '8B5CF6', 'EC4899'];
        let hash = 0;
        for (let i = 0; i < query.length; i++) {
            hash = query.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    /**
     * Get multiple images for a query (useful for product grids)
     */
    static generateMultipleImages(
        query: string,
        count: number,
        productTitles: string[] = []
    ): string[] {
        return Array.from({ length: count }, (_, index) =>
            this.generateImage({
                query,
                productTitle: productTitles[index] || `${query} - Product ${index + 1}`,
                index
            })
        );
    }
}
