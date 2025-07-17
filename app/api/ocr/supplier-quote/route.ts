import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { processOCR } from '@/lib/ocr-processor';
import { SupplierQuote, SupplierQuoteItem, OCRResult } from '@/types/collections';

const DB_NAME = process.env.MONGODB_DB_NAME || 'accounting-app';

// 仕入見積書用のOCR処理
async function processSupplierQuoteOCR(ocrResult: OCRResult): Promise<Partial<SupplierQuote>> {
  const { rawText = '', vendor, documentDate, totalAmount, taxAmount, items = [] } = ocrResult;
  
  // 仕入先情報の抽出（既存のベンダー名を使用）
  const supplierName = vendor || '';
  
  // 見積書番号の抽出
  const quoteNumberMatch = rawText.match(/見積書?番号[:：\s]*([A-Za-z0-9\-]+)/);
  const quoteNumber = quoteNumberMatch ? quoteNumberMatch[1] : `SQ-${Date.now()}`;
  
  // 有効期限の抽出
  const validityMatch = rawText.match(/有効期限[:：\s]*(.+?)[\n\r]/);
  let validityDate = new Date();
  if (validityMatch) {
    const parsedDate = new Date(validityMatch[1]);
    if (!isNaN(parsedDate.getTime())) {
      validityDate = parsedDate;
    } else {
      // デフォルトで30日後
      validityDate.setDate(validityDate.getDate() + 30);
    }
  } else {
    // デフォルトで30日後
    validityDate.setDate(validityDate.getDate() + 30);
  }
  
  // 項目の変換
  const quoteItems: SupplierQuoteItem[] = items.map(item => ({
    itemName: item.description,
    description: '',
    quantity: item.quantity || 1,
    unitPrice: item.unitPrice || item.amount,
    amount: item.amount,
    taxRate: 10, // デフォルト税率
    taxAmount: item.amount * 0.1
  }));
  
  // 小計の計算
  const subtotal = quoteItems.reduce((sum, item) => sum + item.amount, 0);
  const calculatedTaxAmount = taxAmount || subtotal * 0.1;
  const calculatedTotalAmount = totalAmount || subtotal + calculatedTaxAmount;
  
  return {
    quoteNumber,
    issueDate: documentDate || new Date(),
    validityDate,
    items: quoteItems,
    subtotal,
    taxAmount: calculatedTaxAmount,
    taxRate: 10,
    totalAmount: calculatedTotalAmount,
    status: 'received',
    isGeneratedByAI: true,
    aiGenerationMetadata: {
      source: 'ocr',
      confidence: ocrResult.confidence || 0,
      timestamp: new Date()
    },
    ocrResultId: ocrResult._id
  };
}

// POST: 仕入見積書のOCR処理
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const supplierId = formData.get('supplierId') as string;
    const dealId = formData.get('dealId') as string | null;
    
    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }
    
    // supplierId が提供されていない場合は、デフォルトの仕入先を作成または取得
    let finalSupplierId = supplierId;
    if (!supplierId) {
      const client = await getMongoClient();
      const db = client.db(DB_NAME);
      
      // デフォルトの仕入先を検索
      let defaultSupplier = await db.collection('suppliers').findOne({ 
        companyName: 'OCR自動登録仕入先' 
      });
      
      if (!defaultSupplier) {
        // デフォルトの仕入先を作成
        const result = await db.collection('suppliers').insertOne({
          companyName: 'OCR自動登録仕入先',
          contactEmail: '',
          contactPhone: '',
          address: '',
          postalCode: '',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        finalSupplierId = result.insertedId.toString();
      } else {
        finalSupplierId = defaultSupplier._id.toString();
      }
    }
    
    // OCR処理を実行
    const ocrResult = await processOCR(file);
    
    // OCR結果を保存
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    
    const savedOcrResult = await db.collection<OCRResult>('ocrResults').insertOne({
      ...ocrResult,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    ocrResult._id = savedOcrResult.insertedId;
    
    // 仕入見積書データの生成
    const quoteData = await processSupplierQuoteOCR(ocrResult);
    
    // 仕入先情報を追加
    const supplierQuote: SupplierQuote = {
      ...quoteData as SupplierQuote,
      supplierId: new ObjectId(finalSupplierId),
      dealId: dealId ? new ObjectId(dealId) : undefined,
      attachments: [file.name], // ファイル名を保存
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 仕入見積書を保存
    const result = await db.collection<SupplierQuote>('supplierQuotes').insertOne(supplierQuote as any);
    
    // 保存された仕入見積書を返す
    const savedQuote = {
      ...supplierQuote,
      _id: result.insertedId,
      id: result.insertedId.toString()  // 文字列形式のIDも含める
    };
    
    // 仕入先情報を含めて返す
    const supplier = await db.collection('suppliers').findOne({ 
      _id: new ObjectId(finalSupplierId) 
    });
    
    if (supplier) {
      savedQuote.supplier = supplier as any;
    }
    
    console.log('[OCR API] Returning saved quote with ID:', savedQuote.id);
    console.log('[OCR API] Full savedQuote object:', JSON.stringify(savedQuote, null, 2));
    
    return NextResponse.json({
      success: true,
      supplierQuote: savedQuote,
      ocrResult: {
        ...ocrResult,
        id: ocrResult._id?.toString()
      }
    });
  } catch (error) {
    console.error('Error processing supplier quote OCR:', error);
    return NextResponse.json(
      { error: 'Failed to process supplier quote OCR' },
      { status: 500 }
    );
  }
}

// GET: 仕入見積書一覧取得（OCRで作成されたもの）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get('supplierId');
    const dealId = searchParams.get('dealId');
    
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    
    const filter: any = { isGeneratedByAI: true };
    if (supplierId) {
      filter.supplierId = new ObjectId(supplierId);
    }
    if (dealId) {
      filter.dealId = new ObjectId(dealId);
    }
    
    const supplierQuotes = await db.collection('supplierQuotes')
      .aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'suppliers',
            localField: 'supplierId',
            foreignField: '_id',
            as: 'supplier'
          }
        },
        { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'deals',
            localField: 'dealId',
            foreignField: '_id',
            as: 'deal'
          }
        },
        { $unwind: { path: '$deal', preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: -1 } }
      ])
      .toArray();
    
    const results = supplierQuotes.map(quote => ({
      ...quote,
      id: quote._id.toString()
    }));
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching supplier quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier quotes' },
      { status: 500 }
    );
  }
}