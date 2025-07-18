import { NextRequest, NextResponse } from 'next/server';
import { SupplierQuoteService } from '@/services/supplier-quote.service';
import { SupplierService } from '@/services/supplier.service';
import { db } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET: 仕入先見積書一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const isGeneratedByAI = searchParams.get('isGeneratedByAI');
    const limit = searchParams.get('limit');
    const skip = searchParams.get('skip');

    const supplierQuoteService = new SupplierQuoteService();
    const searchParams_ = {
      supplierId: supplierId || undefined,
      status: status as any,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      isGeneratedByAI: isGeneratedByAI === 'true' ? true : isGeneratedByAI === 'false' ? false : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
    };

    const result = await supplierQuoteService.searchSupplierQuotes(searchParams_);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/supplier-quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier quotes' },
      { status: 500 }
    );
  }
}

// POST: 仕入先見積書作成
export async function POST(request: NextRequest) {
  try {
    const quoteData = await request.json();
    const supplierQuoteService = new SupplierQuoteService();
    
    // 仕入先の処理
    let supplierId = quoteData.supplierId;
    
    // OCRからの場合、vendorNameから仕入先を自動作成または取得
    if (!supplierId && quoteData.vendorName) {
      try {
        // 既存の仕入先を検索
        const existingSupplier = await db.findOne('suppliers', {
          companyName: quoteData.vendorName
        });
        
        if (existingSupplier) {
          supplierId = existingSupplier._id;
          console.log(`[Supplier Quote] Found existing supplier: ${existingSupplier.companyName}`);
        } else {
          // OCRから抽出された仕入先情報を使用
          const vendorAddress = quoteData.vendorAddress || '';
          const vendorPhone = quoteData.vendorPhone || quoteData.vendorPhoneNumber || '';
          const vendorEmail = quoteData.vendorEmail || '';
          
          console.log(`[Supplier Quote] Creating new supplier with OCR data:`, {
            companyName: quoteData.vendorName,
            address: vendorAddress,
            phone: vendorPhone,
            email: vendorEmail
          });
          
          // 新しい仕入先を作成（正しいフィールド名を使用）
          const newSupplier = await db.create('suppliers', {
            supplierCode: await SupplierService.generateSupplierCode(),
            companyName: quoteData.vendorName,
            email: vendorEmail,
            phone: vendorPhone,
            address1: vendorAddress, // addressフィールドはaddress1に格納
            postalCode: '',
            status: 'active',
            notes: 'OCRで自動作成された仕入先'
          });
          supplierId = newSupplier._id;
          console.log(`[Supplier Quote] Created new supplier: ${newSupplier.companyName} (${supplierId})`);
        }
      } catch (error) {
        console.error('Error handling supplier:', error);
        // 仕入先処理に失敗した場合はデフォルト仕入先を使用
        const defaultSupplier = await db.findOne('suppliers', {
          companyName: 'OCR自動登録仕入先'
        });
        
        if (!defaultSupplier) {
          const newDefaultSupplier = await db.create('suppliers', {
            supplierCode: await SupplierService.generateSupplierCode(),
            companyName: 'OCR自動登録仕入先',
            email: '',
            phone: '',
            address1: '',
            postalCode: '',
            status: 'active',
            notes: 'OCR処理でのデフォルト仕入先'
          });
          supplierId = newDefaultSupplier._id;
        } else {
          supplierId = defaultSupplier._id;
        }
      }
    }
    
    // supplierId を確実にObjectIdに変換
    if (supplierId && typeof supplierId === 'string') {
      supplierId = new ObjectId(supplierId);
    }
    
    // 見積書データを更新
    const finalQuoteData = {
      ...quoteData,
      supplierId
    };
    
    // vendorNameを削除（supplierIdで管理するため）
    delete finalQuoteData.vendorName;
    
    // 見積書番号が指定されていない場合は自動生成
    if (!finalQuoteData.quoteNumber) {
      finalQuoteData.quoteNumber = await supplierQuoteService.generateSupplierQuoteNumber();
    }
    
    const quote = await supplierQuoteService.createSupplierQuote(finalQuoteData);
    
    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/supplier-quotes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create supplier quote' },
      { status: 500 }
    );
  }
}