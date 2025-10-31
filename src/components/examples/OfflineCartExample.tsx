'use client';

/**
 * Example Component: Offline-Enabled Cart
 * 
 * This demonstrates how to use the offline functionality in your components.
 * Copy this pattern to any component that needs offline support.
 */

import { useEffect, useState } from 'react';
import { useOffline } from '@/hooks/use-offline';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Wifi, WifiOff, RefreshCw, Trash2 } from 'lucide-react';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export function OfflineCartExample({ userId }: { userId: string }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const {
    isOnline,
    isSyncing,
    hasOfflineData,
    storeOffline,
    getOfflineData,
    updateOffline,
    deleteOffline,
    sync,
  } = useOffline();
  
  const { toast } = useToast();

  // Load cart data (online or offline)
  useEffect(() => {
    loadCart();
  }, [isOnline, userId]);

  const loadCart = async () => {
    setLoading(true);
    try {
      if (isOnline) {
        // Fetch from API when online
        const response = await fetch(`/api/cart?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setCartItems(data.items || []);
          
          // Cache the data offline
          for (const item of data.items || []) {
            await storeOffline('cart', item, item.id);
          }
        }
      } else {
        // Load from offline storage
        const offlineCart = await getOfflineData('cart');
        setCartItems(offlineCart as CartItem[]);
        
        if (offlineCart.length > 0) {
          toast({
            title: "Working Offline",
            description: "Showing cached cart data. Changes will sync when online.",
            duration: 3000,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
      
      // Fallback to offline data
      const offlineCart = await getOfflineData('cart');
      setCartItems(offlineCart as CartItem[]);
      
      toast({
        title: "Error Loading Cart",
        description: "Showing offline data. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (product: Omit<CartItem, 'id' | 'quantity'>) => {
    const newItem: CartItem = {
      ...product,
      id: `cart-${Date.now()}`,
      quantity: 1,
    };

    try {
      if (isOnline) {
        // Add via API
        const response = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            productId: product.productId,
            quantity: 1,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setCartItems(prev => [...prev, { ...newItem, id: data.id }]);
          
          // Cache offline
          await storeOffline('cart', newItem, data.id);
          
          toast({
            title: "Added to Cart",
            description: `${product.name} added successfully.`,
          });
        }
      } else {
        // Store offline
        await storeOffline('cart', newItem, newItem.id);
        setCartItems(prev => [...prev, newItem]);
        
        toast({
          title: "Added to Cart (Offline)",
          description: "Item will sync when you're back online.",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
      
      // Fallback to offline storage
      await storeOffline('cart', newItem, newItem.id);
      setCartItems(prev => [...prev, newItem]);
      
      toast({
        title: "Saved Offline",
        description: "Item saved locally and will sync later.",
        variant: "destructive",
      });
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      if (isOnline) {
        // Update via API
        const response = await fetch('/api/cart', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            productId: itemId,
            quantity: newQuantity,
          }),
        });

        if (response.ok) {
          setCartItems(prev =>
            prev.map(item =>
              item.id === itemId ? { ...item, quantity: newQuantity } : item
            )
          );
          
          // Update offline cache
          await updateOffline('cart', itemId, { quantity: newQuantity });
        }
      } else {
        // Update offline
        await updateOffline('cart', itemId, { quantity: newQuantity });
        setCartItems(prev =>
          prev.map(item =>
            item.id === itemId ? { ...item, quantity: newQuantity } : item
          )
        );
        
        toast({
          title: "Updated (Offline)",
          description: "Changes will sync when online.",
        });
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
      
      // Fallback to offline update
      await updateOffline('cart', itemId, { quantity: newQuantity });
      setCartItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      if (isOnline) {
        // Remove via API
        const response = await fetch(`/api/cart?userId=${userId}&productId=${itemId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setCartItems(prev => prev.filter(item => item.id !== itemId));
          await deleteOffline('cart', itemId);
          
          toast({
            title: "Removed from Cart",
            description: "Item removed successfully.",
          });
        }
      } else {
        // Remove offline
        await deleteOffline('cart', itemId);
        setCartItems(prev => prev.filter(item => item.id !== itemId));
        
        toast({
          title: "Removed (Offline)",
          description: "Change will sync when online.",
        });
      }
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      
      // Fallback to offline removal
      await deleteOffline('cart', itemId);
      setCartItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const handleSync = async () => {
    const success = await sync();
    if (success) {
      await loadCart(); // Reload after sync
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping Cart
            {cartItems.length > 0 && (
              <Badge variant="secondary">{cartItems.length}</Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            {isOnline ? (
              <Badge variant="outline" className="gap-1">
                <Wifi className="h-3 w-3" />
                Online
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <WifiOff className="h-3 w-3" />
                Offline
              </Badge>
            )}
            
            {/* Sync Button */}
            {isOnline && hasOfflineData && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Sync
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {cartItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Your cart is empty</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cart Items */}
            {cartItems.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 border rounded-lg"
              >
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                
                <div className="flex-1">
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    ₹{item.price.toFixed(2)}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </Button>
                </div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFromCart(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {/* Total */}
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total:</span>
                <span>₹{calculateTotal().toFixed(2)}</span>
              </div>
              
              <Button className="w-full mt-4" size="lg">
                Proceed to Checkout
              </Button>
            </div>
            
            {/* Offline Warning */}
            {!isOnline && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <p className="font-medium">Working Offline</p>
                <p className="text-xs mt-1">
                  Your changes are saved locally and will sync automatically when you're back online.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
