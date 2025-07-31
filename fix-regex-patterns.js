#!/usr/bin/env node

const url = 'https://abposter.jp/basic/tokusho.html';

async function testRegexPatterns() {
  console.log('🧪 Testing improved regex patterns...');
  
  try {
    // Fetch HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = await response.text();
    console.log(`📄 HTML length: ${html.length}`);
    
    // Test improved patterns
    console.log('\n🔍 Testing Various Patterns:');
    
    // Company name - from title, remove page prefix
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      let companyName = titleMatch[1].trim()
        .replace(/^特定商取引法[│|]\s*/, '')  // Remove page prefix
        .trim();
      console.log(`Company Name: ${companyName}`);
    }
    
    // Look for company name in Japanese text content
    const companyPatterns = [
      /会社名[：:]\s*([^<\n\r]+)/i,
      /社名[：:]\s*([^<\n\r]+)/i,
      /販売業者[：:]\s*([^<\n\r]+)/i,
      /運営者[：:]\s*([^<\n\r]+)/i,
      /事業者[：:]\s*([^<\n\r]+)/i,
    ];
    
    for (const pattern of companyPatterns) {
      const match = html.match(pattern);
      if (match) {
        console.log(`Found company via pattern: ${match[1].trim()}`);
      }
    }
    
    // Address patterns - look for complete addresses
    const addressPatterns = [
      /所在地[：:]\s*([^<\n\r]+(?:\n[^<\n\r]+)*)/i,
      /住所[：:]\s*([^<\n\r]+(?:\n[^<\n\r]+)*)/i,
      /本社[：:]\s*([^<\n\r]+(?:\n[^<\n\r]+)*)/i,
      /〒\d{3}-\d{4}\s+[^<\n\r]+/g,
    ];
    
    for (const pattern of addressPatterns) {
      const matches = html.match(pattern);
      if (matches) {
        console.log(`Address pattern found:`, matches);
      }
    }
    
    // Phone patterns
    const phonePatterns = [
      /(?:電話|TEL|Tel|Phone)[：:]\s*([\d\-\(\)\s]+)/i,
      /(?:電話番号)[：:]\s*([\d\-\(\)\s]+)/i,
      /0120-[\d\-]+/g,
      /0\d{1,4}-\d{1,4}-\d{4}/g,
    ];
    
    for (const pattern of phonePatterns) {
      const matches = html.match(pattern);
      if (matches) {
        console.log(`Phone pattern found:`, matches);
      }
    }
    
    // Look specifically for the content structure
    console.log('\n🔍 Analyzing HTML Structure:');
    
    // Check for dt/dd structure
    const dtddMatches = html.match(/<dt[^>]*>([^<]+)<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/gi);
    if (dtddMatches) {
      console.log('DT/DD structures found:', dtddMatches.length);
      dtddMatches.forEach((match, i) => {
        if (i < 5) { // Show first 5
          console.log(`  ${i + 1}: ${match}`);
        }
      });
    }
    
    // Check for table structure
    const tableMatches = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi);
    if (tableMatches) {
      console.log(`Table structures found: ${tableMatches.length}`);
    }
    
    // Look for specific Japanese content
    const japaneseContent = html.match(/[ジェネクト|株式会社|〒\d{3}-\d{4}]/g);
    if (japaneseContent) {
      console.log('Japanese content samples:', japaneseContent.slice(0, 10));
    }
    
    // Check if the problematic CSS pattern exists
    const cssPattern = html.match(/style\.min\d+\.css/g);
    if (cssPattern) {
      console.log('CSS patterns found:', cssPattern);
    }
    
    // Look for the actual address context
    const addressContext = html.match(/〒\d{3}-\d{4}[^<]*?(?:東京都|大阪府|福岡県|埼玉県|[^都道府県]+[県府])[^<]{10,100}/g);
    if (addressContext) {
      console.log('Address contexts found:', addressContext);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testRegexPatterns().catch(console.error);