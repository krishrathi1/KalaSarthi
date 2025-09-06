/**
 * Unit Tests for LoanEligibilityService
 */

import { LoanEligibilityService } from '../../lib/service/LoanEligibilityService';

// Mock the database connection
jest.mock('../../lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn()
}));

// Mock the models
jest.mock('../../lib/models/SalesAggregate', () => ({
  SalesAggregate: {
    find: jest.fn()
  }
}));

jest.mock('../../lib/models/LoanApplication', () => ({
  LoanApplication: {
    findOne: jest.fn()
  }
}));

describe('LoanEligibilityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateEligibilityScore', () => {
    it('should return error for insufficient financial history', async () => {
      // Mock empty financial history
      const mockSalesAggregate = require('../../lib/models/SalesAggregate').SalesAggregate;
      mockSalesAggregate.find.mockResolvedValue([]);

      const result = await LoanEligibilityService.calculateEligibilityScore(
        'user123',
        100000,
        12
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient financial history');
    });

    it('should calculate eligibility score for valid data', async () => {
      // Mock financial history data
      const mockSalesAggregate = require('../../lib/models/SalesAggregate').SalesAggregate;
      const mockLoanApplication = require('../../lib/models/LoanApplication').LoanApplication;

      const mockAggregates = [
        {
          totalRevenue: 50000,
          totalOrders: 100,
          averageOrderValue: 500,
          periodStart: new Date('2024-01-01'),
          periodEnd: new Date('2024-01-31')
        },
        {
          totalRevenue: 60000,
          totalOrders: 120,
          averageOrderValue: 500,
          periodStart: new Date('2024-02-01'),
          periodEnd: new Date('2024-02-29')
        }
      ];

      mockSalesAggregate.find.mockResolvedValue(mockAggregates);
      mockLoanApplication.findOne.mockResolvedValue({
        businessInfo: {
          businessType: 'retail',
          annualTurnover: 600000,
          businessExperience: 3
        }
      });

      const result = await LoanEligibilityService.calculateEligibilityScore(
        'user123',
        100000,
        12
      );

      expect(result.success).toBe(true);
      expect(result.score).toBeDefined();
      expect(result.score!.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.score!.overallScore).toBeLessThanOrEqual(100);
    });

    it('should handle database errors gracefully', async () => {
      const mockSalesAggregate = require('../../lib/models/SalesAggregate').SalesAggregate;
      mockSalesAggregate.find.mockRejectedValue(new Error('Database connection failed'));

      const result = await LoanEligibilityService.calculateEligibilityScore(
        'user123',
        100000,
        12
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });
  });

  describe('getEligibilitySummary', () => {
    it('should return eligibility summary for user with data', async () => {
      const mockSalesAggregate = require('../../lib/models/SalesAggregate').SalesAggregate;

      const mockAggregates = [
        {
          totalRevenue: 75000,
          totalOrders: 150,
          averageOrderValue: 500,
          periodStart: new Date('2024-01-01'),
          periodEnd: new Date('2024-01-31')
        }
      ];

      mockSalesAggregate.find.mockResolvedValue(mockAggregates);

      const result = await LoanEligibilityService.getEligibilitySummary('user123');

      expect(result.eligible).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.maxLoanAmount).toBeDefined();
    });

    it('should return ineligible for user without data', async () => {
      const mockSalesAggregate = require('../../lib/models/SalesAggregate').SalesAggregate;
      mockSalesAggregate.find.mockResolvedValue([]);

      const result = await LoanEligibilityService.getEligibilitySummary('user123');

      expect(result.eligible).toBe(false);
      expect(result.score).toBe(0);
    });
  });
});