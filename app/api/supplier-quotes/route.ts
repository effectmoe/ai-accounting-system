import { NextRequest, NextResponse } from 'next/server';
import { SupplierQuoteService } from '@/services/supplier-quote.service';
import { SupplierService } from '@/services/supplier.service';
import { db, getDatabase } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { cleanPhoneNumber } from '@/lib/phone-utils';

import { logger } from '@/lib/logger';
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
    logger.error('Error in GET /api/supplier-quotes:', error);
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
    logger.debug('===== [Supplier Quote POST] Full Request Data =====');
    logger.debug(JSON.stringify(quoteData, null, 2));
    logger.debug('===== [Supplier Quote POST] End Full Request Data =====');
    
    // 仕入先の処理
    let supplierId = quoteData.supplierId;
    
    // OCRからの場合、vendorNameまたはvendor.nameから仕入先を自動作成または取得
    const vendorName = quoteData.vendorName || quoteData.vendor?.name;
    if (!supplierId && vendorName) {
      try {
        // 既存の仕入先を検索
        logger.debug('[Supplier Quote] Searching for existing supplier:', vendorName);
        const existingSupplier = await db.findOne('suppliers', {
          companyName: vendorName
        });
        
        if (existingSupplier) {
          supplierId = existingSupplier._id;
          logger.debug(`[Supplier Quote] Found existing supplier:`, JSON.stringify({
            _id: existingSupplier._id,
            companyName: existingSupplier.companyName,
            phone: existingSupplier.phone,
            fax: existingSupplier.fax,
            email: existingSupplier.email,
            website: existingSupplier.website,
            address1: existingSupplier.address1,
            address2: existingSupplier.address2,
            postalCode: existingSupplier.postalCode
          }, null, 2));
          
          // OCRから抽出された新しい情報を取得
          const vendorInfo = quoteData.vendor || {};
          const vendorAddress = quoteData.vendorAddress || vendorInfo.address || '';
          const rawVendorPhone = quoteData.vendorPhone || quoteData.vendorPhoneNumber || vendorInfo.phone || '';
          const vendorPhone = cleanPhoneNumber(rawVendorPhone);
          const vendorEmail = quoteData.vendorEmail || vendorInfo.email || '';
          const vendorFax = quoteData.vendorFax || vendorInfo.fax || '';
          const vendorWebsite = quoteData.vendorWebsite || vendorInfo.website || vendorInfo.url || '';
          
          // 郵便番号を住所から抽出
          let postalCode = '';
          let cleanAddress = vendorAddress;
          const postalCodeMatch = vendorAddress.match(/〒?(\d{3}-?\d{4})/);
          if (postalCodeMatch) {
            postalCode = postalCodeMatch[1];
            // 郵便番号を住所から除去
            cleanAddress = vendorAddress.replace(/〒?\d{3}-?\d{4}\s*/, '').trim();
          }
          
          // 既存の仕入先データと新しいOCRデータを比較して更新が必要か確認
          const updateData: any = {};
          let needsUpdate = false;
          
          // 各フィールドを比較して、新しい値がある場合のみ更新
          if (vendorPhone && vendorPhone !== existingSupplier.phone) {
            updateData.phone = vendorPhone;
            needsUpdate = true;
          }
          if (vendorFax && (!existingSupplier.fax || vendorFax !== existingSupplier.fax)) {
            updateData.fax = vendorFax;
            needsUpdate = true;
          }
          if (vendorEmail && vendorEmail !== existingSupplier.email) {
            updateData.email = vendorEmail;
            needsUpdate = true;
          }
          if (vendorWebsite && (!existingSupplier.website || vendorWebsite !== existingSupplier.website)) {
            updateData.website = vendorWebsite;
            needsUpdate = true;
          }
          if (cleanAddress && (!existingSupplier.address1 || cleanAddress !== existingSupplier.address1)) {
            updateData.address1 = cleanAddress;
            needsUpdate = true;
          }
          if (postalCode && (!existingSupplier.postalCode || postalCode !== existingSupplier.postalCode)) {
            updateData.postalCode = postalCode;
            needsUpdate = true;
          }
          
          // 更新が必要な場合のみ実行
          if (needsUpdate) {
            logger.debug('[Supplier Quote] Updating existing supplier with new OCR data:', JSON.stringify(updateData, null, 2));
            try {
              const updatedSupplier = await SupplierService.updateSupplier(supplierId.toString(), updateData);
              logger.debug('[Supplier Quote] Successfully updated supplier:', JSON.stringify({
                _id: updatedSupplier._id,
                companyName: updatedSupplier.companyName,
                phone: updatedSupplier.phone,
                fax: updatedSupplier.fax,
                email: updatedSupplier.email,
                website: updatedSupplier.website,
                address1: updatedSupplier.address1,
                postalCode: updatedSupplier.postalCode
              }, null, 2));
            } catch (updateError) {
              logger.error('[Supplier Quote] Error updating supplier:', updateError);
              // 更新に失敗しても処理は続行（既存のsupplierIdを使用）
            }
          } else {
            logger.debug('[Supplier Quote] No updates needed for existing supplier');
          }
        } else {
          logger.debug('[Supplier Quote] No existing supplier found, will create new one');
          // OCRから抽出された仕入先情報を使用
          // vendor オブジェクトから情報を取得（AI Orchestratorからの場合）
          const vendorInfo = quoteData.vendor || {};
          const vendorAddress = quoteData.vendorAddress || vendorInfo.address || '';
          const rawVendorPhone = quoteData.vendorPhone || quoteData.vendorPhoneNumber || vendorInfo.phone || '';
          const vendorPhone = cleanPhoneNumber(rawVendorPhone);
          const vendorEmail = quoteData.vendorEmail || vendorInfo.email || '';
          const vendorFax = quoteData.vendorFax || vendorInfo.fax || '';
          const vendorWebsite = quoteData.vendorWebsite || vendorInfo.website || vendorInfo.url || '';
          
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
          logger.debug('===== [Supplier Quote] OCR Data Flow Debug START =====');
          logger.debug('[1] Raw quote data received:', JSON.stringify({
            vendorName: quoteData.vendorName,
            vendorAddress: quoteData.vendorAddress,
            vendorPhone: quoteData.vendorPhone,
            vendorPhoneNumber: quoteData.vendorPhoneNumber,
            vendorFax: quoteData.vendorFax,
            vendorEmail: quoteData.vendorEmail,
            vendor: quoteData.vendor,
            fullQuoteData: quoteData
          }, null, 2));
          
          logger.debug('[2] Extracted vendor info:', JSON.stringify({
            vendorInfo,
            vendorAddress,
            rawVendorPhone,
            vendorPhone,
            vendorFax,
            vendorEmail,
            vendorWebsite
          }, null, 2));
          
          logger.debug('[3] Processed address data:', JSON.stringify({
            originalAddress: vendorAddress,
            postalCode: postalCode,
            cleanAddress: cleanAddress
          }, null, 2));
          
          logger.debug('[4] Creating new supplier with data:', JSON.stringify({
            companyName: vendorName,
            address1: cleanAddress,
            postalCode: postalCode,
            phone: vendorPhone,
            fax: vendorFax,
            email: vendorEmail,
            website: vendorWebsite,
            originalAddress: vendorAddress
          }, null, 2));
          
          // 新しい仕入先を作成（正しいフィールド名を使用）
          const supplierData = {
            supplierCode: await SupplierService.generateSupplierCode(),
            companyName: vendorName,
            email: vendorEmail,
            phone: vendorPhone,
            fax: vendorFax, // FAX番号を追加
            website: vendorWebsite, // ホームページURLを追加
            address1: cleanAddress, // address1フィールドに保存
            postalCode: postalCode, // 抽出した郵便番号
            status: 'active' as const,
            notes: 'OCRで自動作成された仕入先'
          };
          
          logger.debug('[5] Supplier data to be saved:', JSON.stringify(supplierData, null, 2));
          
          // SupplierService.createSupplierを使用して正しく作成
          const newSupplier = await SupplierService.createSupplier(supplierData);
          supplierId = newSupplier._id;
          
          logger.debug('[6] Created supplier result:', JSON.stringify({
            _id: newSupplier._id,
            supplierCode: newSupplier.supplierCode,
            companyName: newSupplier.companyName,
            email: newSupplier.email,
            phone: newSupplier.phone,
            fax: newSupplier.fax,
            website: newSupplier.website,
            address1: newSupplier.address1,
            address2: newSupplier.address2,
            postalCode: newSupplier.postalCode,
            status: newSupplier.status,
            notes: newSupplier.notes
          }, null, 2));
          
          // 作成直後に再度データベースから取得して確認
          const verifySupplier = await db.findOne('suppliers', { _id: newSupplier._id });
          logger.debug('[7] Verification - Supplier from DB:', JSON.stringify({
            _id: verifySupplier?._id,
            companyName: verifySupplier?.companyName,
            phone: verifySupplier?.phone,
            fax: verifySupplier?.fax,
            email: verifySupplier?.email,
            website: verifySupplier?.website,
            address1: verifySupplier?.address1,
            address2: verifySupplier?.address2,
            postalCode: verifySupplier?.postalCode
          }, null, 2));
          
          // MongoDBに直接クエリして確認
          const mongoDb = await getDatabase();
          const directSupplier = await mongoDb.collection('suppliers').findOne({ _id: newSupplier._id });
          logger.debug('[8] Direct MongoDB query result:', JSON.stringify({
            _id: directSupplier?._id,
            companyName: directSupplier?.companyName,
            phone: directSupplier?.phone,
            fax: directSupplier?.fax,
            email: directSupplier?.email,
            website: directSupplier?.website,
            address1: directSupplier?.address1,
            address2: directSupplier?.address2,
            postalCode: directSupplier?.postalCode,
            allFields: Object.keys(directSupplier || {})
          }, null, 2));
          
          logger.debug('===== [Supplier Quote] OCR Data Flow Debug END =====');
        }
      } catch (error) {
        logger.error('[Supplier Quote] Error handling supplier:', error);
        // 仕入先処理に失敗した場合はデフォルト仕入先を使用
        const defaultSupplier = await db.findOne('suppliers', {
          companyName: 'OCR自動登録仕入先'
        });
        
        if (!defaultSupplier) {
          const newDefaultSupplier = await SupplierService.createSupplier({
            supplierCode: await SupplierService.generateSupplierCode(),
            companyName: 'OCR自動登録仕入先',
            email: '',
            phone: '',
            fax: '',
            website: '',
            address1: '',
            postalCode: '',
            status: 'active' as const,
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
      logger.debug('[Supplier Quote] Including fileId in quote data:', finalQuoteData.fileId);
    }
    
    // 見積書番号が指定されていない場合は自動生成
    if (!finalQuoteData.quoteNumber) {
      finalQuoteData.quoteNumber = await supplierQuoteService.generateSupplierQuoteNumber();
    }
    
    const quote = await supplierQuoteService.createSupplierQuote(finalQuoteData);
    
    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/supplier-quotes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create supplier quote' },
      { status: 500 }
    );
  }
}