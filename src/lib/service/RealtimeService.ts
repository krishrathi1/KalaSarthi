import { WebSocket } from 'ws'; // For server-side WebSocket handling

interface RealtimeClient {
  id: string;
  userId: string;
  connection: WebSocket;
  subscriptions: Set<string>;
  lastActivity: Date;
}

interface RealtimeMessage {
  type: string;
  payload: any;
  timestamp: Date;
  userId?: string;
}

export class RealtimeService {
  private static clients = new Map<string, RealtimeClient>();
  private static channels = new Map<string, Set<string>>(); // channel -> clientIds

  /**
   * Add a new client connection
   */
  static addClient(clientId: string, userId: string, connection: WebSocket): void {
    const client: RealtimeClient = {
      id: clientId,
      userId,
      connection,
      subscriptions: new Set(),
      lastActivity: new Date()
    };

    this.clients.set(clientId, client);

    // Handle client messages
    connection.on('message', (data: Buffer) => {
      try {
        const message: RealtimeMessage = JSON.parse(data.toString());
        this.handleClientMessage(clientId, message);
      } catch (error) {
        console.error('Invalid message format:', error);
      }
    });

    // Handle client disconnect
    connection.on('close', () => {
      this.removeClient(clientId);
    });

    // Handle connection errors
    connection.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.removeClient(clientId);
    });

    console.log(`🔌 Client ${clientId} (${userId}) connected`);
  }

  /**
   * Remove a client connection
   */
  static removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      // Remove from all subscriptions
      for (const channel of client.subscriptions) {
        this.unsubscribeFromChannel(clientId, channel);
      }

      this.clients.delete(clientId);
      console.log(`🔌 Client ${clientId} disconnected`);
    }
  }

  /**
   * Subscribe client to a channel
   */
  static subscribeToChannel(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.add(channel);

    // Add to channel subscribers
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(clientId);

    console.log(`📡 Client ${clientId} subscribed to ${channel}`);
  }

  /**
   * Unsubscribe client from a channel
   */
  static unsubscribeFromChannel(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(channel);

    // Remove from channel subscribers
    const channelSubscribers = this.channels.get(channel);
    if (channelSubscribers) {
      channelSubscribers.delete(clientId);
      if (channelSubscribers.size === 0) {
        this.channels.delete(channel);
      }
    }

    console.log(`📡 Client ${clientId} unsubscribed from ${channel}`);
  }

  /**
   * Broadcast message to a channel
   */
  static broadcastToChannel(channel: string, message: RealtimeMessage): void {
    const channelSubscribers = this.channels.get(channel);
    if (!channelSubscribers) return;

    const messageString = JSON.stringify({
      ...message,
      channel,
      timestamp: new Date()
    });

    let sentCount = 0;
    for (const clientId of channelSubscribers) {
      const client = this.clients.get(clientId);
      if (client && client.connection.readyState === WebSocket.OPEN) {
        try {
          client.connection.send(messageString);
          sentCount++;
        } catch (error) {
          console.error(`Failed to send to client ${clientId}:`, error);
        }
      }
    }

    console.log(`📡 Broadcasted to ${channel}: ${sentCount} clients`);
  }

  /**
   * Send message to specific user
   */
  static sendToUser(userId: string, message: RealtimeMessage): void {
    const messageString = JSON.stringify({
      ...message,
      timestamp: new Date()
    });

    let sentCount = 0;
    for (const client of this.clients.values()) {
      if (client.userId === userId && client.connection.readyState === WebSocket.OPEN) {
        try {
          client.connection.send(messageString);
          sentCount++;
        } catch (error) {
          console.error(`Failed to send to client ${client.id}:`, error);
        }
      }
    }

    console.log(`📡 Sent to user ${userId}: ${sentCount} connections`);
  }

  /**
   * Send message to specific client
   */
  static sendToClient(clientId: string, message: RealtimeMessage): void {
    const client = this.clients.get(clientId);
    if (!client || client.connection.readyState !== WebSocket.OPEN) {
      return;
    }

    const messageString = JSON.stringify({
      ...message,
      timestamp: new Date()
    });

    try {
      client.connection.send(messageString);
      console.log(`📡 Sent to client ${clientId}`);
    } catch (error) {
      console.error(`Failed to send to client ${clientId}:`, error);
    }
  }

  /**
   * Handle incoming client messages
   */
  private static handleClientMessage(clientId: string, message: RealtimeMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();

    switch (message.type) {
      case 'subscribe':
        if (message.payload?.channel) {
          this.subscribeToChannel(clientId, message.payload.channel);
        }
        break;

      case 'unsubscribe':
        if (message.payload?.channel) {
          this.unsubscribeFromChannel(clientId, message.payload.channel);
        }
        break;

      case 'ping':
        this.sendToClient(clientId, { type: 'pong', payload: {}, timestamp: new Date() });
        break;

      default:
        console.log(`📨 Received message from ${clientId}:`, message);
        break;
    }
  }

  /**
   * Get connection statistics
   */
  static getStats(): {
    totalClients: number;
    activeChannels: number;
    totalSubscriptions: number;
  } {
    let totalSubscriptions = 0;
    for (const client of this.clients.values()) {
      totalSubscriptions += client.subscriptions.size;
    }

    return {
      totalClients: this.clients.size,
      activeChannels: this.channels.size,
      totalSubscriptions
    };
  }

  /**
   * Clean up inactive connections
   */
  static cleanupInactiveConnections(maxAgeMinutes: number = 30): void {
    const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    const clientsToRemove: string[] = [];

    for (const [clientId, client] of this.clients.entries()) {
      if (client.lastActivity < cutoffTime) {
        clientsToRemove.push(clientId);
      }
    }

    for (const clientId of clientsToRemove) {
      this.removeClient(clientId);
    }

    if (clientsToRemove.length > 0) {
      console.log(`🧹 Cleaned up ${clientsToRemove.length} inactive connections`);
    }
  }
}

/**
 * Finance-specific real-time events
 */
export class FinanceRealtimeService {
  private static readonly CHANNELS = {
    SALES_UPDATES: 'finance:sales',
    LOAN_UPDATES: 'finance:loans',
    ALERTS: 'finance:alerts',
    DASHBOARD: 'finance:dashboard'
  };

  /**
   * Broadcast sales update
   */
  static broadcastSalesUpdate(userId: string, salesData: any): void {
    RealtimeService.broadcastToChannel(
      `${this.CHANNELS.SALES_UPDATES}:${userId}`,
      {
        type: 'sales_update',
        payload: salesData,
        userId,
        timestamp: new Date()
      }
    );
  }

  /**
   * Broadcast loan status update
   */
  static broadcastLoanUpdate(userId: string, loanData: any): void {
    RealtimeService.broadcastToChannel(
      `${this.CHANNELS.LOAN_UPDATES}:${userId}`,
      {
        type: 'loan_update',
        payload: loanData,
        userId,
        timestamp: new Date()
      }
    );
  }

  /**
   * Broadcast finance alert
   */
  static broadcastAlert(userId: string, alertData: any): void {
    RealtimeService.broadcastToChannel(
      `${this.CHANNELS.ALERTS}:${userId}`,
      {
        type: 'alert',
        payload: alertData,
        userId,
        timestamp: new Date()
      }
    );
  }

  /**
   * Broadcast dashboard update
   */
  static broadcastDashboardUpdate(userId: string, dashboardData: any): void {
    RealtimeService.broadcastToChannel(
      `${this.CHANNELS.DASHBOARD}:${userId}`,
      {
        type: 'dashboard_update',
        payload: dashboardData,
        userId,
        timestamp: new Date()
      }
    );
  }

  /**
   * Subscribe user to finance channels
   */
  static subscribeUser(clientId: string, userId: string): void {
    RealtimeService.subscribeToChannel(clientId, `${this.CHANNELS.SALES_UPDATES}:${userId}`);
    RealtimeService.subscribeToChannel(clientId, `${this.CHANNELS.LOAN_UPDATES}:${userId}`);
    RealtimeService.subscribeToChannel(clientId, `${this.CHANNELS.ALERTS}:${userId}`);
    RealtimeService.subscribeToChannel(clientId, `${this.CHANNELS.DASHBOARD}:${userId}`);
  }
}