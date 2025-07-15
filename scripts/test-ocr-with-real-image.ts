#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import sharp from 'sharp';

async function createTestImage(): Promise<Buffer> {
  // Create a test receipt image with text
  const width = 400;
  const height = 600;
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="white"/>
      <text x="200" y="50" font-family="Arial" font-size="24" text-anchor="middle">領収書</text>
      <text x="200" y="100" font-family="Arial" font-size="16" text-anchor="middle">Test Store</text>
      <text x="200" y="130" font-family="Arial" font-size="14" text-anchor="middle">2025年7月8日</text>
      
      <line x1="50" y1="150" x2="350" y2="150" stroke="black" stroke-width="1"/>
      
      <text x="60" y="180" font-family="Arial" font-size="14">商品A</text>
      <text x="340" y="180" font-family="Arial" font-size="14" text-anchor="end">¥1,000</text>
      
      <text x="60" y="210" font-family="Arial" font-size="14">商品B</text>
      <text x="340" y="210" font-family="Arial" font-size="14" text-anchor="end">¥2,000</text>
      
      <line x1="50" y1="230" x2="350" y2="230" stroke="black" stroke-width="1"/>
      
      <text x="60" y="260" font-family="Arial" font-size="14">小計</text>
      <text x="340" y="260" font-family="Arial" font-size="14" text-anchor="end">¥3,000</text>
      
      <text x="60" y="290" font-family="Arial" font-size="14">消費税(10%)</text>
      <text x="340" y="290" font-family="Arial" font-size="14" text-anchor="end">¥300</text>
      
      <line x1="50" y1="310" x2="350" y2="310" stroke="black" stroke-width="2"/>
      
      <text x="60" y="340" font-family="Arial" font-size="16" font-weight="bold">合計</text>
      <text x="340" y="340" font-family="Arial" font-size="16" font-weight="bold" text-anchor="end">¥3,300</text>
      
      <text x="200" y="400" font-family="Arial" font-size="12" text-anchor="middle">ありがとうございました</text>
      <text x="200" y="550" font-family="Arial" font-size="10" text-anchor="middle">Receipt No: 12345</text>
    </svg>
  `;

  // Convert SVG to PNG using sharp
  const buffer = await sharp(Buffer.from(svg))
    .png()
    .toBuffer();

  return buffer;
}

async function testOCREndpoint() {
  console.log('🧪 Testing OCR endpoint with realistic image...\n');

  // Create test image
  const imageBuffer = await createTestImage();
  console.log(`📄 Created test image: ${imageBuffer.length} bytes\n`);

  // Save test image for debugging
  fs.writeFileSync('test-receipt.png', imageBuffer);
  console.log('💾 Saved test image as test-receipt.png\n');

  const url = 'https://accounting-automation.vercel.app/api/ocr/analyze';
  
  console.log(`📍 Testing: ${url}`);
  console.log('─'.repeat(50));

  try {
    // Create FormData
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: 'test-receipt.png',
      contentType: 'image/png'
    });
    formData.append('companyId', 'test-company');

    // Send request
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    const responseText = await response.text();
    let responseJson;
    
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = { rawResponse: responseText };
    }

    console.log(`\nStatus: ${response.status} ${response.statusText}`);
    console.log('\nResponse:', JSON.stringify(responseJson, null, 2));

    if (!response.ok) {
      console.error('\n❌ Request failed');
      if (responseJson.error) {
        console.error('Error:', responseJson.error);
      }
      if (responseJson.details) {
        console.error('\nStack trace:', responseJson.details);
      }
    } else {
      console.log('\n✅ Request successful');
      if (responseJson.extractedData) {
        console.log('\n📊 Extracted Data:');
        console.log(JSON.stringify(responseJson.extractedData, null, 2));
      }
    }

  } catch (error) {
    console.error('\n❌ Connection error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }

  console.log('\n✨ Test complete');
}

// Execute
testOCREndpoint().catch(console.error);