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

// ツールチップ辞書を定義（QuoteWebTemplate用）
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

// ツールチップレンダリング関数の改善
// Updated: 2025-08-18 - 特定のキーワードのみにマーカーを適用する版
const renderDetailsWithTooltip = (details: string, tooltip: string) => {
  // デバッグ用ログ（開発環境でのみ）
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    console.log('🎯 QuoteWebTemplate renderDetailsWithTooltip called:', {
      details: details?.substring(0, 50) + '...',
      hasTooltip: !!tooltip,
      tooltipPreview: tooltip?.substring(0, 50) + '...'
    });
  }
  
  if (!tooltip || tooltip.trim() === '') {
    if (process.env.NODE_ENV === 'development') {
      console.log('❌ No tooltip provided for:', details);
    }
    return <span>{details}</span>;
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Creating tooltip for:', details?.substring(0, 30), 'with tooltip:', tooltip?.substring(0, 30));
  }
  
  // 動的に渡されたツールチップを使用するため、キーワードを自動検出
  // ツールチップの内容から推測されるキーワードを検索
  let matchedKeyword = '';
  let matchedTooltip = tooltip; // 渡されたツールチップをそのまま使用
  
  // TOOLTIP_DICTIONARYからキーワードを検索（フォールバック）
  const sortedKeywords = Array.from(TOOLTIP_DICTIONARY.keys()).sort((a, b) => b.length - a.length);
  
  // まず、detailsの中にTOOLTIP_DICTIONARYのキーワードが含まれているか確認
  for (const keyword of sortedKeywords) {
    if (details.includes(keyword)) {
      matchedKeyword = keyword;
      // 渡されたツールチップがない場合のみ辞書のものを使用
      // 渡されたツールチップがある場合は常にそれを優先する
      if (!tooltip || tooltip.trim() === '') {
        matchedTooltip = TOOLTIP_DICTIONARY.get(keyword) || tooltip;
      } else {
        // 渡されたツールチップをそのまま使用
        matchedTooltip = tooltip;
      }
      break;
    }
  }
  
  // キーワードが見つからない場合は、主要な単語を抽出
  if (!matchedKeyword) {
    // ROI、APIなど大文字の単語やカタカナの単語を検索
    const patterns = [
      /[A-Z]{2,}/g,  // 大文字の連続（API、ROI、UI、UXなど）
      /[ァ-ヴー]+/g,  // カタカナの単語
      /[A-Za-z]+/g    // 英単語
    ];
    
    for (const pattern of patterns) {
      const matches = details.match(pattern);
      if (matches && matches.length > 0) {
        // 最も長い単語を選択
        matchedKeyword = matches.reduce((a, b) => a.length > b.length ? a : b);
        break;
      }
    }
    
    // それでも見つからない場合は最初の10文字を使用
    if (!matchedKeyword) {
      matchedKeyword = details.substring(0, Math.min(10, details.length));
    }
  }
  
  // HTMLエスケープ処理
  const escapedTooltip = matchedTooltip
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // キーワード部分のみをマーカーで囲み、その他の部分は通常のテキストとして表示
  const escapedKeyword = matchedKeyword
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  const escapedDetails = details
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // キーワード部分だけをツールチップ付きのマーカーに置き換え
  const highlightedDetails = escapedDetails.replace(
    new RegExp(escapedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
    `<span class="tooltip-wrapper" data-tooltip="${escapedTooltip}" tabindex="0">
      <span style="
        background: linear-gradient(180deg, transparent 60%, rgba(254, 240, 138, 0.7) 60%);
        cursor: help;
        border-radius: 3px;
        padding: 1px 4px;
        border-bottom: 2px dotted #f59e0b;
        font-weight: 500;
      ">${escapedKeyword}</span>
      <span class="tooltip-content">💡 ${escapedTooltip}</span>
    </span>`
  );
  
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Keyword highlighted:', {
      original: details,
      keyword: matchedKeyword,
      result: highlightedDetails.substring(0, 100) + '...'
    });
  }
  
  return <span dangerouslySetInnerHTML={{ __html: highlightedDetails }} />;
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
  greetingMessage,
  suggestedOptions = [],
}: QuoteWebTemplateProps) {
  // デバッグログ
  console.log('🌐 [QUOTE-WEB-TEMPLATE:START] QuoteWebTemplate rendering started at:', new Date().toISOString());
  console.log('🌐 [QUOTE-WEB-TEMPLATE:PROPS] Received props:', {
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
  
  // デバッグ用ログ（開発環境でのみ）
  if (process.env.NODE_ENV === 'development') {
    console.log('[QuoteWebTemplate] Rendering with:', {
      companyName: companyInfo?.companyName || companyInfo?.name || '未設定',
      suggestedOptionsCount: suggestedOptions?.length || 0,
      hasQuoteItems: !!quote?.items,
      itemsCount: quote?.items?.length || 0,
      hasNotes: !!quote?.notes,
      notesLength: quote?.notes?.length || 0,
      notesPreview: quote?.notes?.substring(0, 50) || 'なし'
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

  const containerStyle = {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    backgroundColor: '#f6f9fc',
    padding: '0',
    margin: '0',
    minHeight: '100vh',
    color: '#1f2937'
  };

  return (
    <div style={containerStyle} className="main-container">
      
      {/* デプロイバージョン情報 - デバッグ用 */}
      {/* Deploy Version: Complete-No-iframe | Build Date: 2025-08-18 23:00 JST | iframe制約完全回避版 */}
      
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
            overflow-x: visible;
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
          
          /* ツールチップのホバー効果とタッチ対応 - 改善版 */
          /* ツールチップは項目行内のみで有効（備考欄を除外） */
          .item-row .tooltip-wrapper,
          .mobile-card .tooltip-wrapper,
          .desktop-table .item-row .tooltip-wrapper {
            position: relative;
            display: inline-block;
            border-bottom: 1px dotted #333;
            cursor: help;
            /* オーバーフロー表示を確保 */
            overflow: visible !important;
          }
          
          /* テーブル要素でのオーバーフロー設定 */
          .desktop-table,
          .desktop-table table,
          .desktop-table tbody,
          .desktop-table tr,
          .desktop-table td {
            overflow: visible !important;
          }
          
          /* メインコンテナとすべての親要素でオーバーフロー表示を確保 */
          .main-container,
          main,
          section,
          div {
            overflow: visible !important;
          }
          
          /* 備考欄ではツールチップを完全無効化 */
          .notes-section .tooltip-wrapper,
          .notes-content .tooltip-wrapper {
            border-bottom: none !important;
            cursor: default !important;
            background: transparent !important;
            position: static !important;
          }
          
          .notes-section .tooltip-wrapper *,
          .notes-content .tooltip-wrapper * {
            border-bottom: none !important;
            cursor: default !important;
            background: transparent !important;
          }
          
          .tooltip-content {
            /* 初期状態で非表示 */
            visibility: hidden;
            opacity: 0;
            pointer-events: none;
            /* スタイル */
            background-color: #1f2937;
            color: #ffffff;
            text-align: left;
            border-radius: 8px;
            padding: 12px 16px;
            /* 位置設定 - デフォルトは上に表示 */
            position: absolute !important;
            z-index: 99999; 
            /* 上に表示（デフォルト） */
            bottom: 100%;
            top: auto;
            left: 50%;
            transform: translateX(-50%);
            margin-bottom: 8px;
            margin-top: 0;
            /* サイズ設定 - メールクライアント対応版 */
            display: block !important;
            width: 320px !important;
            max-width: 320px !important;
            min-width: 200px !important;
            /* フォント設定 */
            font-size: 13px;
            font-weight: 400;
            /* シャドウ */
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            /* アニメーション */
            transition: opacity 0.2s ease, visibility 0.2s ease;
            /* テキスト設定 - メールクライアント対応版 */
            white-space: normal !important;
            line-height: 1.4 !important;
            word-wrap: break-word !important;
            word-break: keep-all !important;
            overflow-wrap: break-word !important;
            box-sizing: border-box !important;
          }
          
          /* 下に表示する場合の位置調整 */
          .tooltip-position-bottom .tooltip-content {
            top: 100% !important;
            bottom: auto !important;
            margin-top: 8px !important;
            margin-bottom: 0 !important;
            /* 確実に親要素から溢れて表示されるようにする */
            z-index: 99999 !important;
          }
          
          /* 汎用的な表示設定 */
          @media screen {
            .tooltip-content {
              clip-path: none !important;
              overflow: visible !important;
            }
          }
          
          /* ツールチップの矢印（三角形） - デフォルトは下向き（上に表示時） */
          .tooltip-content::after {
            content: '';
            position: absolute;
            top: 100%;
            bottom: auto;
            left: 50%;
            transform: translateX(-50%);
            border-width: 6px;
            border-style: solid;
            border-color: #1f2937 transparent transparent transparent;
          }
          
          /* 下に表示する場合の矢印を上向きに */
          .tooltip-position-bottom .tooltip-content::after {
            bottom: 100% !important;
            top: auto !important;
            border-color: transparent transparent #1f2937 transparent !important;
          }
          
          /* ホバー時の表示 */
          .tooltip-wrapper:hover .tooltip-content,
          .tooltip-wrapper:focus .tooltip-content {
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
          }
          
          /* 備考欄ではツールチップを強制的に無効化 */
          .notes-section .tooltip-wrapper:hover .tooltip-content,
          .notes-section .tooltip-wrapper:focus .tooltip-content,
          .notes-section .tooltip-wrapper:active .tooltip-content,
          .notes-content .tooltip-wrapper:hover .tooltip-content,
          .notes-content .tooltip-wrapper:focus .tooltip-content,
          .notes-content .tooltip-wrapper:active .tooltip-content {
            visibility: hidden !important;
            opacity: 0 !important;
            display: none !important;
            pointer-events: none !important;
          }
          
          /* デスクトップ: ホバーで表示（項目行内のみ） */
          @media (hover: hover) and (pointer: fine) {
            .item-row .tooltip-wrapper:hover .tooltip-content,
            .mobile-card .tooltip-wrapper:hover .tooltip-content,
            .desktop-table .item-row .tooltip-wrapper:hover .tooltip-content,
            .item-row .tooltip-wrapper:focus .tooltip-content,
            .mobile-card .tooltip-wrapper:focus .tooltip-content,
            .desktop-table .item-row .tooltip-wrapper:focus .tooltip-content {
              visibility: visible !important;
              opacity: 1 !important;
              display: block !important;
              position: absolute !important;
              z-index: 999999 !important;
            }
          }
          
          /* 強制表示テスト用クラス */
          .tooltip-content.force-show {
            visibility: visible !important;
            opacity: 1 !important;
            display: block !important;
            position: absolute !important;
            z-index: 999999 !important;
          }
          
          /* より確実なホバー表示のためのフォールバックルール */
          .tooltip-wrapper:hover .tooltip-content {
            visibility: visible !important;
            opacity: 1 !important;
            display: block !important;
            position: absolute !important;
            z-index: 999999 !important;
          }
          
          /* モバイル: タップで表示（項目行内のみ） */
          .item-row .tooltip-wrapper.active .tooltip-content,
          .mobile-card .tooltip-wrapper.active .tooltip-content,
          .desktop-table .item-row .tooltip-wrapper.active .tooltip-content {
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          /* 備考欄ではモバイルタップも無効化 */
          .notes-section .tooltip-wrapper.active .tooltip-content,
          .notes-content .tooltip-wrapper.active .tooltip-content {
            visibility: hidden !important;
            opacity: 0 !important;
            display: none !important;
            pointer-events: none !important;
          }
          
          
          /* 画面端での位置調整 - 簡潔版 */
          .tooltip-wrapper.edge-left .tooltip-content {
            left: 0 !important;
            transform: translateX(0) !important;
          }
          
          .tooltip-wrapper.edge-left .tooltip-content::after {
            left: 20px !important;
            transform: translateX(0) !important;
          }
          
          .tooltip-wrapper.edge-right .tooltip-content {
            left: auto !important;
            right: 0 !important;
            transform: translateX(0) !important;
          }
          
          .tooltip-wrapper.edge-right .tooltip-content::after {
            left: auto !important;
            right: 20px !important;
            transform: translateX(0) !important;
          }
          
          /* デスクトップファースト → モバイルファーストアプローチに変更 */
          @media screen and (max-width: 768px) {
            html, body {
              font-size: 16px !important;
              width: 100% !important;
              overflow-x: visible !important;
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
            
            /* モバイルでのツールチップ調整 - メールクライアント対応版 */
            .tooltip-content {
              width: 280px !important;
              min-width: 150px !important;
              max-width: calc(100vw - 2rem) !important;
              font-size: 12px;
              padding: 10px 12px;
              margin-bottom: 6px;
              word-break: keep-all !important;
              overflow-wrap: break-word !important;
              white-space: normal !important;
              display: block !important;
            }
            
            /* モバイルでの画面端調整 - メールクライアント対応版 */
            .tooltip-wrapper.edge-left .tooltip-content,
            .tooltip-wrapper.edge-right .tooltip-content {
              width: 250px !important;
              max-width: calc(100vw - 4rem) !important;
              word-break: keep-all !important;
              overflow-wrap: break-word !important;
              display: block !important;
            }
            
            /* モバイルではテーブルを非表示、カードを表示 */
            .desktop-table { display: none !important; }
            .mobile-cards { display: block !important; }
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

      <script dangerouslySetInnerHTML={{
        __html: `
          console.log('🌐 [WEB-TEMPLATE-JS:START] QuoteWebTemplate JavaScript loaded at:', new Date().toISOString());
          
          // 初期状態のデバッグ
          console.log('🌐 [WEB-TEMPLATE-JS:INIT] Page initialization:', {
            location: window.location.href,
            userAgent: navigator.userAgent.substring(0, 100),
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight
            },
            timestamp: new Date().toISOString()
          });
          
          // ツールチップのデバッグ情報を表示
          function debugTooltips() {
            console.log('🔍 [WEB-TEMPLATE-JS:DEBUG-TOOLTIPS] Starting tooltip debug...');
            
            // 項目行内のツールチップのみを対象（備考欄を除外）
            const tooltipWrappers = document.querySelectorAll('.item-row .tooltip-wrapper, .mobile-card .tooltip-wrapper, .desktop-table .item-row .tooltip-wrapper');
            const tooltipContents = document.querySelectorAll('.item-row .tooltip-content, .mobile-card .tooltip-content, .desktop-table .item-row .tooltip-content');
            const notesSection = document.querySelector('.notes-section');
            const customMessage = document.querySelector('.custom-message');
            const notesSectionTooltips = document.querySelectorAll('.notes-section .tooltip-wrapper');
            
            // 追加のセレクタをテスト
            const allTooltipWrappers = document.querySelectorAll('.tooltip-wrapper');
            const itemRows = document.querySelectorAll('.item-row');
            const mobileCards = document.querySelectorAll('.mobile-card');
            const desktopTable = document.querySelector('.desktop-table');
            
            console.log('📊 [WEB-TEMPLATE-JS:DEBUG-TOOLTIPS] Complete page analysis:', JSON.stringify({
              tooltips: {
                validWrappers: tooltipWrappers.length,
                validContents: tooltipContents.length,
                allWrappers: allTooltipWrappers.length,
                excludedNotesSectionTooltips: notesSectionTooltips.length,
                wrapperList: Array.from(tooltipWrappers).map((w, index) => ({
                  index,
                  text: w.textContent?.substring(0, 50) + '...',
                  hasContent: w.querySelector('.tooltip-content') !== null,
                  hasDataTooltip: w.hasAttribute('data-tooltip'),
                  dataTooltipValue: w.getAttribute('data-tooltip')?.substring(0, 30) + '...',
                  parentElement: w.closest('.item-row, .mobile-card, .desktop-table') ? 'item-area' : 'other',
                  cssClasses: w.className,
                  parentClasses: w.parentElement?.className || 'no-parent'
                }))
              },
              pageElements: {
                hasNotesSection: !!notesSection,
                notesContent: notesSection?.textContent?.substring(0, 100) + '...',
                hasCustomMessage: !!customMessage,
                customMessageContent: customMessage?.textContent?.substring(0, 100) + '...',
                itemRows: itemRows.length,
                mobileCards: mobileCards.length,
                hasDesktopTable: !!desktopTable
              },
              selectors: {
                itemRows: document.querySelectorAll('.item-row, .mobile-card').length,
                allTooltipWrappersOnPage: allTooltipWrappers.length,
                filteredTooltipWrappers: tooltipWrappers.length
              },
              timestamp: new Date().toISOString()
            }, null, 2));
            
            // 強制的にツールチップを表示してテスト
            if (tooltipContents.length > 0) {
              console.log('🧪 Testing tooltip visibility...');
              const firstTooltip = tooltipContents[0];
              const firstWrapper = firstTooltip?.closest('.tooltip-wrapper');
              
              if (firstTooltip && firstWrapper) {
                console.log('🧪 Force showing first tooltip for 3 seconds...');
                firstTooltip.classList.add('force-show');
                firstWrapper.style.border = '2px solid red'; // デバッグ用の視覚的インジケータ
                
                setTimeout(() => {
                  firstTooltip.classList.remove('force-show');
                  firstWrapper.style.border = ''; // インジケータを削除
                  console.log('✅ Tooltip test completed');
                }, 3000);
              } else {
                console.log('❌ Could not find tooltip elements for testing');
              }
            } else {
              console.log('❌ No tooltip contents found on page');
            }
          }
          
          // ページ読み込み完了後にデバッグ実行
          document.addEventListener('DOMContentLoaded', function() {
            console.log('🌐 [WEB-TEMPLATE-JS:DOM-LOADED] DOM Content Loaded at:', new Date().toISOString());
            
            // 即座にチェックしてからタイムアウト後にも実行
            debugTooltips();
            setTimeout(() => {
              console.log('🌐 [WEB-TEMPLATE-JS:DELAYED-CHECK] Running delayed tooltip check...');
              debugTooltips();
            }, 500);
            
            // ツールチップは項目行内のもののみ対象にする（備考欄を除外）
            const tooltipWrappers = document.querySelectorAll('.item-row .tooltip-wrapper, .mobile-card .tooltip-wrapper, .desktop-table .item-row .tooltip-wrapper');
            console.log('🎯 [WEB-TEMPLATE-JS:DOM-LOADED] Found tooltip wrappers (excluding notes section):', tooltipWrappers.length);
            
            // 備考セクション内のツールチップを明示的に無効化
            const notesTooltips = document.querySelectorAll('.notes-section .tooltip-wrapper, .notes-content .tooltip-wrapper');
            if (notesTooltips.length > 0) {
              console.log('⚠️ [WEB-TEMPLATE-JS:DOM-LOADED] Disabling tooltips in notes section:', notesTooltips.length);
              notesTooltips.forEach((tooltip, index) => {
                tooltip.classList.add('notes-disabled-tooltip');
                tooltip.removeAttribute('tabindex');
                tooltip.style.cursor = 'default';
                tooltip.style.borderBottom = 'none';
                console.log('🚫 Disabled notes tooltip ' + (index + 1));
              });
            }
            
            // さらに詳細なログを追加
            console.log('🔧 [WEB-TEMPLATE-JS:DOM-LOADED] Tooltip wrapper details:', {
              itemRowWrappers: document.querySelectorAll('.item-row .tooltip-wrapper').length,
              mobileCardWrappers: document.querySelectorAll('.mobile-card .tooltip-wrapper').length,
              desktopTableWrappers: document.querySelectorAll('.desktop-table .item-row .tooltip-wrapper').length,
              allWrappers: document.querySelectorAll('.tooltip-wrapper').length,
              timestamp: new Date().toISOString()
            });
            
            // 詳細なDOM構造チェック
            console.log('📋 DOM structure analysis:');
            document.querySelectorAll('.tooltip-wrapper').forEach((w, i) => {
              const content = w.querySelector('.tooltip-content');
              console.log('  Wrapper ' + (i + 1) + ':', {
                element: w,
                hasContent: !!content,
                parentClass: w.parentElement?.className,
                contentText: content ? content.textContent?.substring(0, 50) + '...' : 'No content',
                wrapperRect: w.getBoundingClientRect(),
                isInItemRow: w.closest('.item-row') !== null,
                isInMobileCard: w.closest('.mobile-card') !== null
              });
            });
            
            // ツールチップ位置調整関数 - 空行スペース考慮版
            function adjustTooltipPosition(wrapper, content) {
              if (!wrapper || !content) return;
              
              const rect = wrapper.getBoundingClientRect();
              const viewportWidth = window.innerWidth;
              const viewportHeight = window.innerHeight;
              const tooltipWidth = 400; // ツールチップの想定幅
              
              // 要素の中心位置を計算
              const elementCenter = rect.left + (rect.width / 2);
              const elementMiddle = rect.top + (rect.height / 2);
              const tooltipHalfWidth = tooltipWidth / 2;
              
              // 位置クラスをリセット
              wrapper.classList.remove('edge-left', 'edge-right', 'tooltip-position-top', 'tooltip-position-bottom');
              
              // テーブル内の空行の存在をチェック
              const table = wrapper.closest('table');
              const emptyRows = table ? table.querySelectorAll('tr[style*="height: 50px"]') : [];
              const hasEmptyRowsBelow = emptyRows.length > 0;
              
              console.log('📊 Tooltip positioning analysis:', {
                elementMiddle,
                viewportHeight,
                elementInUpperHalf: elementMiddle < viewportHeight / 2,
                hasEmptyRowsBelow,
                emptyRowsCount: emptyRows.length,
                tableHeight: table ? table.getBoundingClientRect().height : 'no table'
              });
              
              // 常に下に表示を優先（空行があるため）
              if (hasEmptyRowsBelow && emptyRows.length >= 2) {
                // 十分な空行がある場合は必ず下に表示
                wrapper.classList.add('tooltip-position-bottom');
                console.log('📍 Applied bottom positioning due to sufficient empty rows below:', emptyRows.length);
              } else if (elementMiddle < viewportHeight / 2) {
                // 要素が画面上半分にある → ツールチップを下に表示
                wrapper.classList.add('tooltip-position-bottom');
                console.log('📍 Applied bottom positioning for element in upper half');
              } else {
                // 要素が画面下半分にある → ツールチップを上に表示（デフォルト）
                wrapper.classList.add('tooltip-position-top');
                console.log('📍 Applied top positioning for element in lower half');
              }
              
              // 左右の位置調整
              if (elementCenter - tooltipHalfWidth < 20) {
                wrapper.classList.add('edge-left');
                console.log('📍 Applied edge-left positioning');
              } else if (elementCenter + tooltipHalfWidth > viewportWidth - 20) {
                wrapper.classList.add('edge-right');
                console.log('📍 Applied edge-right positioning');
              }
            }
            
            // マウスホバーイベントを強化
            tooltipWrappers.forEach((wrapper, index) => {
              console.log('🔧 Setting up tooltip ' + (index + 1), {
                element: wrapper,
                hasContent: !!wrapper.querySelector('.tooltip-content'),
                text: wrapper.textContent?.substring(0, 30),
                classes: wrapper.className
              });
              
              // フォーカス可能にする
              if (!wrapper.hasAttribute('tabindex')) {
                wrapper.setAttribute('tabindex', '0');
              }
              
              wrapper.addEventListener('mouseenter', function(e) {
                console.log('🖱️ Mouse enter on tooltip ' + (index + 1));
                const content = this.querySelector('.tooltip-content');
                if (content) {
                  adjustTooltipPosition(wrapper, content);
                  content.classList.add('force-show');
                  console.log('✅ Tooltip ' + (index + 1) + ' shown');
                }
              });
              
              wrapper.addEventListener('mouseleave', function(e) {
                console.log('🖱️ Mouse leave on tooltip ' + (index + 1));
                const content = this.querySelector('.tooltip-content');
                if (content) {
                  content.classList.remove('force-show');
                  console.log('✅ Tooltip hidden');
                }
              });
              
              // フォーカスイベント
              wrapper.addEventListener('focus', function(e) {
                const content = this.querySelector('.tooltip-content');
                if (content) {
                  adjustTooltipPosition(wrapper, content);
                  content.classList.add('force-show');
                }
              });
              
              wrapper.addEventListener('blur', function(e) {
                const content = this.querySelector('.tooltip-content');
                if (content) {
                  content.classList.remove('force-show');
                }
              });
              
              // タッチイベント（モバイル対応）
              wrapper.addEventListener('touchstart', function(e) {
                e.stopPropagation();
                
                // 他のアクティブなツールチップを閉じる
                document.querySelectorAll('.tooltip-wrapper.active').forEach(w => {
                  if (w !== wrapper) w.classList.remove('active');
                });
                
                // 現在のツールチップをトグル
                wrapper.classList.toggle('active');
                
                const content = this.querySelector('.tooltip-content');
                if (content && wrapper.classList.contains('active')) {
                  adjustTooltipPosition(wrapper, content);
                }
              });
            });
            
            // ウィンドウリサイズ時の再調整
            let resizeTimeout;
            window.addEventListener('resize', function() {
              clearTimeout(resizeTimeout);
              resizeTimeout = setTimeout(function() {
                console.log('🔄 Window resized - readjusting all tooltips');
                const activeTooltips = document.querySelectorAll('.tooltip-wrapper:hover .tooltip-content, .tooltip-wrapper.active .tooltip-content');
                activeTooltips.forEach(content => {
                  const wrapper = content.closest('.tooltip-wrapper');
                  if (wrapper) {
                    adjustTooltipPosition(wrapper, content);
                  }
                });
              }, 250);
            });
            
            // スクロール時の再調整
            let scrollTimeout;
            window.addEventListener('scroll', function() {
              clearTimeout(scrollTimeout);
              scrollTimeout = setTimeout(function() {
                const activeTooltips = document.querySelectorAll('.tooltip-wrapper:hover .tooltip-content, .tooltip-wrapper.active .tooltip-content');
                if (activeTooltips.length > 0) {
                  console.log('📜 Page scrolled - readjusting active tooltips');
                  activeTooltips.forEach(content => {
                    const wrapper = content.closest('.tooltip-wrapper');
                    if (wrapper) {
                      adjustTooltipPosition(wrapper, content);
                    }
                  });
                }
              }, 100);
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
                    
                    // デバッグログ: 項目データを確認（開発環境のみ）
                    if (process.env.NODE_ENV === 'development') {
                      console.log('🎯 QuoteWebTemplate item ' + (index + 1) + ':', {
                        itemName: item.itemName,
                        description: item.description,
                        hasTooltip: !!item.tooltip,
                        tooltip: item.tooltip ? item.tooltip.substring(0, 50) + '...' : 'なし',
                        productLink: item.productLink || 'なし'
                      });
                    }
                    
                    return (
                      <tr key={index} style={tableBodyRowStyle} className="item-row">
                        <td style={{...tableBodyCellStyle, color: itemColor}}>
                          {item.productLink ? (
                            <a href={item.productLink} style={{...productLinkStyle, color: isDiscount ? '#dc2626' : '#3B82F6'}}>
                              {item.tooltip ? 
                                renderDetailsWithTooltip(item.itemName || '', item.tooltip) :
                                (item.itemName || '')
                              }
                            </a>
                          ) : (
                            item.tooltip ? 
                              renderDetailsWithTooltip(item.itemName || '', item.tooltip) :
                              (item.itemName || '')
                          )}
                          {(item.details || item.description) && (
                            <div style={{fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem'}}>
                              {item.tooltip ? 
                                renderDetailsWithTooltip(item.details || item.description || '', item.tooltip) :
                                (item.details || item.description || '')
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
                  {/* 最小行数確保のための空行追加 - 5行になるまで空行を追加 */}
                  {Array.from({ length: Math.max(0, 5 - quote.items.length) }, (_, index) => (
                    <tr key={`empty-${index}`} style={{...tableBodyRowStyle, height: '50px'}}>
                      <td style={{...tableBodyCellStyle, padding: '1rem'}}></td>
                      <td style={tableBodyCellStyle}></td>
                      <td style={tableBodyCellStyle}></td>
                      <td style={tableBodyCellStyle}></td>
                      <td style={tableBodyCellStyle}></td>
                      <td style={tableBodyCellStyle}></td>
                    </tr>
                  ))}
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
                  <div key={index} style={{...itemCardStyle, borderLeft: isDiscount ? '4px solid #dc2626' : '4px solid #3B82F6'}} className="item-card mobile-card">
                    <div style={itemHeaderStyle}>
                      <div style={{...itemNameStyle, color: itemColor}} className="item-name">
                        {item.productLink ? (
                          <a href={item.productLink} style={{...productLinkStyle, color: isDiscount ? '#dc2626' : '#3B82F6'}}>
                            {item.tooltip ? 
                              renderDetailsWithTooltip(item.itemName || '', item.tooltip) :
                              (item.itemName || '')
                            }
                          </a>
                        ) : (
                          item.tooltip ? 
                            renderDetailsWithTooltip(item.itemName || '', item.tooltip) :
                            (item.itemName || '')
                        )}
                      </div>
                      <div style={{...itemAmountStyle, color: itemColor}} className="item-amount">
                        {formatCurrency(item.amount)}
                      </div>
                    </div>
                    {(item.details || item.description) && (
                      <div style={itemDetailsStyle} className="item-details">
                        {item.tooltip ? 
                          renderDetailsWithTooltip(item.details || item.description || '', item.tooltip) :
                          (item.details || item.description || '')
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

        {/* 備考セクション - 備考がある場合のみ表示 */}
        {(() => {
          // 備考の内容をチェック（型安全性とcleanDuplicateSignatures適用後の再チェック）
          const originalNotes = quote.notes;
          
          // デバッグログ（開発環境のみ）
          if (process.env.NODE_ENV === 'development') {
            console.log('📝 QuoteWebTemplate notes check (enhanced):', {
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
            <section style={notesSectionStyle} className="notes-section">
              <h3 style={h3Style}>備考</h3>
              <div style={notesTextStyle} className="notes-content">
                {finalNotes}
              </div>
            </section>
          );
        })()}
      </main>

      {/* フッター */}
      <footer style={footerStyle}>
        <div style={footerContentStyle}>
          <p style={footerTextStyle}>
            このメールは {quote.companySnapshot?.companyName || companyInfo?.companyName || companyInfo?.name || '会社名未設定'} より送信されました。
          </p>
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
// Note: containerStyle is defined inside the function component
const webContainerStyle = {
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
  overflow: 'visible', // ツールチップが見切れないようにする
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
  overflow: 'visible !important',
  position: 'relative',
  minHeight: '400px', // 最小高さを確保してツールチップ表示領域を確保
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
  overflow: 'visible', // ツールチップが見切れないようにする
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



// 新しいテーブル関連スタイル
const desktopTableStyle = {
  display: 'block',
  width: '100%',
  overflow: 'visible',
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
  overflow: 'visible !important',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  position: 'relative',
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
  overflow: 'visible !important',
  position: 'relative',
};

const tableBodyCellStyle = {
  padding: '1rem 0.75rem',
  fontSize: '0.875rem',
  borderRight: '1px solid #f3f4f6',
  verticalAlign: 'top' as const,
  overflow: 'visible !important',
  position: 'relative',
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