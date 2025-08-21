const chromium = require('@sparticuz/chromium-min');
const fs = require('fs');
const path = require('path');

async function downloadChromium() {
  console.log('Downloading Chromium for Vercel...');
  
  try {
    // Chromiumのバイナリパスを取得
    const execPath = await chromium.executablePath();
    console.log('Chromium executable path:', execPath);
    
    // バイナリが存在するか確認
    if (fs.existsSync(execPath)) {
      console.log('✅ Chromium binary already exists at:', execPath);
      const stats = fs.statSync(execPath);
      console.log('  File size:', stats.size, 'bytes');
    } else {
      console.log('❌ Chromium binary not found, downloading...');
      
      // @sparticuz/chromium-minはURLを指定してバイナリをダウンロード
      await chromium.executablePath(
        'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
      );
      
      if (fs.existsSync(execPath)) {
        console.log('✅ Download complete!');
      } else {
        console.log('❌ Download failed!');
      }
    }
    
    // Vercel用の場所にコピー
    const targetPaths = [
      path.join(process.cwd(), '.next', 'server', 'bin', 'chromium'),
      path.join(process.cwd(), 'chromium'),
      '/tmp/chromium'
    ];
    
    for (const targetPath of targetPaths) {
      try {
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        if (fs.existsSync(execPath) && !fs.existsSync(targetPath)) {
          console.log(`Copying to ${targetPath}...`);
          fs.copyFileSync(execPath, targetPath);
          fs.chmodSync(targetPath, 0o755);
          console.log(`✅ Copied to ${targetPath}`);
        }
      } catch (error) {
        console.log(`⚠️ Could not copy to ${targetPath}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

downloadChromium();