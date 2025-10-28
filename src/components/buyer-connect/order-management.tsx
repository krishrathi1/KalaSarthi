"use client";

import { useState } from 'react';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Truck, 
  Star,
  MessageCircle,
  Eye,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Order {
  id: string;
  artisanId: string;
  artisanName: string;
  artisanImage?: string;
  productName: string;
  description: string;
  status: 'pending_approval' | 'approved' | 'design_phase' | 'in_production' | 'shipped' | 'delivered' | 'completed';
  timeline: {
    estimatedDuration: number;
    milestones: Array<{
      milestone: string;
      estimatedDate: Date;
      actualDate?: Date;
      status: 'pending' | 'in_progress' | 'completed' | 'delayed';
    }>;
  };
  pricing: {
    totalPrice: number;
    currency: string;
  };
  designCollaboration?: {
    approvedDesign?: {
      designId: string;
      imageUrl: string;
      approvalDate: Date;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

interface OrderManagementProps {
  orders: Order[];
  onViewOrder: (orderId: string) => void;
  onChatWithArtisan: (artisanId: string) => void;
  onRateOrder?: (orderId: string) => void;
}

export function OrderManagement({ 
  orders, 
  onViewOrder, 
  onChatWithArtisan, 
  onRateOrder 
}: OrderManagementProps) {
  const [activeTab, setActiveTab] = useState('active');

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'design_phase': return 'bg-purple-100 text-purple-800';
      case 'in_production': return 'bg-orange-100 text-orange-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending_approval': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'design_phase': return <Eye className="h-4 w-4" />;
      case 'in_production': return <Package className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'completed': return <Star className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getProgressPercentage = (status: Order['status']) => {
    const statusMap = {
      'pending_approval': 10,
      'approved': 20,
      'design_phase': 40,
      'in_production': 60,
      'shipped': 80,
      'delivered': 90,
      'completed': 100
    };
    return statusMap[status] || 0;
  };

  const formatPrice = (price: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const filterOrders = (status: string) => {
    switch (status) {
      case 'active':
        return orders.filter(order => 
          !['completed', 'delivered'].includes(order.status)
        );
      case 'completed':
        return orders.filter(order => 
          ['completed', 'delivered'].includes(order.status)
        );
      case 'all':
      default:
        return orders;
    }
  };

  const OrderCard = ({ order }: { order: Order }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={order.artisanImage} alt={order.artisanName} />
              <AvatarFallback>{getInitials(order.artisanName)}</AvatarFallback>
            </Avatar>
            
            <div>
              <CardTitle className="text-lg">{order.productName}</CardTitle>
              <p className="text-sm text-muted-foreground">by {order.artisanName}</p>
            </div>
          </div>
          
          <Badge className={getStatusColor(order.status)}>
            {getStatusIcon(order.status)}
            <span className="ml-1 capitalize">{order.status.replace('_', ' ')}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {order.description}
        </p>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{getProgressPercentage(order.status)}%</span>
          </div>
          <Progress value={getProgressPercentage(order.status)} className="h-2" />
        </div>

        {/* Timeline */}
        {order.timeline.milestones.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Next Milestone</h4>
            <div className="flex items-center justify-between text-sm">
              <span>{order.timeline.milestones[0].milestone}</span>
              <span className="text-muted-foreground">
                {formatDate(order.timeline.milestones[0].estimatedDate)}
              </span>
            </div>
          </div>
        )}

        {/* Design Preview */}
        {order.designCollaboration?.approvedDesign && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Approved Design</h4>
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Price and Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-lg font-semibold">
            {formatPrice(order.pricing.totalPrice, order.pricing.currency)}
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChatWithArtisan(order.artisanId)}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Chat
            </Button>
            
            <Button
              size="sm"
              onClick={() => onViewOrder(order.id)}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            
            {order.status === 'delivered' && onRateOrder && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRateOrder(order.id)}
              >
                <Star className="h-4 w-4 mr-1" />
                Rate
              </Button>
            )}
          </div>
        </div>

        {/* Order dates */}
        <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>Ordered: {formatDate(order.createdAt)}</span>
          <span>Updated: {formatDate(order.updatedAt)}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Orders</h2>
        <div className="text-sm text-muted-foreground">
          {orders.length} total orders
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">Active Orders</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All Orders</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filterOrders(activeTab).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No orders found</h3>
                <p className="text-muted-foreground">
                  {activeTab === 'active' 
                    ? "You don't have any active orders at the moment."
                    : "No orders match the selected filter."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterOrders(activeTab).map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}