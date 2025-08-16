import React from 'react';
import { Quote, CompanyInfo } from '@/types/collections';
import { cleanDuplicateSignatures } from '@/lib/utils/clean-duplicate-signatures';

interface QuoteWebTemplateProps {
  quote: Quote;
  companyInfo: CompanyInfo;
  recipientName?: string;
  viewOnlineUrl?: string;
  acceptUrl?: string;
  considerUrl?: string;  // 検討するボタン用のURL
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

// ツールチップレンダリング関数の改善
// Updated: 2025-08-16
const renderDetailsWithTooltip = (details: string, tooltip: string) => {
  if (!tooltip || tooltip.trim() === '') {
    return <span>{details}</span>;
  }
  
  // HTMLエスケープ処理
  const escapedTooltip = tooltip.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  
  // ツールチップ内の主要な用語を抽出（ROI、KPI、CRMなどの英語略語を優先）
  const englishKeywords = tooltip.match(/\b[A-Z]{2,}\b/g) || [];
  // カタカナのキーワードも抽出
  const katakanaKeywords = tooltip.match(/[ァ-ヶー]{3,}/g) || [];
  // 専門用語的な漢字のキーワードも抽出
  const kanjiKeywords = tooltip.match(/[一-龯]{2,4}(?:率|額|費|価|値|量|数)/g) || [];
  
  const allKeywords = [...englishKeywords, ...katakanaKeywords, ...kanjiKeywords];
  let processedDetails = details;
  
  // 各キーワードをツールチップ付きスパンに変換
  allKeywords.forEach(keyword => {
    if (details.includes(keyword)) {
      const markerHtml = `
        <span class="tooltip-wrapper">
          <span style="
            background: linear-gradient(180deg, transparent 60%, rgba(254, 240, 138, 0.5) 60%);
            cursor: help;
            border-radius: 2px;
            padding: 0 2px;
            border-bottom: 1px dotted #333;
          ">${keyword}</span>
          <span class="tooltip-content">💡 ${escapedTooltip}</span>
        </span>
      `;
      processedDetails = processedDetails.replace(
        new RegExp(`\\b${keyword}\\b`, 'g'),
        markerHtml
      );
    }
  });
  
  // キーワードが見つからない場合は、文頭の重要そうな語句にマーカーを付ける
  if (processedDetails === details && details.length > 0) {
    // 最初の単語（英数字または3文字以上の語句）を対象にする
    const firstWord = details.match(/^[A-Za-z0-9]+|^[ァ-ヶー]{2,}|^[一-龯]{2,}/);
    if (firstWord && firstWord[0]) {
      const word = firstWord[0];
      const markerHtml = `
        <span class="tooltip-wrapper">
          <span style="
            background: linear-gradient(180deg, transparent 60%, #fef3c7 60%);
            cursor: help;
            border-radius: 2px;
            padding: 0 2px;
            border-bottom: 1px dotted #333;
          ">${word}</span>
          <span class="tooltip-content">💡 ${escapedTooltip}</span>
        </span>
      `;
      processedDetails = details.replace(word, markerHtml);
    }
  }
  
  return <span dangerouslySetInnerHTML={{ __html: processedDetails }} />;
};

export default function QuoteWebTemplate({
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
}: QuoteWebTemplateProps) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accounting-automation.vercel.app';
  
  // デバッグ用ログ
  if (typeof console !== 'undefined') {
    console.log('[QuoteWebTemplate] Rendering with:', {
      companyName: companyInfo?.companyName || companyInfo?.name || '未設定',
      suggestedOptionsCount: suggestedOptions?.length || 0,
      hasQuoteItems: !!quote?.items,
      itemsCount: quote?.items?.length || 0,
    });
  }
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
    <div style={containerStyle} className="main-container">
      {/* ビューポート設定 */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      
      {/* レスポンシブ対応のCSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* リセットとベース設定 */
          * {
            box-sizing: border-box;
          }
          
          html {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }
          
          body {
            margin: 0;
            padding: 0;
            width: 100%;
            overflow-x: hidden;
          }
          
          /* コンテナの基本設定 */
          @media screen and (min-width: 1200px) {
            .main-container {
              max-width: 1200px !important;
              margin: 0 auto !important;
            }
          }
          
          @media screen and (min-width: 768px) and (max-width: 1199px) {
            .main-container {
              max-width: 90% !important;
              margin: 0 auto !important;
            }
          }
          
          @media screen and (max-width: 767px) {
            .main-container {
              max-width: 100% !important;
              padding: 0 1rem !important;
            }
          }
          
          /* ツールチップのホバー効果とタッチ対応 */
          .tooltip-wrapper {
            position: relative;
            display: inline-block;
            border-bottom: 1px dotted #333;
            cursor: help;
          }
          
          .tooltip-content {
            visibility: hidden;
            opacity: 0;
            background-color: rgba(254, 240, 138, 0.95);
            color: #333;
            text-align: left;
            border-radius: 6px;
            padding: 8px 12px;
            position: absolute;
            z-index: 9999; /* より高いz-indexに変更 */
            bottom: 125%;
            left: 50%;
            transform: translateX(-50%);
            width: 250px;
            font-size: 13px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: opacity 0.3s, visibility 0.3s;
            pointer-events: none; /* マウスイベントを無視 */
            white-space: normal;
            line-height: 1.4;
          }
          
          /* ホバー時の表示を確実にする */
          .tooltip-wrapper:hover .tooltip-content {
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          /* デスクトップ: ホバーで表示 */
          @media (hover: hover) and (pointer: fine) {
            .tooltip-wrapper:hover .tooltip-content {
              visibility: visible !important;
              opacity: 1 !important;
            }
          }
          
          /* モバイル: タップで表示 */
          .tooltip-wrapper.active .tooltip-content {
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          .tooltip-content::after {
            content: "";
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border-width: 5px;
            border-style: solid;
            border-color: rgba(254, 240, 138, 0.95) transparent transparent transparent;
          }
          
          /* デスクトップファースト → モバイルファーストアプローチに変更 */
          @media screen and (max-width: 768px) {
            html, body {
              font-size: 16px !important;
              width: 100% !important;
              overflow-x: hidden !important;
            }
            
            .quote-header { 
              flex-direction: column !important; 
              text-align: center !important;
              padding: 1rem !important;
              width: 100% !important;
            }
            
            .quote-info-grid { 
              grid-template-columns: 1fr !important; 
              gap: 1rem !important; 
            }
            
            .quote-parties-grid { 
              grid-template-columns: 1fr !important; 
              gap: 1.5rem !important; 
            }
            
            .quote-summary { 
              padding: 1.5rem !important;
              width: 100% !important;
              min-width: auto !important;
            }
            
            .quote-actions { 
              flex-direction: column !important; 
              gap: 1rem !important;
              padding: 0 1rem !important;
            }
            
            .suggested-options-grid { 
              grid-template-columns: 1fr !important; 
            }
            
            /* モバイルでの文字サイズと余白調整 */
            h1 { 
              font-size: 1.75rem !important;
              margin: 1rem 0 !important;
              line-height: 1.3 !important;
            }
            
            h2 { 
              font-size: 1.5rem !important;
              margin-bottom: 1rem !important;
            }
            
            h3 { 
              font-size: 1.25rem !important; 
            }
            
            /* 項目カードの調整 */
            .item-card {
              padding: 1.25rem !important;
            }
            
            .item-name {
              font-size: 1rem !important;
              margin-bottom: 0.5rem !important;
            }
            
            .item-amount {
              font-size: 1.125rem !important;
            }
            
            .item-details {
              font-size: 0.875rem !important;
              line-height: 1.6 !important;
              margin: 0.75rem 0 !important;
            }
            
            .item-meta {
              font-size: 0.8125rem !important;
            }
            
            /* ボタンの調整 */
            .cta-button {
              padding: 1rem 1.5rem !important;
              font-size: 1rem !important;
              width: 100% !important;
              min-width: auto !important;
            }
            
            /* 情報カードの調整 */
            .info-card {
              padding: 1.25rem !important;
            }
            
            /* パーティカードの調整 */
            .party-card {
              padding: 1.25rem !important;
            }
            
            .party-details {
              font-size: 0.9375rem !important;
              line-height: 1.75 !important;
            }
            
            /* モバイルでのツールチップ調整 */
            .tooltip-content {
              white-space: normal;
              width: calc(100vw - 3rem);
              max-width: 300px;
              left: 50%;
              transform: translateX(-50%);
              font-size: 0.875rem;
              padding: 0.875rem;
            }
            
            /* ツールチップが画面外に出ないように調整 */
            .tooltip-wrapper:first-child .tooltip-content {
              left: 0;
              transform: none;
            }
            
            .tooltip-wrapper:last-child .tooltip-content {
              left: auto;
              right: 0;
              transform: none;
            }
          }
          
          /* タブレット向けレイアウト */
          @media screen and (min-width: 769px) and (max-width: 1024px) {
            .main-container {
              padding: 0 2rem !important;
            }
            
            .quote-info-grid { 
              grid-template-columns: repeat(2, 1fr) !important; 
            }
            
            .suggested-options-grid { 
              grid-template-columns: repeat(2, 1fr) !important; 
            }
            
            h1 {
              font-size: 2.25rem !important;
            }
            
            h2 {
              font-size: 1.75rem !important;
            }
          }
          
          /* デスクトップ向けレイアウト */
          @media screen and (min-width: 1025px) {
            .main-container {
              padding: 0 2rem !important;
            }
            
            .quote-info-grid { 
              grid-template-columns: repeat(3, 1fr) !important; 
            }
            
            .suggested-options-grid { 
              grid-template-columns: repeat(3, 1fr) !important; 
            }
            
            h1 {
              font-size: 2.5rem !important;
            }
            
            h2 {
              font-size: 1.875rem !important;
            }
            
            .quote-parties-grid {
              grid-template-columns: repeat(2, 1fr) !important;
            }
            
            .quote-actions {
              flex-direction: row !important;
              justify-content: center !important;
            }
          }
        `
      }} />

      {/* ヘッダー */}
      <header style={headerStyle}>
        <div style={headerContentStyle} className="quote-header">
          <div style={logoSectionStyle}>
            {companyInfo?.logoUrl && (
              <img
                src={companyInfo.logoUrl}
                alt={companyInfo?.companyName || companyInfo?.name || ''}
                style={logoStyle}
              />
            )}
          </div>
        </div>
      </header>

      {/* JavaScriptでタッチイベントを処理 */}
      <script dangerouslySetInnerHTML={{
        __html: `
          // モバイルでのツールチップタッチ対応
          if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            document.addEventListener('DOMContentLoaded', function() {
              const tooltipWrappers = document.querySelectorAll('.tooltip-wrapper');
              
              tooltipWrappers.forEach(wrapper => {
                wrapper.addEventListener('touchstart', function(e) {
                  e.stopPropagation();
                  
                  // 他のアクティブなツールチップを閉じる
                  document.querySelectorAll('.tooltip-wrapper.active').forEach(w => {
                    if (w !== wrapper) w.classList.remove('active');
                  });
                  
                  // 現在のツールチップをトグル
                  wrapper.classList.toggle('active');
                });
              });
              
              // 画面の他の場所をタップしたらツールチップを閉じる
              document.addEventListener('touchstart', function(e) {
                if (!e.target.closest('.tooltip-wrapper')) {
                  document.querySelectorAll('.tooltip-wrapper.active').forEach(w => {
                    w.classList.remove('active');
                  });
                }
              });
            });
          }
        `
      }} />

      {/* メインコンテンツ */}
      <main style={mainStyle}>
        {/* タイトルセクション */}
        <section style={titleSectionStyle}>
          <h1 style={h1Style}>お見積書</h1>
        </section>

        {/* カスタムメッセージ */}
        {customMessage && (
          <section style={customMessageSectionStyle}>
            <div style={customMessageContentStyle}>
              {customMessage.split('\n').map((line, index) => (
                <p key={index} style={{ margin: '0.5rem 0' }}>{line}</p>
              ))}
            </div>
          </section>
        )}

        {/* 見積書情報（3カラム→2カラム→1カラム） */}
        <section style={quoteInfoSectionStyle}>
          <div style={quoteInfoGridStyle} className="quote-info-grid">
            <div style={infoCardStyle} className="info-card">
              <div style={infoLabelStyle}>見積書番号</div>
              <div style={infoValueStyle}>{quote.quoteNumber}</div>
            </div>
            <div style={infoCardStyle} className="info-card">
              <div style={infoLabelStyle}>発行日</div>
              <div style={infoValueStyle}>{formatDate(quote.issueDate)}</div>
            </div>
            <div style={infoCardStyle} className="info-card">
              <div style={infoLabelStyle}>有効期限</div>
              <div style={infoValueStyle}>{formatDate(quote.validityDate)}</div>
            </div>
          </div>
        </section>

        <hr style={dividerStyle} />

        {/* 取引先情報（2カラム→1カラム） */}
        <section style={partiesSectionStyle}>
          <div style={partiesGridStyle} className="quote-parties-grid">
            {/* 送信先 */}
            <div style={partyCardStyle} className="party-card">
              <h3 style={partyTitleStyle}>送信先</h3>
              <div style={partyDetailsStyle} className="party-details">
                <div style={partyCompanyStyle}>{quote.customer?.companyName || '顧客未設定'}</div>
                {quote.customer?.contacts?.[0]?.name && (
                  <div>{quote.customer.contacts[0].name} 様</div>
                )}
                {(quote.customer?.prefecture || quote.customer?.city || quote.customer?.address1) && (
                  <div>
                    {quote.customer.postalCode && `〒${quote.customer.postalCode} `}
                    {quote.customer.prefecture}
                    {quote.customer.city}
                    {quote.customer.address1}
                    {quote.customer.address2}
                  </div>
                )}
                {quote.customer?.phone && <div>TEL: {quote.customer.phone}</div>}
                {quote.customer?.email && <div>Email: {quote.customer.email}</div>}
              </div>
            </div>

            {/* 発行元 */}
            <div style={partyCardStyle} className="party-card">
              <h3 style={partyTitleStyle}>発行元</h3>
              <div style={partyDetailsStyle} className="party-details">
                <div style={partyCompanyStyle}>
                  {quote.companySnapshot?.companyName || companyInfo?.companyName || companyInfo?.name || '会社名未設定'}
                </div>
                {/* 住所の組み立て - スナップショットを優先、次に現在の会社情報 */}
                {(() => {
                  const snapshotAddress = quote.companySnapshot?.address;
                  const currentAddress = (companyInfo?.postalCode || companyInfo?.prefecture || companyInfo?.city || companyInfo?.address1 || companyInfo?.address2 || companyInfo?.address) && 
                    [
                      companyInfo?.postalCode && `〒${companyInfo.postalCode}`,
                      companyInfo?.prefecture,
                      companyInfo?.city,
                      companyInfo?.address1,
                      companyInfo?.address2,
                      !companyInfo?.postalCode && !companyInfo?.prefecture && !companyInfo?.city && !companyInfo?.address1 && !companyInfo?.address2 && companyInfo?.address
                    ].filter(Boolean).join(' ');
                  
                  return (snapshotAddress || currentAddress) && (
                    <div>{snapshotAddress || currentAddress}</div>
                  );
                })()}
                {(quote.companySnapshot?.phone || companyInfo?.phone) && (
                  <div>TEL: {quote.companySnapshot?.phone || companyInfo?.phone}</div>
                )}
                {(quote.companySnapshot?.email || companyInfo?.email) && (
                  <div>Email: {quote.companySnapshot?.email || companyInfo?.email}</div>
                )}
                {(quote.companySnapshot?.invoiceRegistrationNumber || companyInfo?.invoiceRegistrationNumber || companyInfo?.registrationNumber) && (
                  <div>登録番号: {quote.companySnapshot?.invoiceRegistrationNumber || companyInfo?.invoiceRegistrationNumber || companyInfo?.registrationNumber}</div>
                )}
                {quote.assignee && <div>担当者: {quote.assignee}</div>}
              </div>
            </div>
          </div>
        </section>

        <hr style={dividerStyle} />

        {/* 見積項目 */}
        <section style={itemsSectionStyle}>
          <h2 style={h2Style}>見積内容</h2>
          
          {/* モバイル対応の項目リスト */}
          <div style={itemsContainerStyle}>
            {quote.items.map((item, index) => (
              <div key={index} style={itemCardStyle} className="item-card">
                <div style={itemHeaderStyle}>
                  <div style={itemNameStyle} className="item-name">
                    {item.productLink ? (
                      <a href={item.productLink} style={productLinkStyle}>
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
                  <div style={itemAmountStyle} className="item-amount">
                    {formatCurrency(item.amount)}
                  </div>
                </div>
                {item.details && (
                  <div style={itemDetailsStyle} className="item-details">
                    {item.tooltip ? 
                      renderDetailsWithTooltip(item.details, item.tooltip) :
                      item.details
                    }
                  </div>
                )}
                <div style={itemMetaStyle} className="item-meta">
                  <span>{item.quantity} {item.unit || '個'}</span>
                  <span>×</span>
                  <span>{formatCurrency(item.unitPrice)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <hr style={dividerStyle} />

        {/* 合計金額 */}
        <section style={totalSectionStyle}>
          <div style={totalContainerStyle} className="quote-summary">
            <div style={totalRowStyle}>
              <span>小計</span>
              <span>{formatCurrency(quote.subtotal)}</span>
            </div>
            <div style={totalRowStyle}>
              <span>消費税（{quote.taxRate}%）</span>
              <span>{formatCurrency(quote.taxAmount)}</span>
            </div>
            <div style={grandTotalRowStyle}>
              <span>合計金額</span>
              <span>{formatCurrency(quote.totalAmount)}</span>
            </div>
          </div>
        </section>

        {/* 追加提案オプション */}
        {suggestedOptions.length > 0 && (
          <section style={suggestionsSectionStyle}>
            <hr style={dividerStyle} />
            <h2 style={h2Style}>
              🎯 お客様におすすめのオプション
            </h2>
            
            <div style={suggestionsGridStyle} className="suggested-options-grid">
              {suggestedOptions.map((option, index) => (
                <div key={index} style={suggestionCardStyle}>
                  <h3 style={suggestionTitleStyle}>{option.title}</h3>
                  <p style={suggestionDescriptionStyle}>{option.description}</p>
                  <div style={suggestionPriceStyle}>追加料金: {option.price}</div>
                  <ul style={featureListStyle}>
                    {option.features.map((feature, fIndex) => (
                      <li key={fIndex} style={featureItemStyle}>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a 
                    href={option.ctaUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={suggestionButtonStyle}
                  >
                    {option.ctaText}
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA ボタン */}
        <section style={ctaSectionStyle}>
          <div style={ctaContainerStyle} className="quote-actions">
            {acceptUrl && (
              <div style={buttonWrapperStyle}>
                <a href={acceptUrl} style={primaryButtonStyle} className="cta-button">
                  見積を承認する
                </a>
                <p style={buttonDescriptionStyle}>
                  見積金額を確定してPDF発行
                </p>
              </div>
            )}
            {considerUrl && (
              <div style={buttonWrapperStyle}>
                <a href={considerUrl} style={considerButtonStyle} className="cta-button">
                  検討する
                </a>
                <p style={buttonDescriptionStyle}>
                  現在の見積書で社内検討
                </p>
              </div>
            )}
            {discussUrl && (
              <div style={buttonWrapperStyle}>
                <a href={discussUrl} style={secondaryButtonStyle} className="cta-button">
                  相談する
                </a>
                <p style={buttonDescriptionStyle}>
                  ご質問・ご相談はこちら
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 備考 */}
        {quote.notes && (
          <section style={notesSectionStyle}>
            <h3 style={h3Style}>備考</h3>
            <div style={notesTextStyle}>{cleanDuplicateSignatures(quote.notes)}</div>
          </section>
        )}
      </main>

      {/* フッター */}
      <footer style={footerStyle}>
        <div style={footerContentStyle}>
          <p style={footerTextStyle}>
            このメールは {quote.companySnapshot?.companyName || companyInfo?.companyName || companyInfo?.name || '会社名未設定'} より送信されました。
          </p>
          <div style={footerLinksStyle}>
            <a href={`${baseUrl}/privacy`} style={footerLinkStyle}>プライバシーポリシー</a>
            {' | '}
            <a href={`${baseUrl}/terms`} style={footerLinkStyle}>利用規約</a>
            {' | '}
            <a href={`${baseUrl}/contact`} style={footerLinkStyle}>お問い合わせ</a>
          </div>
        </div>
      </footer>

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
  );
}

// Webページ最適化されたスタイル定義
const containerStyle = {
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  backgroundColor: '#ffffff',
  color: '#1f2937',
  lineHeight: '1.6',
  minHeight: '100vh',
  width: '100%',
  maxWidth: '100%',
  margin: '0',
  padding: '0',
};

const headerStyle = {
  backgroundColor: '#f8fafc',
  borderBottom: '1px solid #e5e7eb',
  padding: '1.5rem 0',
};

const headerContentStyle = {
  width: '100%',
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 2rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxSizing: 'border-box' as const,
};

const logoSectionStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
};

const logoStyle = {
  height: '50px',
  width: 'auto',
};

const companyNameStyle = {
  fontSize: '1.5rem',
  fontWeight: 'bold',
  margin: 0,
};

const viewOnlineStyle = {
  color: '#3B82F6',
  textDecoration: 'underline',
  fontSize: '0.875rem',
};

const mainStyle = {
  width: '100%',
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '2rem',
  boxSizing: 'border-box' as const,
};

const titleSectionStyle = {
  textAlign: 'center' as const,
  marginBottom: '2rem',
};

const h1Style = {
  fontSize: '2.5rem',
  fontWeight: 'bold',
  margin: '1rem 0',
  color: '#1f2937',
};

const recipientStyle = {
  fontSize: '1.25rem',
  fontWeight: '500',
  color: '#4b5563',
};

const customMessageSectionStyle = {
  backgroundColor: '#eff6ff',
  borderRadius: '0.5rem',
  padding: '1.5rem',
  margin: '2rem 0',
};

const customMessageContentStyle = {
  fontSize: '1rem',
  color: '#1e40af',
};

const quoteInfoSectionStyle = {
  margin: '2rem 0',
};

const quoteInfoGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '1.5rem',
};

const infoCardStyle = {
  backgroundColor: '#f9fafb',
  padding: '1.5rem',
  borderRadius: '0.5rem',
  textAlign: 'center' as const,
};

const infoLabelStyle = {
  fontSize: '0.875rem',
  color: '#6b7280',
  marginBottom: '0.5rem',
};

const infoValueStyle = {
  fontSize: '1.125rem',
  fontWeight: 'bold',
  color: '#1f2937',
};

const dividerStyle = {
  border: 'none',
  borderTop: '1px solid #e5e7eb',
  margin: '2rem 0',
};

const partiesSectionStyle = {
  margin: '2rem 0',
};

const partiesGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '2rem',
};

const partyCardStyle = {
  backgroundColor: '#f9fafb',
  padding: '1.5rem',
  borderRadius: '0.5rem',
};

const partyTitleStyle = {
  fontSize: '1.25rem',
  fontWeight: 'bold',
  marginBottom: '1rem',
  color: '#1f2937',
};

const partyDetailsStyle = {
  fontSize: '0.875rem',
  lineHeight: '1.6',
};

const partyCompanyStyle = {
  fontSize: '1rem',
  fontWeight: 'bold',
  marginBottom: '0.5rem',
};

const itemsSectionStyle = {
  margin: '2rem 0',
};

const h2Style = {
  fontSize: '1.875rem',
  fontWeight: 'bold',
  marginBottom: '1.5rem',
  color: '#1f2937',
};

const itemsContainerStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '1rem',
};

const itemCardStyle = {
  backgroundColor: '#f9fafb',
  padding: '1.5rem',
  borderRadius: '0.5rem',
  border: '1px solid #e5e7eb',
};

const itemHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '0.5rem',
};

const itemNameStyle = {
  fontSize: '1.125rem',
  fontWeight: '500',
  flex: 1,
};

const itemAmountStyle = {
  fontSize: '1.25rem',
  fontWeight: 'bold',
  color: '#3B82F6',
  minWidth: '120px',
  textAlign: 'right' as const,
};

const productLinkStyle = {
  color: '#3B82F6',
  textDecoration: 'none',
};

const itemDetailsStyle = {
  fontSize: '0.875rem',
  color: '#6b7280',
  marginBottom: '1rem',
  lineHeight: '1.6',
};

const itemMetaStyle = {
  fontSize: '0.875rem',
  color: '#6b7280',
  display: 'flex',
  gap: '0.5rem',
};

const totalSectionStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  margin: '2rem 0',
};

const totalContainerStyle = {
  backgroundColor: '#f3f4f6',
  padding: '1.5rem',
  borderRadius: '0.5rem',
  minWidth: '300px',
};

const totalRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '0.5rem 0',
  fontSize: '1rem',
};

const grandTotalRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '0.75rem 0',
  fontSize: '1.25rem',
  fontWeight: 'bold',
  borderTop: '2px solid #1f2937',
  marginTop: '0.5rem',
  paddingTop: '0.75rem',
  color: '#3B82F6',
};

const suggestionsSectionStyle = {
  margin: '3rem 0',
};

const suggestionsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '1.5rem',
  marginTop: '1.5rem',
};

const suggestionCardStyle = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '0.5rem',
  padding: '1.5rem',
};

const suggestionTitleStyle = {
  fontSize: '1.125rem',
  fontWeight: 'bold',
  marginBottom: '0.75rem',
  color: '#1f2937',
};

const suggestionDescriptionStyle = {
  fontSize: '0.875rem',
  color: '#4b5563',
  lineHeight: '1.6',
  marginBottom: '1rem',
};

const suggestionPriceStyle = {
  fontSize: '1rem',
  fontWeight: 'bold',
  color: '#10B981',
  marginBottom: '1rem',
};

const featureListStyle = {
  margin: '1rem 0',
  paddingLeft: '1.5rem',
};

const featureItemStyle = {
  fontSize: '0.875rem',
  color: '#4b5563',
  marginBottom: '0.25rem',
};

const suggestionButtonStyle = {
  display: 'inline-block',
  backgroundColor: '#10B981',
  color: '#ffffff',
  padding: '0.75rem 1.5rem',
  borderRadius: '0.375rem',
  textDecoration: 'none',
  fontSize: '0.875rem',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  marginTop: '1rem',
};

const ctaSectionStyle = {
  margin: '3rem 0',
  textAlign: 'center' as const,
};

const ctaContainerStyle = {
  display: 'flex',
  gap: '2rem',
  justifyContent: 'center',
  alignItems: 'stretch',
  flexWrap: 'nowrap' as const,
  maxWidth: '600px',
  margin: '0 auto',
};

const primaryButtonStyle = {
  display: 'inline-block',
  backgroundColor: '#3B82F6',
  color: '#ffffff',
  padding: '0.875rem 2rem',
  borderRadius: '0.375rem',
  textDecoration: 'none',
  fontSize: '1rem',
  fontWeight: '500',
  minWidth: '180px',
  textAlign: 'center' as const,
  boxSizing: 'border-box' as const,
  transition: 'all 0.2s ease',
  lineHeight: '1.5',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
};

const considerButtonStyle = {
  display: 'inline-block',
  backgroundColor: '#10b981',
  color: '#ffffff',
  padding: '0.875rem 2rem',
  borderRadius: '0.375rem',
  textDecoration: 'none',
  fontSize: '1rem',
  fontWeight: '500',
  minWidth: '180px',
  textAlign: 'center' as const,
  boxSizing: 'border-box' as const,
  transition: 'all 0.2s ease',
  lineHeight: '1.5',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
};

const secondaryButtonStyle = {
  display: 'inline-block',
  backgroundColor: '#ffffff',
  color: '#6b7280',
  padding: '0.75rem 2rem',
  borderRadius: '0.375rem',
  textDecoration: 'none',
  fontSize: '1rem',
  fontWeight: '500',
  border: '1px solid #e5e7eb',
  minWidth: '180px',
  textAlign: 'center' as const,
  boxSizing: 'border-box' as const,
  transition: 'all 0.2s ease',
  lineHeight: '1.5',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
};

const buttonWrapperStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  gap: '0.5rem',
  flex: 1,
};

const buttonDescriptionStyle = {
  fontSize: '0.75rem',
  color: '#4B5563', // 濃いグレーで読みやすく
  lineHeight: '1.4',
  textAlign: 'center' as const,
  margin: '0',
  width: '100%',
  fontWeight: '500', // やや太く
};

const notesSectionStyle = {
  backgroundColor: '#f9fafb',
  padding: '1.5rem',
  borderRadius: '0.5rem',
  margin: '2rem 0',
};

const h3Style = {
  fontSize: '1.25rem',
  fontWeight: 'bold',
  marginBottom: '1rem',
  color: '#1f2937',
};

const notesTextStyle = {
  fontSize: '0.875rem',
  color: '#4b5563',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap' as const,
};

const footerStyle = {
  backgroundColor: '#f8fafc',
  borderTop: '1px solid #e5e7eb',
  padding: '2rem 0',
  marginTop: '3rem',
};

const footerContentStyle = {
  width: '100%',
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 2rem',
  textAlign: 'center' as const,
  boxSizing: 'border-box' as const,
};

const footerTextStyle = {
  fontSize: '0.75rem',
  color: '#6b7280',
  marginBottom: '0.5rem',
};

const footerLinksStyle = {
  fontSize: '0.75rem',
  color: '#6b7280',
};

const footerLinkStyle = {
  color: '#3B82F6',
  textDecoration: 'none',
};