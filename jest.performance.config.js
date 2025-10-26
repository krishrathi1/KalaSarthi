/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: [
        '**/performance/**/*.test.ts',
        '**/performance/**/*.spec.ts'
    ],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/__tests__/**',
    ],
    coverageDirectory: 'coverage/performance',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    testTimeout: 300000, // 5 minutes for performance tests
    maxWorkers: 1, // Run performance tests sequentially
    detectOpenHandles: true,
    forceExit: true,
    verbose: true
};