import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.GEMINI_API_KEY = 'test-api-key'
process.env.GOOGLE_AI_API_KEY = 'test-api-key'
process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY = 'test-api-key'

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific log levels
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock Next.js Request and Response for API testing
global.Request = class MockRequest {
  constructor(url, options = {}) {
    Object.defineProperty(this, 'url', { value: url, writable: false });
    Object.defineProperty(this, 'method', { value: options.method || 'GET', writable: false });
    Object.defineProperty(this, 'headers', { value: new Map(Object.entries(options.headers || {})), writable: false });
    Object.defineProperty(this, 'body', { value: options.body, writable: false });
  }
  
  async json() {
    return JSON.parse(this.body);
  }
  
  async text() {
    return this.body;
  }
}

global.Response = class MockResponse {
  constructor(body, options = {}) {
    this.body = body;
    this.status = options.status || 200;
    this.statusText = options.statusText || 'OK';
    this.headers = new Map(Object.entries(options.headers || {}));
  }
  
  async json() {
    return JSON.parse(this.body);
  }
  
  async text() {
    return this.body;
  }
  
  static json(data, options = {}) {
    return new MockResponse(JSON.stringify(data), {
      status: options.status || 200,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
  }
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})