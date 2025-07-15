#!/usr/bin/env tsx
/**
 * 構造化データシステム Phase 1 テストスクリプト
 */

import { StructuredDataService } from '../services/structured-data.service';
import { 
  Invoice, 
  Quote, 
  DeliveryNote, 
  FaqArticle, 
  CompanyInfo, 
  Customer 
} from '../types/collections';
import { ObjectId } from 'mongodb';

async function testStructuredDataService() {
  console.log('🚀 構造化データサービステスト開始');
  
  const service = new StructuredDataService();
  
  try {
    // テストデータの準備
    const testInvoice: Invoice = {
      _id: new ObjectId(),
      invoiceNumber: 'INV-2025-001',
      customerId: new ObjectId(),
      customer: {
        _id: new ObjectId(),
        companyName: '株式会社テストカンパニー',
        email: 'test@company.co.jp',
        phone: '03-1234-5678',
        address1: '東京都渋谷区1-1-1',
        city: '渋谷区',
        prefecture: '東京都',
        postalCode: '150-0001',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      issueDate: new Date('2025-01-15'),
      dueDate: new Date('2025-01-31'),
      items: [
        {
          itemName: 'Webサイト制作',
          description: 'コーポレートサイトの制作',
          quantity: 1,
          unitPrice: 300000,
          amount: 300000,
          taxRate: 10,
          taxAmount: 30000
        },
        {
          itemName: 'SEO対策',
          description: '検索エンジン最適化サービス',
          quantity: 3,
          unitPrice: 50000,
          amount: 150000,
          taxRate: 10,
          taxAmount: 15000
        }
      ],
      subtotal: 450000,
      taxAmount: 45000,
      taxRate: 10,
      totalAmount: 495000,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const testFaq: FaqArticle = {
      _id: new ObjectId(),
      question: '消費税の計算方法を教えてください',
      answer: '消費税は商品・サービスの価格に対して10%（軽減税率対象は8%）を掛けて計算します。計算式：税抜価格 × 税率 = 消費税額',
      category: '税務',
      tags: ['消費税', '計算', '税率'],
      difficulty: 'beginner',
      priority: 8,
      structuredData: {
        contentType: 'tax',
        taxLaw: ['消費税法'],
        applicableBusinessTypes: ['全業種'],
        relatedRegulations: ['軽減税率制度'],
        effectiveDate: new Date('2019-10-01')
      },
      sourceInfo: {
        generatedBy: 'manual',
        generatedAt: new Date()
      },
      qualityMetrics: {
        accuracy: 95,
        completeness: 90,
        clarity: 92,
        usefulness: 94,
        overallScore: 93
      },
      usageStats: {
        viewCount: 150,
        helpfulVotes: 12,
        unhelpfulVotes: 1,
        relatedQuestions: []
      },
      status: 'published',
      isPublished: true,
      isFeatured: false,
      version: 1,
      previousVersions: [],
      searchKeywords: ['消費税', '計算方法', '税率'],
      relatedFaqIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: new Date()
    };

    console.log('\n📋 テスト1: 請求書の構造化データ生成');
    const invoiceResult = await service.generateStructuredData(
      testInvoice, 
      'Invoice'
    );
    
    if (invoiceResult.success) {
      console.log('✅ 請求書の構造化データ生成成功');
      console.log('📊 メタデータ:', invoiceResult.metadata);
      console.log('📝 生成データ（一部）:', {
        '@type': invoiceResult.data?.['@type'],
        identifier: invoiceResult.data?.identifier,
        totalPaymentDue: invoiceResult.data?.totalPaymentDue
      });
      
      // JSON-LD形式で出力
      const jsonLd = JSON.stringify(invoiceResult.data, null, 2);
      console.log('📄 JSON-LD形式 (最初の200文字):', jsonLd.substring(0, 200) + '...');
    } else {
      console.error('❌ 請求書の構造化データ生成失敗:', invoiceResult.errors);
    }

    console.log('\n📋 テスト2: FAQの構造化データ生成');
    const faqResult = await service.generateStructuredData(
      testFaq,
      'FAQPage'
    );
    
    if (faqResult.success) {
      console.log('✅ FAQの構造化データ生成成功');
      console.log('📊 メタデータ:', faqResult.metadata);
      console.log('📝 生成データ（一部）:', {
        '@type': faqResult.data?.['@type'],
        mainEntity: faqResult.data?.mainEntity?.length + ' questions'
      });
    } else {
      console.error('❌ FAQの構造化データ生成失敗:', faqResult.errors);
    }

    console.log('\n📋 テスト3: 構造化データの検証');
    const validationResult = service.validateSchema(invoiceResult.data, 'Invoice');
    
    if (validationResult.isValid) {
      console.log('✅ スキーマ検証成功');
    } else {
      console.error('❌ スキーマ検証失敗:', validationResult.errors);
    }

    if (validationResult.warnings && validationResult.warnings.length > 0) {
      console.warn('⚠️ 警告:', validationResult.warnings);
    }

    console.log('\n📋 テスト4: 統計情報の取得');
    const stats = await service.getStats();
    console.log('📈 統計情報:', stats);

    console.log('\n✅ すべてのテストが完了しました');

  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
  } finally {
    await service.close();
  }
}

async function testAPIEndpoints() {
  console.log('\n🌐 API エンドポイントテスト開始');
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    // テスト用のFAQデータ
    const testFaqData = {
      question: 'インボイス制度とは何ですか？',
      answer: 'インボイス制度は、適格請求書等保存方式のことで、2023年10月1日から導入された制度です。消費税の仕入税額控除を受けるために必要な要件を定めています。',
      category: '税務',
      tags: ['インボイス', '適格請求書', '消費税'],
      difficulty: 'intermediate',
      contentType: 'tax',
      isPublished: true
    };

    console.log('\n📋 APIテスト1: FAQ作成（構造化データ自動生成付き）');
    
    const createResponse = await fetch(`${baseUrl}/api/faq`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testFaqData)
    });

    if (!createResponse.ok) {
      throw new Error(`HTTP error! status: ${createResponse.status}`);
    }

    const createResult = await createResponse.json();
    console.log('✅ FAQ作成成功:', createResult);

    console.log('\n📋 APIテスト2: FAQ取得（構造化データ付き）');
    
    const searchResponse = await fetch(`${baseUrl}/api/faq?includeStructuredData=true&limit=1`);
    
    if (!searchResponse.ok) {
      throw new Error(`HTTP error! status: ${searchResponse.status}`);
    }

    const searchResult = await searchResponse.json();
    console.log('✅ FAQ検索成功（構造化データ付き）');
    console.log('📊 結果数:', searchResult.faqs?.length);
    
    if (searchResult.faqs?.[0]?.structuredData) {
      console.log('✅ 構造化データが正常に含まれています');
      console.log('📝 構造化データタイプ:', searchResult.faqs[0].structuredData['@type']);
    } else {
      console.log('⚠️ 構造化データが含まれていません');
    }

    console.log('\n📋 APIテスト3: 構造化データ生成API');
    
    const generateResponse = await fetch(`${baseUrl}/api/structured-data/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceData: {
          question: 'テスト質問',
          answer: 'テスト回答',
          category: 'テスト',
          tags: ['test'],
          difficulty: 'beginner',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        schemaType: 'FAQPage'
      })
    });

    if (!generateResponse.ok) {
      throw new Error(`HTTP error! status: ${generateResponse.status}`);
    }

    const generateResult = await generateResponse.json();
    console.log('✅ 構造化データ生成API成功');
    console.log('📝 生成結果:', generateResult.success ? '成功' : '失敗');

    console.log('\n📋 APIテスト4: 構造化データ検証API');
    
    const validateResponse = await fetch(`${baseUrl}/api/structured-data/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          'mainEntity': [{
            '@type': 'Question',
            'name': 'テスト質問',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'テスト回答'
            }
          }]
        },
        schemaType: 'FAQPage'
      })
    });

    if (!validateResponse.ok) {
      throw new Error(`HTTP error! status: ${validateResponse.status}`);
    }

    const validateResult = await validateResponse.json();
    console.log('✅ 構造化データ検証API成功');
    console.log('📝 検証結果:', validateResult.validation?.isValid ? '有効' : '無効');

    console.log('\n✅ すべてのAPIテストが完了しました');

  } catch (error) {
    console.error('❌ APIテストエラー:', error);
  }
}

async function main() {
  console.log('🔧 構造化データシステム Phase 1 統合テスト');
  console.log('=' + '='.repeat(50));
  
  // サービス単体テスト
  await testStructuredDataService();
  
  // APIエンドポイントテスト（開発サーバーが起動している場合）
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n' + '='.repeat(50));
    await testAPIEndpoints();
  } else {
    console.log('\n⚠️ APIテストはスキップされました（本番環境のため）');
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 テスト完了');
}

// スクリプト直接実行時のみmain関数を実行
if (require.main === module) {
  main().catch(console.error);
}

export { testStructuredDataService, testAPIEndpoints };