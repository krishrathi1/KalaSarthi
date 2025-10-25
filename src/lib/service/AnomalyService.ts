import { SalesAggregate, ISalesAggregate } from '../models/SalesAggregate';
import { Schema, model, models, Document } from 'mongoose';

export interface Alert extends Document {
  alertId: string;
  artisanId: string;
  productId?: string;
  type: 'revenue_drop' | 'order_spike' | 'conversion_drop' | 'return_spike' | 'seasonal_anomaly' | 'threshold_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'dismissed';
  title: string;
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  dismissedAt?: Date;
  metadata: {
    currentValue: number;
    expectedValue: number;
    deviation: number;
    threshold?: number;
    period: string;
    confidence: number;
  };
  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema<Alert>({
  alertId: { type: String, required: true, unique: true, index: true },
  artisanId: { type: String, required: true, index: true },
  productId: { type: String, index: true },
  type: {
    type: String,
    required: true,
    enum: ['revenue_drop', 'order_spike', 'conversion_drop', 'return_spike', 'seasonal_anomaly', 'threshold_breach'],
    index: true
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'resolved', 'dismissed'],
    default: 'active',
    index: true
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  detectedAt: { type: Date, required: true, index: true },
  resolvedAt: { type: Date },
  dismissedAt: { type: Date },
  metadata: {
    currentValue: { type: Number, required: true },
    expectedValue: { type: Number, required: true },
    deviation: { type: Number, required: true },
    threshold: { type: Number },
    period: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 }
  },
  recommendations: [{ type: String }]
}, {
  timestamps: true,
  collection: 'finance_alerts'
});

export const FinanceAlert = models.FinanceAlert || model<Alert>('FinanceAlert', AlertSchema);

export interface AlertThreshold {
  artisanId: string;
  metric: string;
  operator: 'greater_than' | 'less_than' | 'percent_change';
  value: number;
  period: 'daily' | 'weekly' | 'monthly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export interface AlertSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  inAppNotifications: boolean;
  notificationFrequency: 'immediate' | 'hourly' | 'daily';
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

export interface DetectionResult {
  anomaliesDetected: number;
  alertsGenerated: number;
  processingTime: number;
  lastProcessed: Date;
  errors: string[];
}

export class AnomalyService {
  private static instance: AnomalyService;

  static getInstance(): AnomalyService {
    if (!AnomalyService.instance) {
      AnomalyService.instance = new AnomalyService();
    }
    return AnomalyService.instance;
  }

  /**
   * Detect anomalies for an artisan
   */
  async detectAnomalies(artisanId: string): Promise<DetectionResult> {
    const startTime = Date.now();
    const result: DetectionResult = {
      anomaliesDetected: 0,
      alertsGenerated: 0,
      processingTime: 0,
      lastProcessed: new Date(),
      errors: []
    };

    try {
      // Get recent data for analysis
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      const dailyData = await (SalesAggregate as any).findTimeSeries(
        artisanId,
        'daily',
        startDate,
        endDate
      );

      if (dailyData.length < 7) {
        result.errors.push('Insufficient data for anomaly detection');
        return result;
      }

      // Run different anomaly detection algorithms
      const revenueAnomalies = await this.detectRevenueAnomalies(artisanId, dailyData);
      const orderAnomalies = await this.detectOrderAnomalies(artisanId, dailyData);
      const conversionAnomalies = await this.detectConversionAnomalies(artisanId, dailyData);
      const seasonalAnomalies = await this.detectSeasonalAnomalies(artisanId, dailyData);

      const allAnomalies = [
        ...revenueAnomalies,
        ...orderAnomalies,
        ...conversionAnomalies,
        ...seasonalAnomalies
      ];

      result.anomaliesDetected = allAnomalies.length;

      // Generate alerts for significant anomalies
      for (const anomaly of allAnomalies) {
        if (anomaly.confidence > 0.7) { // Only create alerts for high-confidence anomalies
          await this.createAlert(anomaly);
          result.alertsGenerated++;
        }
      }

      result.processingTime = Date.now() - startTime;
      
    } catch (error) {
      result.errors.push(`Detection failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Detect revenue anomalies using statistical methods
   */
  private async detectRevenueAnomalies(artisanId: string, data: ISalesAggregate[]): Promise<any[]> {
    const anomalies = [];
    const revenues = data.map(d => d.totalRevenue);
    
    // Calculate moving average and standard deviation
    const windowSize = 7; // 7-day window
    const threshold = 2; // 2 standard deviations
    
    for (let i = windowSize; i < revenues.length; i++) {
      const window = revenues.slice(i - windowSize, i);
      const mean = window.reduce((a, b) => a + b, 0) / window.length;
      const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
      const stdDev = Math.sqrt(variance);
      
      const currentValue = revenues[i];
      const zScore = Math.abs((currentValue - mean) / stdDev);
      
      if (zScore > threshold) {
        const isDropping = currentValue < mean;
        anomalies.push({
          artisanId,
          type: isDropping ? 'revenue_drop' : 'revenue_spike',
          severity: this.calculateSeverity(zScore),
          currentValue,
          expectedValue: mean,
          deviation: zScore,
          period: data[i].periodKey,
          confidence: Math.min(zScore / 3, 1), // Normalize to 0-1
          date: data[i].periodStart,
          title: isDropping ? 'Revenue Drop Detected' : 'Revenue Spike Detected',
          description: `Revenue ${isDropping ? 'dropped' : 'spiked'} to ₹${currentValue.toFixed(2)}, expected around ₹${mean.toFixed(2)}`,
          recommendations: isDropping 
            ? ['Review recent marketing campaigns', 'Check for product issues', 'Analyze competitor activity']
            : ['Investigate cause of spike', 'Ensure inventory availability', 'Consider scaling successful strategies']
        });
      }
    }
    
    return anomalies;
  }

  /**
   * Detect order volume anomalies
   */
  private async detectOrderAnomalies(artisanId: string, data: ISalesAggregate[]): Promise<any[]> {
    const anomalies: any[] = [];
    const orders = data.map(d => d.totalOrders);
    
    // Use Interquartile Range (IQR) method for outlier detection
    const sortedOrders = [...orders].sort((a, b) => a - b);
    const q1 = sortedOrders[Math.floor(sortedOrders.length * 0.25)];
    const q3 = sortedOrders[Math.floor(sortedOrders.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    data.forEach((d, index) => {
      const orderCount = d.totalOrders;
      
      if (orderCount < lowerBound || orderCount > upperBound) {
        const isSpike = orderCount > upperBound;
        const expectedRange = `${Math.round(q1)}-${Math.round(q3)}`;
        
        anomalies.push({
          artisanId,
          type: isSpike ? 'order_spike' : 'order_drop',
          severity: this.calculateSeverityFromDeviation(orderCount, q1, q3),
          currentValue: orderCount,
          expectedValue: (q1 + q3) / 2,
          deviation: isSpike ? (orderCount - upperBound) : (lowerBound - orderCount),
          period: d.periodKey,
          confidence: 0.8,
          date: d.periodStart,
          title: isSpike ? 'Order Spike Detected' : 'Order Drop Detected',
          description: `Order count ${isSpike ? 'spiked' : 'dropped'} to ${orderCount}, expected range: ${expectedRange}`,
          recommendations: isSpike
            ? ['Ensure fulfillment capacity', 'Check inventory levels', 'Monitor customer service load']
            : ['Review marketing effectiveness', 'Check website performance', 'Analyze customer feedback']
        });
      }
    });
    
    return anomalies;
  }

  /**
   * Detect conversion rate anomalies
   */
  private async detectConversionAnomalies(artisanId: string, data: ISalesAggregate[]): Promise<any[]> {
    const anomalies: any[] = [];
    
    // Calculate conversion rates (simplified - would need traffic data in production)
    const conversionRates = data.map(d => d.conversionRate || 0).filter(rate => rate > 0);
    
    if (conversionRates.length < 5) return anomalies; // Need sufficient data
    
    const avgConversion = conversionRates.reduce((a, b) => a + b, 0) / conversionRates.length;
    const threshold = avgConversion * 0.3; // 30% deviation threshold
    
    data.forEach(d => {
      if (d.conversionRate && d.conversionRate > 0) {
        const deviation = Math.abs(d.conversionRate - avgConversion);
        
        if (deviation > threshold) {
          const isDrop = d.conversionRate < avgConversion;
          
          anomalies.push({
            artisanId,
            type: 'conversion_drop',
            severity: this.calculateSeverityFromPercent(deviation / avgConversion),
            currentValue: d.conversionRate,
            expectedValue: avgConversion,
            deviation: deviation / avgConversion,
            period: d.periodKey,
            confidence: 0.75,
            date: d.periodStart,
            title: isDrop ? 'Conversion Rate Drop' : 'Conversion Rate Spike',
            description: `Conversion rate ${isDrop ? 'dropped' : 'increased'} to ${d.conversionRate.toFixed(2)}%, expected around ${avgConversion.toFixed(2)}%`,
            recommendations: isDrop
              ? ['Review website user experience', 'Check payment gateway issues', 'Analyze product page performance']
              : ['Identify successful changes', 'Document best practices', 'Consider scaling improvements']
          });
        }
      }
    });
    
    return anomalies;
  }

  /**
   * Detect seasonal anomalies
   */
  private async detectSeasonalAnomalies(artisanId: string, data: ISalesAggregate[]): Promise<any[]> {
    const anomalies: any[] = [];
    
    // Simple seasonal detection based on day of week patterns
    const dayOfWeekRevenue: { [key: number]: number[] } = {};
    
    data.forEach(d => {
      const dayOfWeek = d.periodStart.getDay();
      if (!dayOfWeekRevenue[dayOfWeek]) {
        dayOfWeekRevenue[dayOfWeek] = [];
      }
      dayOfWeekRevenue[dayOfWeek].push(d.totalRevenue);
    });
    
    // Check for unusual patterns
    Object.keys(dayOfWeekRevenue).forEach(day => {
      const revenues = dayOfWeekRevenue[parseInt(day)];
      if (revenues.length >= 3) {
        const avg = revenues.reduce((a, b) => a + b, 0) / revenues.length;
        const recent = revenues[revenues.length - 1];
        const deviation = Math.abs(recent - avg) / avg;
        
        if (deviation > 0.5) { // 50% deviation from seasonal norm
          anomalies.push({
            artisanId,
            type: 'seasonal_anomaly',
            severity: this.calculateSeverityFromPercent(deviation),
            currentValue: recent,
            expectedValue: avg,
            deviation,
            period: data[data.length - 1].periodKey,
            confidence: 0.6,
            date: data[data.length - 1].periodStart,
            title: 'Seasonal Pattern Anomaly',
            description: `Revenue pattern unusual for ${this.getDayName(parseInt(day))}: ₹${recent.toFixed(2)} vs expected ₹${avg.toFixed(2)}`,
            recommendations: ['Review seasonal marketing strategy', 'Check for external factors', 'Analyze competitor seasonal patterns']
          });
        }
      }
    });
    
    return anomalies;
  }

  /**
   * Create an alert from anomaly data
   */
  private async createAlert(anomaly: any): Promise<void> {
    const alertId = `alert_${anomaly.artisanId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert = new FinanceAlert({
      alertId,
      artisanId: anomaly.artisanId,
      productId: anomaly.productId,
      type: anomaly.type,
      severity: anomaly.severity,
      title: anomaly.title,
      description: anomaly.description,
      detectedAt: anomaly.date || new Date(),
      metadata: {
        currentValue: anomaly.currentValue,
        expectedValue: anomaly.expectedValue,
        deviation: anomaly.deviation,
        threshold: anomaly.threshold,
        period: anomaly.period,
        confidence: anomaly.confidence
      },
      recommendations: anomaly.recommendations || []
    });
    
    await alert.save();
  }

  /**
   * Get alerts for an artisan
   */
  async getAlerts(options: {
    artisanId: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    status?: 'active' | 'resolved' | 'dismissed';
    limit: number;
  }): Promise<Alert[]> {
    const query: any = { artisanId: options.artisanId };
    
    if (options.severity) query.severity = options.severity;
    if (options.status) query.status = options.status;
    
    return FinanceAlert.find(query)
      .sort({ detectedAt: -1 })
      .limit(options.limit)
      .exec();
  }

  /**
   * Get alert summary
   */
  async getAlertSummary(artisanId: string): Promise<{
    total: number;
    active: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }> {
    const pipeline = [
      { $match: { artisanId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } }
        }
      }
    ];
    
    const result = await FinanceAlert.aggregate(pipeline);
    
    return result[0] || {
      total: 0,
      active: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
  }

  /**
   * Dismiss an alert
   */
  async dismissAlert(alertId: string): Promise<void> {
    await FinanceAlert.findOneAndUpdate(
      { alertId },
      { 
        status: 'dismissed',
        dismissedAt: new Date()
      }
    );
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    await FinanceAlert.findOneAndUpdate(
      { alertId },
      { 
        status: 'resolved',
        resolvedAt: new Date()
      }
    );
  }

  /**
   * Get thresholds (placeholder - would be stored in database)
   */
  async getThresholds(artisanId: string): Promise<AlertThreshold[]> {
    // In production, this would fetch from a thresholds collection
    return [
      {
        artisanId,
        metric: 'daily_revenue',
        operator: 'less_than',
        value: 1000,
        period: 'daily',
        severity: 'medium',
        enabled: true
      },
      {
        artisanId,
        metric: 'order_count',
        operator: 'less_than',
        value: 5,
        period: 'daily',
        severity: 'low',
        enabled: true
      }
    ];
  }

  /**
   * Update thresholds
   */
  async updateThresholds(artisanId: string, thresholds: AlertThreshold[]): Promise<void> {
    // In production, this would update the thresholds collection
    console.log(`Updating thresholds for artisan ${artisanId}:`, thresholds);
  }

  /**
   * Update alert settings
   */
  async updateAlertSettings(artisanId: string, settings: AlertSettings): Promise<void> {
    // In production, this would update the alert settings collection
    console.log(`Updating alert settings for artisan ${artisanId}:`, settings);
  }

  /**
   * Helper methods
   */
  private calculateSeverity(zScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (zScore > 3) return 'critical';
    if (zScore > 2.5) return 'high';
    if (zScore > 2) return 'medium';
    return 'low';
  }

  private calculateSeverityFromDeviation(value: number, q1: number, q3: number): 'low' | 'medium' | 'high' | 'critical' {
    const iqr = q3 - q1;
    const deviation = Math.max(Math.abs(value - q1), Math.abs(value - q3)) / iqr;
    
    if (deviation > 3) return 'critical';
    if (deviation > 2) return 'high';
    if (deviation > 1.5) return 'medium';
    return 'low';
  }

  private calculateSeverityFromPercent(percent: number): 'low' | 'medium' | 'high' | 'critical' {
    if (percent > 0.8) return 'critical';
    if (percent > 0.6) return 'high';
    if (percent > 0.4) return 'medium';
    return 'low';
  }

  private getDayName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day] || 'Unknown';
  }
}

export default AnomalyService;
