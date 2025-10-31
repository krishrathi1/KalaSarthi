/**
 * Authentication Service for AI-Powered Scheme Sahayak v2.0
 * Handles OTP-based phone authentication, JWT tokens, and RBAC
 */

import { BaseService } from './base/BaseService';
import { FirestoreService } from '../../firestore';
import { 
  schemeSahayakCollections, 
  schemeSahayakDocRefs 
} from '../../config/scheme-sahayak-firebase';
import { 
  SchemeSahayakErrorType,
  SCHEME_SAHAYAK_COLLECTIONS
} from '../../types/scheme-sahayak';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../../firebase';
import { sign, verify, JwtPayload } from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';

/**
 * JWT Token Payload Interface
 */
export interface JWTPayload extends JwtPayload {
  sub: string; // artisan ID
  phone: string;
  role: 'artisan' | 'officer' | 'admin';
  permissions: string[];
  mfa_verified: boolean;
  session_id: string;
  iat: number;
  exp: number;
  iss: string;
}

/**
 * OTP Session Interface
 */
export interface OTPSession {
  id: string;
  phone: string;
  otp: string;
  hashedOtp: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  createdAt: Date;
  verified: boolean;
  purpose: 'login' | 'registration' | 'password_reset';
}

/**
 * Authentication Result Interface
 */
export interface AuthResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  artisanId?: string;
  expiresIn?: number;
  message?: string;
  requiresRegistration?: boolean;
}

/**
 * Role-Based Access Control Permissions
 */
export const RBAC_PERMISSIONS = {
  artisan: [
    'read:own_profile',
    'update:own_profile',
    'read:all_schemes',
    'create:applications',
    'read:own_applications',
    'upload:documents',
    'read:own_notifications',
    'update:own_preferences'
  ],
  officer: [
    'read:assigned_applications',
    'update:application_status',
    'read:analytics',
    'read:artisan_profiles',
    'create:notifications'
  ],
  admin: [
    'read:all_profiles',
    'read:all_applications',
    'manage:system',
    'read:analytics',
    'manage:schemes',
    'manage:users',
    'system:admin'
  ]
} as const;

/**
 * Authentication Service Implementation
 */
export class AuthService extends BaseService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;
  private readonly otpExpiryMinutes: number;
  private readonly maxOtpAttempts: number;

  constructor() {
    super('AuthService');
    
    this.jwtSecret = process.env.JWT_SECRET || 'scheme-sahayak-secret-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
    this.otpExpiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '5');
    this.maxOtpAttempts = parseInt(process.env.MAX_OTP_ATTEMPTS || '3');
  }

  /**
   * Send OTP to phone number
   */
  async sendOTP(
    phone: string, 
    purpose: 'login' | 'registration' | 'password_reset' = 'login'
  ): Promise<{ sessionId: string; expiresAt: Date }> {
    return this.handleAsync(async () => {
      this.validatePhoneNumber(phone);

      // Generate 6-digit OTP
      const otp = this.generateOTP();
      const hashedOtp = this.hashOTP(otp);
      const sessionId = this.generateSessionId();
      const expiresAt = new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000);

      // Create OTP session
      const otpSession: OTPSession = {
        id: sessionId,
        phone,
        otp, // In production, don't store plain OTP
        hashedOtp,
        attempts: 0,
        maxAttempts: this.maxOtpAttempts,
        expiresAt,
        createdAt: new Date(),
        verified: false,
        purpose
      };

      // Store OTP session in Firestore
      const otpDocRef = doc(db, 'otp_sessions', sessionId);
      await setDoc(otpDocRef, {
        ...otpSession,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt
      });

      // Send OTP via SMS (mock implementation)
      await this.sendSMS(phone, otp, purpose);

      this.log('info', `OTP sent to ${phone} for ${purpose}`, { sessionId });

      return { sessionId, expiresAt };
    }, 'Failed to send OTP', 'SEND_OTP_FAILED');
  }

  /**
   * Verify OTP and authenticate user
   */
  async verifyOTP(sessionId: string, otp: string): Promise<AuthResult> {
    return this.handleAsync(async () => {
      // Get OTP session
      const otpDocRef = doc(db, 'otp_sessions', sessionId);
      const otpDoc = await getDoc(otpDocRef);

      if (!otpDoc.exists()) {
        throw new Error('Invalid or expired OTP session');
      }

      const otpSession = otpDoc.data() as OTPSession;

      // Check if session is expired
      if (new Date() > otpSession.expiresAt) {
        await deleteDoc(otpDocRef);
        throw new Error('OTP has expired');
      }

      // Check if already verified
      if (otpSession.verified) {
        throw new Error('OTP has already been used');
      }

      // Check attempts
      if (otpSession.attempts >= otpSession.maxAttempts) {
        await deleteDoc(otpDocRef);
        throw new Error('Maximum OTP attempts exceeded');
      }

      // Verify OTP
      const isValidOTP = this.verifyOTPHash(otp, otpSession.hashedOtp);
      
      // Update attempts
      await updateDoc(otpDocRef, {
        attempts: otpSession.attempts + 1
      });

      if (!isValidOTP) {
        throw new Error('Invalid OTP');
      }

      // Mark as verified
      await updateDoc(otpDocRef, {
        verified: true
      });

      // Check if artisan exists
      const { getUserService } = await import('./index');
      const userService = getUserService();
      const existingArtisan = await userService.getArtisanByPhone(otpSession.phone);

      if (!existingArtisan && otpSession.purpose === 'login') {
        return {
          success: true,
          requiresRegistration: true,
          message: 'Phone number not registered. Please complete registration.'
        };
      }

      if (!existingArtisan && otpSession.purpose === 'registration') {
        return {
          success: true,
          message: 'OTP verified. Please complete registration.',
          requiresRegistration: true
        };
      }

      if (existingArtisan) {
        // Generate JWT tokens
        const tokens = await this.generateTokens(existingArtisan.id, otpSession.phone, 'artisan');
        
        // Clean up OTP session
        await deleteDoc(otpDocRef);

        this.log('info', `User authenticated successfully`, { artisanId: existingArtisan.id });

        return {
          success: true,
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          artisanId: existingArtisan.id,
          expiresIn: tokens.expiresIn,
          message: 'Authentication successful'
        };
      }

      throw new Error('Unexpected authentication state');
    }, 'Failed to verify OTP', 'VERIFY_OTP_FAILED');
  }

  /**
   * Generate JWT access and refresh tokens
   */
  async generateTokens(
    artisanId: string, 
    phone: string, 
    role: 'artisan' | 'officer' | 'admin' = 'artisan'
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    return this.handleAsync(async () => {
      const sessionId = this.generateSessionId();
      const permissions = RBAC_PERMISSIONS[role];

      const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        sub: artisanId,
        phone,
        role,
        permissions,
        mfa_verified: true,
        session_id: sessionId,
        iss: 'scheme-sahayak-v2'
      };

      // Generate access token
      const accessToken = sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn
      });

      // Generate refresh token
      const refreshToken = sign(
        { sub: artisanId, session_id: sessionId, type: 'refresh' },
        this.jwtSecret,
        { expiresIn: this.refreshTokenExpiresIn }
      );

      // Store refresh token
      const refreshTokenDoc = doc(db, 'refresh_tokens', sessionId);
      await setDoc(refreshTokenDoc, {
        artisanId,
        phone,
        role,
        sessionId,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        isActive: true
      });

      // Calculate expires in seconds
      const decoded = verify(accessToken, this.jwtSecret) as JwtPayload;
      const expiresIn = decoded.exp! - Math.floor(Date.now() / 1000);

      return {
        accessToken,
        refreshToken,
        expiresIn
      };
    }, 'Failed to generate tokens', 'TOKEN_GENERATION_FAILED');
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<JWTPayload> {
    return this.handleAsync(async () => {
      try {
        const decoded = verify(token, this.jwtSecret) as JWTPayload;
        
        // Additional validation
        if (!decoded.sub || !decoded.phone || !decoded.role) {
          throw new Error('Invalid token payload');
        }

        return decoded;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('expired')) {
            throw new Error('Token has expired');
          }
          if (error.message.includes('invalid')) {
            throw new Error('Invalid token');
          }
        }
        throw new Error('Token verification failed');
      }
    }, 'Failed to verify token', 'TOKEN_VERIFICATION_FAILED');
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    return this.handleAsync(async () => {
      try {
        const decoded = verify(refreshToken, this.jwtSecret) as any;
        
        if (decoded.type !== 'refresh') {
          throw new Error('Invalid refresh token');
        }

        // Check if refresh token is still active
        const refreshTokenDoc = doc(db, 'refresh_tokens', decoded.session_id);
        const refreshTokenSnap = await getDoc(refreshTokenDoc);

        if (!refreshTokenSnap.exists() || !refreshTokenSnap.data().isActive) {
          throw new Error('Refresh token is no longer valid');
        }

        const tokenData = refreshTokenSnap.data();

        // Generate new access token
        const newTokens = await this.generateTokens(
          tokenData.artisanId,
          tokenData.phone,
          tokenData.role
        );

        return {
          accessToken: newTokens.accessToken,
          expiresIn: newTokens.expiresIn
        };
      } catch (error) {
        throw new Error('Failed to refresh token');
      }
    }, 'Failed to refresh token', 'TOKEN_REFRESH_FAILED');
  }

  /**
   * Logout user and invalidate tokens
   */
  async logout(sessionId: string): Promise<void> {
    return this.handleAsync(async () => {
      // Invalidate refresh token
      const refreshTokenDoc = doc(db, 'refresh_tokens', sessionId);
      const refreshTokenSnap = await getDoc(refreshTokenDoc);

      if (refreshTokenSnap.exists()) {
        await updateDoc(refreshTokenDoc, {
          isActive: false,
          loggedOutAt: serverTimestamp()
        });
      }

      this.log('info', `User logged out`, { sessionId });
    }, 'Failed to logout', 'LOGOUT_FAILED');
  }

  /**
   * Check user permissions
   */
  hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.includes(requiredPermission) || userPermissions.includes('*');
  }

  /**
   * Validate phone number format
   */
  private validatePhoneNumber(phone: string): void {
    const phoneRegex = /^[6-9]\d{9}$/; // Indian mobile number format
    if (!phoneRegex.test(phone)) {
      throw new Error('Invalid phone number format');
    }
  }

  /**
   * Generate 6-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Hash OTP for secure storage
   */
  private hashOTP(otp: string): string {
    return createHash('sha256').update(otp + this.jwtSecret).digest('hex');
  }

  /**
   * Verify OTP against hash
   */
  private verifyOTPHash(otp: string, hash: string): boolean {
    const computedHash = this.hashOTP(otp);
    return computedHash === hash;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Send SMS (mock implementation)
   * In production, integrate with Twilio or similar service
   */
  private async sendSMS(phone: string, otp: string, purpose: string): Promise<void> {
    // Mock SMS sending
    this.log('info', `SMS sent to ${phone}`, { otp, purpose });
    
    // In production, use Twilio:
    /*
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    await client.messages.create({
      body: `Your Scheme Sahayak OTP is: ${otp}. Valid for ${this.otpExpiryMinutes} minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${phone}`
    });
    */
  }

  /**
   * Health check for Auth Service
   */
  protected async performHealthCheck(): Promise<void> {
    // Test JWT signing and verification
    const testPayload = { test: true };
    const testToken = sign(testPayload, this.jwtSecret, { expiresIn: '1m' });
    verify(testToken, this.jwtSecret);

    // Test Firestore connectivity
    const testDocRef = doc(db, 'health_check', 'auth_service');
    await getDoc(testDocRef);
  }
}