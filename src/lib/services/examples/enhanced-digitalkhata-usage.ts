/**
 * Example usage of the Enhanced DigitalKhata real-time services
 * This file demonstrates how to integrate the real-time Firestore sync
 * and aggregation services into your application.
 */

import EnhancedDigitalKhataService, { DashboardData } from '../EnhancedDigitalKhataService';
import { ISalesEvent } from '../../models/SalesEvent';
import { ConnectionState } from '../RealtimeFirestoreSyncService';

// Example: Setting up real-time dashboard for an artisan
export async function setupArtisanDashboard(artisanId: string) {
  const service = EnhancedDigitalKhataService.getInstance();

  // Subscribe to real-time dashboard updates
  const subscriptionId = service.subscribeToDashboard(
    artisanId,
    (dashboardData: DashboardData) => {
      console.log('📊 Dashboard updated:', {
        currentSales: dashboardData.currentSales,
        recentEventsCount: dashboardData.recentEvents.length,
        connectionState: dashboardData.connectionState,
        lastUpdated: dashboardData.lastUpdated
      });

      // Update your UI components here
      updateDashboardUI(dashboardData);
    }
  );

  // Monitor connection state
  const unsubscribeConnection = service.onConnectionStateChange((state: ConnectionState) => {
    console.log('🔌 Connection state changed:', state);
    
    // Show connection status in UI
    updateConnectionStatus(state);
  });

  // Return cleanup function
  return () => {
    service.unsubscribeFromDashboard(subscriptionId);
    unsubscribeConnection();
  };
}

// Example: Processing a new sales event
export async function processSalesEvent(salesEventData: Partial<ISalesEvent>) {
  const service = EnhancedDigitalKhataService.getInstance();

  // Create a complete sales event
  const salesEvent: ISalesEvent = {
    orderId: salesEventData.orderId || `order_${Date.now()}`,
    productId: salesEventData.productId || 'product_1',
    artisanId: salesEventData.artisanId || 'dev_bulchandani_001',
    userId: salesEventData.userId,
    eventType: salesEventData.eventType || 'order_paid',
    eventTimestamp: salesEventData.eventTimestamp || new Date(),
    quantity: salesEventData.quantity || 1,
    unitPrice: salesEventData.unitPrice || 1000,
    totalAmount: salesEventData.totalAmount || 1000,
    discount: salesEventData.discount || 0,
    tax: salesEventData.tax || 0,
    commission: salesEventData.commission || 50,
    netRevenue: (salesEventData.totalAmount || 1000) - (salesEventData.discount || 0) - (salesEventData.tax || 0) - (salesEventData.commission || 50),
    productName: salesEventData.productName || 'Handcrafted Item',
    productCategory: salesEventData.productCategory || 'furniture',
    productSubcategory: salesEventData.productSubcategory,
    channel: salesEventData.channel || 'web',
    platform: salesEventData.platform,
    region: salesEventData.region || 'Rajasthan',
    city: salesEventData.city || 'Jodhpur',
    customerSegment: salesEventData.customerSegment || 'returning',
    seasonality: salesEventData.seasonality || 'regular',
    currency: salesEventData.currency || 'INR',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  };

  try {
    // Process the sales event (sync to Firestore + update aggregates)
    await service.processSalesEvent(salesEvent);
    console.log('✅ Sales event processed successfully');
  } catch (error) {
    console.error('❌ Error processing sales event:', error);
    throw error;
  }
}

// Example: Getting current dashboard data
export async function getCurrentDashboardData(artisanId: string) {
  const service = EnhancedDigitalKhataService.getInstance();

  try {
    const dashboardData = await service.getDashboardData(artisanId);
    
    console.log('📊 Current dashboard data:', {
      todaySales: dashboardData.currentSales.today,
      weekSales: dashboardData.currentSales.thisWeek,
      monthSales: dashboardData.currentSales.thisMonth,
      yearSales: dashboardData.currentSales.thisYear,
      recentEventsCount: dashboardData.recentEvents.length,
      connectionState: dashboardData.connectionState
    });

    return dashboardData;
  } catch (error) {
    console.error('❌ Error getting dashboard data:', error);
    throw error;
  }
}

// Example: Service health monitoring
export function monitorServiceHealth() {
  const service = EnhancedDigitalKhataService.getInstance();

  setInterval(() => {
    const stats = service.getServiceStats();
    
    console.log('📈 Service Statistics:', {
      connectionState: stats.syncService.connectionState,
      cachedEvents: stats.syncService.cachedEvents,
      cachedAggregates: stats.syncService.cachedAggregates,
      pendingAggregationUpdates: stats.aggregationService.pendingUpdates,
      dashboardSubscriptions: stats.dashboardSubscriptions
    });
  }, 30000); // Every 30 seconds
}

// Example UI update functions (implement based on your frontend framework)
function updateDashboardUI(data: DashboardData) {
  // React example:
  // setDashboardData(data);
  
  // Vue example:
  // this.dashboardData = data;
  
  // Vanilla JS example:
  // document.getElementById('today-sales').textContent = data.currentSales.today;
  // document.getElementById('recent-events').innerHTML = renderRecentEvents(data.recentEvents);
  
  console.log('🎨 UI updated with dashboard data');
}

function updateConnectionStatus(state: ConnectionState) {
  // Update connection indicator in UI
  const statusElement = document.getElementById('connection-status');
  if (statusElement) {
    statusElement.textContent = state;
    statusElement.className = `connection-status ${state}`;
  }
  
  console.log('🔌 Connection status UI updated:', state);
}

// Example: Complete setup for Dev Bulchandani
export async function setupDevBulchandaniDashboard() {
  const artisanId = 'dev_bulchandani_001';
  
  console.log('🚀 Setting up Enhanced DigitalKhata for Dev Bulchandani...');
  
  // Set up real-time dashboard
  const cleanup = await setupArtisanDashboard(artisanId);
  
  // Start health monitoring
  monitorServiceHealth();
  
  // Simulate some sales events for testing
  setTimeout(async () => {
    await processSalesEvent({
      artisanId,
      productId: 'dev_bulchandani_product_1',
      productName: 'Handcrafted Teak Dining Table',
      productCategory: 'furniture',
      eventType: 'order_paid',
      quantity: 1,
      unitPrice: 45000,
      totalAmount: 45000,
      commission: 2250,
      channel: 'web',
      customerSegment: 'premium'
    });
  }, 5000);
  
  // Return cleanup function
  return cleanup;
}

// Export for use in your application
export {
  EnhancedDigitalKhataService,
  type DashboardData,
  type ConnectionState
};