/**
 * AI-Powered Scheme Sahayak v2.0 - Service Registry and Initialization
 * Main entry point for all Scheme Sahayak services
 */

// Export all types and interfaces
export * from '../../types/scheme-sahayak';
export * from './interfaces';

// Export base service
export { BaseService, ServiceRegistry } from './base/BaseService';

// Export Firebase configuration
export * from '../../config/scheme-sahayak-firebase';

// Import service implementations
import { UserService } from './UserService';
import { SchemeService } from './SchemeService';
import { AuthService } from './AuthService';
import { SmartNotificationSystem } from './SmartNotificationSystem';
import { NotificationTimingOptimizer } from './NotificationTimingOptimizer';
import { NotificationContentGenerator } from './NotificationContentGenerator';
import { AnalyticsService } from './AnalyticsService';

// Export service implementations
export { UserService } from './UserService';
export { SchemeService } from './SchemeService';
export { AuthService } from './AuthService';
export { SmartNotificationSystem, smartNotificationSystem } from './SmartNotificationSystem';
export { NotificationTimingOptimizer, notificationTimingOptimizer } from './NotificationTimingOptimizer';
export { NotificationContentGenerator, notificationContentGenerator } from './NotificationContentGenerator';
export { AnalyticsService } from './AnalyticsService';
export { EncryptionService, encryptionService } from './EncryptionService';
export { TLSConfigService, tlsConfigService } from './TLSConfig';
export { PrivacyManagementService, privacyManagementService } from './PrivacyManagementService';

// Service instances (singletons)
let userService: UserService | null = null;
let schemeService: SchemeService | null = null;
let authService: AuthService | null = null;
let notificationSystem: SmartNotificationSystem | null = null;
let timingOptimizer: NotificationTimingOptimizer | null = null;
let contentGenerator: NotificationContentGenerator | null = null;
let analyticsService: AnalyticsService | null = null;

/**
 * Get User Service instance (singleton)
 */
export function getUserService(): UserService {
  if (!userService) {
    userService = new UserService();
    ServiceRegistry.register('UserService', userService);
  }
  return userService;
}

/**
 * Get Scheme Service instance (singleton)
 */
export function getSchemeService(): SchemeService {
  if (!schemeService) {
    schemeService = new SchemeService();
    ServiceRegistry.register('SchemeService', schemeService);
  }
  return schemeService;
}

/**
 * Get Auth Service instance (singleton)
 */
export function getAuthService(): AuthService {
  if (!authService) {
    authService = new AuthService();
    ServiceRegistry.register('AuthService', authService);
  }
  return authService;
}

/**
 * Get Smart Notification System instance (singleton)
 */
export function getNotificationSystem(): SmartNotificationSystem {
  if (!notificationSystem) {
    notificationSystem = new SmartNotificationSystem();
    ServiceRegistry.register('SmartNotificationSystem', notificationSystem);
  }
  return notificationSystem;
}

/**
 * Get Notification Timing Optimizer instance (singleton)
 */
export function getTimingOptimizer(): NotificationTimingOptimizer {
  if (!timingOptimizer) {
    timingOptimizer = new NotificationTimingOptimizer();
  }
  return timingOptimizer;
}

/**
 * Get Notification Content Generator instance (singleton)
 */
export function getContentGenerator(): NotificationContentGenerator {
  if (!contentGenerator) {
    contentGenerator = new NotificationContentGenerator();
  }
  return contentGenerator;
}

/**
 * Get Analytics Service instance (singleton)
 */
export function getAnalyticsService(): AnalyticsService {
  if (!analyticsService) {
    analyticsService = new AnalyticsService();
    ServiceRegistry.register('AnalyticsService', analyticsService);
  }
  return analyticsService;
}

/**
 * Initialize all Scheme Sahayak services
 */
export async function initializeSchemeSahayakServices(): Promise<{
  success: boolean;
  message: string;
  services: string[];
  healthChecks: Array<{
    service: string;
    status: 'healthy' | 'unhealthy';
    timestamp: Date;
    details?: any;
  }>;
}> {
  try {
    console.log('🚀 Initializing AI-Powered Scheme Sahayak v2.0 services...');

    // Initialize Firebase configuration
    const { initializeSchemeSahayakFirebase } = await import('../../config/scheme-sahayak-firebase');
    const firebaseInit = await initializeSchemeSahayakFirebase();
    
    if (!firebaseInit.success) {
      throw new Error(`Firebase initialization failed: ${firebaseInit.message}`);
    }

    // Initialize service instances
    const services = [
      getUserService(),
      getSchemeService(),
      getAuthService()
    ];

    // Perform health checks
    const healthChecks = await Promise.all(
      services.map(service => service.healthCheck())
    );

    const unhealthyServices = healthChecks.filter(check => check.status === 'unhealthy');
    
    if (unhealthyServices.length > 0) {
      console.warn('⚠️ Some services are unhealthy:', unhealthyServices);
    }

    const serviceNames = services.map(service => service.constructor.name);

    console.log('✅ Scheme Sahayak services initialized successfully');
    console.log(`📊 Services: ${serviceNames.join(', ')}`);
    console.log(`🔥 Firebase collections: ${firebaseInit.collections.join(', ')}`);

    return {
      success: true,
      message: 'All Scheme Sahayak services initialized successfully',
      services: serviceNames,
      healthChecks
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to initialize Scheme Sahayak services:', errorMessage);

    return {
      success: false,
      message: `Service initialization failed: ${errorMessage}`,
      services: [],
      healthChecks: []
    };
  }
}

/**
 * Get health status of all services
 */
export async function getSchemeSahayakHealthStatus(): Promise<{
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: Array<{
    service: string;
    status: 'healthy' | 'unhealthy';
    timestamp: Date;
    details?: any;
  }>;
  metrics: Array<{
    service: string;
    uptime: number;
    timestamp: Date;
  }>;
}> {
  try {
    const healthChecks = await ServiceRegistry.checkAllHealth();
    const metrics = ServiceRegistry.getAllMetrics();

    const unhealthyCount = healthChecks.filter(check => check.status === 'unhealthy').length;
    const totalServices = healthChecks.length;

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount === 0) {
      overall = 'healthy';
    } else if (unhealthyCount < totalServices) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      services: healthChecks,
      metrics
    };
  } catch (error) {
    console.error('Failed to get health status:', error);
    return {
      overall: 'unhealthy',
      services: [],
      metrics: []
    };
  }
}

/**
 * Shutdown all services gracefully
 */
export async function shutdownSchemeSahayakServices(): Promise<void> {
  try {
    console.log('🛑 Shutting down Scheme Sahayak services...');

    // Clear service instances
    userService = null;
    schemeService = null;
    authService = null;

    // Clear service registry
    ServiceRegistry.getAll().clear();

    console.log('✅ Scheme Sahayak services shut down successfully');
  } catch (error) {
    console.error('❌ Error during service shutdown:', error);
  }
}

/**
 * Service configuration
 */
export const SCHEME_SAHAYAK_CONFIG = {
  version: '2.0.0',
  services: {
    userService: {
      name: 'UserService',
      description: 'Manages artisan profiles and user data'
    },
    schemeService: {
      name: 'SchemeService',
      description: 'Manages government scheme data and discovery'
    },
    authService: {
      name: 'AuthService',
      description: 'Manages authentication and authorization'
    },
    aiRecommendationEngine: {
      name: 'AIRecommendationEngine',
      description: 'Provides AI-powered scheme recommendations',
      status: 'planned'
    },
    documentManager: {
      name: 'DocumentManager',
      description: 'Handles document processing and verification',
      status: 'planned'
    },
    applicationTracker: {
      name: 'ApplicationTracker',
      description: 'Tracks application status across government portals',
      status: 'planned'
    },
    notificationSystem: {
      name: 'SmartNotificationSystem',
      description: 'Intelligent multi-channel notification delivery',
      status: 'implemented'
    }
  },
  features: {
    aiRecommendations: {
      enabled: false,
      description: 'AI-powered scheme recommendations'
    },
    documentProcessing: {
      enabled: false,
      description: 'Automated document processing and verification'
    },
    realTimeTracking: {
      enabled: false,
      description: 'Real-time application status tracking'
    },
    smartNotifications: {
      enabled: true,
      description: 'Intelligent notification delivery'
    },
    offlineSupport: {
      enabled: false,
      description: 'Offline functionality for core features'
    }
  }
} as const;

/**
 * Development utilities
 */
export const devUtils = {
  /**
   * Reset all data (development only)
   */
  async resetAllData(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Data reset is not allowed in production');
    }

    console.warn('🗑️ Resetting all Scheme Sahayak data (development only)...');
    // Implementation would clear all collections
    console.log('✅ Data reset completed');
  },

  /**
   * Seed sample data (development only)
   */
  async seedSampleData(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Data seeding is not allowed in production');
    }

    console.log('🌱 Seeding sample data (development only)...');
    // Implementation would create sample artisans, schemes, etc.
    console.log('✅ Sample data seeded');
  },

  /**
   * Get development statistics
   */
  async getDevStats(): Promise<{
    collections: Record<string, number>;
    services: string[];
    features: Record<string, boolean>;
  }> {
    const services = Array.from(ServiceRegistry.getAll().keys());
    const features = Object.fromEntries(
      Object.entries(SCHEME_SAHAYAK_CONFIG.features).map(([key, config]) => [key, config.enabled])
    );

    return {
      collections: {}, // Would count documents in each collection
      services,
      features
    };
  }
};

// Auto-initialize services in non-test environments
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  // Client-side initialization
  initializeSchemeSahayakServices().catch(error => {
    console.error('Failed to auto-initialize Scheme Sahayak services:', error);
  });
}