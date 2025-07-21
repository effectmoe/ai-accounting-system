const fs = require('fs');

// Read .env.local directly
const envContent = fs.readFileSync('.env.local', 'utf8');
const lines = envContent.split('\n');

console.log('Looking for MONGODB_URI in .env.local...\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('MONGODB_URI')) {
    console.log(`Line ${i + 1}: ${line}`);
    
    if (line.startsWith('MONGODB_URI=')) {
      const rawValue = line.substring('MONGODB_URI='.length);
      console.log('\nRaw value:', rawValue);
      console.log('Raw value length:', rawValue.length);
      console.log('First 50 chars:', rawValue.substring(0, 50));
      console.log('Last 10 chars:', rawValue.substring(rawValue.length - 10));
      
      // Clean the value
      const cleanValue = rawValue.replace(/^["']|["']$/g, '').replace(/\\n/g, '').trim();
      console.log('\nCleaned value:', cleanValue);
      console.log('Cleaned value length:', cleanValue.length);
      console.log('Starts with mongodb:', cleanValue.startsWith('mongodb'));
    }
  }
}