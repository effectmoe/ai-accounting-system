#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== Mastra Build Script ===');
console.log('Node version:', process.version);
console.log('Current directory:', process.cwd());

// Check if @mastra/cli is available
try {
  console.log('\n1. Checking @mastra/cli...');
  execSync('npx @mastra/cli --version', { stdio: 'inherit' });
} catch (error) {
  console.log('Installing @mastra/cli...');
  execSync('npm install --save-dev @mastra/cli', { stdio: 'inherit' });
}

// Check if src/mastra/index.ts exists
const mastraEntryPath = path.join(process.cwd(), 'src/mastra/index.ts');
console.log(`\n2. Checking entry file: ${mastraEntryPath}`);
if (!fs.existsSync(mastraEntryPath)) {
  console.error('ERROR: src/mastra/index.ts not found!');
  process.exit(1);
}

// Try to build
console.log('\n3. Running Mastra build...');
try {
  execSync('npx @mastra/cli build', { stdio: 'inherit' });
  console.log('\n✅ Build successful!');
  
  // Check output
  const outputPath = path.join(process.cwd(), '.mastra/output/index.mjs');
  if (fs.existsSync(outputPath)) {
    console.log(`✅ Output file created: ${outputPath}`);
  } else {
    console.error('❌ Output file not found!');
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}