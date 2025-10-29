# Security and Privacy Implementation

## Overview

This document describes the security and privacy controls implemented for the AI-Powered Scheme Sahayak v2.0 system, covering data encryption, TLS configuration, and privacy management.

## Requirements Addressed

- **Requirement 9.1**: AES-256 encryption for sensitive data at rest
- **Requirement 9.2**: TLS 1.3 for all data transmission
- **Requirement 9.4**: Automatic data deletion after scheme completion or user request
- **Requirement 9.5**: Compliance with Indian Personal Data Protection Act requirements

## Components

### 1. Encryption Service (`EncryptionService.ts`)

Provides AES-256-GCM encryption for sensitive data at rest.

#### Features

- **AES-256-GCM Encryption**: Industry-standard encryption with authentication
- **Key Derivation**: PBKDF2 with 100,000 iterations for key strengthening
- **Field-Level Encryption**: Automatic encryption of PII and sensitive fields
- **Key Rotation Support**: Re-encryption capability for key rotation
- **Searchable Encryption**: Deterministic encryption for searchable fields

#### PII Fields (Automatically Encrypted)

- `aadhaarHash`
- `panNumber`
- `phone`
- `email`
- `address`
- `bankDetails`
- `accountNumber`
- `ifscCode`

#### Sensitive Fields (Automatically Encrypted)

- `income`
- `monthlyIncome`
- `financialData`
- `taxDetails`
- `creditScore`

#### Usage Example

```typescript
import { encryptionService } from '@/lib/services/scheme-sahayak/EncryptionService';

// Encrypt a single value
const encrypted = await encryptionService.encrypt('sensitive data');

// Decrypt a value
const decrypted = await encryptionService.decrypt(encrypted);

// Encrypt multiple fields in an object
const profile = {
  name: 'John Doe',
  phone: '9876543210',
  email: 'john@example.com'
};

const encryptedProfile = await encryptionService.encryptFields(profile, ['phone', 'email']);

// Decrypt fields
const decryptedProfile = await encryptionService.decryptFields(encryptedProfile);

// Hash data (one-way)
const { hash, salt } = await encryptionService.hash('password');

// Verify hash
const isValid = await encryptionService.verifyHash('password', hash, salt);
```

#### Configuration

Set the master encryption key in your environment:

```bash
# Generate a 256-bit key (32 bytes)
openssl rand -base64 32

# Set in .env
ENCRYPTION_MASTER_KEY=your_base64_encoded_key_here
```

**Important**: Never commit the master key to version control!

### 2. TLS Configuration Service (`TLSConfig.ts`)

Ensures TLS 1.3 is used for all data transmission.

#### Features

- **TLS 1.3 Enforcement**: Only allows TLS 1.3 connections
- **Strong Cipher Suites**: Uses only secure cipher suites
- **Security Headers**: Applies comprehensive security headers
- **HSTS Support**: HTTP Strict Transport Security with preload

#### Security Headers Applied

- `Strict-Transport-Security`: Enforces HTTPS
- `X-Content-Type-Options`: Prevents MIME sniffing
- `X-Frame-Options`: Prevents clickjacking
- `X-XSS-Protection`: Enables XSS protection
- `Content-Security-Policy`: Restricts resource loading
- `Referrer-Policy`: Controls referrer information
- `Permissions-Policy`: Restricts browser features

#### Usage Example

```typescript
import { tlsConfigService } from '@/lib/services/scheme-sahayak/TLSConfig';

// Get secure HTTPS agent for Node.js
const agent = tlsConfigService.getSecureAgent();

// Use with fetch
const response = await fetch(url, {
  agent,
  ...tlsConfigService.getSecureFetchOptions()
});

// Get security headers for API responses
const headers = tlsConfigService.getSecurityHeaders();
```

### 3. Security Middleware (`middleware/security.ts`)

Applies security headers to all HTTP responses.

#### Features

- **Automatic Header Application**: Applies security headers to all responses
- **HTTPS Enforcement**: Redirects HTTP to HTTPS in production
- **CSP Configuration**: Content Security Policy for XSS protection

#### Usage

The middleware is automatically applied to all routes. To customize:

```typescript
// middleware.ts
import { securityMiddleware, enforceHTTPS } from '@/middleware/security';

export function middleware(request: NextRequest) {
  // Enforce HTTPS
  const httpsRedirect = enforceHTTPS(request);
  if (httpsRedirect) return httpsRedirect;

  // Apply security headers
  return securityMiddleware(request);
}
```

### 4. Privacy Management Service (`PrivacyManagementService.ts`)

Implements comprehensive privacy controls and data retention policies.

#### Features

- **Consent Management**: Granular consent tracking with audit trail
- **Data Retention Policies**: Configurable retention periods
- **Right to Erasure**: User-initiated data deletion with grace period
- **Data Portability**: Export user data in structured format
- **Audit Logging**: Complete audit trail for compliance

#### Consent Types

- `DATA_COLLECTION`: Permission to collect user data
- `DATA_PROCESSING`: Permission to process user data
- `DATA_SHARING`: Permission to share data with third parties
- `MARKETING`: Permission for marketing communications
- `ANALYTICS`: Permission for analytics tracking
- `THIRD_PARTY`: Permission for third-party integrations

#### Data Retention Periods

- Profile Data: 7 years
- Application Data: 10 years (government requirement)
- Documents: 7 years
- Analytics: 2 years
- Notifications: 1 year
- Logs: 90 days

#### Usage Example

```typescript
import { privacyManagementService, ConsentType } from '@/lib/services/scheme-sahayak/PrivacyManagementService';

// Initialize privacy settings for new user
await privacyManagementService.initializePrivacySettings(userId, {
  [ConsentType.DATA_COLLECTION]: true,
  [ConsentType.DATA_PROCESSING]: true
});

// Update consent
await privacyManagementService.updateConsent(
  userId,
  ConsentType.MARKETING,
  true,
  { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0...' }
);

// Check consent
const hasConsent = await privacyManagementService.hasConsent(
  userId,
  ConsentType.ANALYTICS
);

// Request data deletion (30-day grace period)
const requestId = await privacyManagementService.requestDataDeletion(
  userId,
  'full',
  undefined,
  'User requested account deletion'
);

// Cancel deletion (within grace period)
await privacyManagementService.cancelDataDeletion(userId, requestId);

// Export user data
const exportedData = await privacyManagementService.exportUserData(userId);
```

### 5. Data Retention Scheduler (`DataRetentionScheduler.ts`)

Automated scheduler for data cleanup and retention policy enforcement.

#### Features

- **Automated Cleanup**: Daily cleanup of expired data
- **Deletion Processing**: Hourly processing of deletion requests
- **Expiry Reminders**: Daily reminders for expiring documents
- **Manual Triggers**: Ability to manually trigger jobs

#### Scheduled Jobs

1. **Data Cleanup** (Daily)
   - Removes data past retention period
   - Archives old records
   - Cleans up temporary files

2. **Deletion Requests** (Hourly)
   - Processes pending deletion requests
   - Executes scheduled deletions
   - Updates request status

3. **Expiry Reminders** (Daily)
   - Sends reminders for expiring documents
   - Notifies users 30 days before expiry

#### Usage Example

```typescript
import { dataRetentionScheduler } from '@/lib/services/scheme-sahayak/DataRetentionScheduler';

// Start scheduler
await dataRetentionScheduler.start();

// Manually trigger cleanup
await dataRetentionScheduler.triggerDataCleanup();

// Get scheduler status
const status = dataRetentionScheduler.getStatus();

// Stop scheduler
await dataRetentionScheduler.stop();
```

## API Routes

### Privacy Management API

**Endpoint**: `/api/scheme-sahayak/privacy`

#### Get Privacy Settings

```http
GET /api/scheme-sahayak/privacy?userId=artisan_123
```

#### Initialize Privacy Settings

```http
POST /api/scheme-sahayak/privacy
Content-Type: application/json

{
  "userId": "artisan_123",
  "action": "initialize",
  "consents": {
    "data_collection": true,
    "data_processing": true
  }
}
```

#### Update Consent

```http
POST /api/scheme-sahayak/privacy
Content-Type: application/json

{
  "userId": "artisan_123",
  "action": "updateConsent",
  "consentType": "marketing",
  "granted": true
}
```

#### Request Data Deletion

```http
POST /api/scheme-sahayak/privacy
Content-Type: application/json

{
  "userId": "artisan_123",
  "action": "requestDeletion",
  "requestType": "full",
  "reason": "User requested account deletion"
}
```

#### Export User Data

```http
POST /api/scheme-sahayak/privacy
Content-Type: application/json

{
  "userId": "artisan_123",
  "action": "exportData"
}
```

## Integration with UserService

The `UserService` automatically encrypts and decrypts sensitive fields:

```typescript
import { getUserService } from '@/lib/services/scheme-sahayak';

const userService = getUserService();

// Create profile (automatically encrypts sensitive fields)
const artisanId = await userService.createArtisanProfile({
  personalInfo: {
    name: 'John Doe',
    phone: '9876543210', // Will be encrypted
    email: 'john@example.com', // Will be encrypted
    aadhaarHash: 'hash123', // Will be encrypted
    dateOfBirth: new Date('1990-01-01')
  },
  // ... other fields
});

// Get profile (automatically decrypts sensitive fields)
const profile = await userService.getArtisanProfile(artisanId);
// profile.personalInfo.phone is decrypted and ready to use
```

## Security Best Practices

### 1. Key Management

- Store master encryption key in secure environment variables
- Rotate encryption keys every 90 days
- Use different keys for different environments
- Never commit keys to version control

### 2. Access Control

- Implement role-based access control (RBAC)
- Use least privilege principle
- Audit all access to sensitive data
- Implement multi-factor authentication

### 3. Data Handling

- Encrypt data at rest and in transit
- Minimize data collection
- Implement data retention policies
- Provide data export capabilities

### 4. Monitoring

- Log all security events
- Monitor for suspicious activity
- Set up alerts for security incidents
- Regular security audits

### 5. Compliance

- Follow Indian Personal Data Protection Act
- Implement GDPR requirements for international users
- Maintain audit trails
- Provide transparency reports

## Testing

### Encryption Tests

```typescript
import { encryptionService } from '@/lib/services/scheme-sahayak/EncryptionService';

describe('EncryptionService', () => {
  it('should encrypt and decrypt data', async () => {
    const data = 'sensitive information';
    const encrypted = await encryptionService.encrypt(data);
    const decrypted = await encryptionService.decrypt(encrypted);
    
    expect(decrypted).toBe(data);
    expect(encrypted.encrypted).not.toBe(data);
  });

  it('should encrypt fields in object', async () => {
    const obj = { phone: '9876543210', name: 'John' };
    const encrypted = await encryptionService.encryptFields(obj, ['phone']);
    
    expect(encrypted.phone._encrypted).toBe(true);
    expect(encrypted.name).toBe('John');
  });
});
```

### Privacy Management Tests

```typescript
import { privacyManagementService, ConsentType } from '@/lib/services/scheme-sahayak/PrivacyManagementService';

describe('PrivacyManagementService', () => {
  it('should initialize privacy settings', async () => {
    await privacyManagementService.initializePrivacySettings('user123');
    const settings = await privacyManagementService.getPrivacySettings('user123');
    
    expect(settings).toBeDefined();
    expect(settings.userId).toBe('user123');
  });

  it('should update consent', async () => {
    await privacyManagementService.updateConsent(
      'user123',
      ConsentType.MARKETING,
      true
    );
    
    const hasConsent = await privacyManagementService.hasConsent(
      'user123',
      ConsentType.MARKETING
    );
    
    expect(hasConsent).toBe(true);
  });
});
```

## Troubleshooting

### Encryption Issues

**Problem**: "Master key not initialized"
**Solution**: Set `ENCRYPTION_MASTER_KEY` in environment variables

**Problem**: "Decryption failed"
**Solution**: Ensure the same master key is used for encryption and decryption

### TLS Issues

**Problem**: "TLS validation failed"
**Solution**: Ensure server supports TLS 1.3

**Problem**: "Certificate validation error"
**Solution**: Check certificate validity and trust chain

### Privacy Management Issues

**Problem**: "Deletion request not processing"
**Solution**: Check if scheduler is running and deletion is past grace period

**Problem**: "Consent not updating"
**Solution**: Verify user ID and consent type are valid

## Compliance Checklist

- [x] AES-256 encryption for sensitive data at rest
- [x] TLS 1.3 for all data transmission
- [x] Field-level encryption for PII
- [x] Consent management with audit trail
- [x] Data retention policies (7-10 years)
- [x] Right to erasure (30-day grace period)
- [x] Data portability (export functionality)
- [x] Security headers on all responses
- [x] HTTPS enforcement in production
- [x] Automated data cleanup
- [x] Audit logging for compliance

## Future Enhancements

1. **Hardware Security Module (HSM)**: Store encryption keys in HSM
2. **Key Management Service**: Use cloud KMS for key management
3. **Advanced Threat Protection**: Implement anomaly detection
4. **Data Loss Prevention**: Monitor and prevent data leaks
5. **Compliance Automation**: Automated compliance reporting
6. **Privacy Dashboard**: User-facing privacy control panel
7. **Consent Management Platform**: Advanced consent workflows
8. **Data Anonymization**: Anonymize data for analytics

## Support

For security issues or questions:
- Email: security@schemesahayak.gov.in
- Security Hotline: 1800-XXX-XXXX
- Bug Bounty: https://schemesahayak.gov.in/security

## References

- [Indian Personal Data Protection Act](https://www.meity.gov.in/)
- [NIST Encryption Standards](https://csrc.nist.gov/)
- [OWASP Security Guidelines](https://owasp.org/)
- [TLS 1.3 Specification](https://tools.ietf.org/html/rfc8446)
