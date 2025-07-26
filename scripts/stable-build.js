#!/usr/bin/env node
/**
 * Stable build script for Vercel deployment
 * This script ensures a clean and stable build environment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting stable build process...');

// Step 1: Clean previous build artifacts
console.log('🧹 Cleaning previous build artifacts...');
try {
  if (fs.existsSync('.next')) {
    fs.rmSync('.next', { recursive: true, force: true });
  }
  if (fs.existsSync('.mastra')) {
    // Remove Mastra telemetry config that might cause issues
    const telemetryPath = path.join('.mastra', 'output', 'telemetry-config.mjs');
    if (fs.existsSync(telemetryPath)) {
      fs.rmSync(telemetryPath, { force: true });
    }
  }
} catch (error) {
  console.warn('Warning during cleanup:', error.message);
}

// Step 2: Set environment variables for stable build
process.env.NODE_ENV = 'production';
process.env.DO_NOT_TRACK = '1';
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.NODE_OPTIONS = '--max-old-space-size=4096';
process.env.SKIP_DB_CONNECTION = 'true';

// Step 3: Install dependencies with legacy peer deps
console.log('📦 Installing dependencies...');
try {
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Step 4: Run the build
console.log('🏗️  Building the application...');
try {
  execSync('npm run prebuild', { stdio: 'inherit' });
  execSync('next build', { stdio: 'inherit' });
  execSync('npm run postbuild', { stdio: 'inherit' });
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 5: Verify build output
console.log('🔍 Verifying build output...');
const requiredFiles = [
  '.next/BUILD_ID',
  '.next/build-manifest.json',
  '.next/prerender-manifest.json'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing required file: ${file}`);
    allFilesExist = false;
  }
}

if (allFilesExist) {
  console.log('✅ All required build files are present');
} else {
  console.error('❌ Build verification failed');
  process.exit(1);
}

console.log('🎉 Stable build process completed successfully!');