/**
 * Gupshup Configuration Management
 * Validates and provides type-safe access to Gupshup environment variables
 */

export interface GupshupConfig {
  // API Configuration
  apiKey: string;
  appId: string;
  baseUrl: string;
  
  // WhatsApp Configuration
  whatsapp: {
    phoneNumberId: string;
    businessAccountId: string;
  };
  
  // SMS Configuration
  sms: {
    senderId: string;
    route: string;
  };
  
  // Rate Limiting
  rateLimit: {
    whatsappPerSecond: number;
    smsPerSecond: number;
    dailyLimit: number;
    monthlyLimit: number;
  };
  
  // Webhook Configuration
  webhook: {
    secret: string;
    url: string;
    timeout: number;
  };
  
  // Template Configuration
  template: {
    defaultLanguage: string;
    fallbackLanguage: string;
    cacheTtl: number;
  };
  
  // Retry Configuration
  retry: {
    maxRetries: number;
    delayMs: number;
    backoffMultiplier: number;
  };
  
  // Cost Monitoring
  cost: {
    alertThreshold: number;
    dailyLimit: number;
    whatsappCostPerMessage: number;
    smsCostPerMessage: number;
  };
  
  // Environment
  environment: 'development' | 'production';
  debugMode: boolean;
}

/**
 * Validates that all required environment variables are set
 */
function validateRequiredEnvVars(): void {
  const required = [
    'GUPSHUP_API_KEY',
    'GUPSHUP_APP_ID',
    'GUPSHUP_WHATSAPP_PHONE_NUMBER_ID',
    'GUPSHUP_WHATSAPP_BUSINESS_ACCOUNT_ID',
    'GUPSHUP_WEBHOOK_SECRET',
    'GUPSHUP_WEBHOOK_URL'
  ];
  
  const missing = required.filter(key => !process.env[key] || process.env[key]?.includes('REPLACE_WITH'));
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required Gupshup environment variables: ${missing.join(', ')}\n` +
      'Please update your .env file with actual Gupshup credentials.\n' +
      'See .env.production.example for configuration instructions.'
    );
  }
}

/**
 * Validates webhook secret security requirements
 */
function validateWebhookSecurity(): void {
  const secret = process.env.GUPSHUP_WEBHOOK_SECRET;
  
  if (!secret || secret.length < 32) {
    throw new Error(
      'GUPSHUP_WEBHOOK_SECRET must be at least 32 characters long for security.\n' +
      'Generate a secure secret using: openssl rand -hex 32'
    );
  }
  
  if (secret.includes('REPLACE_WITH') || secret === 'your-webhook-secret-here') {
    throw new Error(
      'GUPSHUP_WEBHOOK_SECRET contains placeholder value. Please set a secure random string.'
    );
  }
}

/**
 * Validates production environment configuration
 */
function validateProductionConfig(): void {
  if (process.env.NODE_ENV === 'production') {
    const webhookUrl = process.env.GUPSHUP_WEBHOOK_URL;
    
    if (!webhookUrl || webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
      throw new Error(
        'Production environment requires a public GUPSHUP_WEBHOOK_URL. ' +
        'Localhost URLs will not work in production.'
      );
    }
    
    if (!webhookUrl.startsWith('https://')) {
      throw new Error(
        'GUPSHUP_WEBHOOK_URL must use HTTPS in production for security.'
      );
    }
  }
}

/**
 * Gets validated Gupshup configuration
 */
export function getGupshupConfig(): GupshupConfig {
  // Validate environment variables
  validateRequiredEnvVars();
  validateWebhookSecurity();
  validateProductionConfig();
  
  return {
    apiKey: process.env.GUPSHUP_API_KEY!,
    appId: process.env.GUPSHUP_APP_ID!,
    baseUrl: process.env.GUPSHUP_BASE_URL || 'https://api.gupshup.io/sm/api/v1',
    
    whatsapp: {
      phoneNumberId: process.env.GUPSHUP_WHATSAPP_PHONE_NUMBER_ID!,
      businessAccountId: process.env.GUPSHUP_WHATSAPP_BUSINESS_ACCOUNT_ID!,
    },
    
    sms: {
      senderId: process.env.GUPSHUP_SMS_SENDER_ID || 'KALASARTHI',
      route: process.env.GUPSHUP_SMS_ROUTE || '1',
    },
    
    rateLimit: {
      whatsappPerSecond: parseInt(process.env.GUPSHUP_WHATSAPP_RATE_LIMIT_PER_SECOND || '20'),
      smsPerSecond: parseInt(process.env.GUPSHUP_SMS_RATE_LIMIT_PER_SECOND || '200'),
      dailyLimit: parseInt(process.env.GUPSHUP_DAILY_MESSAGE_LIMIT || '50000'),
      monthlyLimit: parseInt(process.env.GUPSHUP_MONTHLY_MESSAGE_LIMIT || '1000000'),
    },
    
    webhook: {
      secret: process.env.GUPSHUP_WEBHOOK_SECRET!,
      url: process.env.GUPSHUP_WEBHOOK_URL!,
      timeout: parseInt(process.env.GUPSHUP_WEBHOOK_TIMEOUT || '30000'),
    },
    
    template: {
      defaultLanguage: process.env.GUPSHUP_DEFAULT_LANGUAGE || 'hi',
      fallbackLanguage: process.env.GUPSHUP_FALLBACK_LANGUAGE || 'en',
      cacheTtl: parseInt(process.env.GUPSHUP_TEMPLATE_CACHE_TTL || '86400'),
    },
    
    retry: {
      maxRetries: parseInt(process.env.GUPSHUP_MAX_RETRIES || '3'),
      delayMs: parseInt(process.env.GUPSHUP_RETRY_DELAY_MS || '1000'),
      backoffMultiplier: parseInt(process.env.GUPSHUP_RETRY_BACKOFF_MULTIPLIER || '2'),
    },
    
    cost: {
      alertThreshold: parseFloat(process.env.GUPSHUP_COST_ALERT_THRESHOLD || '5000'),
      dailyLimit: parseFloat(process.env.GUPSHUP_DAILY_COST_LIMIT || '1000'),
      whatsappCostPerMessage: parseFloat(process.env.GUPSHUP_WHATSAPP_COST_PER_MESSAGE || '0.05'),
      smsCostPerMessage: parseFloat(process.env.GUPSHUP_SMS_COST_PER_MESSAGE || '0.02'),
    },
    
    environment: (process.env.GUPSHUP_ENVIRONMENT as 'development' | 'production') || 'development',
    debugMode: process.env.GUPSHUP_DEBUG_MODE === 'true',
  };
}

/**
 * Validates configuration without throwing errors
 * Returns validation results for health checks
 */
export function validateGupshupConfig(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    validateRequiredEnvVars();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown validation error');
  }
  
  try {
    validateWebhookSecurity();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown webhook validation error');
  }
  
  try {
    validateProductionConfig();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown production validation error');
  }
  
  // Check for warnings
  const dailyLimit = parseInt(process.env.GUPSHUP_DAILY_MESSAGE_LIMIT || '0');
  if (dailyLimit > 100000) {
    warnings.push('Daily message limit is very high. Monitor costs carefully.');
  }
  
  const costLimit = parseFloat(process.env.GUPSHUP_DAILY_COST_LIMIT || '0');
  if (costLimit > 10000) {
    warnings.push('Daily cost limit is high. Ensure proper monitoring is in place.');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Gets configuration summary for logging (without sensitive data)
 */
export function getConfigSummary(): Record<string, any> {
  try {
    const config = getGupshupConfig();
    return {
      environment: config.environment,
      debugMode: config.debugMode,
      baseUrl: config.baseUrl,
      rateLimit: config.rateLimit,
      template: config.template,
      retry: config.retry,
      webhookConfigured: !!config.webhook.url,
      apiKeyConfigured: !!config.apiKey,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Configuration error',
    };
  }
}