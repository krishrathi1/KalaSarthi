import { IOrder, IOrderDocument } from "../models/Order";
import { IProductDocument } from "../models/Product";
import { ICart } from "../models/Cart";
import { FirestoreService, COLLECTIONS, where, orderBy, limit as limitQuery } from "../firestore";
import { v4 as uuidv4 } from 'uuid';
import { SalesEventService } from './SalesEventService';

interface ServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

interface CreateOrderRequest {
    userId: string;
    shippingAddress: {
        fullName: string;
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
        phone: string;
    };
    items?: Array<{
        productId: string;
        quantity: number;
    }>;
    notes?: string;
    taxRate?: number;
    shippingCost?: number;
    discount?: number;
    useCart?: boolean;
}

interface UpdateOrderRequest {
    status?: IOrder['status'];
    paymentStatus?: IOrder['paymentStatus'];
    paymentDetails?: IOrder['paymentDetails'];
    trackingNumber?: string;
    estimatedDelivery?: Date;
    deliveredAt?: Date;
    cancellationReason?: string;
    notes?: string;
}

interface OrderStats {
    totalOrders: number;
    pendingOrders: number;
    confirmedOrders: number;
    processingOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    pendingPayments: number;
}

export class OrderService {
    static async createOrder(orderData: CreateOrderRequest): Promise<ServiceResponse<IOrderDocument>> {
        try {
            const { 
                userId, 
                shippingAddress, 
                items: providedItems, 
                notes, 
                taxRate = 0,
                shippingCost = 0,
                discount = 0,
                useCart = true 
            } = orderData;

            let orderItems = providedItems || [];

            // If useCart is true and no items provided, get items from cart
            if (useCart && (!providedItems || providedItems.length === 0)) {
                const carts = await FirestoreService.query<ICart>(
                    COLLECTIONS.CARTS,
                    [where('userId', '==', userId)]
                );
                
                const cart = carts.length > 0 ? carts[0] : null;
                
                if (!cart || cart.items.length === 0) {
                    return {
                        success: false,
                        error: 'Cart is empty. Cannot create order.'
                    };
                }
                
                orderItems = cart.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity
                }));
            }

            if (orderItems.length === 0) {
                return {
                    success: false,
                    error: 'No items provided for the order.'
                };
            }

            // Validate and fetch products
            const orderItemsWithDetails = [];
            let subtotal = 0;

            for (const item of orderItems) {
                const product = await FirestoreService.getById<IProductDocument>(
                    COLLECTIONS.PRODUCTS,
                    item.productId
                );
                
                if (!product) {
                    return {
                        success: false,
                        error: `Product ${item.productId} not found.`
                    };
                }

                if (!product.inventory.isAvailable) {
                    return {
                        success: false,
                        error: `Product ${product.name} is not available.`
                    };
                }

                if (item.quantity > product.inventory.quantity) {
                    return {
                        success: false,
                        error: `Only ${product.inventory.quantity} units of ${product.name} are available.`
                    };
                }

                const itemSubtotal = product.price * item.quantity;
                subtotal += itemSubtotal;

                orderItemsWithDetails.push({
                    productId: product.productId,
                    artisanId: product.artisanId,
                    quantity: item.quantity,
                    unitPrice: product.price,
                    subtotal: itemSubtotal,
                    productSnapshot: {
                        name: product.name,
                        description: product.description,
                        images: product.images,
                        category: product.category,
                    }
                });
            }

            // Calculate totals
            const tax = subtotal * taxRate;
            const totalAmount = subtotal + tax + shippingCost - discount;

            // Create the order
            const orderId = uuidv4();
            const order: IOrder = {
                orderId,
                userId,
                items: orderItemsWithDetails,
                shippingAddress,
                orderSummary: {
                    subtotal,
                    tax,
                    shippingCost,
                    discount,
                    totalAmount: Math.max(0, totalAmount),
                },
                status: 'pending',
                paymentStatus: 'pending',
                notes,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await FirestoreService.set(COLLECTIONS.ORDERS, orderId, order);

            // Emit sales events for order creation
            try {
                const salesEventService = SalesEventService.getInstance();
                await salesEventService.emitOrderCreatedEvents(order as IOrderDocument);
            } catch (error) {
                console.error('Error emitting order created events:', error);
            }

            // Update product inventory
            for (const item of orderItemsWithDetails) {
                const product = await FirestoreService.getById<IProductDocument>(
                    COLLECTIONS.PRODUCTS,
                    item.productId
                );
                
                if (product) {
                    const newQuantity = product.inventory.quantity - item.quantity;
                    await FirestoreService.update(COLLECTIONS.PRODUCTS, item.productId, {
                        'inventory.quantity': newQuantity,
                        'inventory.isAvailable': newQuantity > 0,
                        updatedAt: new Date()
                    });
                }
            }

            // Clear cart if items were taken from cart
            if (useCart) {
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
            }

            return {
                success: true,
                data: order as IOrderDocument
            };

        } catch (error: any) {
            console.error('Error creating order:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async getOrderById(orderId: string): Promise<ServiceResponse<IOrderDocument>> {
        try {
            const order = await FirestoreService.getById<IOrder>(COLLECTIONS.ORDERS, orderId);
            
            if (!order) {
                return {
                    success: false,
                    error: 'Order not found'
                };
            }

            return {
                success: true,
                data: order as IOrderDocument
            };

        } catch (error: any) {
            console.error('Error fetching order:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async getUserOrders(userId: string, status?: string): Promise<ServiceResponse<IOrderDocument[]>> {
        try {
            const constraints = [where('userId', '==', userId), orderBy('createdAt', 'desc')];
            if (status) {
                constraints.unshift(where('status', '==', status));
            }

            const orders = await FirestoreService.query<IOrder>(COLLECTIONS.ORDERS, constraints);

            return {
                success: true,
                data: orders as IOrderDocument[]
            };

        } catch (error: any) {
            console.error('Error fetching user orders:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async getArtisanOrders(artisanId: string, status?: string): Promise<ServiceResponse<IOrderDocument[]>> {
        try {
            // Firestore doesn't support querying array elements directly
            // We need to fetch all orders and filter client-side
            const allOrders = await FirestoreService.getAll<IOrder>(COLLECTIONS.ORDERS);
            
            let filteredOrders = allOrders.filter(order => 
                order.items.some(item => item.artisanId === artisanId)
            );

            if (status) {
                filteredOrders = filteredOrders.filter(order => order.status === status);
            }

            // Sort by createdAt descending
            filteredOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            return {
                success: true,
                data: filteredOrders as IOrderDocument[]
            };

        } catch (error: any) {
            console.error('Error fetching artisan orders:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async updateOrder(orderId: string, updateData: UpdateOrderRequest): Promise<ServiceResponse> {
        try {
            // Get the order before update to compare status changes
            const existingOrder = await FirestoreService.getById<IOrder>(COLLECTIONS.ORDERS, orderId);
            if (!existingOrder) {
                return {
                    success: false,
                    error: 'Order not found'
                };
            }

            const updateFields: any = {
                ...updateData,
                updatedAt: new Date()
            };

            // Handle status-specific updates
            if (updateData.status === 'delivered' && !updateData.deliveredAt) {
                updateFields.deliveredAt = new Date();
            }

            if (updateData.status === 'cancelled') {
                updateFields.cancelledAt = new Date();
            }

            await FirestoreService.update(COLLECTIONS.ORDERS, orderId, updateFields);

            // Get updated order for event emission
            const updatedOrder = await FirestoreService.getById<IOrder>(COLLECTIONS.ORDERS, orderId);
            if (updatedOrder) {
                // Emit sales events based on status changes
                try {
                    const salesEventService = SalesEventService.getInstance();
                    
                    if (updateData.paymentStatus === 'paid' && existingOrder.paymentStatus !== 'paid') {
                        await salesEventService.emitOrderPaidEvents(updatedOrder as IOrderDocument);
                    }
                    
                    if (updateData.status === 'delivered' && existingOrder.status !== 'delivered') {
                        await salesEventService.emitOrderFulfilledEvents(updatedOrder as IOrderDocument);
                    }
                    
                    if (updateData.status === 'cancelled' && existingOrder.status !== 'cancelled') {
                        await salesEventService.emitOrderCanceledEvents(updatedOrder as IOrderDocument);
                    }
                    
                } catch (error) {
                    console.error('Error emitting order update events:', error);
                }
            }

            return {
                success: true,
                data: { message: 'Order updated successfully' }
            };

        } catch (error: any) {
            console.error('Error updating order:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async cancelOrder(orderId: string, reason: string, userId?: string): Promise<ServiceResponse> {
        try {
            const order = await FirestoreService.getById<IOrder>(COLLECTIONS.ORDERS, orderId);
            if (!order) {
                return {
                    success: false,
                    error: 'Order not found'
                };
            }

            if (userId && order.userId !== userId) {
                return {
                    success: false,
                    error: 'Not authorized to cancel this order'
                };
            }

            if (['delivered', 'cancelled'].includes(order.status)) {
                return {
                    success: false,
                    error: `Cannot cancel order with status: ${order.status}`
                };
            }

            // Restore product inventory
            for (const item of order.items) {
                const product = await FirestoreService.getById<IProductDocument>(
                    COLLECTIONS.PRODUCTS,
                    item.productId
                );
                
                if (product) {
                    const newQuantity = product.inventory.quantity + item.quantity;
                    await FirestoreService.update(COLLECTIONS.PRODUCTS, item.productId, {
                        'inventory.quantity': newQuantity,
                        'inventory.isAvailable': true,
                        updatedAt: new Date()
                    });
                }
            }

            // Update order status
            await FirestoreService.update(COLLECTIONS.ORDERS, orderId, {
                status: 'cancelled',
                cancelledAt: new Date(),
                cancellationReason: reason,
                updatedAt: new Date()
            });

            // Emit cancellation events
            try {
                const salesEventService = SalesEventService.getInstance();
                const updatedOrder = await FirestoreService.getById<IOrder>(COLLECTIONS.ORDERS, orderId);
                if (updatedOrder) {
                    await salesEventService.emitOrderCanceledEvents(updatedOrder as IOrderDocument);
                }
            } catch (error) {
                console.error('Error emitting order cancellation events:', error);
            }

            return {
                success: true,
                data: { message: 'Order cancelled successfully' }
            };

        } catch (error: any) {
            console.error('Error cancelling order:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async getAllOrders(filters: {
        status?: string;
        paymentStatus?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        skip?: number;
    } = {}): Promise<ServiceResponse<IOrderDocument[]>> {
        try {
            const { status, paymentStatus, startDate, endDate, limit = 50, skip = 0 } = filters;

            // Get all orders and filter client-side
            let allOrders = await FirestoreService.getAll<IOrder>(COLLECTIONS.ORDERS);
            
            if (status) {
                allOrders = allOrders.filter(order => order.status === status);
            }
            
            if (paymentStatus) {
                allOrders = allOrders.filter(order => order.paymentStatus === paymentStatus);
            }
            
            if (startDate || endDate) {
                allOrders = allOrders.filter(order => {
                    const orderDate = order.createdAt;
                    if (startDate && orderDate < startDate) return false;
                    if (endDate && orderDate > endDate) return false;
                    return true;
                });
            }

            // Sort by createdAt descending
            allOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            // Apply pagination
            const paginatedOrders = allOrders.slice(skip, skip + limit);

            return {
                success: true,
                data: paginatedOrders as IOrderDocument[]
            };

        } catch (error: any) {
            console.error('Error fetching all orders:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async getOrderStats(): Promise<ServiceResponse<OrderStats>> {
        try {
            const allOrders = await FirestoreService.getAll<IOrder>(COLLECTIONS.ORDERS);

            const stats: OrderStats = {
                totalOrders: allOrders.length,
                pendingOrders: allOrders.filter(o => o.status === 'pending').length,
                confirmedOrders: allOrders.filter(o => o.status === 'confirmed').length,
                processingOrders: allOrders.filter(o => o.status === 'processing').length,
                shippedOrders: allOrders.filter(o => o.status === 'shipped').length,
                deliveredOrders: allOrders.filter(o => o.status === 'delivered').length,
                cancelledOrders: allOrders.filter(o => o.status === 'cancelled').length,
                pendingPayments: allOrders.filter(o => o.paymentStatus === 'pending').length,
                totalRevenue: allOrders
                    .filter(o => o.status !== 'cancelled')
                    .reduce((sum, o) => sum + o.orderSummary.totalAmount, 0)
            };

            return {
                success: true,
                data: stats
            };

        } catch (error: any) {
            console.error('Error fetching order stats:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async searchOrders(searchTerm: string): Promise<ServiceResponse<IOrderDocument[]>> {
        try {
            // Firestore doesn't support regex search
            // Fetch all orders and filter client-side
            const allOrders = await FirestoreService.getAll<IOrder>(COLLECTIONS.ORDERS);

            const searchLower = searchTerm.toLowerCase();
            const filteredOrders = allOrders.filter(order =>
                order.orderId.toLowerCase().includes(searchLower) ||
                order.shippingAddress.fullName.toLowerCase().includes(searchLower) ||
                order.shippingAddress.phone.includes(searchTerm) ||
                order.trackingNumber?.toLowerCase().includes(searchLower)
            );

            // Sort by createdAt descending
            filteredOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            return {
                success: true,
                data: filteredOrders as IOrderDocument[]
            };

        } catch (error: any) {
            console.error('Error searching orders:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
