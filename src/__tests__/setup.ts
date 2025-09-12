/**
 * Jest test setup
 */

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

// Global test setup
beforeAll(async () => {
  // Setup code here
});

afterAll(async () => {
  // Cleanup code here
});

// Mock console methods to reduce noise during tests
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
    return; // Suppress React warnings
  }
  originalConsoleError(...args);
};