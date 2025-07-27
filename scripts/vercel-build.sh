#!/bin/bash
# Vercel-optimized build script

echo "🚀 Starting Vercel-optimized build..."

# Set build environment
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
export DO_NOT_TRACK=1
export NODE_OPTIONS="--max-old-space-size=4096"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next .mastra/output/telemetry-config.mjs

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p .mastra/output

# Create a minimal telemetry config to prevent errors
echo "🔧 Creating telemetry config..."
cat > .mastra/output/telemetry-config.mjs << EOF
export const telemetry = {
  enabled: false,
  serviceName: 'accounting-automation',
  sampling: {
    type: 'always_off'
  }
};
EOF

# Run prebuild
echo "🔧 Running prebuild tasks..."
npm run prebuild

# Run Next.js build
echo "🏗️  Building Next.js application..."
next build

# Run postbuild
echo "🔨 Running postbuild tasks..."
npm run postbuild

echo "✅ Build completed successfully!"