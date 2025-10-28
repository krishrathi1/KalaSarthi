"use client";

import { useState } from 'react';
import { X, Package, Calendar, MapPin, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface OrderManagementFormProps {
  sessionId: string;
  buyerId: string;
  artisanId: string;
  conversationSummary: string;
  onClose: () => void;
  onOrderSubmitted: (orderData: any) => void;
}

export function OrderManagementForm({
  sessionId,
  buyerId,
  artisanId,
  conversationSummary,
  onClose,
  onOrderSubmitted
}: OrderManagementFormProps) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    deliveryAddress: '',
    city: '',
    state: '',
    pincode: '',
    agreedPrice: '',
    deliveryTimeline: '',
    specialInstructions: '',
    paymentMethod: 'cash_on_delivery'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const requiredFields = ['customerName', 'customerPhone', 'deliveryAddress', 'agreedPrice'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Information",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create order data
      const orderData = {
        sessionId,
        buyerId,
        artisanId,
        customerDetails: {
          name: formData.customerName,
          email: formData.customerEmail,
          phone: formData.customerPhone
        },
        deliveryAddress: {
          address: formData.deliveryAddress,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode
        },
        orderDetails: {
          agreedPrice: parseFloat(formData.agreedPrice),
          deliveryTimeline: formData.deliveryTimeline,
          specialInstructions: formData.specialInstructions,
          paymentMethod: formData.paymentMethod
        },
        conversationSummary,
        orderDate: new Date(),
        status: 'confirmed'
      };
      
      // In production, this would call the order creation API
      console.log('Creating order:', orderData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onOrderSubmitted(orderData);
      
    } catch (error) {
      console.error('Order submission failed:', error);
      toast({
        title: "Order Failed",
        description: "Could not create order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Collect Order Details
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Customer Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Full Name *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    placeholder="Enter customer's full name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="customerPhone">Phone Number *</Label>
                  <Input
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="customerEmail">Email Address</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                  placeholder="customer@example.com"
                />
              </div>
            </div>
            
            {/* Delivery Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Delivery Address
              </h3>
              
              <div>
                <Label htmlFor="deliveryAddress">Street Address *</Label>
                <Textarea
                  id="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                  placeholder="Enter complete delivery address"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="City"
                  />
                </div>
                
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="State"
                  />
                </div>
                
                <div>
                  <Label htmlFor="pincode">PIN Code</Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                    placeholder="000000"
                  />
                </div>
              </div>
            </div>
            
            {/* Order Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Order Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="agreedPrice">Agreed Price (₹) *</Label>
                  <Input
                    id="agreedPrice"
                    type="number"
                    value={formData.agreedPrice}
                    onChange={(e) => handleInputChange('agreedPrice', e.target.value)}
                    placeholder="0"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="deliveryTimeline">Delivery Timeline</Label>
                  <Input
                    id="deliveryTimeline"
                    value={formData.deliveryTimeline}
                    onChange={(e) => handleInputChange('deliveryTimeline', e.target.value)}
                    placeholder="e.g., 7-10 days"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => handleInputChange('paymentMethod', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash_on_delivery">Cash on Delivery</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI Payment</SelectItem>
                    <SelectItem value="advance_payment">50% Advance Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="specialInstructions">Special Instructions</Label>
                <Textarea
                  id="specialInstructions"
                  value={formData.specialInstructions}
                  onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                  placeholder="Any special requirements or notes..."
                />
              </div>
            </div>
            
            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating Order...
                  </>
                ) : (
                  'Create Order'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}