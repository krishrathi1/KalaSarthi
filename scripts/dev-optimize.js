#!/usr/bin/env node

// Development optimization script
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Optimizing development environment...');

// Set environment variables for faster development
process.env.NODE_ENV = 'development';
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

// Clean cache if it exists
const nextCache = path.join(process.cwd(), '.next');
if (fs.existsSync(nextCache)) {
  console.log('🧹 Cleaning Next.js cache...');
  execSync('rm -rf .next', { stdio: 'inherit' });
}

// Clean node modules cache
const nodeModulesCache = path.join(process.cwd(), 'node_modules/.cache');
if (fs.existsSync(nodeModulesCache)) {
  console.log('🧹 Cleaning node_modules cache...');
  execSync('rm -rf node_modules/.cache', { stdio: 'inherit' });
}

console.log('✅ Development environment optimized!');
console.log('💡 Use "npm run dev:fast" for maximum speed');
