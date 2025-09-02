import Order, { IOrder, IOrderDocument } from "../models/Order";
import Product, { IProductDocument } from "../models/Product";
import Cart from "../models/Cart";
import connectDB from "../mongodb";
import { v4 as uuidv4 } from 'uuid';

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
    taxRate?: number; // e.g., 0.1 for 10%
    shippingCost?: number;
    discount?: number;
    useCart?: boolean; // If true, use items from user's cart
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
            await connectDB();

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
                const cart = await Cart.findOne({ userId }).exec();
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
                const product = await Product.findOne({ productId: item.productId }).exec();
                
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
            const order = new Order({
                orderId: uuidv4(),
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
            });

            const savedOrder = await order.save();

            // Update product inventory
            for (const item of orderItemsWithDetails) {
                await Product.updateOne(
                    { productId: item.productId },
                    {
                        $inc: { 'inventory.quantity': -item.quantity },
                        $set: { updatedAt: new Date() }
                    }
                ).exec();

                // Check if product should be marked as unavailable
                const updatedProduct = await Product.findOne({ productId: item.productId }).exec();
                if (updatedProduct && updatedProduct.inventory.quantity <= 0) {
                    await Product.updateOne(
                        { productId: item.productId },
                        { $set: { 'inventory.isAvailable': false } }
                    ).exec();
                }
            }

            // Clear cart if items were taken from cart
            if (useCart) {
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
            }

            return {
                success: true,
                data: savedOrder
            };

        } catch (error: any) {
            console.error('Error creating order:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async getOrderById(orderId: string): Promise<ServiceResponse<IOrderDocument>> {
        try {
            await connectDB();

            const order = await Order.findOne({ orderId }).exec();
            
            if (!order) {
                return {
                    success: false,
                    error: 'Order not found'
                };
            }

            return {
                success: true,
                data: order
            };

        } catch (error: any) {
            console.error('Error fetching order:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async getUserOrders(userId: string, status?: string): Promise<ServiceResponse<IOrderDocument[]>> {
        try {
            await connectDB();

            const filter: any = { userId };
            if (status) {
                filter.status = status;
            }

            const orders = await Order
                .find(filter)
                .sort({ createdAt: -1 })
                .exec();

            return {
                success: true,
                data: orders
            };

        } catch (error: any) {
            console.error('Error fetching user orders:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async getArtisanOrders(artisanId: string, status?: string): Promise<ServiceResponse<IOrderDocument[]>> {
        try {
            await connectDB();

            const filter: any = { 'items.artisanId': artisanId };
            if (status) {
                filter.status = status;
            }

            const orders = await Order
                .find(filter)
                .sort({ createdAt: -1 })
                .exec();

            return {
                success: true,
                data: orders
            };

        } catch (error: any) {
            console.error('Error fetching artisan orders:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async updateOrder(orderId: string, updateData: UpdateOrderRequest): Promise<ServiceResponse> {
        try {
            await connectDB();

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

            const result = await Order.updateOne(
                { orderId },
                { $set: updateFields }
            ).exec();

            if (result.matchedCount === 0) {
                return {
                    success: false,
                    error: 'Order not found'
                };
            }

            return {
                success: true,
                data: { message: 'Order updated successfully' }
            };

        } catch (error: any) {
            console.error('Error updating order:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async cancelOrder(orderId: string, reason: string, userId?: string): Promise<ServiceResponse> {
        try {
            await connectDB();

            // Get the order first
            const order = await Order.findOne({ orderId }).exec();
            if (!order) {
                return {
                    success: false,
                    error: 'Order not found'
                };
            }

            // Check if user is authorized to cancel (if userId provided)
            if (userId && order.userId !== userId) {
                return {
                    success: false,
                    error: 'Not authorized to cancel this order'
                };
            }

            // Check if order can be cancelled
            if (['delivered', 'cancelled'].includes(order.status)) {
                return {
                    success: false,
                    error: `Cannot cancel order with status: ${order.status}`
                };
            }

            // Restore product inventory
            for (const item of order.items) {
                await Product.updateOne(
                    { productId: item.productId },
                    {
                        $inc: { 'inventory.quantity': item.quantity },
                        $set: { 
                            'inventory.isAvailable': true,
                            updatedAt: new Date()
                        }
                    }
                ).exec();
            }

            // Update order status
            await Order.updateOne(
                { orderId },
                {
                    $set: {
                        status: 'cancelled',
                        cancelledAt: new Date(),
                        cancellationReason: reason,
                        updatedAt: new Date()
                    }
                }
            ).exec();

            return {
                success: true,
                data: { message: 'Order cancelled successfully' }
            };

        } catch (error: any) {
            console.error('Error cancelling order:', error);
            return {
                success: false,
                error: error.message
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
            await connectDB();

            const { status, paymentStatus, startDate, endDate, limit = 50, skip = 0 } = filters;

            const filter: any = {};
            
            if (status) filter.status = status;
            if (paymentStatus) filter.paymentStatus = paymentStatus;
            if (startDate || endDate) {
                filter.createdAt = {};
                if (startDate) filter.createdAt.$gte = startDate;
                if (endDate) filter.createdAt.$lte = endDate;
            }

            const orders = await Order
                .find(filter)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip)
                .exec();

            return {
                success: true,
                data: orders
            };

        } catch (error: any) {
            console.error('Error fetching all orders:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async getOrderStats(): Promise<ServiceResponse<OrderStats>> {
        try {
            await connectDB();

            const [
                totalOrders,
                pendingOrders,
                confirmedOrders,
                processingOrders,
                shippedOrders,
                deliveredOrders,
                cancelledOrders,
                pendingPayments,
                revenueData
            ] = await Promise.all([
                Order.countDocuments().exec(),
                Order.countDocuments({ status: 'pending' }).exec(),
                Order.countDocuments({ status: 'confirmed' }).exec(),
                Order.countDocuments({ status: 'processing' }).exec(),
                Order.countDocuments({ status: 'shipped' }).exec(),
                Order.countDocuments({ status: 'delivered' }).exec(),
                Order.countDocuments({ status: 'cancelled' }).exec(),
                Order.countDocuments({ paymentStatus: 'pending' }).exec(),
                Order.aggregate([
                    { $match: { status: { $ne: 'cancelled' } } },
                    { $group: { _id: null, totalRevenue: { $sum: '$orderSummary.totalAmount' } } }
                ]).exec()
            ]);

            const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

            const stats: OrderStats = {
                totalOrders,
                pendingOrders,
                confirmedOrders,
                processingOrders,
                shippedOrders,
                deliveredOrders,
                cancelledOrders,
                totalRevenue,
                pendingPayments
            };

            return {
                success: true,
                data: stats
            };

        } catch (error: any) {
            console.error('Error fetching order stats:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async searchOrders(searchTerm: string): Promise<ServiceResponse<IOrderDocument[]>> {
        try {
            await connectDB();

            const orders = await Order
                .find({
                    $or: [
                        { orderId: { $regex: searchTerm, $options: 'i' } },
                        { 'shippingAddress.fullName': { $regex: searchTerm, $options: 'i' } },
                        { 'shippingAddress.phone': { $regex: searchTerm, $options: 'i' } },
                        { trackingNumber: { $regex: searchTerm, $options: 'i' } }
                    ]
                })
                .sort({ createdAt: -1 })
                .exec();

            return {
                success: true,
                data: orders
            };

        } catch (error: any) {
            console.error('Error searching orders:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}