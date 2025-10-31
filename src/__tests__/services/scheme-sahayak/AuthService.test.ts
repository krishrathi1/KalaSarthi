/**
 * Authentication and Authorization Tests
 * Tests for task 2.2: Implement multi-factor authentication system
 * Requirements: 9.3, 9.4
 */

import { AuthService, RBAC_PERMISSIONS } from '@/lib/services/scheme-sahayak/AuthService';
import { sign, verify } from 'jsonwebtoken';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn()
}));

// Mock UserService
jest.mock('@/lib/services/scheme-sahayak/index', () => ({
  getUserService: jest.fn(() => ({
    getArtisanByPhone: jest.fn()
  }))
}));

import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getUserService } from '@/lib/services/scheme-sahayak/index';

describe('AuthService - Authentication and Authorization', () => {
  let authService: AuthService;
  let mockGetDoc: jest.Mock;
  let mockSetDoc: jest.Mock;
  let mockUpdateDoc: jest.Mock;
  let mockDeleteDoc: jest.Mock;
  let mockGetArtisanByPhone: jest.Mock;

  beforeAll(() => {
    // Set required environment variables
    process.env.JWT_SECRET = 'test-secret-key-for-testing';
    process.env.JWT_EXPIRES_IN = '24h';
    process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
    process.env.OTP_EXPIRY_MINUTES = '5';
    process.env.MAX_OTP_ATTEMPTS = '3';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
 