/**
 * Encryption Service for AI-Powered Scheme Sahayak v2.0
 * Implements AES-256 encryption for sensitive data at rest
 * Requirements: 9.1, 9.2
 */

import { BaseService } from './base/BaseService';
import * as crypto from 'crypto';

/**
 * Encryption configuration
 */
interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  iterations: number;
  digest: string;
}

/**
 * Encrypted data structure
 */
interface EncryptedData {
  encrypted: string;
  iv: string;
  salt: string;
  tag?: string;
}

/**
 * Field-level encryption metadata
 */
interface FieldEncryptionMetadata {
  field: string;
  encrypted: boolean;
  algorithm: string;
  timestamp: Date;
}

/**
 * Encryption Service Implementation
 * Provides AES-256-GCM encryption for sensitive data
 */
export class EncryptionService extends BaseService {
  private config: EncryptionConfig;
  private masterKey: Buffer | null = null;

  // PII fields that require encryption
  private readonly PII_FIELDS = [
    'aadhaarHash',
    'panNumber',
    'phone',
    'email',
    'address',
    'bankDetails',
    'accountNumber',
    'ifscCode'
  ];

  // Sensitive fields that require encryption
  private readonly SENSITIVE_FIELDS = [
    'income',
    'monthlyIncome',
    'financialData',
    'taxDetails',
    'creditScore'
  ];

  constructor() {
    super('EncryptionService');

    this.config = {
      algorithm: 'aes-256-gcm',
      keyLength: 32, // 256 bits
      ivLength: 16, // 128 bits
      saltLength: 64,
      iterations: 100000,
      digest: 'sha512'
    };

    this.initializeMasterKey();
  }

  /**
   * Initialize master encryption key from environment
   */
  private initializeMasterKey(): void {
    const masterKeyEnv = process.env.ENCRYPTION_MASTER_KEY;

    if (!masterKeyEnv) {
      this.log('warn', 'ENCRYPTION_MASTER_KEY not set in environment. Using default key for development only.');
      // In production, this should throw an error
      // For development, generate a temporary key
      this.masterKey = crypto.randomBytes(this.config.keyLength);
      return;
    }

    try {
      // Master key should be base64 encoded in environment
      this.masterKey = Buffer.from(masterKeyEnv, 'base64');

      if (this.masterKey.length !== this.config.keyLength) {
        throw new Error(`Master key must be ${this.config.keyLength} bytes`);
      }

      this.log('info', 'Master encryption key initialized successfully');
    } catch (error) {
      this.log('error', 'Failed to initialize master key', error);
      throw new Error('Invalid encryption master key configuration');
    }
  }

  /**
   * Derive encryption key from master key and salt
   */
  private deriveKey(salt: Buffer): Buffer {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    return crypto.pbkdf2Sync(
      this.masterKey,
      salt,
      this.config.iterations,
      this.config.keyLength,
      this.config.digest
    );
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  async encrypt(data: string): Promise<EncryptedData> {
    return this.handleAsync(async () => {
      if (!data || typeof data !== 'string') {
        throw new Error('Data must be a non-empty string');
      }

      // Generate random salt and IV
      const salt = crypto.randomBytes(this.config.saltLength);
      const iv = crypto.randomBytes(this.config.ivLength);

      // Derive encryption key
      const key = this.deriveKey(salt);

      // Create cipher
      const cipher = crypto.createCipheriv(this.config.algorithm, key, iv);

      // Encrypt data
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get authentication tag for GCM mode
      const tag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('base64'),
        salt: salt.toString('base64'),
        tag: tag.toString('base64')
      };
    }, 'Failed to encrypt data', 'ENCRYPTION_FAILED');
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  async decrypt(encryptedData: EncryptedData): Promise<string> {
    return this.handleAsync(async () => {
      if (!encryptedData || !encryptedData.encrypted || !encryptedData.iv || !encryptedData.salt) {
        throw new Error('Invalid encrypted data structure');
      }

      // Convert from base64
      const salt = Buffer.from(encryptedData.salt, 'base64');
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const tag = encryptedData.tag ? Buffer.from(encryptedData.tag, 'base64') : undefined;

      // Derive decryption key
      const key = this.deriveKey(salt);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.config.algorithm, key, iv);

      // Set authentication tag for GCM mode
      if (tag) {
        decipher.setAuthTag(tag);
      }

      // Decrypt data
      let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    }, 'Failed to decrypt data', 'DECRYPTION_FAILED');
  }

  /**
   * Encrypt multiple fields in an object
   */
  async encryptFields<T extends Record<string, any>>(
    data: T,
    fieldsToEncrypt?: string[]
  ): Promise<T> {
    return this.handleAsync(async () => {
      const fields = fieldsToEncrypt || this.getAllEncryptableFields();
      const result = { ...data };

      for (const field of fields) {
        const value = this.getNestedValue(result, field);

        if (value !== undefined && value !== null) {
          const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
          const encrypted = await this.encrypt(stringValue);

          // Store encrypted data with metadata
          this.setNestedValue(result, field, {
            _encrypted: true,
            _data: encrypted,
            _field: field,
            _timestamp: new Date().toISOString()
          });
        }
      }

      return result;
    }, 'Failed to encrypt fields', 'FIELD_ENCRYPTION_FAILED');
  }

  /**
   * Decrypt multiple fields in an object
   */
  async decryptFields<T extends Record<string, any>>(data: T): Promise<T> {
    return this.handleAsync(async () => {
      const result = { ...data };

      // Recursively find and decrypt encrypted fields
      await this.decryptNestedFields(result);

      return result;
    }, 'Failed to decrypt fields', 'FIELD_DECRYPTION_FAILED');
  }

  /**
   * Recursively decrypt nested fields
   */
  private async decryptNestedFields(obj: any): Promise<void> {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    for (const key in obj) {
      const value = obj[key];

      // Check if this is an encrypted field
      if (value && typeof value === 'object' && value._encrypted === true && value._data) {
        try {
          const decrypted = await this.decrypt(value._data);

          // Try to parse as JSON if it was an object
          try {
            obj[key] = JSON.parse(decrypted);
          } catch {
            obj[key] = decrypted;
          }
        } catch (error) {
          this.log('error', `Failed to decrypt field: ${key}`, error);
          // Keep encrypted value if decryption fails
        }
      } else if (typeof value === 'object') {
        // Recursively process nested objects
        await this.decryptNestedFields(value);
      }
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  async hash(data: string, salt?: string): Promise<{ hash: string; salt: string }> {
    return this.handleAsync(async () => {
      if (!data || typeof data !== 'string') {
        throw new Error('Data must be a non-empty string');
      }

      const saltBuffer = salt
        ? Buffer.from(salt, 'base64')
        : crypto.randomBytes(this.config.saltLength);

      const hash = crypto.pbkdf2Sync(
        data,
        saltBuffer,
        this.config.iterations,
        64,
        this.config.digest
      );

      return {
        hash: hash.toString('base64'),
        salt: saltBuffer.toString('base64')
      };
    }, 'Failed to hash data', 'HASHING_FAILED');
  }

  /**
   * Verify hashed data
   */
  async verifyHash(data: string, hash: string, salt: string): Promise<boolean> {
    return this.handleAsync(async () => {
      const computed = await this.hash(data, salt);
      return computed.hash === hash;
    }, 'Failed to verify hash', 'HASH_VERIFICATION_FAILED');
  }

  /**
   * Check if a field should be encrypted
   */
  isEncryptableField(fieldName: string): boolean {
    return (
      this.PII_FIELDS.includes(fieldName) ||
      this.SENSITIVE_FIELDS.includes(fieldName)
    );
  }

  /**
   * Get all encryptable fields
   */
  getAllEncryptableFields(): string[] {
    return [...this.PII_FIELDS, ...this.SENSITIVE_FIELDS];
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Generate encryption key for key rotation
   */
  async generateNewKey(): Promise<string> {
    return this.handleAsync(async () => {
      const key = crypto.randomBytes(this.config.keyLength);
      return key.toString('base64');
    }, 'Failed to generate new key', 'KEY_GENERATION_FAILED');
  }

  /**
   * Re-encrypt data with new key (for key rotation)
   */
  async reEncrypt(encryptedData: EncryptedData, newMasterKey: Buffer): Promise<EncryptedData> {
    return this.handleAsync(async () => {
      // Decrypt with old key
      const decrypted = await this.decrypt(encryptedData);

      // Temporarily swap master key
      const oldKey = this.masterKey;
      this.masterKey = newMasterKey;

      // Encrypt with new key
      const reEncrypted = await this.encrypt(decrypted);

      // Restore old key
      this.masterKey = oldKey;

      return reEncrypted;
    }, 'Failed to re-encrypt data', 'RE_ENCRYPTION_FAILED');
  }

  /**
   * Health check for Encryption Service
   */
  protected async performHealthCheck(): Promise<void> {
    // Test encryption/decryption cycle
    const testData = 'health-check-test-data';
    const encrypted = await this.encrypt(testData);
    const decrypted = await this.decrypt(encrypted);

    if (decrypted !== testData) {
      throw new Error('Encryption health check failed: data mismatch');
    }
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();
