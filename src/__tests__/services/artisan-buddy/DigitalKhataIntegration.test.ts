/**
 * Digital Khata Integration Tests
 * 
 * Tests the integration between Artisan Buddy and Digital Khata services.
 */

import { digitalKhataIntegration } from '@/lib/services/artisan-buddy/DigitalKhataIntegration';
import { responseGenerator } from '@/lib/services/artisan-buddy/ResponseGenerator';

describe('DigitalKhataIntegration', () => {
  const testArtisanId = 'artisan_001';

  describe('getSalesMetrics', () => {
    it('should fetch sales metrics for an artisan', async () => {
      const metrics = await digitalKhataIntegration.getSalesMetrics(testArtisanId, 'month');
      
      expect(metrics).toBeDefined();
      expect(metrics.period).toBe('month');
      expect(metrics.sales).toBeDefined();
      expect(metrics.sales.count).toBeGreaterThanOrEqual(0);
      expect(metrics.sales.revenue).toBeGreaterThanOrEqual(0);
      expect(metrics.topProducts).toBeInstanceOf(Array);
    });

    it('should support different time periods', async () => {
      const weekMetrics = await digitalKhataIntegration.getSalesMetrics(testArtisanId, 'week');
      const monthMetrics = await digitalKhataIntegration.getSalesMetrics(testArtisanId, 'month');
      const yearMetrics = await digitalKhataIntegration.getSalesMetrics(testArtisanId, 'year');
      
      expect(weekMetrics.period).toBe('week');
      expect(monthMetrics.period).toBe('month');
      expect(yearMetrics.period).toBe('year');
    });
  });

  describe('getFinancialInsights', () => {
    it('should generate comprehensive financial insights', async () => {
      const insights = await digitalKhataIntegration.getFinancialInsights(testArtisanId);
      
      expect(insights).toBeDefined();
      expect(insights.salesPerformance).toBeDefined();
      expect(insights.revenueAnalysis).toBeDefined();
      expect(insights.profitability).toBeDefined();
      expect(insights.cashFlow).toBeDefined();
      
      expect(insights.salesPerformance.trend).toMatch(/increasing|decreasing|stable/);
      expect(insights.profitability.recommendations).toBeInstanceOf(Array);
      expect(insights.profitability.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate growth rate correctly', async () => {
      const insights = await digitalKhataIntegration.getFinancialInsights(testArtisanId);
      
      expect(typeof insights.salesPerformance.growthRate).toBe('number');
      expect(insights.salesPerformance.currentMonth).toBeGreaterThanOrEqual(0);
      expect(insights.salesPerformance.previousMonth).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getInventoryInsights', () => {
    it('should provide inventory status and alerts', async () => {
      const inventory = await digitalKhataIntegration.getInventoryInsights(testArtisanId);
      
      expect(inventory).toBeDefined();
      expect(inventory.overview).toBeDefined();
      expect(inventory.alerts).toBeInstanceOf(Array);
      expect(inventory.recommendations).toBeInstanceOf(Array);
      
      expect(inventory.overview.totalProducts).toBeGreaterThanOrEqual(0);
      expect(inventory.overview.lowStockCount).toBeGreaterThanOrEqual(0);
      expect(inventory.overview.outOfStockCount).toBeGreaterThanOrEqual(0);
    });

    it('should generate appropriate alerts for low stock items', async () => {
      const inventory = await digitalKhataIntegration.getInventoryInsights(testArtisanId);
      
      inventory.alerts.forEach(alert => {
        expect(alert.type).toMatch(/low_stock|out_of_stock|overstock/);
        expect(alert.productId).toBeDefined();
        expect(alert.productName).toBeDefined();
        expect(alert.recommendedAction).toBeDefined();
      });
    });
  });

  describe('analyzeSalesTrends', () => {
    it('should analyze sales trends and generate predictions', async () => {
      const trends = await digitalKhataIntegration.analyzeSalesTrends(testArtisanId, 'month');
      
      expect(trends).toBeDefined();
      expect(trends.period).toBe('month');
      expect(trends.trends).toBeInstanceOf(Array);
      expect(trends.insights).toBeDefined();
      expect(trends.predictions).toBeDefined();
      
      expect(trends.insights.bestPerformingDay).toBeDefined();
      expect(trends.insights.worstPerformingDay).toBeDefined();
      expect(trends.predictions.confidence).toBeGreaterThanOrEqual(0);
      expect(trends.predictions.confidence).toBeLessThanOrEqual(100);
    });

    it('should identify peak sales time', async () => {
      const trends = await digitalKhataIntegration.analyzeSalesTrends(testArtisanId, 'month');
      
      expect(trends.insights.peakSalesTime).toBeDefined();
      expect(typeof trends.insights.peakSalesTime).toBe('string');
    });
  });

  describe('getCurrentSalesPerformance', () => {
    it('should fetch current sales performance', async () => {
      const performance = await digitalKhataIntegration.getCurrentSalesPerformance(testArtisanId);
      
      expect(performance).toBeDefined();
      expect(performance.today).toBeGreaterThanOrEqual(0);
      expect(performance.thisWeek).toBeGreaterThanOrEqual(0);
      expect(performance.thisMonth).toBeGreaterThanOrEqual(0);
      expect(performance.thisYear).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getQuickFinancialSummary', () => {
    it('should generate a formatted financial summary', async () => {
      const summary = await digitalKhataIntegration.getQuickFinancialSummary(testArtisanId);
      
      expect(summary).toBeDefined();
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
      
      // Check for key sections
      expect(summary).toContain('Financial Summary');
      expect(summary).toContain('Sales Performance');
      expect(summary).toContain('Inventory Status');
    });

    it('should include currency formatting', async () => {
      const summary = await digitalKhataIntegration.getQuickFinancialSummary(testArtisanId);
      
      // Should contain rupee symbol
      expect(summary).toContain('₹');
    });
  });

  describe('Response Generator Integration', () => {
    it('should format sales metrics for chatbot responses', async () => {
      const insights = await responseGenerator.getDigitalKhataInsights(testArtisanId, 'sales');
      
      expect(insights).toBeDefined();
      expect(typeof insights).toBe('string');
      expect(insights).toContain('Sales Metrics');
    });

    it('should format financial insights for chatbot responses', async () => {
      const insights = await responseGenerator.getDigitalKhataInsights(testArtisanId, 'financial');
      
      expect(insights).toBeDefined();
      expect(insights).toContain('Financial Insights');
      expect(insights).toContain('Sales Performance');
    });

    it('should format inventory insights for chatbot responses', async () => {
      const insights = await responseGenerator.getDigitalKhataInsights(testArtisanId, 'inventory');
      
      expect(insights).toBeDefined();
      expect(insights).toContain('Inventory Status');
    });

    it('should format trend analysis for chatbot responses', async () => {
      const insights = await responseGenerator.getDigitalKhataInsights(testArtisanId, 'trends');
      
      expect(insights).toBeDefined();
      expect(insights).toContain('Sales Trend Analysis');
      expect(insights).toContain('Predictions');
    });

    it('should provide quick summary by default', async () => {
      const insights = await responseGenerator.getDigitalKhataInsights(testArtisanId, 'summary');
      
      expect(insights).toBeDefined();
      expect(insights).toContain('Financial Summary');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid artisan ID gracefully', async () => {
      const invalidId = 'invalid_artisan_id';
      
      // Should not throw, but return appropriate error message or empty data
      await expect(
        digitalKhataIntegration.getQuickFinancialSummary(invalidId)
      ).resolves.toBeDefined();
    });

    it('should handle service failures gracefully', async () => {
      const insights = await responseGenerator.getDigitalKhataInsights('test_artisan', 'sales');
      
      // Should return a string even if data fetch fails
      expect(typeof insights).toBe('string');
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent data across different query types', async () => {
      const salesMetrics = await digitalKhataIntegration.getSalesMetrics(testArtisanId, 'month');
      const insights = await digitalKhataIntegration.getFinancialInsights(testArtisanId);
      
      // Revenue should be consistent
      expect(salesMetrics.sales.revenue).toBe(insights.revenueAnalysis.totalRevenue);
    });

    it('should calculate averages correctly', async () => {
      const salesMetrics = await digitalKhataIntegration.getSalesMetrics(testArtisanId, 'month');
      
      if (salesMetrics.sales.count > 0) {
        const calculatedAverage = salesMetrics.sales.revenue / salesMetrics.sales.count;
        expect(Math.abs(salesMetrics.sales.averageValue - calculatedAverage)).toBeLessThan(1);
      }
    });
  });
});
