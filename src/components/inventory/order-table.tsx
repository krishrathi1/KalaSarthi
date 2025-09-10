'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice, formatDate } from '@/lib/format-utils';
import {
    Store,
    Globe,
    Eye,
    Package,
    Truck,
    CheckCircle,
    Clock,
    XCircle,
    ExternalLink,
    Calendar,
    User,
    CreditCard,
    ShoppingBag
} from 'lucide-react';

// Using the Order interface from your useOrders hook
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

interface OrderTableProps {
    orders: Order[];
    isLoading?: boolean;
}

export default function OrderTable({ orders, isLoading = false }: OrderTableProps) {
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [paymentFilter, setPaymentFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const getStatusIcon = (status: Order['status']) => {
        switch (status) {
            case 'pending':
                return <Clock className="h-4 w-4 text-yellow-500" />;
            case 'confirmed':
                return <CheckCircle className="h-4 w-4 text-blue-500" />;
            case 'processing':
                return <Package className="h-4 w-4 text-blue-600" />;
            case 'shipped':
                return <Truck className="h-4 w-4 text-green-600" />;
            case 'delivered':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'cancelled':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusBadgeVariant = (status: Order['status']) => {
        switch (status) {
            case 'delivered':
                return 'default';
            case 'shipped':
                return 'default';
            case 'processing':
                return 'secondary';
            case 'confirmed':
                return 'secondary';
            case 'pending':
                return 'outline';
            case 'cancelled':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    const getPaymentStatusBadgeVariant = (paymentStatus: Order['paymentStatus']) => {
        switch (paymentStatus) {
            case 'paid':
                return 'default';
            case 'pending':
                return 'secondary';
            case 'failed':
                return 'destructive';
            case 'refunded':
                return 'outline';
            default:
                return 'outline';
        }
    };

    const getSourceIcon = (orderId: string) => {
        // Determine source based on order ID pattern or other indicators
        if (orderId.startsWith('AMZ-') || orderId.includes('amazon')) {
            return <Store className="h-4 w-4 text-orange-500" />;
        }
        return <Globe className="h-4 w-4 text-blue-500" />;
    };

    const getSourceName = (orderId: string) => {
        if (orderId.startsWith('AMZ-') || orderId.includes('amazon')) {
            return 'Amazon';
        }
        return 'Website';
    };

    // Filter orders based on status, payment status, and search term
    const filteredOrders = orders.filter(order => {
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        const matchesPayment = paymentFilter === 'all' || order.paymentStatus === paymentFilter;
        const matchesSearch = !searchTerm ||
            order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.shippingAddress.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.items.some(item =>
                item.productSnapshot.name.toLowerCase().includes(searchTerm.toLowerCase())
            );

        return matchesStatus && matchesPayment && matchesSearch;
    });

    const calculateOrderStats = () => {
        const stats = {
            total: orders.length,
            pending: orders.filter(o => o.status === 'pending').length,
            processing: orders.filter(o => o.status === 'processing').length,
            shipped: orders.filter(o => o.status === 'shipped').length,
            delivered: orders.filter(o => o.status === 'delivered').length,
            cancelled: orders.filter(o => o.status === 'cancelled').length,
            totalRevenue: orders
                .filter(o => o.status !== 'cancelled' && o.paymentStatus === 'paid')
                .reduce((sum, o) => sum + o.orderSummary.totalAmount, 0),
            pendingPayments: orders.filter(o => o.paymentStatus === 'pending').length,
        };
        return stats;
    };

    const stats = calculateOrderStats();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Package className="h-6 w-6 animate-pulse mr-2" />
                <span>Loading orders...</span>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="text-center py-12">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Orders Found</h3>
                <p className="text-muted-foreground">
                    You haven't received any orders yet. Orders will appear here once customers start purchasing.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Order Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Processing</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Shipped</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-2xl font-bold text-green-600">{stats.shipped}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-xl font-bold">{formatPrice(stats.totalRevenue)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Pay</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-2xl font-bold text-orange-600">{stats.pendingPayments}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex gap-2 items-center flex-wrap">
                    <Input
                        placeholder="Search orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-64"
                    />

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder="All Payments" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Payments</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="refunded">Refunded</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="text-sm text-muted-foreground">
                    Showing {filteredOrders.length} of {orders.length} orders
                </div>
            </div>

            {/* Orders Table */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-muted-foreground">No orders match your current filters.</p>
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Payment</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrders.map(order => (
                                <TableRow key={order.orderId}>
                                    {/* Order ID */}
                                    <TableCell>
                                        <div className="font-mono text-sm">
                                            #{order.orderId.substring(0, 8)}
                                            {order.trackingNumber && (
                                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                    <Truck className="h-3 w-3" />
                                                    {order.trackingNumber}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Customer */}
                                    <TableCell>
                                        <div>
                                            <div className="font-medium flex items-center gap-1">
                                                <User className="h-3 w-3 text-muted-foreground" />
                                                {order.shippingAddress.fullName}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {order.shippingAddress.city}, {order.shippingAddress.state}
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Source */}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {getSourceIcon(order.orderId)}
                                            <span className="text-sm">{getSourceName(order.orderId)}</span>
                                        </div>
                                    </TableCell>

                                    {/* Items */}
                                    <TableCell>
                                        <div>
                                            <div className="text-sm font-medium">
                                                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {order.items.slice(0, 2).map(item => item.productSnapshot.name).join(', ')}
                                                {order.items.length > 2 && '...'}
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Order Status */}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(order.status)}
                                            <Badge variant={getStatusBadgeVariant(order.status)}>
                                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                            </Badge>
                                        </div>
                                        {order.estimatedDelivery && order.status === 'shipped' && (
                                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                <Calendar className="h-3 w-3" />
                                                Est. {formatDate(order.estimatedDelivery)}
                                            </div>
                                        )}
                                    </TableCell>

                                    {/* Payment Status */}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="h-3 w-3 text-muted-foreground" />
                                            <Badge variant={getPaymentStatusBadgeVariant(order.paymentStatus)}>
                                                {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                                            </Badge>
                                        </div>
                                        {order.paymentDetails?.method && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {order.paymentDetails.method.replace('_', ' ')}
                                            </div>
                                        )}
                                    </TableCell>

                                    {/* Date */}
                                    <TableCell>
                                        <div className="text-sm">
                                            {formatDate(order.createdAt)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {new Date(order.createdAt).toLocaleTimeString('en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </TableCell>

                                    {/* Total */}
                                    <TableCell className="text-right">
                                        <div className="font-medium">
                                            {formatPrice(order.orderSummary.totalAmount)}
                                        </div>
                                        {order.orderSummary.discount > 0 && (
                                            <div className="text-xs text-muted-foreground">
                                                -{formatPrice(order.orderSummary.discount)} disc.
                                            </div>
                                        )}
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setSelectedOrder(order)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {getSourceName(order.orderId) === 'Amazon' && (
                                                <Button size="sm" variant="ghost">
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}