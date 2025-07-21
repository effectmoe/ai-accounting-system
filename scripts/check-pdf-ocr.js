const { MongoClient } = require('mongodb');

async function checkPDFOCR() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://tonychus:Musubi0928@cluster0.cud6w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('🔍 MongoDB接続成功');
    
    const db = client.db('accounting_system');
    const collection = db.collection('documents');
    
    // PDFファイルのOCR結果を検索
    const pdfResults = await collection.find({
      $or: [
        { fileName: { $regex: /\.pdf$/i } },
        { original_filename: { $regex: /\.pdf$/i } },
        { file_name: { $regex: /\.pdf$/i } }
      ],
      ocrStatus: { $exists: true }
    }).toArray();
    
    console.log(`\n📄 PDFファイルのOCR結果: ${pdfResults.length}件`);
    
    if (pdfResults.length > 0) {
      console.log('\n最近のPDF OCR結果:');
      pdfResults.slice(0, 5).forEach((doc, index) => {
        console.log(`\n${index + 1}. ${doc.fileName || doc.original_filename || doc.file_name}`);
        console.log(`   - OCRステータス: ${doc.ocrStatus}`);
        console.log(`   - 作成日: ${doc.createdAt || doc.created_at}`);
        console.log(`   - 金額: ${doc.amount || doc.total_amount || 'N/A'}`);
        console.log(`   - 仕入先: ${doc.vendor_name || doc.store_name || 'N/A'}`);
      });
    }
    
    // 全体のファイル形式別統計
    console.log('\n📊 ファイル形式別のOCR結果統計:');
    
    const allOcrResults = await collection.find({
      ocrStatus: { $exists: true }
    }).toArray();
    
    const stats = {
      pdf: 0,
      jpg: 0,
      png: 0,
      other: 0
    };
    
    allOcrResults.forEach(doc => {
      const fileName = doc.fileName || doc.original_filename || doc.file_name || '';
      if (fileName.match(/\.pdf$/i)) stats.pdf++;
      else if (fileName.match(/\.jpg$/i) || fileName.match(/\.jpeg$/i)) stats.jpg++;
      else if (fileName.match(/\.png$/i)) stats.png++;
      else stats.other++;
    });
    
    console.log(`- PDF: ${stats.pdf}件`);
    console.log(`- JPG/JPEG: ${stats.jpg}件`);
    console.log(`- PNG: ${stats.png}件`);
    console.log(`- その他: ${stats.other}件`);
    
    // 最新のOCR処理を確認
    const latestOcr = await collection.find({
      ocrStatus: { $exists: true }
    }).sort({ createdAt: -1, created_at: -1 }).limit(5).toArray();
    
    console.log('\n🕐 最新のOCR処理結果:');
    latestOcr.forEach((doc, index) => {
      const fileName = doc.fileName || doc.original_filename || doc.file_name || 'Unknown';
      console.log(`${index + 1}. ${fileName} - ${doc.ocrStatus} - ${doc.createdAt || doc.created_at}`);
    });
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await client.close();
  }
}

checkPDFOCR();