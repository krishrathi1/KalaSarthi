import { ICart, ICartDocument } from "@/lib/models/Cart";
import { IProductDocument } from "@/lib/models/Product";
import { FirestoreService, COLLECTIONS, where } from "@/lib/firestore";
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

// Cart service class for Firestore
export class CartService {
    static async createCart(userId: string): Promise<ServiceResponse<ICartDocument>> {
        try {
            // Check if cart already exists for user
            const existingCarts = await FirestoreService.query<ICart>(
                COLLECTIONS.CARTS,
                [where('userId', '==', userId)]
            );
            
            if (existingCarts.length > 0) {
                return {
                    success: true,
                    data: existingCarts[0]
                };
            }

            const cartId = uuidv4();
            const cart: ICart = {
                cartId,
                userId,
                items: [],
                totalAmount: 0,
                totalItems: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await FirestoreService.set(COLLECTIONS.CARTS, cartId, cart);
            
            return {
                success: true,
                data: cart
            };
        } catch (error: any) {
            console.error('Error creating cart:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async getUserCart(userId: string): Promise<ServiceResponse<CartWithProducts>> {
        try {
            const carts = await FirestoreService.query<ICart>(
                COLLECTIONS.CARTS,
                [where('userId', '==', userId)]
            );

            let cart = carts.length > 0 ? carts[0] : null;

            // Create cart if it doesn't exist
            if (!cart) {
                const createResult = await this.createCart(userId);
                if (!createResult.success || !createResult.data) {
                    return {
                        success: false,
                        error: createResult.error || 'Failed to create cart'
                    };
                }
                cart = createResult.data;
            }

            // Populate products data and calculate subtotals
            const itemsWithData = await Promise.all(
                (cart.items || []).map(async (item) => {
                    try {
                        const product = await FirestoreService.getById<IProductDocument>(
                            COLLECTIONS.PRODUCTS,
                            item.productId
                        );
                        const subtotal = product ? product.price * item.quantity : 0;
                        return {
                            productId: item.productId,
                            quantity: item.quantity,
                            addedAt: item.addedAt,
                            updatedAt: item.updatedAt,
                            product: product || undefined,
                            subtotal
                        };
                    } catch (error) {
                        console.error(`Error fetching product ${item.productId}:`, error);
                        return {
                            productId: item.productId,
                            quantity: item.quantity,
                            addedAt: item.addedAt,
                            updatedAt: item.updatedAt,
                            product: undefined,
                            subtotal: 0
                        };
                    }
                })
            );

            // Calculate total amount
            const totalAmount = itemsWithData.reduce((total, item) => total + (item.subtotal || 0), 0);

            // Update cart totals if they don't match
            if (cart.totalAmount !== totalAmount) {
                await FirestoreService.update(COLLECTIONS.CARTS, cart.cartId, {
                    totalAmount,
                    totalItems: cart.items.reduce((total, item) => total + item.quantity, 0)
                });
            }

            const cartWithProducts: CartWithProducts = {
                ...cart,
                items: itemsWithData,
                totalAmount
            };

            return {
                success: true,
                data: cartWithProducts
            };
        } catch (error: any) {
            console.error('Error fetching cart:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async addToCart(userId: string, productId: string, quantity: number = 1): Promise<ServiceResponse> {
        try {
            // Verify product exists and is available
            const product = await FirestoreService.getById<IProductDocument>(COLLECTIONS.PRODUCTS, productId);
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

            const carts = await FirestoreService.query<ICart>(
                COLLECTIONS.CARTS,
                [where('userId', '==', userId)]
            );

            let cart = carts.length > 0 ? carts[0] : null;

            // Create cart if it doesn't exist
            if (!cart) {
                const createResult = await this.createCart(userId);
                if (!createResult.success || !createResult.data) {
                    return {
                        success: false,
                        error: createResult.error || 'Failed to create cart'
                    };
                }
                cart = createResult.data;
            }

            // Check if product already in cart
            const existingItemIndex = cart.items.findIndex(item => item.productId === productId);

            if (existingItemIndex >= 0) {
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
            } else {
                // Add new item to cart
                cart.items.push({
                    productId,
                    quantity,
                    addedAt: new Date(),
                    updatedAt: new Date()
                });
            }

            // Recalculate totals
            await this.recalculateAndSaveCart(cart);

            return {
                success: true,
                data: { message: 'Product added to cart' }
            };
        } catch (error: any) {
            console.error('Error adding to cart:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async updateCartItem(userId: string, productId: string, quantity: number): Promise<ServiceResponse> {
        try {
            if (quantity < 1) {
                return this.removeFromCart(userId, productId);
            }

            // Verify product availability
            const product = await FirestoreService.getById<IProductDocument>(COLLECTIONS.PRODUCTS, productId);
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

            const carts = await FirestoreService.query<ICart>(
                COLLECTIONS.CARTS,
                [where('userId', '==', userId)]
            );

            const cart = carts.length > 0 ? carts[0] : null;
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

            await this.recalculateAndSaveCart(cart);

            return {
                success: true,
                data: { message: 'Cart item updated' }
            };
        } catch (error: any) {
            console.error('Error updating cart item:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async removeFromCart(userId: string, productId: string): Promise<ServiceResponse> {
        try {
            const carts = await FirestoreService.query<ICart>(
                COLLECTIONS.CARTS,
                [where('userId', '==', userId)]
            );

            const cart = carts.length > 0 ? carts[0] : null;
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

            await this.recalculateAndSaveCart(cart);

            return {
                success: true,
                data: { message: 'Product removed from cart' }
            };
        } catch (error: any) {
            console.error('Error removing from cart:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async clearCart(userId: string): Promise<ServiceResponse> {
        try {
            const carts = await FirestoreService.query<ICart>(
                COLLECTIONS.CARTS,
                [where('userId', '==', userId)]
            );

            if (carts.length > 0) {
                await FirestoreService.update(COLLECTIONS.CARTS, carts[0].cartId, {
                    items: [],
                    totalAmount: 0,
                    totalItems: 0,
                    updatedAt: new Date()
                });
            }

            return {
                success: true,
                data: { message: 'Cart cleared' }
            };
        } catch (error: any) {
            console.error('Error clearing cart:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async getCartCount(userId: string): Promise<ServiceResponse<number>> {
        try {
            const carts = await FirestoreService.query<ICart>(
                COLLECTIONS.CARTS,
                [where('userId', '==', userId)]
            );

            const count = carts.length > 0 ? carts[0].totalItems : 0;

            return {
                success: true,
                data: count
            };
        } catch (error: any) {
            console.error('Error getting cart count:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async getCartTotal(userId: string): Promise<ServiceResponse<number>> {
        try {
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
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private static async recalculateAndSaveCart(cart: ICart): Promise<void> {
        let totalAmount = 0;
        let totalItems = 0;

        for (const item of cart.items) {
            const product = await FirestoreService.getById<IProductDocument>(
                COLLECTIONS.PRODUCTS,
                item.productId
            );
            if (product) {
                totalAmount += product.price * item.quantity;
            }
            totalItems += item.quantity;
        }

        await FirestoreService.update(COLLECTIONS.CARTS, cart.cartId, {
            items: cart.items,
            totalAmount,
            totalItems,
            updatedAt: new Date()
        });
    }
}
