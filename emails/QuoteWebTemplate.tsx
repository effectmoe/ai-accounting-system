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
// Updated: 2025-08-17 - 修正版: 確実にツールチップを表示
const renderDetailsWithTooltip = (details: string, tooltip: string) => {
  console.log('🎨 renderDetailsWithTooltip called:', { details, hasTooltip: !!tooltip });
  
  if (!tooltip || tooltip.trim() === '') {
    console.log('❌ No tooltip provided for:', details);
    return <span>{details}</span>;
  }
  
  console.log('✅ Creating tooltip for:', details, 'with tooltip:', tooltip.substring(0, 50) + '...');
  
  // HTMLエスケープ処理
  const escapedDetails = details.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const escapedTooltip = tooltip.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  
  // より確実な方法: 項目名全体をツールチップ付きにする
  const markerHtml = `
    <span class="tooltip-wrapper" data-tooltip="${escapedTooltip}" title="${escapedTooltip}">
      <span style="
        background: linear-gradient(180deg, transparent 60%, rgba(254, 240, 138, 0.7) 60%);
        cursor: help;
        border-radius: 3px;
        padding: 1px 4px;
        border-bottom: 2px dotted #f59e0b;
        font-weight: 500;
        position: relative;
        display: inline-block;
      ">${escapedDetails}</span>
      <span class="tooltip-content" style="
        visibility: hidden;
        opacity: 0;
        background-color: #fef3c7;
        color: #1f2937;
        text-align: left;
        border-radius: 6px;
        padding: 12px 16px;
        position: absolute;
        z-index: 999999;
        bottom: 125%;
        left: 50%;
        transform: translateX(-50%);
        width: 280px;
        min-width: 200px;
        max-width: 90vw;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 8px 25px rgba(0,0,0,0.25);
        border: 2px solid #f59e0b;
        transition: all 0.2s ease-in-out;
        pointer-events: none;
        white-space: normal;
        line-height: 1.5;
        word-wrap: break-word;
      ">💡 ${escapedTooltip}</span>
    </span>
  `;
  
  return <span dangerouslySetInnerHTML={{ __html: markerHtml }} />;
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
          
          /* ツールチップのホバー効果とタッチ対応 - 修正版 */
          .tooltip-wrapper {
            position: relative;
            display: inline-block;
            border-bottom: 1px dotted #333;
            cursor: help;
            /* デバッグ用の背景色を追加 */
            background: rgba(255, 255, 0, 0.1);
          }
          
          .tooltip-content {
            /* 初期状態で非表示 */
            visibility: hidden;
            opacity: 0;
            /* スタイル */
            background-color: #fef3c7; /* より確実な背景色 */
            color: #1f2937;
            text-align: left;
            border-radius: 6px;
            padding: 12px 16px;
            /* 位置設定 */
            position: absolute;
            z-index: 999999; /* 非常に高いz-index */
            bottom: 125%;
            left: 50%;
            transform: translateX(-50%);
            width: 280px;
            min-width: 200px;
            max-width: 90vw;
            /* フォント設定 */
            font-size: 14px;
            font-weight: 500;
            /* シャドウとボーダー */
            box-shadow: 0 8px 25px rgba(0,0,0,0.25);
            border: 2px solid #f59e0b;
            /* アニメーション */
            transition: all 0.2s ease-in-out;
            /* マウスイベント */
            pointer-events: none;
            /* テキスト設定 */
            white-space: normal;
            line-height: 1.5;
            word-wrap: break-word;
          }
          
          /* ホバー時の表示を確実にする - 強化版 */
          .tooltip-wrapper:hover .tooltip-content,
          .tooltip-wrapper:focus .tooltip-content,
          .tooltip-wrapper:active .tooltip-content {
            visibility: visible !important;
            opacity: 1 !important;
            display: block !important;
          }
          
          /* デスクトップ: ホバーで表示 */
          @media (hover: hover) and (pointer: fine) {
            .tooltip-wrapper:hover .tooltip-content,
            .tooltip-wrapper:focus .tooltip-content {
              visibility: visible !important;
              opacity: 1 !important;
              display: block !important;
            }
          }
          
          /* 強制表示テスト用クラス */
          .tooltip-content.force-show {
            visibility: visible !important;
            opacity: 1 !important;
            display: block !important;
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
            
            /* モバイルではテーブルを非表示、カードを表示 */
            .desktop-table { display: none !important; }
            .mobile-cards { display: block !important; }
            
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
            
            /* デスクトップではテーブルを表示、カードを非表示 */
            .desktop-table { display: block !important; }
            .mobile-cards { display: none !important; }
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

      {/* JavaScriptでタッチイベントとデバッグ情報を処理 */}
      <script dangerouslySetInnerHTML={{
        __html: `
          console.log('🔧 QuoteWebTemplate JavaScript loaded');
          
          // ツールチップのデバッグ情報を表示
          function debugTooltips() {
            const tooltipWrappers = document.querySelectorAll('.tooltip-wrapper');
            const tooltipContents = document.querySelectorAll('.tooltip-content');
            console.log('📊 Tooltip Debug Info:', {
              wrappers: tooltipWrappers.length,
              contents: tooltipContents.length,
              wrapperList: Array.from(tooltipWrappers).map(w => ({
                text: w.textContent?.substring(0, 50) + '...',
                hasContent: w.querySelector('.tooltip-content') !== null
              }))
            });
            
            // 強制的にツールチップを表示してテスト
            if (tooltipContents.length > 0) {
              console.log('🧪 Testing tooltip visibility...');
              const firstTooltip = tooltipContents[0];
              firstTooltip.classList.add('force-show');
              setTimeout(() => {
                firstTooltip.classList.remove('force-show');
                console.log('✅ Tooltip test completed');
              }, 3000);
            }
          }
          
          // ページ読み込み完了後にデバッグ実行
          document.addEventListener('DOMContentLoaded', function() {
            console.log('📄 DOM Content Loaded');
            setTimeout(debugTooltips, 500);
            
            const tooltipWrappers = document.querySelectorAll('.tooltip-wrapper');
            console.log('🎯 Found tooltip wrappers:', tooltipWrappers.length);
            
            // マウスホバーイベントを強化
            tooltipWrappers.forEach((wrapper, index) => {
              console.log(\`🔧 Setting up tooltip \${index + 1}\`);
              
              wrapper.addEventListener('mouseenter', function(e) {
                console.log(\`🖱️ Mouse enter on tooltip \${index + 1}\`);
                const content = this.querySelector('.tooltip-content');
                if (content) {
                  content.classList.add('force-show');
                }
              });
              
              wrapper.addEventListener('mouseleave', function(e) {
                console.log(\`🖱️ Mouse leave on tooltip \${index + 1}\`);
                const content = this.querySelector('.tooltip-content');
                if (content) {
                  content.classList.remove('force-show');
                }
              });
              
              // タッチイベント
              wrapper.addEventListener('touchstart', function(e) {
                console.log(\`👆 Touch start on tooltip \${index + 1}\`);
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
            <div 
              style={customMessageContentStyle}
              dangerouslySetInnerHTML={{ __html: customMessage }}
            />
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
                <div style={partyCompanyStyle}>
                  {quote.customer?.storeName 
                    ? `${quote.customer.storeName}（${quote.customer.companyName}）`
                    : quote.customer?.companyName || '顧客未設定'}
                </div>
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
          
          {/* デスクトップ：テーブル表示、モバイル：カード表示 */}
          <div style={{display: 'block'}}>
            {/* デスクトップ用テーブル */}
            <div style={desktopTableStyle} className="desktop-table">
              <table style={tableStyle}>
                <thead>
                  <tr style={tableHeaderRowStyle}>
                    <th style={{...tableHeaderCellStyle, textAlign: 'left'}}>品目</th>
                    <th style={{...tableHeaderCellStyle, width: '80px'}}>数量</th>
                    <th style={{...tableHeaderCellStyle, width: '100px'}}>単価</th>
                    <th style={{...tableHeaderCellStyle, width: '100px'}}>小計</th>
                    <th style={{...tableHeaderCellStyle, width: '100px'}}>消費税</th>
                    <th style={{...tableHeaderCellStyle, width: '120px'}}>金額</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item, index) => {
                    const isDiscount = (item.amount < 0) || 
                      (item.itemName && (item.itemName.includes('値引き') || item.itemName.includes('割引') || item.itemName.includes('ディスカウント')));
                    const itemColor = isDiscount ? '#dc2626' : '#1f2937';
                    const subtotalAmount = (item.quantity || 1) * (item.unitPrice || 0);
                    const taxAmount = subtotalAmount * (quote.taxRate || 0.1);
                    
                    return (
                      <tr key={index} style={tableBodyRowStyle}>
                        <td style={{...tableBodyCellStyle, color: itemColor}}>
                          {item.productLink ? (
                            <a href={item.productLink} style={{...productLinkStyle, color: isDiscount ? '#dc2626' : '#3B82F6'}}>
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
                          {item.details && (
                            <div style={{fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem'}}>
                              {item.tooltip ? 
                                renderDetailsWithTooltip(item.details, item.tooltip) :
                                item.details
                              }
                            </div>
                          )}
                        </td>
                        <td style={{...tableBodyCellStyle, textAlign: 'center', color: itemColor}}>
                          {item.quantity || 1}{item.unit ? ` ${item.unit}` : ''}
                        </td>
                        <td style={{...tableBodyCellStyle, textAlign: 'right', color: itemColor}}>
                          {formatCurrency(item.unitPrice || 0)}
                        </td>
                        <td style={{...tableBodyCellStyle, textAlign: 'right', color: itemColor}}>
                          {formatCurrency(subtotalAmount)}
                        </td>
                        <td style={{...tableBodyCellStyle, textAlign: 'right', color: itemColor}}>
                          {formatCurrency(Math.round(taxAmount))}
                        </td>
                        <td style={{...tableBodyCellStyle, textAlign: 'right', color: itemColor, fontWeight: 'bold'}}>
                          {formatCurrency(item.amount || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* モバイル用カード表示 */}
            <div style={mobileCardsStyle} className="mobile-cards">
              {quote.items.map((item, index) => {
                const isDiscount = (item.amount < 0) || 
                  (item.itemName && (item.itemName.includes('値引き') || item.itemName.includes('割引') || item.itemName.includes('ディスカウント')));
                const itemColor = isDiscount ? '#dc2626' : '#1f2937';
                const subtotalAmount = (item.quantity || 1) * (item.unitPrice || 0);
                const taxAmount = subtotalAmount * (quote.taxRate || 0.1);
                
                return (
                  <div key={index} style={{...itemCardStyle, borderLeft: isDiscount ? '4px solid #dc2626' : '4px solid #3B82F6'}} className="item-card">
                    <div style={itemHeaderStyle}>
                      <div style={{...itemNameStyle, color: itemColor}} className="item-name">
                        {item.productLink ? (
                          <a href={item.productLink} style={{...productLinkStyle, color: isDiscount ? '#dc2626' : '#3B82F6'}}>
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
                      <div style={{...itemAmountStyle, color: itemColor}} className="item-amount">
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
                    <div style={itemBreakdownStyle} className="item-breakdown">
                      <div style={breakdownRowStyle}>
                        <span>数量:</span>
                        <span style={{color: itemColor}}>{item.quantity || 1} {item.unit || '個'}</span>
                      </div>
                      <div style={breakdownRowStyle}>
                        <span>単価:</span>
                        <span style={{color: itemColor}}>{formatCurrency(item.unitPrice || 0)}</span>
                      </div>
                      <div style={breakdownRowStyle}>
                        <span>小計:</span>
                        <span style={{color: itemColor}}>{formatCurrency(subtotalAmount)}</span>
                      </div>
                      <div style={breakdownRowStyle}>
                        <span>消費税:</span>
                        <span style={{color: itemColor}}>{formatCurrency(Math.round(taxAmount))}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <hr style={dividerStyle} />

        {/* 合計金額 */}
        <section style={totalSectionStyle}>
          <div style={totalContainerStyle} className="quote-summary">
            <div style={totalRowStyle}>
              <span>小計</span>
              <span>{formatCurrency(Math.round(quote.subtotal))}</span>
            </div>
            <div style={totalRowStyle}>
              <span>消費税（{quote.taxRate}%）</span>
              <span>{formatCurrency(Math.round(quote.taxAmount))}</span>
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
                  {option.ctaUrl && option.ctaUrl.trim() !== '' && (
                    <a 
                      href={option.ctaUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={suggestionButtonStyle}
                    >
                      {option.ctaText}
                    </a>
                  )}
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
        {(() => {
          const hasNotes = quote.notes && quote.notes.trim();
          console.log('📝 QuoteWebTemplate notes check:', {
            hasNotes: !!hasNotes,
            notesLength: quote.notes?.length || 0,
            notesPreview: quote.notes?.substring(0, 100) || 'なし'
          });
          
          return hasNotes ? (
            <section style={notesSectionStyle}>
              <h3 style={h3Style}>備考</h3>
              <div style={notesTextStyle}>{cleanDuplicateSignatures(quote.notes)}</div>
            </section>
          ) : null;
        })()}
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
          <hr style={systemSignatureDividerStyle} />
          <p style={systemSignatureTextStyle}>
            このシステムはAI駆動によるAAM-Accountingシステムです powered by{' '}
            <a 
              href="https://notion.effect.moe/"
              target="_blank"
              rel="noopener noreferrer"
              style={systemSignatureLinkStyle}
            >
              EFFECT Inc.
            </a>
          </p>
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

// 新しいテーブル関連スタイル
const desktopTableStyle = {
  display: 'block',
  width: '100%',
  overflowX: 'auto' as const,
  marginBottom: '1rem',
};

const mobileCardsStyle = {
  display: 'none',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  backgroundColor: '#ffffff',
  borderRadius: '0.5rem',
  overflow: 'hidden',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
};

const tableHeaderRowStyle = {
  backgroundColor: '#f8fafc',
  borderBottom: '2px solid #e5e7eb',
};

const tableHeaderCellStyle = {
  padding: '1rem 0.75rem',
  textAlign: 'center' as const,
  fontSize: '0.875rem',
  fontWeight: 'bold',
  color: '#374151',
  borderRight: '1px solid #e5e7eb',
};

const tableBodyRowStyle = {
  borderBottom: '1px solid #f3f4f6',
};

const tableBodyCellStyle = {
  padding: '1rem 0.75rem',
  fontSize: '0.875rem',
  borderRight: '1px solid #f3f4f6',
  verticalAlign: 'top' as const,
};

// モバイルカード用の新しいスタイル
const itemBreakdownStyle = {
  marginTop: '1rem',
  padding: '0.75rem',
  backgroundColor: '#f8fafc',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
};

const breakdownRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: '0.25rem',
  marginBottom: '0.25rem',
  borderBottom: '1px solid #e5e7eb',
};

const systemSignatureDividerStyle = {
  border: 'none',
  borderTop: '1px solid #e5e7eb',
  margin: '1.5rem 0 1rem 0',
};

const systemSignatureTextStyle = {
  fontSize: '0.75rem',
  color: '#6b7280',
  margin: '0.5rem 0 0 0',
  textAlign: 'center' as const,
};

const systemSignatureLinkStyle = {
  color: '#3b82f6',
  textDecoration: 'none',
};