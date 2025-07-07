import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received request body:', JSON.stringify(body, null, 2));
    const {
      ocrResultId,
      document_type = 'receipt',
      vendor_name = '',
      receipt_date = new Date().toISOString().split('T')[0],
      subtotal_amount = 0,
      tax_amount = 0,
      total_amount = 0,
      payment_amount = 0,
      change_amount = 0,
      receipt_number = '',
      store_name = '',
      store_phone = '',
      company_name = '',
      notes = '',
      file_name = '文書'
    } = body;

    // サービスロールキーを使用してRLSをバイパス
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration is missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const companyId = '11111111-1111-1111-1111-111111111111';
    
    // テーブルが存在するかチェックし、存在しない場合はエラーを返す
    try {
      const { data: testData, error: testError } = await supabase
        .from('documents')
        .select('id')
        .limit(1);
      
      if (testError && (testError.code === 'PGRST106' || testError.code === 'PGRST204')) {
        // テーブルが存在しない
        const setupUrl = 'https://app.supabase.com/project/clqpfmroqcnvyxdzadln/sql/new';
        throw new Error(`documentsテーブルが存在しません。\n\n以下の手順でテーブルを作成してください：\n1. ${setupUrl} にアクセス\n2. scripts/setup-database.tsで生成されたSQLを実行\n\nまたは、npm run setup-database --directを実行してSQLを再生成してください。`);
      }
    } catch (error: any) {
      if (error.message.includes('テーブルが存在しません')) {
        throw error;
      }
      // その他のエラーは無視（テーブルは存在するが他の問題）
    }
    
    // 小計を計算（subtotal_amountが提供されていない場合は、total_amountから税額を引く）
    const calculatedSubtotal = subtotal_amount > 0 ? subtotal_amount : Math.max(0, total_amount - tax_amount);
    
    // パートナー名を決定（vendor_name, store_name, company_nameの優先順）
    const partnerName = vendor_name || store_name || company_name || '不明';
    
    // 備考欄に支払い情報を含める
    const enhancedNotes = [
      notes || 'OCRデータより作成',
      payment_amount > 0 ? `お預かり: ¥${payment_amount.toLocaleString()}` : '',
      change_amount > 0 ? `お釣り: ¥${change_amount.toLocaleString()}` : '',
      receipt_number ? `領収書番号: ${receipt_number}` : ''
    ].filter(n => n).join('\n');

    // 文書番号のプレフィックスを文書種別に応じて変更
    const prefixMap = {
      receipt: 'REC',
      invoice: 'INV',
      estimate: 'EST',
      delivery_note: 'DLV'
    };
    const prefix = prefixMap[document_type as keyof typeof prefixMap] || 'DOC';

    // 保存するデータを準備（存在するカラムのみ使用）
    const documentData = {
        company_id: companyId,
        document_type: document_type,
        type: document_type,  // 既存のtypeカラムにも値を設定
        document_number: receipt_number || `${prefix}-${new Date().getTime()}`,
        issue_date: receipt_date,
        partner_name: partnerName,
        partner_address: '',
        partner_phone: store_phone || '',
        partner_email: '',
        partner_postal_code: '',
        project_name: file_name,
        subtotal: calculatedSubtotal,
        tax_amount: tax_amount,
        total_amount: total_amount,
        status: 'draft',
        notes: enhancedNotes
    };
    
    console.log('Document data to save:', JSON.stringify(documentData, null, 2));
    
    // シンプルなデータ構造で直接Supabaseに保存
    const { data: savedDoc, error } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    // 明細を保存
    const { error: itemError } = await supabase
      .from('document_items')
      .insert({
        document_id: savedDoc.id,
        item_order: 1,
        item_name: file_name || '商品・サービス',
        quantity: 1,
        unit_price: calculatedSubtotal,
        tax_rate: tax_amount > 0 ? 0.10 : 0,
        amount: calculatedSubtotal
      });

    if (itemError) {
      console.error('Supabase item insert error:', itemError);
      throw itemError;
    }

    // OCR結果を更新
    if (ocrResultId) {
      const { error: updateError, data: updatedOcr } = await supabase
        .from('ocr_results')
        .update({ 
          linked_document_id: savedDoc.id,
          status: 'processed'
        })
        .eq('id', ocrResultId)
        .select()
        .single();
        
      if (updateError) {
        console.error('OCR result update error:', updateError);
        // エラーがあってもレスポンスは成功として返す（文書は作成済みのため）
      } else {
        console.log('OCR result updated successfully:', ocrResultId, updatedOcr);
        // 更新が確実に反映されるまで少し待つ
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 勘定科目を推論（非同期で実行）
    // TODO: Mastraのビルド問題を解決後に有効化
    /*
    try {
      const { AccountInferenceAgent } = await import('@/agents/account-inference-agent');
      const agent = new AccountInferenceAgent();
      
      // 非同期で推論実行（レスポンスを待たない）
      agent.analyzeDocument({
        documentType: 'receipt',
        vendorName: partnerName,
        items: [{
          name: file_name || '商品・サービス',
          amount: calculatedSubtotal
        }],
        totalAmount: total_amount,
        notes: enhancedNotes,
        extractedText: body.extracted_text
      }).then(async (inference) => {
        if (inference) {
          await agent.saveInference(savedDoc.id, inference);
          console.log('勘定科目推論完了:', inference);
        }
      }).catch((error) => {
        console.error('勘定科目推論エラー:', error);
      });
    } catch (error) {
      console.error('Agent initialization error:', error);
      // エラーが発生しても文書作成は成功とする
    }
    */

    const documentTypeLabels = {
      receipt: '領収書',
      invoice: '請求書',
      estimate: '見積書',
      delivery_note: '納品書'
    };
    const label = documentTypeLabels[document_type as keyof typeof documentTypeLabels] || '文書';

    return NextResponse.json({
      id: savedDoc.id,
      message: `${label}を作成しました（勘定科目を推論中...）`
    });

  } catch (error) {
    console.error('Create document error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '文書の作成に失敗しました',
        details: error instanceof Error ? error.stack : undefined,
        errorObject: JSON.stringify(error, null, 2)
      },
      { status: 500 }
    );
  }
}