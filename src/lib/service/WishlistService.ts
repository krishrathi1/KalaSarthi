import { IWishlist, IWishlistDocument } from "../models/Wishlist";
import { IProductDocument } from "../models/Product";
import { FirestoreService, COLLECTIONS, where } from "../firestore";
import { v4 as uuidv4 } from 'uuid';

interface ServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

interface WishlistWithProducts {
    wishlistId: string;
    userId: string;
    products: Array<{
        productId: string;
        addedAt: Date;
        product?: any;
        _id?: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

// Wishlist service class for Firestore
export class WishlistService {
    static async createWishlist(userId: string): Promise<ServiceResponse<IWishlistDocument>> {
        try {
            // Check if wishlist already exists for user
            const existingWishlists = await FirestoreService.query<IWishlist>(
                COLLECTIONS.WISHLISTS,
                [where('userId', '==', userId)]
            );

            if (existingWishlists.length > 0) {
                return {
                    success: true,
                    data: existingWishlists[0]
                };
            }

            const wishlistId = uuidv4();
            const wishlist: IWishlist = {
                wishlistId,
                userId,
                products: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await FirestoreService.set(COLLECTIONS.WISHLISTS, wishlistId, wishlist);

            return {
                success: true,
                data: wishlist
            };
        } catch (error: any) {
            console.error('Error creating wishlist:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async getUserWishlist(userId: string): Promise<ServiceResponse<WishlistWithProducts>> {
        try {
            const wishlists = await FirestoreService.query<IWishlist>(
                COLLECTIONS.WISHLISTS,
                [where('userId', '==', userId)]
            );

            let wishlist = wishlists.length > 0 ? wishlists[0] : null;

            // Create wishlist if it doesn't exist
            if (!wishlist) {
                const createResult = await this.createWishlist(userId);
                if (!createResult.success) {
                    return createResult as any;
                }
                wishlist = createResult.data!;
            }

            // Populate products data
            const productsWithData = await Promise.all(
                (wishlist.products || []).map(async (item) => {
                    try {
                        const product = await FirestoreService.getById<IProductDocument>(
                            COLLECTIONS.PRODUCTS,
                            item.productId
                        );
                        return {
                            productId: item.productId,
                            addedAt: item.addedAt,
                            product: product || undefined
                        };
                    } catch (error) {
                        console.error(`Error fetching product ${item.productId}:`, error);
                        return {
                            productId: item.productId,
                            addedAt: item.addedAt,
                            product: undefined
                        };
                    }
                })
            );

            const wishlistWithProducts: WishlistWithProducts = {
                wishlistId: wishlist.wishlistId,
                userId: wishlist.userId,
                createdAt: wishlist.createdAt,
                updatedAt: wishlist.updatedAt,
                products: productsWithData
            };

            return {
                success: true,
                data: wishlistWithProducts
            };
        } catch (error: any) {
            console.error('Error fetching wishlist:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async addToWishlist(userId: string, productId: string): Promise<ServiceResponse> {
        try {
            // Verify product exists
            const product = await FirestoreService.getById<IProductDocument>(COLLECTIONS.PRODUCTS, productId);
            if (!product) {
                return {
                    success: false,
                    error: 'Product not found'
                };
            }

            const wishlists = await FirestoreService.query<IWishlist>(
                COLLECTIONS.WISHLISTS,
                [where('userId', '==', userId)]
            );

            let wishlist = wishlists.length > 0 ? wishlists[0] : null;

            // Create wishlist if it doesn't exist
            if (!wishlist) {
                const createResult = await this.createWishlist(userId);
                if (!createResult.success) {
                    return createResult;
                }
                wishlist = createResult.data!;
            }

            // Check if product already in wishlist
            const existingProduct = wishlist.products.find(
                item => item.productId === productId
            );

            if (existingProduct) {
                return {
                    success: false,
                    error: 'Product already in wishlist'
                };
            }

            // Add product to wishlist
            wishlist.products.push({
                productId,
                addedAt: new Date()
            });

            await FirestoreService.update(COLLECTIONS.WISHLISTS, wishlist.wishlistId, {
                products: wishlist.products,
                updatedAt: new Date()
            });

            return {
                success: true,
                data: { message: 'Product added to wishlist' }
            };
        } catch (error: any) {
            console.error('Error adding to wishlist:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async removeFromWishlist(userId: string, productId: string): Promise<ServiceResponse> {
        try {
            const wishlists = await FirestoreService.query<IWishlist>(
                COLLECTIONS.WISHLISTS,
                [where('userId', '==', userId)]
            );

            if (wishlists.length === 0) {
                return {
                    success: false,
                    error: 'Wishlist not found'
                };
            }

            const wishlist = wishlists[0];
            const originalLength = wishlist.products.length;
            wishlist.products = wishlist.products.filter(item => item.productId !== productId);

            if (wishlist.products.length === originalLength) {
                return {
                    success: false,
                    error: 'Product not found in wishlist'
                };
            }

            await FirestoreService.update(COLLECTIONS.WISHLISTS, wishlist.wishlistId, {
                products: wishlist.products,
                updatedAt: new Date()
            });

            return {
                success: true,
                data: { message: 'Product removed from wishlist' }
            };
        } catch (error: any) {
            console.error('Error removing from wishlist:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async isInWishlist(userId: string, productId: string): Promise<ServiceResponse<boolean>> {
        try {
            const wishlists = await FirestoreService.query<IWishlist>(
                COLLECTIONS.WISHLISTS,
                [where('userId', '==', userId)]
            );

            if (wishlists.length === 0) {
                return {
                    success: true,
                    data: false
                };
            }

            const wishlist = wishlists[0];
            const isInWishlist = wishlist.products.some(item => item.productId === productId);

            return {
                success: true,
                data: isInWishlist
            };
        } catch (error: any) {
            console.error('Error checking wishlist:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async clearWishlist(userId: string): Promise<ServiceResponse> {
        try {
            const wishlists = await FirestoreService.query<IWishlist>(
                COLLECTIONS.WISHLISTS,
                [where('userId', '==', userId)]
            );

            if (wishlists.length > 0) {
                await FirestoreService.update(COLLECTIONS.WISHLISTS, wishlists[0].wishlistId, {
                    products: [],
                    updatedAt: new Date()
                });
            }

            return {
                success: true,
                data: { message: 'Wishlist cleared' }
            };
        } catch (error: any) {
            console.error('Error clearing wishlist:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async getWishlistCount(userId: string): Promise<ServiceResponse<number>> {
        try {
            const wishlists = await FirestoreService.query<IWishlist>(
                COLLECTIONS.WISHLISTS,
                [where('userId', '==', userId)]
            );

            const count = wishlists.length > 0 ? wishlists[0].products.length : 0;

            return {
                success: true,
                data: count
            };
        } catch (error: any) {
            console.error('Error getting wishlist count:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
