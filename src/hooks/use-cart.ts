'use client'

import { useState, useEffect, useCallback, useRef } from 'react';

interface CartItem {
    productId: string;
    quantity: number;
    addedAt: Date;
    updatedAt: Date;
    product?: any;
    subtotal?: number;
}

interface Cart {
    cartId: string;
    userId: string;
    items: CartItem[];
    totalAmount: number;
    totalItems: number;
    createdAt: Date;
    updatedAt: Date;
}

// Cart hook with enhanced state management
export const useCart = (userId: string | null) => {
    const [cart, setCart] = useState<Cart | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const controllerRef = useRef<AbortController | null>(null);

    const fetchCart = useCallback(async () => {
        if (!userId || userId.trim() === '') {
            setCart(null);
            return;
        }
        
        controllerRef.current?.abort();
        controllerRef.current = new AbortController();

        setLoading(true);
        setError(null);

        try {
            console.log('useCart: Fetching cart for userId:', userId);
            const response = await fetch(`/api/cart?userId=${userId}`, {
                signal: controllerRef.current.signal,
            });

            if (!response.ok) {
                throw new Error(`Cart fetch failed with status ${response.status}`);
            }

            const data = await response.json();

            console.log('useCart: API response:', data);

            if (data.success) {
                setCart(data.data);
                console.log('useCart: Cart set:', data.data);
                console.log('useCart: Items count:', data.data?.items?.length || 0);
                console.log('useCart: Total items:', data.data?.totalItems || 0);
            } else {
                setError(data.error || 'Failed to fetch cart');
                console.error('useCart: API error:', data.error);
            }
        } catch (err: any) {
            if (err?.name === 'AbortError') {
                return;
            }
            console.error('useCart: Network error:', err);
            setError(err?.message || 'Network error occurred');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const addToCart = useCallback(async (productId: string, quantity: number = 1) => {
        if (!userId) return false;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/cart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, productId, quantity }),
            });

            const data = await response.json();

            if (data.success) {
                await fetchCart(); // Refresh cart data
                return true;
            } else {
                setError(data.error || 'Failed to add to cart');
                return false;
            }
        } catch (err) {
            setError('Network error occurred');
            return false;
        } finally {
            setLoading(false);
        }
    }, [userId, fetchCart]);

    const updateCartItem = useCallback(async (productId: string, quantity: number) => {
        if (!userId) return false;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/cart', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, productId, quantity }),
            });

            const data = await response.json();

            if (data.success) {
                await fetchCart(); // Refresh cart data
                return true;
            } else {
                setError(data.error || 'Failed to update cart item');
                return false;
            }
        } catch (err) {
            setError('Network error occurred');
            return false;
        } finally {
            setLoading(false);
        }
    }, [userId, fetchCart]);

    const removeFromCart = useCallback(async (productId: string) => {
        if (!userId) return false;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/cart?userId=${userId}&productId=${productId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                await fetchCart(); // Refresh cart data
                return true;
            } else {
                setError(data.error || 'Failed to remove from cart');
                return false;
            }
        } catch (err) {
            setError('Network error occurred');
            return false;
        } finally {
            setLoading(false);
        }
    }, [userId, fetchCart]);

    const clearCart = useCallback(async () => {
        if (!userId) return false;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/cart/clear?userId=${userId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                await fetchCart(); // Refresh cart data
                return true;
            } else {
                setError(data.error || 'Failed to clear cart');
                return false;
            }
        } catch (err) {
            setError('Network error occurred');
            return false;
        } finally {
            setLoading(false);
        }
    }, [userId, fetchCart]);

    const getCartCount = useCallback(() => {
        // Fallback to manual calculation if totalItems is 0 but items exist
        const totalItems = cart?.totalItems || 0;
        const manualCount = cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;
        const count = totalItems > 0 ? totalItems : manualCount;
        
        console.log('useCart getCartCount: cart object:', cart);
        console.log('useCart getCartCount: totalItems from API:', totalItems);
        console.log('useCart getCartCount: manual count:', manualCount);
        console.log('useCart getCartCount: final count:', count);
        return count;
    }, [cart]);

    const getCartTotal = useCallback(() => {
        const total = cart?.totalAmount || 0;
        console.log('useCart getCartTotal: returning total:', total);
        return total;
    }, [cart]);

    useEffect(() => {
        console.log('useCart useEffect: userId changed:', userId);
        if (userId) {
            fetchCart();
        } else {
            console.log('useCart useEffect: clearing cart state (no userId)');
            controllerRef.current?.abort();
            setCart(null);
        }
        return () => controllerRef.current?.abort();
    }, [userId, fetchCart]);

    return {
        cart,
        loading,
        error,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
        getCartCount,
        getCartTotal,
        refetch: fetchCart,
    };
};
