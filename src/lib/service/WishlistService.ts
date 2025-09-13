import Wishlist, { IWishlist, IWishlistDocument } from "../models/Wishlist";
import Product, { IProductDocument } from "../models/Product";
import connectDB from "../mongodb";
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
        product?: any; // Use any to avoid strict typing issues
        _id?: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

// Wishlist service class
export class WishlistService {
    static async createWishlist(userId: string): Promise<ServiceResponse<IWishlistDocument>> {
        try {
            await connectDB();

            // Check if wishlist already exists for user
            const existingWishlist = await Wishlist.findOne({ userId }).exec();
            if (existingWishlist) {
                return {
                    success: true,
                    data: existingWishlist
                };
            }

            const wishlist = new Wishlist({
                wishlistId: uuidv4(),
                userId,
                products: []
            });

            const savedWishlist = await wishlist.save();
            return {
                success: true,
                data: savedWishlist
            };
        } catch (error: any) {
            console.error('Error creating wishlist:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async getUserWishlist(userId: string): Promise<ServiceResponse<WishlistWithProducts>> {
        try {
            await connectDB();

            let wishlist = await Wishlist.findOne({ userId }).exec();
            
            // Create wishlist if it doesn't exist
            if (!wishlist) {
                const createResult = await this.createWishlist(userId);
                if (!createResult.success) {
                    return createResult;
                }
                wishlist = createResult.data as typeof Wishlist.prototype;
            }

            // Convert wishlist to plain object to avoid Mongoose issues
            const plainWishlist = wishlist!.toObject();

            // Populate products data
            const productsWithData = await Promise.all(
                (plainWishlist?.products ?? []).map(async (item) => {
                    try {
                        const product = await Product.findOne({ productId: item.productId }).exec();
                        return {
                            productId: item.productId,
                            addedAt: item.addedAt,
                            _id: (item as any)._id?.toString(),
                            product: product ? product.toObject() : undefined
                        };
                    } catch (error) {
                        console.error(`Error fetching product ${item.productId}:`, error);
                        return {
                            productId: item.productId,
                            addedAt: item.addedAt,
                            _id: (item as any)._id?.toString(),
                            product: undefined
                        };
                    }
                })
            );

            const wishlistWithProducts: WishlistWithProducts = {
                wishlistId: plainWishlist.wishlistId,
                userId: plainWishlist.userId,
                createdAt: plainWishlist.createdAt,
                updatedAt: plainWishlist.updatedAt,
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
                error: error.message
            };
        }
    }

    static async addToWishlist(userId: string, productId: string): Promise<ServiceResponse> {
        try {
            await connectDB();

            // Verify product exists
            const product = await Product.findOne({ productId }).exec();
            if (!product) {
                return {
                    success: false,
                    error: 'Product not found'
                };
            }

            let wishlist = await Wishlist.findOne({ userId }).exec();
            
            // Create wishlist if it doesn't exist
            if (!wishlist) {
                const createResult = await this.createWishlist(userId);
                if (!createResult.success) {
                    return createResult;
                }
                wishlist = createResult.data as typeof Wishlist.prototype;
            }

            // Check if product already in wishlist
            const existingProduct = wishlist?.products.find(
                item => item.productId === productId
            );

            if (existingProduct) {
                return {
                    success: false,
                    error: 'Product already in wishlist'
                };
            }

            // Add product to wishlist
            wishlist?.products.push({
                productId,
                addedAt: new Date()
            });

            await wishlist?.save();

            return {
                success: true,
                data: { message: 'Product added to wishlist' }
            };
        } catch (error: any) {
            console.error('Error adding to wishlist:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async removeFromWishlist(userId: string, productId: string): Promise<ServiceResponse> {
        try {
            await connectDB();

            const result = await Wishlist.updateOne(
                { userId },
                {
                    $pull: {
                        products: { productId }
                    }
                }
            ).exec();

            if (result.modifiedCount === 0) {
                return {
                    success: false,
                    error: 'Product not found in wishlist'
                };
            }

            return {
                success: true,
                data: { message: 'Product removed from wishlist' }
            };
        } catch (error: any) {
            console.error('Error removing from wishlist:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async isInWishlist(userId: string, productId: string): Promise<ServiceResponse<boolean>> {
        try {
            await connectDB();

            const wishlist = await Wishlist.findOne({
                userId,
                'products.productId': productId
            }).exec();

            return {
                success: true,
                data: !!wishlist
            };
        } catch (error: any) {
            console.error('Error checking wishlist:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async clearWishlist(userId: string): Promise<ServiceResponse> {
        try {
            await connectDB();

            await Wishlist.updateOne(
                { userId },
                { $set: { products: [] } }
            ).exec();

            return {
                success: true,
                data: { message: 'Wishlist cleared' }
            };
        } catch (error: any) {
            console.error('Error clearing wishlist:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async getWishlistCount(userId: string): Promise<ServiceResponse<number>> {
        try {
            await connectDB();

            const wishlist = await Wishlist.findOne({ userId }).exec();
            const count = wishlist ? wishlist.products.length : 0;

            return {
                success: true,
                data: count
            };
        } catch (error: any) {
            console.error('Error getting wishlist count:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}