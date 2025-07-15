#!/bin/bash
# Vercel build script

echo "Installing TypeScript and types..."
npm install --no-save typescript @types/react @types/node @types/react-dom

echo "Building Next.js app..."
rm -rf .next
npx next build