"use client";

import { useState, useCallback } from 'react';
import { 
  Package, 
  Clock, 
  Star, 
  TrendingUp, 
  Users, 
  MessageCircle,
  Calendar,
  Settings,
  Eye,
  CheckCircle,
  AlertCircle,
  GripVertical
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface WorkListOrder {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerImage?: string;
  productName: string;
  description: string;
  requirements: {
    quantity: number;
    timeline: string;
    customizations: string[];
  };
  pricing: {
    agreedPrice: number;
    currency: string;
  };
  status: 'pending_approval' | 'approved' | 'in_production' | 'quality_check' | 'completed';
  priority: 'low' | 'medium' | 'high';
  deadline: Date;
  estimatedCompletion: Date;
  createdAt: Date;
  designApproved?: boolean;
  designImageUrl?: string;
}

interface ArtisanDashboardProps {
  artisanId: string;
  orders: WorkListOrder[];
  onApproveOrder: (orderId: string) => void;
  onDeclineOrder: (orderId: string, reason: string) => void;
  onUpdateOrderStatus: (orderId: string, status: WorkListOrder['status']) => void;
  onChatWithBuyer: (buyerId: string) => void;
  onViewOrderDetails: (orderId: string) => void;
}

export function ArtisanDashboard({
  artisanId,
  orders,
  onApproveOrder,
  onDeclineOrder,
  onUpdateOrderStatus,
  onChatWithBuyer,
  onViewOrderDetails
}: ArtisanDashboardProps) {
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'busy' | 'unavailable'>('available');
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'priority' | 'created'>('deadline');

  // Mock artisan metrics
  const metrics = {
    totalOrders: orders.length,
    activeOrders: orders.filter(o => ['approved', 'in_production'].includes(o.status)).length,
    completedThisMonth: orders.filter(o => o.status === 'completed').length,
    averageRating: 4.6,
    responseTime: 45, // minutes
    completionRate: 92
  };

  const getStatusColor = (status: WorkListOrder['status']) => {
    switch (status) {
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'in_production': return 'bg-orange-100 text-orange-800';
      case 'quality_check': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: WorkListOrder['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: WorkListOrder['status']) => {
    switch (status) {
      case 'pending_approval': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'in_production': return <Package className="h-4 w-4" />;
      case 'quality_check': return <Eye className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
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
      day: 'numeric'
    }).format(date);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getDaysUntilDeadline = (deadline: Date) => {
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredAndSortedOrders = useCallback(() => {
    let filtered = orders;

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(order => order.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'deadline':
          return a.deadline.getTime() - b.deadline.getTime();
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'created':
          return b.createdAt.getTime() - a.createdAt.getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [orders, filterStatus, sortBy]);

  const OrderCard = ({ order }: { order: WorkListOrder }) => {
    const daysUntilDeadline = getDaysUntilDeadline(order.deadline);
    const isUrgent = daysUntilDeadline <= 3;

    return (
      <Card className={`hover:shadow-md transition-shadow ${isUrgent ? 'border-red-200' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={order.buyerImage} alt={order.buyerName} />
                <AvatarFallback>{getInitials(order.buyerName)}</AvatarFallback>
              </Avatar>
              
              <div>
                <CardTitle className="text-lg">{order.productName}</CardTitle>
                <p className="text-sm text-muted-foreground">for {order.buyerName}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge className={getPriorityColor(order.priority)}>
                {order.priority}
              </Badge>
              <Badge className={getStatusColor(order.status)}>
                {getStatusIcon(order.status)}
                <span className="ml-1 capitalize">{order.status.replace('_', ' ')}</span>
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {order.description}
          </p>

          {/* Requirements */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Quantity:</span> {order.requirements.quantity}
            </div>
            <div>
              <span className="font-medium">Timeline:</span> {order.requirements.timeline}
            </div>
          </div>

          {/* Customizations */}
          {order.requirements.customizations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Customizations:</h4>
              <div className="flex flex-wrap gap-1">
                {order.requirements.customizations.slice(0, 3).map((custom, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {custom}
                  </Badge>
                ))}
                {order.requirements.customizations.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{order.requirements.customizations.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Design Status */}
          {order.designApproved && (
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Design Approved</span>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Deadline: {formatDate(order.deadline)}</span>
              <span className={isUrgent ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                {daysUntilDeadline > 0 ? `${daysUntilDeadline} days left` : 'Overdue'}
              </span>
            </div>
            {isUrgent && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                ⚠️ Urgent: Deadline approaching soon
              </div>
            )}
          </div>

          {/* Price and Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-lg font-semibold">
              {formatPrice(order.pricing.agreedPrice, order.pricing.currency)}
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChatWithBuyer(order.buyerId)}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Chat
              </Button>
              
              <Button
                size="sm"
                onClick={() => onViewOrderDetails(order.id)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Details
              </Button>
            </div>
          </div>

          {/* Status Actions */}
          {order.status === 'pending_approval' && (
            <div className="flex space-x-2 pt-2 border-t">
              <Button
                size="sm"
                onClick={() => onApproveOrder(order.id)}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDeclineOrder(order.id, 'Not available for this timeline')}
                className="flex-1"
              >
                Decline
              </Button>
            </div>
          )}

          {/* Status Update */}
          {order.status !== 'pending_approval' && order.status !== 'completed' && (
            <div className="pt-2 border-t">
              <Select
                value={order.status}
                onValueChange={(value: WorkListOrder['status']) => onUpdateOrderStatus(order.id, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="in_production">In Production</SelectItem>
                  <SelectItem value="quality_check">Quality Check</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Artisan Dashboard</h1>
        
        {/* Availability Controls */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="accepting-orders">Accepting Orders</Label>
            <Switch
              id="accepting-orders"
              checked={acceptingOrders}
              onCheckedChange={setAcceptingOrders}
            />
          </div>
          
          <Select value={availabilityStatus} onValueChange={(value: any) => setAvailabilityStatus(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
              <SelectItem value="unavailable">Unavailable</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeOrders}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalOrders} total orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completedThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.completionRate}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageRating}</div>
            <p className="text-xs text-muted-foreground">
              Based on customer reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.responseTime}m</div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Work List */}
      <Tabs defaultValue="worklist">
        <TabsList>
          <TabsTrigger value="worklist">Work List</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="worklist" className="space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="in_production">In Production</SelectItem>
                  <SelectItem value="quality_check">Quality Check</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="created">Date Created</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              {filteredAndSortedOrders().length} orders
            </div>
          </div>

          {/* Orders Grid */}
          {filteredAndSortedOrders().length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No orders found</h3>
                <p className="text-muted-foreground">
                  {filterStatus === 'all' 
                    ? "You don't have any orders at the moment."
                    : "No orders match the selected filter."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedOrders().map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardContent className="py-12 text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Analytics Dashboard</h3>
              <p className="text-muted-foreground">
                Detailed analytics and insights coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardContent className="py-12 text-center">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Settings</h3>
              <p className="text-muted-foreground">
                Artisan settings and preferences coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}