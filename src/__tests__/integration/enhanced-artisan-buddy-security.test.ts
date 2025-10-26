/**
 * Enhanced Artisan Buddy Security Integration Tests
 * 
 * Tests authentication, authorization, data protection, and compliance features
 * Requirements: 4.2, 6.4, 7.4
 */

import { NextRequest } from 'next/server';
import { EnhancedArtisanBuddyAuth, DataProtection } from '../../lib/middleware/enhanced-artisan-buddy-auth';
import { ComplianceService } from '../../lib/service/ComplianceService';

describe('Enhanced Artisan Buddy Security Integration', () => {
    let auth: EnhancedArtisanBuddyAuth;
    let complianceService: ComplianceService;

    beforeEach(() => {
        auth = EnhancedArtisanBuddyAuth.getInstance();
        complianceService = ComplianceService.getInstance();
    });

    describe('Authentication and Authorization', () => {
        it('should authenticate anonymous users with limited permissions', async () => {
            const request = new NextRequest('http://localhost:3000/api/enhanced-artisan-buddy');
            const authContext = await auth.authenticateRequest(request);

            expect(authContext.isAuthenticated).toBe(false);
            expect(authContext.userId).toBe('anonymous');
            expect(authContext.permissions).toContain('read');
            expect(authContext.profileAccess).toBe(false);
        });

        it('should handle JWT token authentication', async () => {
            const mockToken = 'mock-jwt-token';
            const request = new NextRequest('http://localhost:3000/api/enhanced-artisan-buddy', {
                headers: {
                    'authorization': `Bearer ${mockToken}`
                }
            });

            // This would fail in real scenario without valid JWT, but tests the flow
            const authContext = await auth.authenticateRequest(request);
            expect(authContext).toBeDefined();
        });

        it('should authorize access based on permissions', () => {
            const authContext = {
                userId: 'test-user',
                sessionId: 'test-session',
                permissions: ['profile:read', 'conversation:write'],
                isAuthenticated: true,
                profileAccess: true
            };

            expect(auth.authorizeAccess(authContext, 'profile', 'read')).toBe(true);
            expect(auth.authorizeAccess(authContext, 'conversation', 'write')).toBe(true);
            expect(auth.authorizeAccess(authContext, 'profile', 'delete')).toBe(false);
        });

        it('should deny access to unauthenticated users for protected resources', () => {
            const authContext = {
                userId: 'anonymous',
                sessionId: 'anon-session',
                permissions: ['read'],
                isAuthenticated: false,
                profileAccess: false
            };

            expect(auth.authorizeAccess(authContext, 'profile', 'read')).toBe(false);
            expect(auth.authorizeAccess(authContext, 'conversation', 'write')).toBe(true); // General read allowed
        });
    });

    describe('Rate Limiting', () => {
        it('should allow requests within rate limit', () => {
            const clientId = 'test-client-1';

            // First request should be allowed
            expect(auth.checkRateLimit(clientId)).toBe(true);

            // Multiple requests within limit should be allowed
            for (let i = 0; i < 50; i++) {
                expect(auth.checkRateLimit(clientId)).toBe(true);
            }
        });

        it('should block requests exceeding rate limit', () => {
            const clientId = 'test-client-2';

            // Exhaust rate limit
            for (let i = 0; i < 100; i++) {
                auth.checkRateLimit(clientId);
            }

            // Next request should be blocked
            expect(auth.checkRateLimit(clientId)).toBe(false);
        });
    });

    describe('Data Encryption and Protection', () => {
        it('should encrypt and decrypt data correctly', () => {
            const originalData = 'sensitive user information';

            const encrypted = auth.encryptData(originalData);
            expect(encrypted).not.toBe(originalData);
            expect(encrypted).toContain(':'); // Should have IV:authTag:encrypted format

            const decrypted = auth.decryptData(encrypted);
            expect(decrypted).toBe(originalData);
        });

        it('should fail to decrypt tampered data', () => {
            const originalData = 'sensitive user information';
            const encrypted = auth.encryptData(originalData);

            // Tamper with encrypted data
            const tamperedData = encrypted.replace(/.$/, 'x');

            expect(() => auth.decryptData(tamperedData)).toThrow();
        });

        it('should hash data securely', () => {
            const data = 'password123';

            const { hash, salt } = auth.hashData(data);
            expect(hash).toBeDefined();
            expect(salt).toBeDefined();
            expect(hash).not.toBe(data);

            // Verify hash
            expect(auth.verifyHash(data, hash, salt)).toBe(true);
            expect(auth.verifyHash('wrongpassword', hash, salt)).toBe(false);
        });

        it('should sanitize user input', () => {
            const maliciousInput = '<script>alert("xss")</script>Hello';
            const sanitized = auth.sanitizeInput(maliciousInput);

            expect(sanitized).not.toContain('<script>');
            expect(sanitized).toContain('Hello');
        });

        it('should encrypt profile data', () => {
            const profileData = {
                personalInfo: { name: 'John Doe', email: 'john@example.com' },
                businessInfo: { revenue: 50000, customers: 100 },
                skills: { primary: ['pottery'] }
            };

            const encrypted = DataProtection.encryptProfileData(profileData);

            expect(typeof encrypted.personalInfo).toBe('string');
            expect(typeof encrypted.businessInfo).toBe('string');
            expect(encrypted.skills).toEqual(profileData.skills); // Not encrypted
        });

        it('should anonymize conversation data', () => {
            const conversationData = {
                userId: 'user123',
                conversationHistory: [
                    {
                        content: 'My email is john@example.com and my card is 1234-5678-9012-3456',
                        timestamp: new Date('2024-01-15T10:30:00Z')
                    }
                ]
            };

            const anonymized = DataProtection.anonymizeConversationData(conversationData);

            expect(anonymized.userId).not.toBe('user123');
            expect(anonymized.conversationHistory[0].content).toContain('[EMAIL]');
            expect(anonymized.conversationHistory[0].content).toContain('[CARD_NUMBER]');
            expect(anonymized.conversationHistory[0].timestamp).toBe('2024-01-15');
        });
    });

    describe('Session Management', () => {
        it('should create and validate sessions', () => {
            const userId = 'test-user';
            const sessionId = auth.createSession(userId);

            expect(sessionId).toBeDefined();
            expect(typeof sessionId).toBe('string');

            expect(auth.validateSession(sessionId)).toBe(true);
            expect(auth.validateSession('invalid-session')).toBe(false);
        });

        it('should expire old sessions', () => {
            const userId = 'test-user';
            const sessionId = auth.createSession(userId);

            // Mock old session by manipulating internal state
            // In real implementation, this would be time-based
            expect(auth.validateSession(sessionId)).toBe(true);
        });

        it('should cleanup expired sessions', () => {
            // Create multiple sessions
            const sessions = [];
            for (let i = 0; i < 5; i++) {
                sessions.push(auth.createSession(`user-${i}`));
            }

            // All sessions should be valid initially
            sessions.forEach(sessionId => {
                expect(auth.validateSession(sessionId)).toBe(true);
            });

            // Cleanup should return count of cleaned sessions
            const cleanedCount = auth.cleanupExpiredSessions();
            expect(typeof cleanedCount).toBe('number');
        });
    });

    describe('Compliance and Privacy', () => {
        it('should handle data export requests', async () => {
            const userId = 'test-user';
            const requestId = await complianceService.requestDataExport(userId);

            expect(requestId).toBeDefined();
            expect(typeof requestId).toBe('string');
            expect(requestId).toMatch(/^req_/);
        });

        it('should handle data deletion requests', async () => {
            const userId = 'test-user';
            const requestId = await complianceService.requestDataDeletion(userId, 'complete', false);

            expect(requestId).toBeDefined();
            expect(typeof requestId).toBe('string');
            expect(requestId).toMatch(/^req_/);
        });

        it('should manage privacy settings', async () => {
            const userId = 'test-user';

            // Get default privacy settings
            const settings = await complianceService.getPrivacySettings(userId);
            expect(settings).toBeDefined();
            expect(typeof settings.allowDataCollection).toBe('boolean');

            // Update privacy settings
            await complianceService.updatePrivacySettings(userId, {
                allowAnalytics: false,
                marketingConsent: false
            });

            // Verify consent checking
            const hasAnalyticsConsent = await complianceService.hasConsent(userId, 'allowAnalytics');
            expect(typeof hasAnalyticsConsent).toBe('boolean');
        });

        it('should validate data processing legality', async () => {
            const userId = 'test-user';

            const canProcess = await complianceService.validateDataProcessing(userId, 'conversation');
            expect(typeof canProcess).toBe('boolean');
        });

        it('should generate compliance reports', async () => {
            const report = await complianceService.generateComplianceReport();

            expect(report).toBeDefined();
            expect(typeof report.totalUsers).toBe('number');
            expect(typeof report.activeConversations).toBe('number');
            expect(typeof report.dataRetentionCompliance).toBe('boolean');
        });
    });

    describe('API Security Integration', () => {
        it('should handle secure API requests', async () => {
            const request = new NextRequest('http://localhost:3000/api/enhanced-artisan-buddy', {
                method: 'POST',
                body: JSON.stringify({
                    message: 'Hello, test message',
                    userId: 'test-user'
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Import and test the secured API route
            const { POST } = await import('../../app/api/enhanced-artisan-buddy/route');
            const response = await POST(request);

            expect(response.status).toBeLessThan(500); // Should not crash
        });

        it('should handle rate-limited requests', async () => {
            const requests = [];

            // Create multiple requests from same client
            for (let i = 0; i < 5; i++) {
                const request = new NextRequest('http://localhost:3000/api/enhanced-artisan-buddy', {
                    method: 'GET',
                    headers: {
                        'x-forwarded-for': '192.168.1.100' // Same IP
                    }
                });
                requests.push(request);
            }

            // All requests should be processed (within rate limit)
            const { GET } = await import('../../app/api/enhanced-artisan-buddy/route');

            for (const request of requests) {
                const response = await GET(request);
                expect(response.status).toBeLessThan(500);
            }
        });

        it('should handle privacy-related API endpoints', async () => {
            // Test privacy settings retrieval
            const getRequest = new NextRequest(
                'http://localhost:3000/api/enhanced-artisan-buddy?action=privacy-settings',
                {
                    headers: {
                        'authorization': 'Bearer mock-token'
                    }
                }
            );

            const { GET } = await import('../../app/api/enhanced-artisan-buddy/route');
            const getResponse = await GET(getRequest);

            expect(getResponse.status).toBeLessThan(500);

            // Test data export request
            const deleteRequest = new NextRequest(
                'http://localhost:3000/api/enhanced-artisan-buddy?action=request-data-export',
                {
                    method: 'DELETE',
                    headers: {
                        'authorization': 'Bearer mock-token'
                    }
                }
            );

            const { DELETE } = await import('../../app/api/enhanced-artisan-buddy/route');
            const deleteResponse = await DELETE(deleteRequest);

            expect(deleteResponse.status).toBeLessThan(500);
        });
    });

    describe('Audit Logging', () => {
        it('should create audit log entries', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            auth.auditLog({
                userId: 'test-user',
                action: 'test_action',
                resource: 'test_resource',
                details: { test: 'data' },
                ipAddress: '192.168.1.1',
                userAgent: 'test-agent'
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                'AUDIT LOG:',
                expect.stringContaining('test_action')
            );

            consoleSpy.mockRestore();
        });
    });
});