'use client'

import { useState, useEffect, useCallback } from 'react';

interface OrderItem {
    productId: string;
    artisanId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    productSnapshot: {
        name: string;
        description: string;
        images: string[];
        category: string;
    };
}

interface ShippingAddress {
    fullName: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
}

interface OrderSummary {
    subtotal: number;
    tax: number;
    shippingCost: number;
    discount: number;
    totalAmount: number;
}

interface PaymentDetails {
    method?: "card" | "paypal" | "stripe" | "razorpay" | "cash_on_delivery";
    transactionId?: string;
    paidAt?: Date;
}

interface Order {
    orderId: string;
    userId: string;
    items: OrderItem[];
    shippingAddress: ShippingAddress;
    orderSummary: OrderSummary;
    status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
    paymentStatus: "pending" | "paid" | "failed" | "refunded";
    paymentDetails?: PaymentDetails;
    notes?: string;
    trackingNumber?: string;
    estimatedDelivery?: Date;
    deliveredAt?: Date;
    cancelledAt?: Date;
    cancellationReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface CreateOrderData {
    shippingAddress: ShippingAddress;
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

export const useOrders = (userId: string | undefined) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
    const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch user's orders
    const fetchOrders = useCallback(async (status?: string) => {
        if (!userId) {
            console.log('useOrders: No userId provided');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log('useOrders: Fetching orders for userId:', userId);
            const url = `/api/orders?userId=${userId}${status ? `&status=${status}` : ''}`;
            const response = await fetch(url);
            const data = await response.json();

            console.log('useOrders: API response:', data);

            if (data.success) {
                setOrders(data.data);
                console.log('useOrders: Orders set:', data.data.length);
            } else {
                setError(data.error || 'Failed to fetch orders');
                console.error('useOrders: API error:', data.error);
            }
        } catch (err) {
            console.error('useOrders: Network error:', err);
            setError('Network error occurred');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // Create a new order
    const createOrder = useCallback(async (orderData: CreateOrderData) => {
        if (!userId) return false;

        setLoading(true);
        setError(null);

        try {
            console.log('useOrders: Creating order for userId:', userId);
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    ...orderData,
                }),
            });

            const data = await response.json();

            if (data.success) {
                console.log('useOrders: Order created successfully:', data.data.orderId);
                await fetchOrders(); // Refresh orders list
                return {
                    success: true,
                    orderId: data.data.orderId,
                    order: data.data
                };
            } else {
                setError(data.error || 'Failed to create order');
                console.error('useOrders: Order creation error:', data.error);
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (err) {
            console.error('useOrders: Network error during order creation:', err);
            setError('Network error occurred');
            return {
                success: false,
                error: 'Network error occurred'
            };
        } finally {
            setLoading(false);
        }
    }, [userId, fetchOrders]);

    // Get a specific order by ID
    const fetchOrderById = useCallback(async (orderId: string) => {
        setLoading(true);
        setError(null);

        try {
            console.log('useOrders: Fetching order by ID:', orderId);
            const response = await fetch(`/api/orders/${orderId}`);
            const data = await response.json();

            if (data.success) {
                setCurrentOrder(data.data);
                console.log('useOrders: Order fetched:', data.data.orderId);
                return data.data;
            } else {
                setError(data.error || 'Failed to fetch order');
                console.error('useOrders: API error:', data.error);
                return null;
            }
        } catch (err) {
            console.error('useOrders: Network error:', err);
            setError('Network error occurred');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // Cancel an order
    const cancelOrder = useCallback(async (orderId: string, reason: string) => {
        if (!userId) return false;

        setLoading(true);
        setError(null);

        try {
            console.log('useOrders: Cancelling order:', orderId);
            const response = await fetch(`/api/orders/${orderId}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    reason,
                }),
            });

            const data = await response.json();

            if (data.success) {
                console.log('useOrders: Order cancelled successfully:', orderId);
                await fetchOrders(); // Refresh orders list
                if (currentOrder && currentOrder.orderId === orderId) {
                    setCurrentOrder(null); // Clear current order if it was cancelled
                }
                return true;
            } else {
                setError(data.error || 'Failed to cancel order');
                console.error('useOrders: Cancel error:', data.error);
                return false;
            }
        } catch (err) {
            console.error('useOrders: Network error during cancellation:', err);
            setError('Network error occurred');
            return false;
        } finally {
            setLoading(false);
        }
    }, [userId, fetchOrders, currentOrder]);

    // Fetch order statistics (for admin/artisan dashboards)
    const fetchOrderStats = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            console.log('useOrders: Fetching order statistics');
            const response = await fetch('/api/orders/stats');
            const data = await response.json();

            if (data.success) {
                setOrderStats(data.data);
                console.log('useOrders: Order stats fetched:', data.data);
                return data.data;
            } else {
                setError(data.error || 'Failed to fetch order statistics');
                console.error('useOrders: Stats API error:', data.error);
                return null;
            }
        } catch (err) {
            console.error('useOrders: Network error:', err);
            setError('Network error occurred');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // Search orders
    const searchOrders = useCallback(async (searchTerm: string) => {
        setLoading(true);
        setError(null);

        try {
            console.log('useOrders: Searching orders with term:', searchTerm);
            const response = await fetch(`/api/orders/search?q=${encodeURIComponent(searchTerm)}`);
            const data = await response.json();

            if (data.success) {
                setOrders(data.data);
                console.log('useOrders: Search results:', data.data.length);
                return data.data;
            } else {
                setError(data.error || 'Failed to search orders');
                console.error('useOrders: Search API error:', data.error);
                return [];
            }
        } catch (err) {
            console.error('useOrders: Network error during search:', err);
            setError('Network error occurred');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    // Get order status display text
    const getOrderStatusText = useCallback((status: Order['status']) => {
        const statusTexts = {
            pending: 'Pending',
            confirmed: 'Confirmed',
            processing: 'Processing',
            shipped: 'Shipped',
            delivered: 'Delivered',
            cancelled: 'Cancelled'
        };
        return statusTexts[status] || status;
    }, []);

    // Get payment status display text
    const getPaymentStatusText = useCallback((paymentStatus: Order['paymentStatus']) => {
        const statusTexts = {
            pending: 'Payment Pending',
            paid: 'Paid',
            failed: 'Payment Failed',
            refunded: 'Refunded'
        };
        return statusTexts[paymentStatus] || paymentStatus;
    }, []);

    // Check if order can be cancelled
    const canCancelOrder = useCallback((order: Order) => {
        return !['delivered', 'cancelled'].includes(order.status);
    }, []);

    // Get orders by status
    const getOrdersByStatus = useCallback((status: Order['status']) => {
        return orders.filter(order => order.status === status);
    }, [orders]);

    // Get total spent by user
    const getTotalSpent = useCallback(() => {
        return orders
            .filter(order => order.status !== 'cancelled')
            .reduce((total, order) => total + order.orderSummary.totalAmount, 0);
    }, [orders]);

    // Initialize - fetch orders when userId changes
    useEffect(() => {
        console.log('useOrders useEffect: userId changed:', userId);
        if (userId) {
            fetchOrders();
        } else {
            console.log('useOrders useEffect: clearing orders state (no userId)');
            setOrders([]);
            setCurrentOrder(null);
            setOrderStats(null);
        }
    }, [userId, fetchOrders]);

    return {
        // State
        orders,
        currentOrder,
        orderStats,
        loading,
        error,

        // Actions
        createOrder,
        fetchOrders,
        fetchOrderById,
        cancelOrder,
        fetchOrderStats,
        searchOrders,

        // Utilities
        getOrderStatusText,
        getPaymentStatusText,
        canCancelOrder,
        getOrdersByStatus,
        getTotalSpent,

        // Refresh function
        refetch: fetchOrders,
    };
};