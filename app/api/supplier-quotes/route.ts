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
    
    // デバッグ: 受信したデータ全体をログ出力
    console.log('===== [Supplier Quote POST] Full Request Data =====');
    console.log(JSON.stringify(quoteData, null, 2));
    console.log('===== [Supplier Quote POST] End Full Request Data =====');
    
    // 仕入先の処理
    let supplierId = quoteData.supplierId;
    
    // OCRからの場合、vendorNameまたはvendor.nameから仕入先を自動作成または取得
    const vendorName = quoteData.vendorName || quoteData.vendor?.name;
    if (!supplierId && vendorName) {
      try {
        // 既存の仕入先を検索
        console.log('[Supplier Quote] Searching for existing supplier:', vendorName);
        const existingSupplier = await db.findOne('suppliers', {
          companyName: vendorName
        });
        
        if (existingSupplier) {
          supplierId = existingSupplier._id;
          console.log(`[Supplier Quote] Found existing supplier:`, JSON.stringify({
            _id: existingSupplier._id,
            companyName: existingSupplier.companyName,
            phone: existingSupplier.phone,
            address1: existingSupplier.address1,
            postalCode: existingSupplier.postalCode
          }, null, 2));
        } else {
          console.log('[Supplier Quote] No existing supplier found, will create new one');
          // OCRから抽出された仕入先情報を使用
          // vendor オブジェクトから情報を取得（AI Orchestratorからの場合）
          const vendorInfo = quoteData.vendor || {};
          const vendorAddress = quoteData.vendorAddress || vendorInfo.address || '';
          const vendorPhone = quoteData.vendorPhone || quoteData.vendorPhoneNumber || vendorInfo.phone || '';
          const vendorEmail = quoteData.vendorEmail || vendorInfo.email || '';
          
          // 郵便番号を住所から抽出
          let postalCode = '';
          let cleanAddress = vendorAddress;
          const postalCodeMatch = vendorAddress.match(/〒?(\d{3}-?\d{4})/);
          if (postalCodeMatch) {
            postalCode = postalCodeMatch[1];
            // 郵便番号を住所から除去
            cleanAddress = vendorAddress.replace(/〒?\d{3}-?\d{4}\s*/, '').trim();
          }
          
          // Comprehensive logging for OCR data flow
          console.log('===== [Supplier Quote] OCR Data Flow Debug START =====');
          console.log('[1] Raw quote data received:', JSON.stringify({
            vendorName: quoteData.vendorName,
            vendorAddress: quoteData.vendorAddress,
            vendorPhone: quoteData.vendorPhone,
            vendorPhoneNumber: quoteData.vendorPhoneNumber,
            vendorEmail: quoteData.vendorEmail,
            vendor: quoteData.vendor,
            fullQuoteData: quoteData
          }, null, 2));
          
          console.log('[2] Extracted vendor info:', JSON.stringify({
            vendorInfo,
            vendorAddress,
            vendorPhone,
            vendorEmail
          }, null, 2));
          
          console.log('[3] Processed address data:', JSON.stringify({
            originalAddress: vendorAddress,
            postalCode: postalCode,
            cleanAddress: cleanAddress
          }, null, 2));
          
          console.log('[4] Creating new supplier with data:', JSON.stringify({
            companyName: vendorName,
            address: cleanAddress,
            postalCode: postalCode,
            phone: vendorPhone,
            email: vendorEmail,
            originalAddress: vendorAddress
          }, null, 2));
          
          // 新しい仕入先を作成（正しいフィールド名を使用）
          const supplierData = {
            supplierCode: await SupplierService.generateSupplierCode(),
            companyName: vendorName,
            email: vendorEmail,
            phone: vendorPhone,
            address1: cleanAddress, // 郵便番号を除いた住所
            postalCode: postalCode, // 抽出した郵便番号
            status: 'active',
            notes: 'OCRで自動作成された仕入先'
          };
          
          console.log('[5] Supplier data to be saved:', JSON.stringify(supplierData, null, 2));
          
          const newSupplier = await db.create('suppliers', supplierData);
          supplierId = newSupplier._id;
          
          console.log('[6] Created supplier result:', JSON.stringify({
            _id: newSupplier._id,
            supplierCode: newSupplier.supplierCode,
            companyName: newSupplier.companyName,
            email: newSupplier.email,
            phone: newSupplier.phone,
            address1: newSupplier.address1,
            postalCode: newSupplier.postalCode,
            status: newSupplier.status,
            notes: newSupplier.notes
          }, null, 2));
          
          // 作成直後に再度データベースから取得して確認
          const verifySupplier = await db.findOne('suppliers', { _id: newSupplier._id });
          console.log('[7] Verification - Supplier from DB:', JSON.stringify({
            _id: verifySupplier?._id,
            companyName: verifySupplier?.companyName,
            phone: verifySupplier?.phone,
            address1: verifySupplier?.address1,
            postalCode: verifySupplier?.postalCode
          }, null, 2));
          
          console.log('===== [Supplier Quote] OCR Data Flow Debug END =====');
        }
      } catch (error) {
        console.error('[Supplier Quote] Error handling supplier:', error);
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
    
    // fileIdが含まれている場合はログに記録
    if (finalQuoteData.fileId) {
      console.log('[Supplier Quote] Including fileId in quote data:', finalQuoteData.fileId);
    }
    
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