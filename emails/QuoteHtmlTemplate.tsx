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

// メール版ツールチップレンダリング関数を改善
const renderDetailsWithTooltip = (details: string, tooltip: string) => {
  // 開発環境でのみデバッグログを出力
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname.includes('preview'))) {
    console.log('📧 QuoteHtmlTemplate: renderDetailsWithTooltip called:', { details, hasTooltip: !!tooltip });
  }
  
  if (!tooltip || tooltip.trim() === '') {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname.includes('preview'))) {
      console.log('❌ No tooltip provided for:', details);
    }
    return <span>{details}</span>;
  }
  
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname.includes('preview'))) {
    console.log('✅ Creating tooltip for:', details, 'with tooltip:', tooltip.substring(0, 50) + '...');
  }
  
  // HTMLエスケープ処理
  const escapedDetails = details
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const escapedTooltip = tooltip
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // メール版では項目名全体をマーキングして、説明文として表示
  const markerHtml = `
    <span title="${escapedTooltip}">
      <span style="
        background: linear-gradient(180deg, transparent 50%, rgba(254, 240, 138, 0.7) 50%);
        border-bottom: 2px dotted #f59e0b;
        padding: 1px 3px;
        border-radius: 2px;
        font-weight: 600;
        position: relative;
        display: inline-block;
      ">${escapedDetails}</span>
    </span>
    <div style="
      font-size: 12px;
      color: #1565c0;
      background-color: #e3f2fd;
      border-left: 3px solid #1976d2;
      padding: 6px 10px;
      margin: 4px 0;
      border-radius: 3px;
      line-height: 1.4;
    ">
      💡 用語解説: ${escapedTooltip}
    </div>
  `;
  
  return <span dangerouslySetInnerHTML={{ __html: markerHtml }} />;
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
  suggestedOptions = [],
}: QuoteHtmlTemplateProps) {
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
            .item-row {
              border-bottom: 1px solid #f3f4f6;
              padding: 16px 0;
              display: grid;
              grid-template-columns: 1fr auto auto auto;
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
            }
            .item-quantity,
            .item-price,
            .item-total {
              text-align: right;
              font-size: 15px;
              color: #4b5563;
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
          `
        }} />
      </head>
      <body>
        <div className="container">
          {/* ヘッダー */}
          <div className="header">
            {companyInfo?.logoUrl && (
              <img
                src={companyInfo.logoUrl}
                alt={companyInfo?.companyName || companyInfo?.name || ''}
                className="logo"
              />
            )}
            <div className="company-name">
              {quote.companySnapshot?.companyName || companyInfo?.companyName || companyInfo?.name || '会社名未設定'}
            </div>
          </div>

          {/* メインコンテンツ */}
          <div>
            <h1 className="main-title">お見積書</h1>
            
            <div className="greeting">
              {recipientName || 
               (quote.customer?.storeName 
                 ? `${quote.customer.storeName}（${quote.customer?.companyName}）`
                 : quote.customerName || quote.customer?.companyName || quote.customer?.name || 'お客様')} 様
            </div>

            <div className="message">
              平素より格別のご高配を賜り、厚く御礼申し上げます。<br />
              ご依頼いただきました件について、下記の通りお見積りさせていただきます。
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
                            {item.tooltip ? 
                              renderDetailsWithTooltip(item.itemName || item.description || '', item.tooltip) :
                              (item.itemName || item.description || '')
                            }
                          </a>
                        ) : (
                          item.tooltip ? 
                            renderDetailsWithTooltip(item.itemName || item.description || '', item.tooltip) :
                            (item.itemName || item.description || '')
                        )}
                      </div>
                      {item.details && (
                        <div className={`item-details ${isDiscount ? 'discount' : ''}`}>
                          {item.tooltip ? 
                            renderDetailsWithTooltip(item.details, item.tooltip) :
                            item.details
                          }
                        </div>
                      )}
                    </div>
                    <div className={`item-quantity ${isDiscount ? 'discount' : ''}`}>
                      {item.quantity} {item.unit || '個'}
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

            {/* 備考 */}
            {(() => {
              // より寛容な備考チェック（空白文字を除いて何か内容があるか）
              const normalizedNotes = quote.notes ? quote.notes.trim() : '';
              const hasNotes = normalizedNotes && normalizedNotes.length > 0;
              
              // 開発環境でのみデバッグログを出力
              if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname.includes('preview'))) {
                console.log('📝 QuoteHtmlTemplate notes check (enhanced):', {
                  originalNotes: quote.notes,
                  normalizedNotes: normalizedNotes,
                  hasNotes: hasNotes,
                  notesLength: normalizedNotes.length,
                  notesPreview: normalizedNotes.substring(0, 100) || 'なし'
                });
              }
              
              return hasNotes ? (
                <div className="notes-section">
                  <div className="notes-title">備考</div>
                  <div className="notes-text">{cleanDuplicateSignatures(normalizedNotes)}</div>
                </div>
              ) : null;
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
            <div className="footer-text">
              <a href={`${baseUrl}/privacy`} className="footer-link">プライバシーポリシー</a>
              {' | '}
              <a href={`${baseUrl}/terms`} className="footer-link">利用規約</a>
              {' | '}
              <a href={`${baseUrl}/contact`} className="footer-link">お問い合わせ</a>
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