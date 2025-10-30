/**
 * Gupshup Configuration Interface and Validation
 * Manages API credentials, endpoints, and service configuration for Gupshup integration
 */

export interface GupshupConfig {
  apiKey: string;
  appId: string;
  baseUrl: string;
  whatsapp: {
    phoneNumberId: string;
    businessAccountId: string;
  };
  sms: {
    senderId: string;
    route: string;
  };
  rateLimit: {
    whatsappPerSecond: number;
    smsPerSecond: number;
    dailyLimit: number;
  };
  webhook: {
    secret: string;
  };
}

export interface GupshupEnvironmentConfig {
  GUPSHUP_API_KEY: string;
  GUPSHUP_APP_ID: string;
  GUPSHUP_BASE_URL: string;
  GUPSHUP_WHATSAPP_PHONE_NUMBER_ID: string;
  GUPSHUP_WHATSAPP_BUSINESS_ACCOUNT_ID: string;
  GUPSHUP_SMS_SENDER_ID: string;
  GUPSHUP_SMS_ROUTE: string;
  GUPSHUP_WHATSAPP_RATE_LIMIT_PER_SECOND: string;
  GUPSHUP_SMS_RATE_LIMIT_PER_SECOND: string;
  GUPSHUP_DAILY_MESSAGE_LIMIT: string;
  GUPSHUP_WEBHOOK_SECRET: string;
}

/**
 * Validation error for Gupshup configuration
 */
export class GupshupConfigError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'GupshupConfigError';
  }
}

/**
 * Validates required environment variables for Gupshup configuration
 */
export function validateGupshupEnvironment(): GupshupEnvironmentConfig {
  const requiredVars = [
    'GUPSHUP_API_KEY',
    'GUPSHUP_APP_ID',
    'GUPSHUP_BASE_URL',
    'GUPSHUP_WHATSAPP_PHONE_NUMBER_ID',
    'GUPSHUP_WHATSAPP_BUSINESS_ACCOUNT_ID',
    'GUPSHUP_SMS_SENDER_ID',
    'GUPSHUP_SMS_ROUTE',
    'GUPSHUP_WHATSAPP_RATE_LIMIT_PER_SECOND',
    'GUPSHUP_SMS_RATE_LIMIT_PER_SECOND',
    'GUPSHUP_DAILY_MESSAGE_LIMIT',
    'GUPSHUP_WEBHOOK_SECRET'
  ] as const;

  const config: Partial<GupshupEnvironmentConfig> = {};
  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value || value.trim() === '' || value === `your-${varName.toLowerCase().replace(/_/g, '-')}-here`) {
      missingVars.push(varName);
    } else {
      config[varName] = value.trim();
    }
  }

  if (missingVars.length > 0) {
    throw new GupshupConfigError(
      `Missing or invalid Gupshup environment variables: ${missingVars.join(', ')}. ` +
      'Please set these variables in your .env file with actual values.'
    );
  }

  return config as GupshupEnvironmentConfig;
}

/**
 * Validates and parses Gupshup configuration from environment variables
 */
export function validateGupshupConfig(): GupshupConfig {
  const env = validateGupshupEnvironment();

  // Validate API key format (basic validation)
  if (env.GUPSHUP_API_KEY.length < 10) {
    throw new GupshupConfigError('GUPSHUP_API_KEY appears to be invalid (too short)', 'apiKey');
  }

  // Validate base URL format
  try {
    new URL(env.GUPSHUP_BASE_URL);
  } catch {
    throw new GupshupConfigError('GUPSHUP_BASE_URL is not a valid URL', 'baseUrl');
  }

  // Validate rate limits are positive numbers
  const whatsappRateLimit = parseInt(env.GUPSHUP_WHATSAPP_RATE_LIMIT_PER_SECOND, 10);
  const smsRateLimit = parseInt(env.GUPSHUP_SMS_RATE_LIMIT_PER_SECOND, 10);
  const dailyLimit = parseInt(env.GUPSHUP_DAILY_MESSAGE_LIMIT, 10);

  if (isNaN(whatsappRateLimit) || whatsappRateLimit <= 0) {
    throw new GupshupConfigError('GUPSHUP_WHATSAPP_RATE_LIMIT_PER_SECOND must be a positive number', 'rateLimit.whatsappPerSecond');
  }

  if (isNaN(smsRateLimit) || smsRateLimit <= 0) {
    throw new GupshupConfigError('GUPSHUP_SMS_RATE_LIMIT_PER_SECOND must be a positive number', 'rateLimit.smsPerSecond');
  }

  if (isNaN(dailyLimit) || dailyLimit <= 0) {
    throw new GupshupConfigError('GUPSHUP_DAILY_MESSAGE_LIMIT must be a positive number', 'rateLimit.dailyLimit');
  }

  // Validate SMS sender ID (alphanumeric, 6 chars max for India)
  if (!/^[A-Z0-9]{1,6}$/.test(env.GUPSHUP_SMS_SENDER_ID)) {
    throw new GupshupConfigError('GUPSHUP_SMS_SENDER_ID must be 1-6 alphanumeric characters (uppercase)', 'sms.senderId');
  }

  // Validate SMS route
  const smsRoute = parseInt(env.GUPSHUP_SMS_ROUTE, 10);
  if (isNaN(smsRoute) || smsRoute < 1 || smsRoute > 4) {
    throw new GupshupConfigError('GUPSHUP_SMS_ROUTE must be a number between 1-4', 'sms.route');
  }

  return {
    apiKey: env.GUPSHUP_API_KEY,
    appId: env.GUPSHUP_APP_ID,
    baseUrl: env.GUPSHUP_BASE_URL,
    whatsapp: {
      phoneNumberId: env.GUPSHUP_WHATSAPP_PHONE_NUMBER_ID,
      businessAccountId: env.GUPSHUP_WHATSAPP_BUSINESS_ACCOUNT_ID,
    },
    sms: {
      senderId: env.GUPSHUP_SMS_SENDER_ID,
      route: env.GUPSHUP_SMS_ROUTE,
    },
    rateLimit: {
      whatsappPerSecond: whatsappRateLimit,
      smsPerSecond: smsRateLimit,
      dailyLimit: dailyLimit,
    },
    webhook: {
      secret: env.GUPSHUP_WEBHOOK_SECRET,
    },
  };
}

/**
 * Gets validated Gupshup configuration with caching
 */
let cachedConfig: GupshupConfig | null = null;

export function getGupshupConfig(): GupshupConfig {
  if (!cachedConfig) {
    cachedConfig = validateGupshupConfig();
  }
  return cachedConfig;
}

/**
 * Clears the cached configuration (useful for testing)
 */
export function clearGupshupConfigCache(): void {
  cachedConfig = null;
}

/**
 * Default configuration values for development/testing
 */
export const DEFAULT_GUPSHUP_CONFIG: Partial<GupshupConfig> = {
  baseUrl: 'https://api.gupshup.io/sm/api/v1',
  sms: {
    senderId: 'KALASARTHI',
    route: '1',
  },
  rateLimit: {
    whatsappPerSecond: 10,
    smsPerSecond: 100,
    dailyLimit: 10000,
  },
};