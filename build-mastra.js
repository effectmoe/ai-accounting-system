#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🏗️  Building Mastra deployment...');

// Create dist directory
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy src directory structure
const srcDir = path.join(__dirname, 'src');
const distSrcDir = path.join(distDir, 'src');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
      // For TypeScript files, just copy them (Mastra might handle compilation)
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy source files
copyDir(srcDir, distSrcDir);

// Copy package.json
fs.copyFileSync(
  path.join(__dirname, 'package.json'),
  path.join(distDir, 'package.json')
);

// Copy mastra.yaml
if (fs.existsSync(path.join(__dirname, 'mastra.yaml'))) {
  fs.copyFileSync(
    path.join(__dirname, 'mastra.yaml'),
    path.join(distDir, 'mastra.yaml')
  );
}

// Create a simple server entry point
const serverContent = `
const express = require('express');
const app = express();
const port = process.env.PORT || 4111;

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'mastra-accounting-automation',
    timestamp: new Date().toISOString()
  });
});

// Agents info
app.get('/agents', (req, res) => {
  res.json({
    agents: [
      'accountingAgent',
      'customerAgent',
      'databaseAgent',
      'deploymentAgent',
      'japanTaxAgent',
      'ocrAgent',
      'problemSolvingAgent',
      'productAgent',
      'refactorAgent',
      'uiAgent',
      'constructionAgent'
    ],
    count: 11
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(\`✅ Mastra server running on http://0.0.0.0:\${port}\`);
});
`;

fs.writeFileSync(
  path.join(distDir, 'server.js'),
  serverContent
);

console.log('✅ Build completed successfully!');
console.log(`📁 Output directory: ${distDir}`);