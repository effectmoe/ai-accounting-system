const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconDir = path.join(__dirname, '../public/icons');

// SVG source
const svgPath = path.join(iconDir, 'icon.svg');

async function generateIcons() {
  console.log('Generating PWA icons from SVG...');

  // Check if SVG exists
  if (!fs.existsSync(svgPath)) {
    console.error('SVG file not found:', svgPath);
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(svgPath);

  for (const size of sizes) {
    const outputPath = path.join(iconDir, `icon-${size}x${size}.png`);

    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`Created: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`Error creating ${size}x${size} icon:`, error.message);
    }
  }

  // Generate Apple Touch Icon (180x180)
  const appleTouchPath = path.join(iconDir, 'apple-touch-icon.png');
  try {
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile(appleTouchPath);
    console.log('Created: apple-touch-icon.png');
  } catch (error) {
    console.error('Error creating apple-touch-icon:', error.message);
  }

  // Generate favicon (32x32)
  const faviconPath = path.join(__dirname, '../public/favicon.ico');
  try {
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(__dirname, '../public/favicon-32x32.png'));
    console.log('Created: favicon-32x32.png');
  } catch (error) {
    console.error('Error creating favicon:', error.message);
  }

  console.log('\nAll PWA icons generated successfully!');
}

generateIcons().catch(console.error);
