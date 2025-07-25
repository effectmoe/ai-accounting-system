import * as fs from 'fs';
import * as path from 'path';

async function verifyBuildOutput() {
  const outputDir = '.mastra/output';
  const expectedFiles = [
    'index.mjs',
    'package.json'
  ];

  console.log('🔍 Verifying build output...');

  // Check if output directory exists
  if (!fs.existsSync(outputDir)) {
    console.error('❌ .mastra/output directory does not exist');
    console.log('💡 Run "npm run build" to generate the output');
    return false;
  }

  // Check for required files
  let allFilesExist = true;
  for (const file of expectedFiles) {
    const filePath = path.join(outputDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Required file not found: ${file}`);
      allFilesExist = false;
    } else {
      const stats = fs.statSync(filePath);
      console.log(`✅ ${file} (${stats.size} bytes)`);
    }
  }

  if (!allFilesExist) {
    return false;
  }

  // Verify index.mjs content
  const indexPath = path.join(outputDir, 'index.mjs');
  const content = fs.readFileSync(indexPath, 'utf8');
  
  if (content.includes('export') || content.includes('Hono') || content.includes('server')) {
    console.log('✅ Server code generated successfully');
  } else {
    console.warn('⚠️ Server code might have issues');
  }

  console.log('\n✅ Build verification complete!');
  return true;
}

// Execute verification
verifyBuildOutput().then(success => {
  process.exit(success ? 0 : 1);
});