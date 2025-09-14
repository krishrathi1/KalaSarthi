'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    ShoppingBag,
    Minus,
    Plus,
    Trash2,
    IndianRupee,
    ShoppingCart,
    ArrowLeft,
    Package,
    ArrowRight,
    MapPin,
    User,
    Phone,
    CheckCircle,
    AlertCircle,
    Truck,
    CreditCard
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/format-utils';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/context/auth-context';
import { useOrders } from '@/hooks/use-orders';

export default function CartPage() {
    const { user } = useAuth();
    const userId = user?.uid;

    const { cart, loading, error, updateCartItem, removeFromCart, clearCart } = useCart(userId!);
    const { createOrder, loading: orderLoading, error: orderError } = useOrders(userId);

    const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
    const [showCheckout, setShowCheckout] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [placedOrder, setPlacedOrder] = useState<any>(null);
    const [placedOrder, setPlacedOrder] = useState<any>(null);

    // Shipping address state
    const [shippingAddress, setShippingAddress] = useState<Record<string, string>>({
        fullName: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India',
        phone: ''
    });

    const [orderNotes, setOrderNotes] = useState('');
    const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
    const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});

    const handleQuantityChange = async (productId: string, newQuantity: number) => {
        setUpdatingItems(prev => new Set(prev).add(productId));
        await updateCartItem(productId, newQuantity);
        setUpdatingItems(prev => {
            const updated = new Set(prev);
            updated.delete(productId);
            return updated;
        });
    };

    const handleRemoveItem = async (productId: string) => {
        setUpdatingItems(prev => new Set(prev).add(productId));
        await removeFromCart(productId);
        setUpdatingItems(prev => {
            const updated = new Set(prev);
            updated.delete(productId);
            return updated;
        });
    };

    const handleClearCart = async () => {
        if (window.confirm('Are you sure you want to clear your cart?')) {
            await clearCart();
        }
    };

    const handleAddressChange = (field: string, value: string) => {
        setShippingAddress(prev => ({
            ...prev,
            [field]: value
        }));
        // Clear error for this field
        if (addressErrors[field]) {
            setAddressErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const validateAddress = () => {
        const errors: Record<string, string> = {};
        const errors: Record<string, string> = {};
        const required = ['fullName', 'street', 'city', 'state', 'zipCode', 'phone'];

        required.forEach(field => {
            if (!(shippingAddress as any)[field].trim()) {
                errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')} is required`;
            }
        });

        // Phone validation
        if (shippingAddress.phone && !/^\d{10}$/.test(shippingAddress.phone.replace(/\D/g, ''))) {
            errors.phone = 'Please enter a valid 10-digit phone number';
        }

        // ZIP code validation
        if (shippingAddress.zipCode && !/^\d{6}$/.test(shippingAddress.zipCode)) {
            errors.zipCode = 'Please enter a valid 6-digit PIN code';
        }

        setAddressErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleProceedToCheckout = () => {
        setShowCheckout(true);
    };

    const handleBackToCart = () => {
        setShowCheckout(false);
        setAddressErrors({});
    };

    const handlePlaceOrder = async () => {
        if (!validateAddress()) {
            return;
        }

        const orderData = {
            shippingAddress: shippingAddress as any,
            notes: orderNotes,
            useCart: true, // Use items from cart
            taxRate: 0.18, // 18% GST
            shippingCost: (cart?.totalAmount || 0) >= 500 ? 0 : 50, // Free shipping above ₹500
            discount: 0
        };

        const result = await createOrder(orderData);

        if (result && result.success) {
            setPlacedOrder(result.order);
            setOrderPlaced(true);
            // Clear cart after successful order
            await clearCart();
        }
    };

    // Calculate totals
    const subtotal = cart?.totalAmount || 0;
    const tax = subtotal * 0.18; // 18% GST
    const shippingCost = subtotal >= 500 ? 0 : 50;
    const total = subtotal + tax + shippingCost;

    if (loading && !cart) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-32 bg-gray-200 rounded"></div>
                                ))}
                            </div>
                            <div className="h-64 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="p-6 text-center">
                        <ShoppingCart className="h-16 w-16 text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Error Loading Cart</h2>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <Button onClick={() => window.location.reload()}>Try Again</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Order Success Page
    if (orderPlaced && placedOrder) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-2xl mx-auto text-center">
                        <div className="mb-8">
                            <CheckCircle className="h-24 w-24 text-green-500 mx-auto mb-6" />
                            <h1 className="text-3xl font-bold mb-2">Order Placed Successfully!</h1>
                            <p className="text-gray-600">Thank you for your order. We'll send you a confirmation email shortly.</p>
                        </div>

                        <Card className="mb-8">
                            <CardHeader>
                                <CardTitle>Order Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="font-medium">Order ID:</span>
                                        <span>{placedOrder.orderId}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium">Status:</span>
                                        <Badge variant="outline">{placedOrder.status}</Badge>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium">Payment Method:</span>
                                        <span>Cash on Delivery</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium">Total Amount:</span>
                                        <div className="flex items-center font-bold">
                                            <span>{formatPrice(total)}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex gap-4 justify-center">
                            <Link href="/orders">
                                <Button variant="outline">View Orders</Button>
                            </Link>
                            <Link href="/marketplace">
                                <Button className="bg-orange-600 hover:bg-orange-700">Continue Shopping</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!cart || cart.items.length === 0) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center gap-4 mb-8">
                        <Link href="/marketplace">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Continue Shopping
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold">Your Cart</h1>
                    </div>

                    <div className="flex flex-col items-center justify-center py-16">
                        <ShoppingBag className="h-24 w-24 text-gray-300 mb-6" />
                        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
                        <p className="text-gray-500 mb-8 text-center max-w-md">
                            Discover amazing handcrafted products from talented artisans and add them to your cart.
                        </p>
                        <Link href="/marketplace">
                            <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
                                <ShoppingBag className="h-5 w-5 mr-2" />
                                Start Shopping
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        {showCheckout ? (
                            <Button variant="ghost" size="sm" onClick={handleBackToCart}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Cart
                            </Button>
                        ) : (
                            <Link href="/marketplace">
                                <Button variant="ghost" size="sm">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Continue Shopping
                                </Button>
                            </Link>
                        )}
                        <div>
                            <h1 className="text-3xl font-bold">
                                {showCheckout ? 'Checkout' : 'Your Cart'}
                            </h1>
                            {!showCheckout && <p className="text-gray-600">{cart.totalItems} items</p>}
                        </div>
                    </div>

                    {!showCheckout && cart.items.length > 0 && (
                        <Button variant="outline" onClick={handleClearCart}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear Cart
                        </Button>
                    )}
                </div>

                {/* Cart View */}
                {!showCheckout && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Cart Items */}
                        <div className="lg:col-span-2 space-y-4">
                            {cart.items.map((item) => (
                                <Card key={item.productId}>
                                    <CardContent className="p-6">
                                        <div className="flex gap-4">
                                            {/* Product Image */}
                                            <div className="relative w-24 h-24 bg-white rounded-lg overflow-hidden flex-shrink-0">
                                                {item.product?.images && item.product.images.length > 0 ? (
                                                    <Image
                                                        src={item.product.images[0]}
                                                        alt={item.product.name}
                                                        fill
                                                        className="object-cover"
                                                        sizes="96px"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                                        <Package className="h-6 w-6 text-gray-400" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Product Details */}
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h3 className="font-semibold text-lg">{item.product?.name}</h3>
                                                        <Badge variant="outline" className="mt-1">
                                                            {item.product?.category}
                                                        </Badge>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveItem(item.productId)}
                                                        disabled={updatingItems.has(item.productId)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    {/* Quantity Controls */}
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-medium">Qty:</span>
                                                        <div className="flex items-center border rounded-md">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                                                                disabled={item.quantity <= 1 || updatingItems.has(item.productId)}
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <Minus className="h-3 w-3" />
                                                            </Button>
                                                            <span className="px-3 py-2 min-w-[3rem] text-center">
                                                                {item.quantity}
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                                                                disabled={
                                                                    updatingItems.has(item.productId) ||
                                                                    item.quantity >= (item.product?.inventory?.quantity || 1)
                                                                }
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <Plus className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* Price */}
                                                    <div className="text-right">
                                                        <div className="flex items-center">
                                                            <span className="text-lg font-bold">
                                                                {formatPrice(item.subtotal || 0)}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {formatPrice(item.product?.price || 0)} each
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Order Summary */}
                        <div className="space-y-6">
                            <Card>
                                <CardContent className="p-6">
                                    <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span>Subtotal ({cart.totalItems} items)</span>
                                            <div className="flex items-center">
                                                <span>{formatPrice(subtotal)}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between">
                                            <span>Tax (GST 18%)</span>
                                            <div className="flex items-center">
                                                <span>{formatPrice(tax)}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between">
                                            <span>Shipping</span>
                                            {shippingCost === 0 ? (
                                                <span className="text-green-600">Free</span>
                                            ) : (
                                                <div className="flex items-center">
                                                    <span>{formatPrice(shippingCost)}</span>
                                                </div>
                                            )}
                                        </div>

                                        <Separator />

                                        <div className="flex justify-between text-lg font-semibold">
                                            <span>Total</span>
                                            <div className="flex items-center">
                                                <span>{formatPrice(total)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full mt-6 bg-orange-600 hover:bg-orange-700"
                                        size="lg"
                                        onClick={handleProceedToCheckout}
                                    >
                                        Proceed to Checkout
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Security Badges */}
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                            <span>Secure Checkout</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                            <span>Free Returns</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Checkout View */}
                {showCheckout && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Checkout Form */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Shipping Address */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5" />
                                        Shipping Address
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="fullName">Full Name *</Label>
                                            <Input
                                                id="fullName"
                                                value={shippingAddress.fullName}
                                                onChange={(e) => handleAddressChange('fullName', e.target.value)}
                                                className={addressErrors.fullName ? 'border-red-500' : ''}
                                            />
                                            {addressErrors.fullName && (
                                                <p className="text-red-500 text-sm mt-1">{addressErrors.fullName}</p>
                                            )}
                                        </div>
                                        <div>
                                            <Label htmlFor="phone">Phone Number *</Label>
                                            <Input
                                                id="phone"
                                                value={shippingAddress.phone}
                                                onChange={(e) => handleAddressChange('phone', e.target.value)}
                                                className={addressErrors.phone ? 'border-red-500' : ''}
                                            />
                                            {addressErrors.phone && (
                                                <p className="text-red-500 text-sm mt-1">{addressErrors.phone}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="street">Street Address *</Label>
                                        <Input
                                            id="street"
                                            value={shippingAddress.street}
                                            onChange={(e) => handleAddressChange('street', e.target.value)}
                                            className={addressErrors.street ? 'border-red-500' : ''}
                                        />
                                        {addressErrors.street && (
                                            <p className="text-red-500 text-sm mt-1">{addressErrors.street}</p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label htmlFor="city">City *</Label>
                                            <Input
                                                id="city"
                                                value={shippingAddress.city}
                                                onChange={(e) => handleAddressChange('city', e.target.value)}
                                                className={addressErrors.city ? 'border-red-500' : ''}
                                            />
                                            {addressErrors.city && (
                                                <p className="text-red-500 text-sm mt-1">{addressErrors.city}</p>
                                            )}
                                        </div>
                                        <div>
                                            <Label htmlFor="state">State *</Label>
                                            <Input
                                                id="state"
                                                value={shippingAddress.state}
                                                onChange={(e) => handleAddressChange('state', e.target.value)}
                                                className={addressErrors.state ? 'border-red-500' : ''}
                                            />
                                            {addressErrors.state && (
                                                <p className="text-red-500 text-sm mt-1">{addressErrors.state}</p>
                                            )}
                                        </div>
                                        <div>
                                            <Label htmlFor="zipCode">PIN Code *</Label>
                                            <Input
                                                id="zipCode"
                                                value={shippingAddress.zipCode}
                                                onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                                                className={addressErrors.zipCode ? 'border-red-500' : ''}
                                            />
                                            {addressErrors.zipCode && (
                                                <p className="text-red-500 text-sm mt-1">{addressErrors.zipCode}</p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Order Notes */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Order Notes (Optional)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Textarea
                                        placeholder="Any special instructions for your order..."
                                        value={orderNotes}
                                        onChange={(e) => setOrderNotes(e.target.value)}
                                        rows={3}
                                    />
                                </CardContent>
                            </Card>

                            {/* Payment Method */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CreditCard className="h-5 w-5" />
                                        Payment Method
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-3 p-4 border rounded-lg bg-orange-50">
                                        <Truck className="h-5 w-5 text-orange-600" />
                                        <div>
                                            <div className="font-medium">Cash on Delivery</div>
                                            <div className="text-sm text-gray-600">Pay when your order is delivered</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Order Summary */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Order Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Order Items */}
                                    <div className="space-y-3">
                                        {cart.items.slice(0, 3).map((item) => (
                                            <div key={item.productId} className="flex gap-3">
                                                <div className="relative w-12 h-12 bg-white rounded overflow-hidden flex-shrink-0">
                                                    {item.product?.images && item.product.images.length > 0 ? (
                                                        <Image
                                                            src={item.product.images[0]}
                                                            alt={item.product.name}
                                                            fill
                                                            className="object-cover"
                                                            sizes="48px"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                                            <Package className="h-3 w-3 text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium truncate">{item.product?.name}</div>
                                                    <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                                                </div>
                                                <div className="flex items-center text-sm">
                                                    <span>{formatPrice(item.subtotal || 0)}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {cart.items.length > 3 && (
                                            <div className="text-sm text-gray-500 text-center py-2">
                                                +{cart.items.length - 3} more items
                                            </div>
                                        )}
                                    </div>

                                    <Separator />

                                    {/* Pricing */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span>Subtotal</span>
                                            <div className="flex items-center">
                                                <span>{formatPrice(subtotal)}</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>Tax (GST)</span>
                                            <div className="flex items-center">
                                                <span>{formatPrice(tax)}</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>Shipping</span>
                                            {shippingCost === 0 ? (
                                                <span className="text-green-600">Free</span>
                                            ) : (
                                                <div className="flex items-center">
                                                    <span>{formatPrice(shippingCost)}</span>
                                                </div>
                                            )}
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between font-semibold">
                                            <span>Total</span>
                                            <div className="flex items-center">
                                                <span>{formatPrice(total)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {orderError && (
                                        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                            <span className="text-sm">{orderError}</span>
                                        </div>
                                    )}

                                    <Button
                                        className="w-full bg-orange-600 hover:bg-orange-700"
                                        size="lg"
                                        onClick={handlePlaceOrder}
                                        disabled={orderLoading}
                                    >
                                        {orderLoading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Placing Order...
                                            </>
                                        ) : (
                                            <>
                                                Place Order
                                                <CheckCircle className="h-4 w-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Security Info */}
                            <Card>
                                <CardContent className="p-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <span>Secure checkout</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            <span>Free returns within 7 days</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                            <span>Cash on delivery available</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}