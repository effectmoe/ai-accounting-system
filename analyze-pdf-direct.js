const fs = require('fs');
const { getFormRecognizerService } = require('./src/lib/azure-form-recognizer');

async function analyzePDF() {
  const pdfPath = '/Users/tonychustudio/Downloads/スキャン_20250705-2350.pdf';
  
  console.log('PDFファイルを解析中:', pdfPath);
  
  try {
    // PDFファイルを読み込む
    const buffer = fs.readFileSync(pdfPath);
    console.log('ファイルサイズ:', buffer.length, 'bytes');
    
    // Azure Form Recognizerで解析
    const formRecognizer = getFormRecognizerService();
    
    // まずレシートとして解析
    console.log('\n=== レシートとして解析 ===');
    try {
      const receiptResult = await formRecognizer.analyzeReceipt(buffer, 'test.pdf');
      console.log('解析結果:', JSON.stringify(receiptResult.fields, null, 2));
    } catch (e) {
      console.log('レシート解析失敗:', e.message);
    }
    
    // 次に一般的なドキュメントとして解析
    console.log('\n=== 一般ドキュメントとして解析 ===');
    try {
      const docResult = await formRecognizer.analyzeDocument(buffer, 'test.pdf');
      console.log('解析結果:', JSON.stringify(docResult.fields, null, 2));
      
      // テキストコンテンツから日付を探す
      if (docResult.extractedData && docResult.extractedData.content) {
        console.log('\n=== 抽出されたテキスト ===');
        const text = docResult.extractedData.content;
        console.log(text.substring(0, 1000)); // 最初の1000文字
        
        // 日付パターンを探す
        const datePatterns = [
          /(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/g,
          /令和(\d+)年(\d{1,2})月(\d{1,2})日/g,
          /(\d{1,2})月(\d{1,2})日/g,
          /(\d{4})\/(\d{1,2})\/(\d{1,2})/g,
          /(\d{4})-(\d{1,2})-(\d{1,2})/g
        ];
        
        console.log('\n=== 見つかった日付 ===');
        datePatterns.forEach(pattern => {
          const matches = text.matchAll(pattern);
          for (const match of matches) {
            console.log('日付:', match[0]);
          }
        });
      }
    } catch (e) {
      console.log('ドキュメント解析失敗:', e.message);
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

analyzePDF();