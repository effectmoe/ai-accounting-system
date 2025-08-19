import React from 'react';
import { Quote, CompanyInfo } from '@/types/collections';
import { cleanDuplicateSignatures } from '@/lib/utils/clean-duplicate-signatures';

interface QuoteHtmlTemplateProps {
  quote: Quote;
  companyInfo: CompanyInfo;
  recipientName?: string;
  viewOnlineUrl?: string;
  acceptUrl?: string;
  considerUrl?: string;
  discussUrl?: string;
  trackingPixelUrl?: string;
  customMessage?: string;
  greetingMessage?: string;
  suggestedOptions?: SuggestedOption[];
}

interface SuggestedOption {
  title: string;
  description: string;
  price: string;
  features: string[];
  ctaText: string;
  ctaUrl: string;
}

// ツールチップ辞書を定義（QuoteHtmlTemplate用）
const TOOLTIP_DICTIONARY = new Map<string, string>([
  ['LLMO', '大規模言語モデル最適化技術'],
  ['SaaS', 'Software as a Service - クラウド経由で提供されるソフトウェア'],
  ['API', 'Application Programming Interface - システム間の連携インターフェース'],
  ['UI/UX', 'ユーザーインターフェース/ユーザー体験 - 使いやすさとデザイン'],
  ['レスポンシブ', 'PC・スマホ・タブレットなど、あらゆる画面サイズに対応'],
  ['SEO', 'Search Engine Optimization - 検索エンジン最適化'],
  ['ROI', 'Return on Investment - 投資収益率'],
  ['KPI', 'Key Performance Indicator - 重要業績評価指標'],
  ['リードタイム', '発注から納品までの期間'],
  ['LLMOモニタリング', 'AIを活用したWebサイトの最適化とモニタリングサービス。サイトのパフォーマンス、検索順位、ユーザー行動を継続的に分析し、改善提案を行います'],
  ['モニタリング', 'サイトのパフォーマンスや検索順位を継続的に監視・分析するサービス'],
  ['最適化', 'システムやプロセスをより効率的に改善すること'],
  ['パフォーマンス', 'システムの処理能力や応答速度の性能'],
  ['システム', 'コンピュータとソフトウェアを組み合わせた仕組み'],
  ['開発', 'ソフトウェアやシステムを設計・構築すること'],
  ['構築', 'システムやWebサイトを作り上げること'],
  ['設計', 'システムの設計図を作成すること'],
  ['保守', 'システムの維持・管理・改善作業'],
  ['運用', 'システムを日常的に運用・管理すること'],
  ['メンテナンス', 'システムの保守点検・改良作業'],
  ['アップデート', 'ソフトウェアやシステムの更新・改善'],
  ['カスタマイズ', 'お客様のご要望に合わせた独自の調整・改修'],
  ['サポート', '技術支援・問題解決・使い方指導']
]);

// 用語説明を収集する関数
const collectTermsFromItems = (items: any[]) => {
  const terms = new Map<string, string>();
  const sortedKeywords = Array.from(TOOLTIP_DICTIONARY.keys()).sort((a, b) => b.length - a.length);
  
  items.forEach(item => {
    const itemText = (item.itemName || '') + ' ' + (item.details || '') + ' ' + (item.description || '');
    
    // 各キーワードをチェック
    for (const keyword of sortedKeywords) {
      if (itemText.includes(keyword) && !terms.has(keyword)) {
        const explanation = TOOLTIP_DICTIONARY.get(keyword) || '';
        if (explanation) {
          terms.set(keyword, explanation);
        }
      }
    }
  });
  
  return terms;
};

// メール版では通常のテキストのみを表示する関数（インライン注釈なし）
const renderCleanText = (text: string) => {
  return <span>{text}</span>;
};

export default function QuoteHtmlTemplate({
  quote,
  companyInfo,
  recipientName,
  viewOnlineUrl,
  acceptUrl,
  considerUrl,
  discussUrl,
  trackingPixelUrl,
  customMessage,
  greetingMessage,
  suggestedOptions = [],
}: QuoteHtmlTemplateProps) {
  // デバッグログ
  console.log('📧 [QUOTE-HTML-TEMPLATE:START] QuoteHtmlTemplate rendering started at:', new Date().toISOString());
  console.log('📧 [QUOTE-HTML-TEMPLATE:PROPS] Received props:', {
    hasQuote: !!quote,
    quoteId: quote?._id,
    quoteNumber: quote?.quoteNumber,
    hasNotes: !!quote?.notes,
    notesValue: quote?.notes,
    notesType: typeof quote?.notes,
    notesLength: quote?.notes?.length || 0,
    hasCompanyInfo: !!companyInfo,
    recipientName,
    hasCustomMessage: !!customMessage,
    customMessage,
    suggestedOptionsCount: suggestedOptions?.length || 0,
    hasViewOnlineUrl: !!viewOnlineUrl,
    hasAcceptUrl: !!acceptUrl,
    timestamp: new Date().toISOString()
  });
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accounting-automation.vercel.app';
  const brandColor = '#3B82F6';
  const accentColor = '#10B981';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  };

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{quote.title || `お見積書 #${quote.quoteNumber}`}</title>
        {/* Deploy Version: 644353e87 | Build Date: 2025-08-18 17:20 JST | Email Tooltip Fix Applied */}
        <style dangerouslySetInnerHTML={{
          __html: `
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif;
              background-color: #f6f9fc;
              color: #1f2937;
              line-height: 1.5;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              padding: 20px;
            }
            .header {
              text-align: center;
              padding: 24px 20px;
              background-color: #f8fafc;
              margin-bottom: 20px;
            }
            .logo {
              max-width: 150px;
              height: auto;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #1f2937;
              margin-top: 16px;
            }
            .main-title {
              font-size: 32px;
              font-weight: bold;
              text-align: center;
              color: #1f2937;
              margin: 30px 0;
            }
            .greeting {
              font-size: 18px;
              font-weight: bold;
              color: #1f2937;
              margin: 20px 0;
            }
            .message {
              font-size: 16px;
              color: #4b5563;
              line-height: 1.75;
              margin: 16px 0;
            }
            .custom-message {
              background-color: #eff6ff;
              border-radius: 8px;
              padding: 16px;
              margin: 20px 0;
            }
            .quote-info {
              display: flex;
              gap: 20px;
              margin: 30px 0;
              flex-wrap: wrap;
            }
            .info-item {
              flex: 1;
              min-width: 150px;
            }
            .info-label {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 4px;
            }
            .info-value {
              font-size: 16px;
              font-weight: bold;
              color: #1f2937;
            }
            .divider {
              border: none;
              border-top: 1px solid #e5e7eb;
              margin: 30px 0;
            }
            .section-title {
              font-size: 24px;
              font-weight: bold;
              color: #1f2937;
              margin: 30px 0 20px;
            }
            .item-header {
              display: grid;
              grid-template-columns: 2fr 100px 120px 120px;
              gap: 20px;
              padding: 12px 0;
              border-bottom: 2px solid #e5e7eb;
              font-weight: 600;
              color: #374151;
              background-color: #f9fafb;
              margin: 0 -20px;
              padding-left: 20px;
              padding-right: 20px;
            }
            .item-header > div {
              font-size: 14px;
            }
            .item-header > div:not(:first-child) {
              text-align: right;
            }
            .item-row {
              border-bottom: 1px solid #f3f4f6;
              padding: 16px 0;
              display: grid;
              grid-template-columns: 2fr 100px 120px 120px;
              gap: 20px;
              align-items: start;
            }
            .item-name {
              font-size: 15px;
              font-weight: 500;
              color: #1f2937;
              margin-bottom: 4px;
            }
            .item-details {
              font-size: 13px;
              color: #6b7280;
              line-height: 1.5;
              margin-top: 2px;
            }
            .item-quantity,
            .item-price,
            .item-total {
              text-align: right;
              font-size: 15px;
              color: #4b5563;
              white-space: nowrap;
            }
            .item-total {
              font-weight: bold;
              color: #1f2937;
            }
            .discount {
              color: #dc2626 !important;
              font-weight: bold;
            }
            .total-section {
              margin: 30px 0;
            }
            .total-row {
              display: grid;
              grid-template-columns: 1fr auto;
              gap: 20px;
              padding: 8px 0;
            }
            .total-label {
              text-align: right;
              font-size: 16px;
              color: #4b5563;
            }
            .total-value {
              text-align: right;
              font-size: 16px;
              color: #1f2937;
            }
            .grand-total {
              border-top: 2px solid #1f2937;
              padding-top: 12px;
              margin-top: 12px;
            }
            .grand-total .total-label {
              font-size: 18px;
              font-weight: bold;
            }
            .grand-total .total-value {
              font-size: 24px;
              font-weight: bold;
              color: #3B82F6;
            }
            .cta-section {
              text-align: center;
              margin: 40px 0;
            }
            .btn {
              display: inline-block;
              padding: 12px 32px;
              margin: 0 8px 8px;
              border-radius: 8px;
              text-decoration: none;
              font-size: 16px;
              font-weight: bold;
              text-align: center;
            }
            .btn-primary {
              background-color: #3B82F6;
              color: #ffffff;
            }
            .btn-secondary {
              background-color: #ffffff;
              color: #3B82F6;
              border: 2px solid #3B82F6;
            }
            .btn-tertiary {
              background-color: #ffffff;
              color: #6B7280;
              border: 2px solid #6B7280;
            }
            .notes-section {
              background-color: #f9fafb;
              border-radius: 8px;
              padding: 20px;
              margin: 30px 0;
            }
            .notes-title {
              font-size: 18px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 10px;
            }
            .notes-text {
              font-size: 14px;
              color: #4b5563;
              line-height: 1.6;
            }
            .company-section {
              margin: 40px 0;
              padding-top: 30px;
              border-top: 1px solid #e5e7eb;
            }
            .company-details {
              font-size: 14px;
              color: #4b5563;
              margin: 4px 0;
            }
            .footer {
              text-align: center;
              padding: 24px 20px;
              background-color: #f8fafc;
              margin-top: 40px;
              border-top: 1px solid #e5e7eb;
            }
            .footer-text {
              font-size: 12px;
              color: #6b7280;
              margin: 8px 0;
            }
            .footer-link {
              color: #3B82F6;
              text-decoration: none;
            }
            .suggestions-section {
              margin: 40px 0;
            }
            .suggestion-card {
              background-color: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 20px;
              margin: 16px 0;
            }
            .suggestion-title {
              font-size: 18px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 8px;
            }
            .suggestion-description {
              font-size: 14px;
              color: #4b5563;
              line-height: 1.6;
              margin: 8px 0;
              white-space: pre-wrap;
            }
            .suggestion-price {
              font-size: 16px;
              font-weight: bold;
              color: #10B981;
              margin: 12px 0;
            }
            .feature-list {
              margin: 12px 0;
              padding-left: 20px;
            }
            .feature-item {
              font-size: 14px;
              color: #4b5563;
              margin: 4px 0;
            }
            .suggestion-button {
              background-color: #10B981;
              color: #ffffff;
              padding: 10px 20px;
              border-radius: 6px;
              text-decoration: none;
              font-size: 14px;
              font-weight: bold;
              display: inline-block;
              margin-top: 16px;
            }
            /* 用語説明セクション */
            .terms-section {
              margin: 40px 0;
            }
            .terms-content {
              background-color: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #3B82F6;
            }
            .term-item {
              font-size: 14px;
              color: #4b5563;
              line-height: 1.6;
              margin: 8px 0;
            }
            .term-item strong {
              color: #1f2937;
              font-weight: 600;
            }
            /* モバイルメールクライアント対応 */
            @media screen and (max-width: 600px) {
              .item-header {
                display: none;
              }
              .item-row {
                grid-template-columns: 1fr;
                gap: 8px;
              }
              .item-quantity,
              .item-price,
              .item-total {
                text-align: left;
                margin-top: 4px;
              }
              .item-quantity::before {
                content: "数量: ";
                font-weight: 600;
              }
              .item-price::before {
                content: "単価: ";
                font-weight: 600;
              }
              .item-total::before {
                content: "金額: ";
                font-weight: 600;
              }
              .terms-content {
                padding: 15px;
              }
              .term-item {
                font-size: 13px;
                margin: 6px 0;
              }
            }
          `
        }} />
      </head>
      <body>
        <div className="container">
          {/* メインコンテンツ */}
          <div>
            <h1 className="main-title">お見積書</h1>
            
            {/* 顧客情報セクション（従来の見積書形式） */}
            <div style={{
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              padding: '20px',
              margin: '20px 0'
            }}>
              <div className="greeting" style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#1f2937',
                borderBottom: '2px solid #e0e0e0',
                paddingBottom: '10px',
                marginBottom: '15px'
              }}>
                {recipientName || 
                 (quote.customer?.storeName 
                   ? `${quote.customer.storeName}（${quote.customer?.companyName}）`
                   : quote.customerName || quote.customer?.companyName || quote.customer?.name || 'お客様')} 様
              </div>
              
              {/* 顧客詳細情報 */}
              {quote.customer?.companyName && (
                <div style={{ margin: '5px 0', fontSize: '14px', color: '#4b5563' }}>
                  <strong>会社名：</strong>{quote.customer.companyName}
                </div>
              )}
              {quote.customer?.address && (
                <div style={{ margin: '5px 0', fontSize: '14px', color: '#4b5563' }}>
                  <strong>住所：</strong>{quote.customer.address}
                </div>
              )}
              {quote.customer?.phone && (
                <div style={{ margin: '5px 0', fontSize: '14px', color: '#4b5563' }}>
                  <strong>電話番号：</strong>{quote.customer.phone}
                </div>
              )}
              {quote.customer?.email && (
                <div style={{ margin: '5px 0', fontSize: '14px', color: '#4b5563' }}>
                  <strong>メール：</strong>{quote.customer.email}
                </div>
              )}
            </div>

            {/* 挨拶文 */}
            <div className="message">
              {greetingMessage ? (
                <div dangerouslySetInnerHTML={{ __html: greetingMessage }} />
              ) : (
                <>
                  平素より格別のご高配を賜り、厚く御礼申し上げます。<br />
                  ご依頼いただきました件について、下記の通りお見積りさせていただきます。
                </>
              )}
            </div>

            {customMessage && (
              <div className="custom-message">
                <div dangerouslySetInnerHTML={{ __html: customMessage }} />
              </div>
            )}

            {/* 見積書情報 */}
            <div className="quote-info">
              <div className="info-item">
                <div className="info-label">見積書番号</div>
                <div className="info-value">{quote.quoteNumber}</div>
              </div>
              <div className="info-item">
                <div className="info-label">発行日</div>
                <div className="info-value">{formatDate(quote.issueDate)}</div>
              </div>
              <div className="info-item">
                <div className="info-label">有効期限</div>
                <div className="info-value">{formatDate(quote.validityDate)}</div>
              </div>
            </div>

            <hr className="divider" />

            {/* 見積項目 */}
            <div>
              <h2 className="section-title">見積内容</h2>
              
              {/* ヘッダー行 */}
              <div className="item-header">
                <div>品目</div>
                <div>数量</div>
                <div>単価</div>
                <div>金額</div>
              </div>
              
              {quote.items.map((item, index) => {
                // 値引き判定
                const isDiscount = (item.amount < 0) || 
                  (item.itemName && (item.itemName.includes('値引き') || item.itemName.includes('割引') || item.itemName.includes('ディスカウント')));
                
                return (
                  <div key={index} className="item-row">
                    <div>
                      <div className={`item-name ${isDiscount ? 'discount' : ''}`}>
                        {item.productLink ? (
                          <a href={item.productLink} style={{color: '#3B82F6', textDecoration: 'none'}}>
                            {renderCleanText(item.itemName || item.description || '')}
                          </a>
                        ) : (
                          renderCleanText(item.itemName || item.description || '')
                        )}
                      </div>
                      {item.details && (
                        <div className={`item-details ${isDiscount ? 'discount' : ''}`}>
                          {renderCleanText(item.details)}
                        </div>
                      )}
                    </div>
                    <div className={`item-quantity ${isDiscount ? 'discount' : ''}`}>
                      {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                    </div>
                    <div className={`item-price ${isDiscount ? 'discount' : ''}`}>
                      {formatCurrency(item.unitPrice)}
                    </div>
                    <div className={`item-total ${isDiscount ? 'discount' : ''}`}>
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                );
              })}
            </div>

            <hr className="divider" />

            {/* 合計金額 */}
            <div className="total-section">
              <div className="total-row">
                <div className="total-label">小計</div>
                <div className="total-value">{formatCurrency(Math.round(quote.subtotal))}</div>
              </div>
              <div className="total-row">
                <div className="total-label">消費税（{quote.taxRate}%）</div>
                <div className="total-value">{formatCurrency(Math.round(quote.taxAmount))}</div>
              </div>
              <div className="total-row grand-total">
                <div className="total-label">合計金額</div>
                <div className="total-value">{formatCurrency(quote.totalAmount)}</div>
              </div>
            </div>

            {/* 用語説明セクション */}
            {(() => {
              const collectedTerms = collectTermsFromItems(quote.items);
              if (collectedTerms.size === 0) {
                return null;
              }
              
              return (
                <div className="terms-section">
                  <hr className="divider" />
                  <h2 className="section-title">📖 用語説明</h2>
                  <div className="terms-content">
                    {Array.from(collectedTerms.entries()).map(([term, explanation], index) => (
                      <div key={index} className="term-item">
                        <strong>{term}</strong>: {explanation}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* 追加提案オプション */}
            {suggestedOptions.length > 0 && (
              <div className="suggestions-section">
                <hr className="divider" />
                <h2 className="section-title">🎯 お客様におすすめのオプション</h2>
                
                {suggestedOptions.map((option, index) => (
                  <div key={index} className="suggestion-card">
                    <div className="suggestion-title">{option.title}</div>
                    <div className="suggestion-description">
                      {option.description.split('\n').map((line, index) => (
                        <span key={index}>
                          {line}
                          {index < option.description.split('\n').length - 1 && <br />}
                        </span>
                      ))}
                    </div>
                    {option.price && (
                      <div className="suggestion-price">
                        追加料金: {option.price}
                      </div>
                    )}
                    {option.features && option.features.length > 0 && (
                      <ul className="feature-list">
                        {option.features.map((feature, fIndex) => (
                          <li key={fIndex} className="feature-item">{feature}</li>
                        ))}
                      </ul>
                    )}
                    {option.ctaUrl && option.ctaText && (
                      <a href={option.ctaUrl} className="suggestion-button">
                        {option.ctaText}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* CTA ボタン */}
            <div className="cta-section">
              {acceptUrl && (
                <a href={acceptUrl} className="btn btn-primary">
                  見積を承認する
                </a>
              )}
              {considerUrl && (
                <a href={considerUrl} className="btn btn-secondary">
                  検討する
                </a>
              )}
              {discussUrl && (
                <a href={discussUrl} className="btn btn-tertiary">
                  相談する
                </a>
              )}
            </div>

            {/* 備考 - 備考がある場合のみ表示 */}
            {(() => {
              // 備考の内容をチェック（型安全性とcleanDuplicateSignatures適用後の再チェック）
              const originalNotes = quote.notes;
              
              // デバッグログ（開発環境のみ）
              if (process.env.NODE_ENV === 'development') {
                console.log('📝 QuoteHtmlTemplate notes check (enhanced):', {
                  originalNotes: originalNotes,
                  originalNotesType: typeof originalNotes,
                  originalNotesLength: typeof originalNotes === 'string' ? originalNotes.length : 'N/A'
                });
              }
              
              // 型チェック: null, undefined, または文字列以外の場合は表示しない
              if (!originalNotes || typeof originalNotes !== 'string') {
                if (process.env.NODE_ENV === 'development') {
                  console.log('❌ Notes not displayed: invalid type or empty');
                }
                return null;
              }
              
              // 空白文字のみをチェック
              const trimmedNotes = originalNotes.trim();
              if (trimmedNotes.length === 0) {
                if (process.env.NODE_ENV === 'development') {
                  console.log('❌ Notes not displayed: empty after trim');
                }
                return null;
              }
              
              // cleanDuplicateSignatures関数を適用
              const cleanedNotes = cleanDuplicateSignatures(trimmedNotes);
              const finalNotes = cleanedNotes.trim();
              
              // 清拭後に内容がない場合は表示しない
              if (finalNotes.length === 0) {
                if (process.env.NODE_ENV === 'development') {
                  console.log('❌ Notes not displayed: empty after cleaning signatures');
                }
                return null;
              }
              
              // デバッグログ（開発環境のみ）
              if (process.env.NODE_ENV === 'development') {
                console.log('✅ Notes will be displayed:', {
                  trimmedLength: trimmedNotes.length,
                  cleanedLength: cleanedNotes.length,
                  finalLength: finalNotes.length,
                  finalPreview: finalNotes.substring(0, 50) + (finalNotes.length > 50 ? '...' : '')
                });
              }
              
              return (
                <div className="notes-section">
                  <div className="notes-title">備考</div>
                  <div className="notes-text notes-content">
                    {(() => {
                      // 備考テキストからツールチップマークアップを完全除去
                      const cleanNotes = finalNotes
                        .replace(/data-tooltip="[^"]*"/gi, '')
                        .replace(/tooltip-wrapper/gi, '')
                        .replace(/tooltip-content/gi, '')
                        .replace(/<span[^>]*class="[^"]*tooltip[^"]*"[^>]*>/gi, '')
                        .replace(/<\/span>/gi, '');
                      
                      return cleanNotes;
                    })()}
                  </div>
                </div>
              );
            })()}

            {/* 会社情報 */}
            <div className="company-section">
              <div className="company-name">
                {quote.companySnapshot?.companyName || companyInfo?.companyName || companyInfo?.name || '会社名未設定'}
              </div>
              <div className="company-details">
                {(() => {
                  // スナップショットを優先、次に現在の会社情報
                  if (quote.companySnapshot?.address) {
                    return quote.companySnapshot.address;
                  }
                  return [
                    companyInfo?.postalCode && `〒${companyInfo.postalCode}`,
                    companyInfo?.prefecture,
                    companyInfo?.city,
                    companyInfo?.address1,
                    companyInfo?.address2
                  ].filter(Boolean).join(' ');
                })()}
              </div>
              {(quote.companySnapshot?.phone || companyInfo?.phone) && (
                <div className="company-details">
                  TEL: {quote.companySnapshot?.phone || companyInfo?.phone}
                </div>
              )}
              {(quote.companySnapshot?.email || companyInfo?.email) && (
                <div className="company-details">
                  Email: {quote.companySnapshot?.email || companyInfo?.email}
                </div>
              )}
              {companyInfo?.website && (
                <a href={companyInfo.website} className="footer-link" style={{display: 'inline-block', margin: '4px 0'}}>
                  {companyInfo.website}
                </a>
              )}
              {companyInfo?.representativeName && (
                <div style={{fontSize: '16px', fontWeight: 'bold', color: '#1f2937', margin: '5px 0'}}>
                  代表取締役 {companyInfo.representativeName}
                </div>
              )}
              {quote.assignee && (
                <div style={{fontSize: '13px', color: '#6b7280', margin: '5px 0'}}>
                  担当: {quote.assignee}
                </div>
              )}
            </div>
          </div>

          {/* フッター */}
          <div className="footer">
            <div className="footer-text">
              このメールは {quote.companySnapshot?.companyName || companyInfo?.companyName || companyInfo?.name || '会社名未設定'} より送信されました。
            </div>
            <hr style={{borderColor: '#e5e7eb', margin: '20px 0 10px'}} />
            <div className="footer-text">
              このシステムはAI駆動によるAAM-Accountingシステムです powered by{' '}
              <a 
                href="https://notion.effect.moe/"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                EFFECT Inc.
              </a>
            </div>
          </div>

          {/* トラッキングピクセル */}
          {trackingPixelUrl && (
            <img
              src={trackingPixelUrl}
              width="1"
              height="1"
              alt=""
              style={{ display: 'none' }}
            />
          )}
        </div>
      </body>
    </html>
  );
}