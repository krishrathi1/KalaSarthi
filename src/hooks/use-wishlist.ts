'use client'
import { useState, useEffect, useCallback } from 'react';

interface WishlistItem {
    productId: string;
    addedAt: Date;
    product?: any;
}

interface Wishlist {
    wishlistId: string;
    userId: string;
    products: WishlistItem[];
    createdAt: Date;
    updatedAt: Date;
}

export const useWishlist = (userId: string | null) => {
    const [wishlist, setWishlist] = useState<Wishlist | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchWishlist = useCallback(async () => {
        if (!userId) {
            console.log('useWishlist: No userId provided');
            return;
        }
        
        setLoading(true);
        setError(null);

        try {
            console.log('useWishlist: Fetching wishlist for userId:', userId);
            const response = await fetch(`/api/wishlist?userId=${userId}`);
            const data = await response.json();

            console.log('useWishlist: API response:', data);

            if (data.success) {
                setWishlist(data.data);
                console.log('useWishlist: Wishlist set:', data.data);
                console.log('useWishlist: Products count:', data.data?.products?.length || 0);
            } else {
                setError(data.error || 'Failed to fetch wishlist');
                console.error('useWishlist: API error:', data.error);
            }
        } catch (err) {
            console.error('useWishlist: Network error:', err);
            setError('Network error occurred');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const addToWishlist = useCallback(async (productId: string) => {
        if (!userId) return false;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/wishlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, productId }),
            });

            const data = await response.json();

            if (data.success) {
                await fetchWishlist(); // Refresh wishlist data
                return true;
            } else {
                setError(data.error || 'Failed to add to wishlist');
                return false;
            }
        } catch (err) {
            setError('Network error occurred');
            return false;
        } finally {
            setLoading(false);
        }
    }, [userId, fetchWishlist]);

    const removeFromWishlist = useCallback(async (productId: string) => {
        if (!userId) return false;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/wishlist?userId=${userId}&productId=${productId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                await fetchWishlist(); // Refresh wishlist data
                return true;
            } else {
                setError(data.error || 'Failed to remove from wishlist');
                return false;
            }
        } catch (err) {
            setError('Network error occurred');
            return false;
        } finally {
            setLoading(false);
        }
    }, [userId, fetchWishlist]);

    const clearWishlist = useCallback(async () => {
        if (!userId) return false;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/wishlist/clear?userId=${userId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                await fetchWishlist(); // Refresh wishlist data
                return true;
            } else {
                setError(data.error || 'Failed to clear wishlist');
                return false;
            }
        } catch (err) {
            setError('Network error occurred');
            return false;
        } finally {
            setLoading(false);
        }
    }, [userId, fetchWishlist]);

    const isInWishlist = useCallback((productId: string) => {
        const isPresent = wishlist?.products.some(item => item.productId === productId) || false;
        console.log('useWishlist isInWishlist: checking productId:', productId, 'result:', isPresent);
        return isPresent;
    }, [wishlist]);

    const getWishlistCount = useCallback(() => {
        const count = wishlist?.products.length || 0;
        console.log('useWishlist getWishlistCount: wishlist object:', wishlist);
        console.log('useWishlist getWishlistCount: returning count:', count);
        return count;
    }, [wishlist]);

    useEffect(() => {
        console.log('useWishlist useEffect: userId changed:', userId);
        if (userId) {
            fetchWishlist();
        } else {
            console.log('useWishlist useEffect: clearing wishlist state (no userId)');
            setWishlist(null);
        }
    }, [userId, fetchWishlist]);

    return {
        wishlist,
        loading,
        error,
        addToWishlist,
        removeFromWishlist,
        clearWishlist,
        isInWishlist,
        getWishlistCount,
        refetch: fetchWishlist,
    };
};
