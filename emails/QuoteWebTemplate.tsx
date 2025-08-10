import React from 'react';
import { Quote, CompanyInfo } from '@/types/collections';

interface QuoteWebTemplateProps {
  quote: Quote;
  companyInfo: CompanyInfo;
  recipientName?: string;
  viewOnlineUrl?: string;
  acceptUrl?: string;
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

// ツールチップ用語を検出してライトグレーマーカーを付ける関数
const renderDetailsWithTooltip = (details: string, tooltip: string) => {
  // ツールチップ内の主要な用語を抽出（ROI、KPI、CRMなどの英語略語を優先）
  const englishKeywords = tooltip.match(/\b[A-Z]{2,}\b/g) || [];
  // カタカナのキーワードも抽出
  const katakanaKeywords = tooltip.match(/[ァ-ヶー]{3,}/g) || [];
  // 専門用語的な漢字のキーワードも抽出
  const kanjiKeywords = tooltip.match(/[一-龯]{2,4}(?:率|額|費|価|値|量|数)/g) || [];
  
  const allKeywords = [...englishKeywords, ...katakanaKeywords, ...kanjiKeywords];
  let processedDetails = details;
  
  // 各キーワードをライトグレーマーカー付きスパンに変換（CSSホバー効果を使用）
  allKeywords.forEach(keyword => {
    if (details.includes(keyword)) {
      const tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;
      const markerHtml = `
        <span class="tooltip-wrapper" style="position: relative; display: inline-block;">
          <span style="
            background: linear-gradient(180deg, transparent 60%, #e5e7eb 60%);
            cursor: help;
            border-radius: 2px;
            padding: 0 2px;
            position: relative;
          ">${keyword}</span>
          <span class="tooltip-content" style="
            visibility: hidden;
            opacity: 0;
            position: absolute;
            bottom: 100%;
            left: 0;
            transform: none;
            background-color: #1f2937;
            color: white;
            padding: 10px 14px;
            border-radius: 6px;
            font-size: 13px;
            white-space: normal;
            width: 280px;
            max-width: 90vw;
            z-index: 1000;
            margin-bottom: 8px;
            transition: opacity 0.2s, visibility 0.2s;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            line-height: 1.4;
          ">💡 ${tooltip}</span>
        </span>
      `;
      processedDetails = processedDetails.replace(
        new RegExp(`(${keyword})`, 'g'),
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
      const tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;
      const markerHtml = `
        <span class="tooltip-wrapper" style="position: relative; display: inline-block;">
          <span style="
            background: linear-gradient(180deg, transparent 60%, #fef3c7 60%);
            cursor: help;
            border-radius: 2px;
            padding: 0 2px;
            position: relative;
          ">${word}</span>
          <span class="tooltip-content" style="
            visibility: hidden;
            opacity: 0;
            position: absolute;
            bottom: 100%;
            left: 0;
            transform: none;
            background-color: #1f2937;
            color: white;
            padding: 10px 14px;
            border-radius: 6px;
            font-size: 13px;
            white-space: normal;
            width: 280px;
            max-width: 90vw;
            z-index: 1000;
            margin-bottom: 8px;
            transition: opacity 0.2s, visibility 0.2s;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            line-height: 1.4;
          ">💡 ${tooltip}</span>
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
  discussUrl,
  trackingPixelUrl,
  customMessage,
  suggestedOptions = [],
}: QuoteWebTemplateProps) {
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
    <div style={containerStyle}>
      {/* レスポンシブ対応のCSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* ツールチップのホバー効果 */
          .tooltip-wrapper {
            position: relative;
            display: inline-block;
          }
          
          .tooltip-wrapper:hover .tooltip-content {
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          .tooltip-content {
            visibility: hidden;
            opacity: 0;
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background-color: #1f2937;
            color: white;
            padding: 10px 14px;
            border-radius: 6px;
            font-size: 13px;
            white-space: normal;
            width: 280px;
            z-index: 1000;
            margin-bottom: 8px;
            transition: opacity 0.2s, visibility 0.2s;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            line-height: 1.4;
          }
          
          .tooltip-content::after {
            content: "";
            position: absolute;
            top: 100%;
            left: 20px;
            transform: none;
            border-width: 5px;
            border-style: solid;
            border-color: #1f2937 transparent transparent transparent;
          }
          
          @media (max-width: 768px) {
            .quote-header { flex-direction: column !important; text-align: center !important; }
            .quote-info-grid { grid-template-columns: 1fr !important; gap: 1rem !important; }
            .quote-parties-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
            .quote-summary { padding: 1rem !important; }
            .quote-actions { flex-direction: column !important; gap: 0.75rem !important; }
            .suggested-options-grid { grid-template-columns: 1fr !important; }
            
            /* モバイルでのツールチップ調整 */
            .tooltip-content {
              white-space: normal;
              width: 250px;
              max-width: 85vw;
              left: 0;
              transform: none;
              font-size: 12px;
            }
          }
          @media (min-width: 769px) and (max-width: 1024px) {
            .quote-info-grid { grid-template-columns: repeat(2, 1fr) !important; }
            .suggested-options-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
          @media (min-width: 1025px) {
            .quote-info-grid { grid-template-columns: repeat(3, 1fr) !important; }
            .suggested-options-grid { grid-template-columns: repeat(3, 1fr) !important; }
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
            <div style={infoCardStyle}>
              <div style={infoLabelStyle}>見積書番号</div>
              <div style={infoValueStyle}>{quote.quoteNumber}</div>
            </div>
            <div style={infoCardStyle}>
              <div style={infoLabelStyle}>発行日</div>
              <div style={infoValueStyle}>{formatDate(quote.issueDate)}</div>
            </div>
            <div style={infoCardStyle}>
              <div style={infoLabelStyle}>有効期限</div>
              <div style={infoValueStyle}>{formatDate(quote.validityDate)}</div>
            </div>
          </div>
        </section>

        <hr style={dividerStyle} />

        {/* 取引先情報（2カラム→1カラム） */}
        <section style={partiesSectionStyle}>
          <div style={partiesGridStyle} className="quote-parties-grid">
            {/* 見積先 */}
            <div style={partyCardStyle}>
              <h3 style={partyTitleStyle}>見積先</h3>
              <div style={partyDetailsStyle}>
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

            {/* 見積元 */}
            <div style={partyCardStyle}>
              <h3 style={partyTitleStyle}>見積元</h3>
              <div style={partyDetailsStyle}>
                <div style={partyCompanyStyle}>{companyInfo?.companyName || companyInfo?.name || '会社名未設定'}</div>
                {/* 住所の組み立て */}
                {(companyInfo?.postalCode || companyInfo?.prefecture || companyInfo?.city || companyInfo?.address1 || companyInfo?.address2 || companyInfo?.address) && (
                  <div>
                    {companyInfo?.postalCode && `〒${companyInfo.postalCode} `}
                    {companyInfo?.prefecture}
                    {companyInfo?.city}
                    {companyInfo?.address1}
                    {companyInfo?.address2}
                    {!companyInfo?.postalCode && !companyInfo?.prefecture && !companyInfo?.city && !companyInfo?.address1 && !companyInfo?.address2 && companyInfo?.address}
                  </div>
                )}
                {companyInfo?.phone && <div>TEL: {companyInfo.phone}</div>}
                {companyInfo?.email && <div>Email: {companyInfo.email}</div>}
                {companyInfo?.invoiceRegistrationNumber && (
                  <div>登録番号: {companyInfo.invoiceRegistrationNumber}</div>
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
              <div key={index} style={itemCardStyle}>
                <div style={itemHeaderStyle}>
                  <div style={itemNameStyle}>
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
                  <div style={itemAmountStyle}>
                    {formatCurrency(item.amount)}
                  </div>
                </div>
                {item.details && (
                  <div style={itemDetailsStyle}>
                    {item.tooltip ? 
                      renderDetailsWithTooltip(item.details, item.tooltip) :
                      item.details
                    }
                  </div>
                )}
                <div style={itemMetaStyle}>
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
                  <a href={option.ctaUrl} style={suggestionButtonStyle}>
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
                <a href={acceptUrl} style={primaryButtonStyle}>
                  見積を承認する
                </a>
                <div style={buttonDescriptionStyle}>
                  <div>このボタンをクリックすると見積金額が確定し、</div>
                  <div>PDFのお見積書が添付されたメールが送信されます</div>
                </div>
              </div>
            )}
            {/* 相談ボタンをmailtoリンクに変更 */}
            <div style={buttonWrapperStyle}>
              <a 
                href={`mailto:${companyInfo?.email || 'info@example.com'}?subject=${encodeURIComponent(`【ご質問】見積書 ${quote.quoteNumber} について`)}&body=${encodeURIComponent(
                  `お世話になっております。\n\n` +
                  `見積書番号: ${quote.quoteNumber}\n` +
                  `お客様: ${quote.customer?.companyName || '未設定'}\n` +
                  `見積金額: ¥${quote.totalAmount?.toLocaleString() || '0'}（税込）\n\n` +
                  `【ご質問内容】\n\n\n\n` +
                  `よろしくお願いいたします。`
                )}`}
                style={secondaryButtonStyle}
              >
                相談する
              </a>
              <div style={buttonDescriptionStyle}>
                <div>このボタンをクリックするとメールソフトが起動し、</div>
                <div>見積についてのご質問をメールで送信できます</div>
              </div>
            </div>
          </div>
        </section>

        {/* 備考 */}
        {quote.notes && (
          <section style={notesSectionStyle}>
            <h3 style={h3Style}>備考</h3>
            <div style={notesTextStyle}>{quote.notes}</div>
          </section>
        )}
      </main>

      {/* フッター */}
      <footer style={footerStyle}>
        <div style={footerContentStyle}>
          <p style={footerTextStyle}>
            このメールは {companyInfo?.companyName || companyInfo?.name || '株式会社'} より送信されました。
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
};

const headerStyle = {
  backgroundColor: '#f8fafc',
  borderBottom: '1px solid #e5e7eb',
  padding: '1.5rem 0',
};

const headerContentStyle = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 2rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
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
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '2rem',
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
  gap: '4rem',
  justifyContent: 'center',
  alignItems: 'stretch',
  flexWrap: 'wrap' as const,
};

const primaryButtonStyle = {
  display: 'inline-block',
  backgroundColor: '#3B82F6',
  color: '#ffffff',
  padding: '1rem 3rem',
  borderRadius: '0.5rem',
  textDecoration: 'none',
  fontSize: '1.0625rem',
  fontWeight: '600',
  minWidth: '220px',
  textAlign: 'center' as const,
  boxSizing: 'border-box' as const,
  transition: 'background-color 0.2s ease',
  lineHeight: '1.5',
};

const secondaryButtonStyle = {
  display: 'inline-block',
  backgroundColor: '#ffffff',
  color: '#3B82F6',
  padding: '0.875rem 3rem',
  borderRadius: '0.5rem',
  textDecoration: 'none',
  fontSize: '1.0625rem',
  fontWeight: '600',
  border: '2px solid #3B82F6',
  minWidth: '220px',
  textAlign: 'center' as const,
  boxSizing: 'border-box' as const,
  transition: 'border-color 0.2s ease, color 0.2s ease',
  lineHeight: '1.5',
};

const buttonWrapperStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  gap: '0.875rem',
  minWidth: '280px',
  maxWidth: '360px',
};

const buttonDescriptionStyle = {
  fontSize: '0.8125rem',
  color: '#6b7280',
  lineHeight: '1.6',
  textAlign: 'center' as const,
  marginTop: '0',
  width: '100%',
  letterSpacing: '-0.01em',
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
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 2rem',
  textAlign: 'center' as const,
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