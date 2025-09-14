import Cart, { ICart, ICartDocument } from "../models/Cart";
import Product, { IProductDocument } from "../models/Product";
import connectDB from "../mongodb";
import { v4 as uuidv4 } from 'uuid';

interface ServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

interface CartWithProducts extends Omit<ICart, 'items'> {
    items: Array<{
        productId: string;
        quantity: number;
        addedAt: Date;
        updatedAt: Date;
        product?: IProductDocument;
        subtotal?: number;
        _id?: string;
    }>;
}

// Cart service class
export class CartService {
    static async createCart(userId: string): Promise<ServiceResponse<ICartDocument>> {
        try {
            await connectDB();

            // Check if cart already exists for user
            const existingCart = await Cart.findOne({ userId }).exec();
            if (existingCart) {
                return {
                    success: true,
                    data: existingCart
                };
            }

            const cart = new Cart({
                cartId: uuidv4(),
                userId,
                items: [],
                totalAmount: 0,
                totalItems: 0
            });

            const savedCart = await cart.save();
            return {
                success: true,
                data: savedCart
            };
        } catch (error: any) {
            console.error('Error creating cart:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async getUserCart(userId: string): Promise<ServiceResponse<CartWithProducts>> {
        try {
            await connectDB();

            let cart = await Cart.findOne({ userId }).exec();

            // Create cart if it doesn't exist
            if (!cart) {
                const createResult = await this.createCart(userId);
                if (!createResult.success || !createResult.data) {
                    return {
                        success: false,
                        error: createResult.error || 'Failed to create cart'
                    };
                }
                cart = createResult.data as typeof Cart.prototype;
            }

            // Convert cart to plain object to avoid Mongoose issues
            const plainCart = cart?.toObject();

            // Populate products data and calculate subtotals
            const itemsWithData = await Promise.all(
                (plainCart?.items ?? []).map(async (item) => {
                    try {
                        const product = await Product.findOne({ productId: item.productId }).exec();
                        const subtotal = product ? product.price * item.quantity : 0;
                        return {
                            productId: item.productId,
                            quantity: item.quantity,
                            addedAt: item.addedAt,
                            updatedAt: item.updatedAt,
                            _id: (item as any)._id?.toString(),
                            product: product ? product.toObject() : undefined,
                            subtotal
                        };
                    } catch (error) {
                        console.error(`Error fetching product ${item.productId}:`, error);
                        return {
                            productId: item.productId,
                            quantity: item.quantity,
                            addedAt: item.addedAt,
                            updatedAt: item.updatedAt,
                            _id: (item as any)._id?.toString(),
                            product: undefined,
                            subtotal: 0
                        };
                    }
                })
            );

            // Calculate total amount
            const totalAmount = itemsWithData.reduce((total, item) => total + (item.subtotal || 0), 0);

            // Update cart totals if they don't match
            if (cart && cart.totalAmount !== totalAmount) {
                await Cart.updateOne(
                    { userId },
                    {
                        $set: {
                            totalAmount,
                            totalItems: plainCart?.items.reduce((total, item) => total + item.quantity, 0)
                        }
                    }
                ).exec();
            }

            const cartWithProducts: CartWithProducts = {
                ...plainCart,
                cartId: plainCart?.cartId || '',
                userId: plainCart?.userId || '',
                items: itemsWithData || [],
                totalAmount: plainCart?.totalAmount || 0,
                totalItems: plainCart?.totalItems || 0,
                createdAt: plainCart?.createdAt || new Date(),
                updatedAt: plainCart?.updatedAt || new Date()
            };

            return {
                success: true,
                data: cartWithProducts
            };
        } catch (error: any) {
            console.error('Error fetching cart:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async addToCart(userId: string, productId: string, quantity: number = 1): Promise<ServiceResponse> {
        try {
            await connectDB();

            // Verify product exists and is available
            const product = await Product.findOne({ productId }).exec();
            if (!product) {
                return {
                    success: false,
                    error: 'Product not found'
                };
            }

            if (!product.inventory.isAvailable) {
                return {
                    success: false,
                    error: 'Product is not available'
                };
            }

            if (quantity > product.inventory.quantity) {
                return {
                    success: false,
                    error: `Only ${product.inventory.quantity} items available`
                };
            }

            let cart = await Cart.findOne({ userId }).exec();

            // Create cart if it doesn't exist
            if (!cart) {
                const createResult = await this.createCart(userId);
                if (!createResult.success || !createResult.data) {
                    return {
                        success: false,
                        error: createResult.error || 'Failed to create cart'
                    };
                }
                cart = createResult.data as typeof Cart.prototype;
            }

            // Check if product already in cart
            const existingItemIndex = cart && cart.items
                ? cart.items.findIndex(item => item.productId === productId)
                : -1;

            if (cart && existingItemIndex >= 0) {
                // Update existing item quantity
                const newQuantity = cart.items[existingItemIndex].quantity + quantity;

                if (newQuantity > product.inventory.quantity) {
                    return {
                        success: false,
                        error: `Cannot add more items. Only ${product.inventory.quantity} available`
                    };
                }

                cart.items[existingItemIndex].quantity = newQuantity;
                cart.items[existingItemIndex].updatedAt = new Date();
            } else if (cart) {
                // Add new item to cart
                cart.items.push({
                    productId,
                    quantity,
                    addedAt: new Date(),
                    updatedAt: new Date()
                });
            }

            // Recalculate totals
            if (cart) {
                await this.recalculateCartTotals(cart);
                await cart.save();
            }

            return {
                success: true,
                data: { message: 'Product added to cart' }
            };
        } catch (error: any) {
            console.error('Error adding to cart:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async updateCartItem(userId: string, productId: string, quantity: number): Promise<ServiceResponse> {
        try {
            await connectDB();

            if (quantity < 1) {
                return this.removeFromCart(userId, productId);
            }

            // Verify product availability
            const product = await Product.findOne({ productId }).exec();
            if (!product) {
                return {
                    success: false,
                    error: 'Product not found'
                };
            }

            if (quantity > product.inventory.quantity) {
                return {
                    success: false,
                    error: `Only ${product.inventory.quantity} items available`
                };
            }

            const cart = await Cart.findOne({ userId }).exec();
            if (!cart) {
                return {
                    success: false,
                    error: 'Cart not found'
                };
            }

            const itemIndex = cart.items.findIndex(item => item.productId === productId);
            if (itemIndex === -1) {
                return {
                    success: false,
                    error: 'Product not found in cart'
                };
            }

            cart.items[itemIndex].quantity = quantity;
            cart.items[itemIndex].updatedAt = new Date();

            await this.recalculateCartTotals(cart);
            await cart.save();

            return {
                success: true,
                data: { message: 'Cart item updated' }
            };
        } catch (error: any) {
            console.error('Error updating cart item:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async removeFromCart(userId: string, productId: string): Promise<ServiceResponse> {
        try {
            await connectDB();

            const cart = await Cart.findOne({ userId }).exec();
            if (!cart) {
                return {
                    success: false,
                    error: 'Cart not found'
                };
            }

            const originalLength = cart.items.length;
            cart.items = cart.items.filter(item => item.productId !== productId);

            if (cart.items.length === originalLength) {
                return {
                    success: false,
                    error: 'Product not found in cart'
                };
            }

            await this.recalculateCartTotals(cart);
            await cart.save();

            return {
                success: true,
                data: { message: 'Product removed from cart' }
            };
        } catch (error: any) {
            console.error('Error removing from cart:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async clearCart(userId: string): Promise<ServiceResponse> {
        try {
            await connectDB();

            await Cart.updateOne(
                { userId },
                {
                    $set: {
                        items: [],
                        totalAmount: 0,
                        totalItems: 0
                    }
                }
            ).exec();

            return {
                success: true,
                data: { message: 'Cart cleared' }
            };
        } catch (error: any) {
            console.error('Error clearing cart:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async getCartCount(userId: string): Promise<ServiceResponse<number>> {
        try {
            await connectDB();

            const cart = await Cart.findOne({ userId }).exec();
            const count = cart ? cart.totalItems : 0;

            return {
                success: true,
                data: count
            };
        } catch (error: any) {
            console.error('Error getting cart count:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async getCartTotal(userId: string): Promise<ServiceResponse<number>> {
        try {
            await connectDB();

            const cartResult = await this.getUserCart(userId);
            if (!cartResult.success) {
                return {
                    success: false,
                    error: cartResult.error
                };
            }

            return {
                success: true,
                data: cartResult.data?.totalAmount || 0
            };
        } catch (error: any) {
            console.error('Error getting cart total:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    private static async recalculateCartTotals(cart: ICartDocument): Promise<void> {
        const items = cart.items;
        let totalAmount = 0;
        let totalItems = 0;

        for (const item of items) {
            const product = await Product.findOne({ productId: item.productId }).exec();
            if (product) {
                totalAmount += product.price * item.quantity;
            }
            totalItems += item.quantity;
        }

        cart.totalAmount = totalAmount;
        cart.totalItems = totalItems;
    }
}