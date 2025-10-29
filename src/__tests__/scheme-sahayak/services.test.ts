/**
 * Basic tests for Scheme Sahayak services
 * Tests core functionality and service initialization
 */

import { 
  getUserService, 
  getSchemeService,
  initializeSchemeSahayakServices,
  SCHEME_SAHAYAK_CONFIG
} from '../../lib/services/scheme-sahayak';

// Mock Firebase to avoid actual database calls in tests
jest.mock('../../lib/firebase', () => ({
  db: {},
  auth: {},
  storage: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 })),
  writeBatch: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn()
  }))
}));

describe('Scheme Sahayak Services', () => {
  describe('Service Initialization', () => {
    test('should initialize services successfully', async () => {
      const result = await initializeSchemeSahayakServices();
      
      expect(result.success).toBe(true);
      expect(result.services).toContain('UserService');
      expect(result.services).toContain('SchemeService');
      expect(result.message).toContain('successfully');
    });

    test('should return service configuration', () => {
      expect(SCHEME_SAHAYAK_CONFIG.version).toBe('2.0.0');
      expect(SCHEME_SAHAYAK_CONFIG.services).toHaveProperty('userService');
      expect(SCHEME_SAHAYAK_CONFIG.services).toHaveProperty('schemeService');
    });
  });

  describe('UserService', () => {
    let userService: ReturnType<typeof getUserService>;

    beforeEach(() => {
      userService = getUserService();
    });

    test('should create UserService instance', () => {
      expect(userService).toBeDefined();
      expect(userService.constructor.name).toBe('UserService');
    });

    test('should validate artisan ID', () => {
      expect(() => {
        (userService as any).validateArtisanId('');
      }).toThrow('Invalid artisan ID provided');

      expect(() => {
        (userService as any).validateArtisanId(null);
      }).toThrow('Invalid artisan ID provided');

      expect(() => {
        (userService as any).validateArtisanId('valid-id');
      }).not.toThrow();
    });

    test('should perform health check', async () => {
      const healthCheck = await userService.healthCheck();
      
      expect(healthCheck).toHaveProperty('service', 'UserService');
      expect(healthCheck).toHaveProperty('status');
      expect(healthCheck).toHaveProperty('timestamp');
    });

    test('should get service metrics', () => {
      const metrics = userService.getMetrics();
      
      expect(metrics).toHaveProperty('service', 'UserService');
      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('timestamp');
    });
  });

  describe('SchemeService', () => {
    let schemeService: ReturnType<typeof getSchemeService>;

    beforeEach(() => {
      schemeService = getSchemeService();
    });

    test('should create SchemeService instance', () => {
      expect(schemeService).toBeDefined();
      expect(schemeService.constructor.name).toBe('SchemeService');
    });

    test('should validate scheme ID', () => {
      expect(() => {
        (schemeService as any).validateSchemeId('');
      }).toThrow('Invalid scheme ID provided');

      expect(() => {
        (schemeService as any).validateSchemeId(null);
      }).toThrow('Invalid scheme ID provided');

      expect(() => {
        (schemeService as any).validateSchemeId('valid-scheme-id');
      }).not.toThrow();
    });

    test('should perform health check', async () => {
      const healthCheck = await schemeService.healthCheck();
      
      expect(healthCheck).toHaveProperty('service', 'SchemeService');
      expect(healthCheck).toHaveProperty('status');
      expect(healthCheck).toHaveProperty('timestamp');
    });

    test('should sanitize input', () => {
      const sanitized = (schemeService as any).sanitizeInput('<script>alert("test")</script>');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
    });
  });

  describe('Error Handling', () => {
    test('should create standardized error responses', () => {
      const userService = getUserService();
      const error = (userService as any).createError(
        'VALIDATION_ERROR',
        'TEST_ERROR',
        'Test error message',
        { detail: 'test' },
        ['Try again']
      );

      expect(error).toHaveProperty('error');
      expect(error.error).toHaveProperty('type', 'VALIDATION_ERROR');
      expect(error.error).toHaveProperty('code', 'TEST_ERROR');
      expect(error.error).toHaveProperty('message', 'Test error message');
      expect(error.error).toHaveProperty('suggestedActions');
      expect(error.error.suggestedActions).toContain('Try again');
    });

    test('should create success responses', () => {
      const userService = getUserService();
      const response = (userService as any).createSuccessResponse(
        { test: 'data' },
        100
      );

      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('data', { test: 'data' });
      expect(response).toHaveProperty('metadata');
      expect(response.metadata).toHaveProperty('processingTime', 100);
      expect(response.metadata).toHaveProperty('version', '2.0');
    });
  });

  describe('Input Validation', () => {
    let userService: ReturnType<typeof getUserService>;

    beforeEach(() => {
      userService = getUserService();
    });

    test('should validate required parameters', () => {
      const params = { name: 'test', email: 'test@example.com' };
      const required = ['name', 'email', 'phone'];

      expect(() => {
        (userService as any).validateRequired(params, required);
      }).toThrow('Missing required parameters: phone');

      expect(() => {
        (userService as any).validateRequired({ ...params, phone: '123456789' }, required);
      }).not.toThrow();
    });

    test('should validate date ranges', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 86400000); // 1 day ago
      const future = new Date(now.getTime() + 86400000); // 1 day from now

      expect(() => {
        (userService as any).validateDateRange(now, past);
      }).toThrow('Start date must be before end date');

      expect(() => {
        (userService as any).validateDateRange(future, now);
      }).toThrow('Start date cannot be in the future');

      expect(() => {
        (userService as any).validateDateRange(past, now);
      }).not.toThrow();
    });
  });
});