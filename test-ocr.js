// OCRテストスクリプト
// 使い方: node test-ocr.js [画像ファイルパス]

const fs = require('fs');
const path = require('path');

async function testOCR(imagePath) {
  try {
    // 画像をBase64に変換
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // OCR APIを呼び出し
    const response = await fetch('http://localhost:3000/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        filename: path.basename(imagePath)
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ OCR成功！');
      console.log('\n抽出されたデータ:');
      console.log('店舗名:', result.data.vendor);
      console.log('日付:', result.data.date);
      console.log('金額:', result.data.amount, '円');
      console.log('カテゴリ:', result.data.category);
      console.log('\n品目:');
      result.data.items?.forEach(item => {
        console.log(`- ${item.name}: ${item.price}円`);
      });
      console.log('\n生テキスト:');
      console.log(result.data.rawText);
    } else {
      console.log('❌ OCRエラー:', result.error);
    }
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

// コマンドライン引数から画像パスを取得
const imagePath = process.argv[2];
if (!imagePath) {
  console.log('使い方: node test-ocr.js [画像ファイルパス]');
  console.log('例: node test-ocr.js ~/Desktop/receipt.jpg');
  process.exit(1);
}

if (!fs.existsSync(imagePath)) {
  console.log('❌ ファイルが見つかりません:', imagePath);
  process.exit(1);
}

console.log('🔍 OCR処理を開始します...');
console.log('ファイル:', imagePath);
testOCR(imagePath);