/**
 * Enhanced Artisan Buddy Authentication and Authorization Middleware
 * 
 * Provides security controls for the Enhanced Artisan Buddy system
 * Requirements: 4.2, 6.4, 7.4
 */

import { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

export interface AuthContext {
    userId: string;
    sessionId: string;
    permissions: string[];
    isAuthenticated: boolean;
    profileAccess: boolean;
}

export interface SecurityConfig {
    jwtSecret: string;
    encryptionKey: string;
    sessionTimeout: number; // minutes
    maxRequestsPerMinute: number;
    enableAuditLogging: boolean;
}

export class EnhancedArtisanBuddyAuth {
    private static instance: EnhancedArtisanBuddyAuth;
    private config: SecurityConfig;
    private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();
    private activeSessions: Map<string, { userId: string; createdAt: Date; lastActivity: Date }> = new Map();

    private constructor() {
        this.config = {
            jwtSecret: process.env.JWT_SECRET || 'enhanced-artisan-buddy-secret',
            encryptionKey: process.env.ENCRYPTION_KEY || this.generateEncryptionKey(),
            sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '60'), // 60 minutes
            maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '100'),
            enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING === 'true'
        };
    }

    public static getInstance(): EnhancedArtisanBuddyAuth {
        if (!EnhancedArtisanBuddyAuth.instance) {
            EnhancedArtisanBuddyAuth.instance = new EnhancedArtisanBuddyAuth();
        }
        return EnhancedArtisanBuddyAuth.instance;
    }

    /**
     * Authenticate request and extract user context
     */
    public async authenticateRequest(request: NextRequest): Promise<AuthContext> {
        try {
            // Extract authorization header
            const authHeader = request.headers.get('authorization');
            const sessionToken = request.headers.get('x-session-token');

            // For development/testing, allow anonymous access with default user
            if (!authHeader && !sessionToken) {
                return this.createAnonymousContext();
            }

            // Verify JWT token if provided
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                return await this.verifyJWTToken(token);
            }

            // Verify session token if provided
            if (sessionToken) {
                return await this.verifySessionToken(sessionToken);
            }

            throw new Error('No valid authentication provided');

        } catch (error) {
            console.error('Authentication error:', error);
            return this.createAnonymousContext();
        }
    }

    /**
     * Authorize user access to specific resources
     */
    public authorizeAccess(authContext: AuthContext, resource: string, action: string): boolean {
        // Check if user is authenticated for protected resources
        if (resource === 'profile' && !authContext.isAuthenticated) {
            return false;
        }

        // Check profile access permissions
        if (resource === 'profile' && !authContext.profileAccess) {
            return false;
        }

        // Check specific permissions
        const requiredPermission = `${resource}:${action}`;
        if (authContext.permissions.includes(requiredPermission) || authContext.permissions.includes('*')) {
            return true;
        }

        // Allow read access to own data
        if (action === 'read' && authContext.isAuthenticated) {
            return true;
        }

        return false;
    }

    /**
     * Apply rate limiting to requests
     */
    public checkRateLimit(clientId: string): boolean {
        const now = Date.now();
        const windowStart = now - (60 * 1000); // 1 minute window

        const clientData = this.rateLimitMap.get(clientId);

        if (!clientData || clientData.resetTime < now) {
            // Reset or create new rate limit entry
            this.rateLimitMap.set(clientId, {
                count: 1,
                resetTime: now + (60 * 1000)
            });
            return true;
        }

        if (clientData.count >= this.config.maxRequestsPerMinute) {
            return false; // Rate limit exceeded
        }

        clientData.count++;
        return true;
    }

    /**
     * Encrypt sensitive data
     */
    public encryptData(data: string): string {
        try {
            const iv = randomBytes(16);
            const cipher = createCipheriv('aes-256-gcm', Buffer.from(this.config.encryptionKey, 'hex'), iv);

            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            const authTag = cipher.getAuthTag();

            return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Decrypt sensitive data
     */
    public decryptData(encryptedData: string): string {
        try {
            const parts = encryptedData.split(':');
            if (parts.length !== 3) {
                throw new Error('Invalid encrypted data format');
            }

            const iv = Buffer.from(parts[0], 'hex');
            const authTag = Buffer.from(parts[1], 'hex');
            const encrypted = parts[2];

            const decipher = createDecipheriv('aes-256-gcm', Buffer.from(this.config.encryptionKey, 'hex'), iv);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * Create audit log entry
     */
    public auditLog(event: {
        userId: string;
        action: string;
        resource: string;
        details?: any;
        ipAddress?: string;
        userAgent?: string;
    }): void {
        if (!this.config.enableAuditLogging) {
            return;
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            userId: event.userId,
            action: event.action,
            resource: event.resource,
            details: event.details,
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            sessionId: this.generateSessionId()
        };

        // In production, this would write to a secure audit log system
        console.log('AUDIT LOG:', JSON.stringify(logEntry));
    }

    /**
     * Validate and sanitize user input
     */
    public sanitizeInput(input: any): any {
        if (typeof input === 'string') {
            // Remove potentially dangerous characters
            return input
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .trim();
        }

        if (Array.isArray(input)) {
            return input.map(item => this.sanitizeInput(item));
        }

        if (typeof input === 'object' && input !== null) {
            const sanitized: any = {};
            for (const [key, value] of Object.entries(input)) {
                sanitized[this.sanitizeInput(key)] = this.sanitizeInput(value);
            }
            return sanitized;
        }

        return input;
    }

    /**
     * Create session for authenticated user
     */
    public createSession(userId: string): string {
        const sessionId = this.generateSessionId();

        this.activeSessions.set(sessionId, {
            userId,
            createdAt: new Date(),
            lastActivity: new Date()
        });

        return sessionId;
    }

    /**
     * Validate and refresh session
     */
    public validateSession(sessionId: string): boolean {
        const session = this.activeSessions.get(sessionId);

        if (!session) {
            return false;
        }

        const now = new Date();
        const sessionAge = now.getTime() - session.lastActivity.getTime();
        const maxAge = this.config.sessionTimeout * 60 * 1000; // Convert to milliseconds

        if (sessionAge > maxAge) {
            this.activeSessions.delete(sessionId);
            return false;
        }

        // Update last activity
        session.lastActivity = now;
        return true;
    }

    /**
     * Clean up expired sessions
     */
    public cleanupExpiredSessions(): number {
        const now = new Date();
        const maxAge = this.config.sessionTimeout * 60 * 1000;
        let cleanedCount = 0;

        for (const [sessionId, session] of this.activeSessions.entries()) {
            const sessionAge = now.getTime() - session.lastActivity.getTime();
            if (sessionAge > maxAge) {
                this.activeSessions.delete(sessionId);
                cleanedCount++;
            }
        }

        return cleanedCount;
    }

    /**
     * Hash sensitive data for storage
     */
    public hashData(data: string, salt?: string): { hash: string; salt: string } {
        const actualSalt = salt || randomBytes(32).toString('hex');
        const hash = createHash('sha256').update(data + actualSalt).digest('hex');
        return { hash, salt: actualSalt };
    }

    /**
     * Verify hashed data
     */
    public verifyHash(data: string, hash: string, salt: string): boolean {
        const { hash: computedHash } = this.hashData(data, salt);
        return computedHash === hash;
    }

    // Private helper methods

    private async verifyJWTToken(token: string): Promise<AuthContext> {
        try {
            const decoded = verify(token, this.config.jwtSecret) as any;

            return {
                userId: decoded.userId,
                sessionId: decoded.sessionId || this.generateSessionId(),
                permissions: decoded.permissions || ['read'],
                isAuthenticated: true,
                profileAccess: true
            };
        } catch (error) {
            throw new Error('Invalid JWT token');
        }
    }

    private async verifySessionToken(sessionToken: string): Promise<AuthContext> {
        if (!this.validateSession(sessionToken)) {
            throw new Error('Invalid or expired session');
        }

        const session = this.activeSessions.get(sessionToken);
        if (!session) {
            throw new Error('Session not found');
        }

        return {
            userId: session.userId,
            sessionId: sessionToken,
            permissions: ['read', 'write'],
            isAuthenticated: true,
            profileAccess: true
        };
    }

    private createAnonymousContext(): AuthContext {
        return {
            userId: 'anonymous',
            sessionId: this.generateSessionId(),
            permissions: ['read'],
            isAuthenticated: false,
            profileAccess: false
        };
    }

    private generateSessionId(): string {
        return randomBytes(32).toString('hex');
    }

    private generateEncryptionKey(): string {
        return randomBytes(32).toString('hex');
    }
}

/**
 * Middleware function for Next.js API routes
 */
export async function withEnhancedArtisanBuddyAuth(
    request: NextRequest,
    handler: (request: NextRequest, authContext: AuthContext) => Promise<Response>
): Promise<Response> {
    const auth = EnhancedArtisanBuddyAuth.getInstance();

    try {
        // Get client identifier for rate limiting
        const clientId = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown';

        // Check rate limit
        if (!auth.checkRateLimit(clientId)) {
            return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
                status: 429,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Authenticate request
        const authContext = await auth.authenticateRequest(request);

        // Create audit log entry
        auth.auditLog({
            userId: authContext.userId,
            action: request.method || 'UNKNOWN',
            resource: 'enhanced-artisan-buddy',
            ipAddress: clientId,
            userAgent: request.headers.get('user-agent') || 'unknown'
        });

        // Call the handler with auth context
        return await handler(request, authContext);

    } catch (error) {
        console.error('Auth middleware error:', error);

        return new Response(JSON.stringify({ error: 'Authentication failed' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Data protection utilities
 */
export class DataProtection {
    private static auth = EnhancedArtisanBuddyAuth.getInstance();

    /**
     * Encrypt profile data before storage
     */
    static encryptProfileData(profileData: any): any {
        const sensitiveFields = ['personalInfo', 'businessInfo'];
        const encrypted = { ...profileData };

        for (const field of sensitiveFields) {
            if (encrypted[field]) {
                encrypted[field] = this.auth.encryptData(JSON.stringify(encrypted[field]));
            }
        }

        return encrypted;
    }

    /**
     * Decrypt profile data after retrieval
     */
    static decryptProfileData(encryptedData: any): any {
        const sensitiveFields = ['personalInfo', 'businessInfo'];
        const decrypted = { ...encryptedData };

        for (const field of sensitiveFields) {
            if (decrypted[field] && typeof decrypted[field] === 'string') {
                try {
                    decrypted[field] = JSON.parse(this.auth.decryptData(decrypted[field]));
                } catch (error) {
                    console.error(`Failed to decrypt ${field}:`, error);
                    // Return empty object if decryption fails
                    decrypted[field] = {};
                }
            }
        }

        return decrypted;
    }

    /**
     * Anonymize conversation data for analytics
     */
    static anonymizeConversationData(conversationData: any): any {
        const anonymized = { ...conversationData };

        // Remove or hash personally identifiable information
        if (anonymized.userId) {
            anonymized.userId = this.auth.hashData(anonymized.userId).hash;
        }

        if (anonymized.conversationHistory) {
            anonymized.conversationHistory = anonymized.conversationHistory.map((message: any) => ({
                ...message,
                content: this.sanitizeMessageContent(message.content),
                timestamp: new Date(message.timestamp).toISOString().split('T')[0] // Date only
            }));
        }

        return anonymized;
    }

    /**
     * Sanitize message content for storage/analytics
     */
    private static sanitizeMessageContent(content: string): string {
        // Remove potential PII patterns
        return content
            .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD_NUMBER]') // Credit card numbers
            .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]') // Social Security Numbers
            .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]') // Email addresses
            .replace(/\b\d{10,}\b/g, '[PHONE]') // Phone numbers
            .replace(/\b\d{1,5}\s\w+\s(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\b/gi, '[ADDRESS]'); // Addresses
    }
}