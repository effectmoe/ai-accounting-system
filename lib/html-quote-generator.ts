import { render } from '@react-email/render';
import QuoteHtmlTemplate from '@/emails/QuoteHtmlTemplate';
import QuoteWebTemplate from '@/emails/QuoteWebTemplate';
import { Quote, CompanyInfo } from '@/types/collections';
import { logger } from '@/lib/logger';
import { cleanDuplicateSignatures } from '@/lib/utils/clean-duplicate-signatures';

export interface HtmlQuoteOptions {
  quote: Quote;
  companyInfo: CompanyInfo;
  recipientName?: string;
  customMessage?: string;
  includeTracking?: boolean;
  includeInteractiveElements?: boolean;
  suggestedOptions?: SuggestedOption[];
  tooltips?: Map<string, string>;
  productLinks?: Map<string, string>;
  useWebLayout?: boolean; // Web最適化レイアウト使用フラグ
  acceptUrl?: string;     // カスタムAccept URL（プレビュー用）
  considerUrl?: string;   // カスタムConsider URL（プレビュー用）
  discussUrl?: string;    // カスタムDiscuss URL（プレビュー用）
}

export interface SuggestedOption {
  title: string;
  description: string;
  price: string;
  features: string[];
  ctaText: string;
  ctaUrl: string;
}

export interface HtmlQuoteResult {
  html: string;
  plainText: string;
  subject: string;
  previewText: string;
  trackingId?: string;
}

/**
 * HTML見積書を生成
 */
export async function generateHtmlQuote(
  options: HtmlQuoteOptions
): Promise<HtmlQuoteResult> {
  try {
    const {
      quote,
      companyInfo,
      recipientName,
      customMessage,
      includeTracking = true,
      includeInteractiveElements = true,
      suggestedOptions = [],
      tooltips,
      productLinks,
      useWebLayout = false, // デフォルトは従来のメールテンプレート
      acceptUrl: customAcceptUrl,
      considerUrl: customConsiderUrl,
      discussUrl: customDiscussUrl,
    } = options;

    // デバッグログ
    logger.debug('[html-quote-generator] Generating HTML with:', {
      companyName: companyInfo?.companyName || companyInfo?.name,
      suggestedOptionsCount: suggestedOptions?.length || 0,
      useWebLayout,
      includeInteractiveElements,
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accounting-automation.vercel.app';
    const trackingId = includeTracking ? generateTrackingId() : undefined;

    // 見積項目にインタラクティブ要素を追加
    const enhancedQuote = enhanceQuoteItems(quote, tooltips, productLinks);

    // URLs生成（カスタムURLが提供されていればそれを使用）
    const viewOnlineUrl = `${baseUrl}/quotes/view/${quote._id}?t=${trackingId}`;
    const acceptUrl = customAcceptUrl || `${baseUrl}/quotes/accept/${quote._id}?t=${trackingId}`;
    const considerUrl = customConsiderUrl || `${baseUrl}/quotes/consider/${quote._id}?t=${trackingId}`;
    const discussUrl = customDiscussUrl || `${baseUrl}/quotes/discuss/${quote._id}?t=${trackingId}`;
    const trackingPixelUrl = includeTracking
      ? `${baseUrl}/api/tracking/open?id=${trackingId}&doc=quote&qid=${quote._id}`
      : undefined;

    // HTML生成 - レイアウトに応じてテンプレートを選択
    const TemplateComponent = useWebLayout ? QuoteWebTemplate : QuoteHtmlTemplate;
    
    const html = await render(
      TemplateComponent({
        quote: enhancedQuote,
        companyInfo,
        recipientName,
        viewOnlineUrl,
        acceptUrl,
        considerUrl,
        discussUrl,
        trackingPixelUrl,
        customMessage,
        suggestedOptions: includeInteractiveElements ? suggestedOptions : [],
      }),
      {
        pretty: true,
      }
    );

    // プレーンテキスト版も生成
    const plainText = generatePlainText(quote, companyInfo);

    // 件名生成
    const subject = generateSubject(quote, companyInfo);

    // プレビューテキスト生成
    const previewText = generatePreviewText(quote, companyInfo);

    return {
      html,
      plainText,
      subject,
      previewText,
      trackingId,
    };
  } catch (error) {
    logger.error('Error generating HTML quote:', error);
    throw error;
  }
}

/**
 * 見積項目にインタラクティブ要素を追加
 */
function enhanceQuoteItems(
  quote: Quote,
  tooltips?: Map<string, string>,
  productLinks?: Map<string, string>
): Quote {
  if (!tooltips && !productLinks) {
    return quote;
  }

  // itemsが存在しない場合はそのまま返す
  if (!quote.items || !Array.isArray(quote.items)) {
    return quote;
  }

  console.log('Enhancing quote items with tooltips:', tooltips?.size || 0, 'tooltips available');

  return {
    ...quote,
    items: quote.items.map((item, index) => {
      const enhanced: any = { ...item };
      
      // ツールチップを追加
      if (tooltips) {
        const tooltip = findTooltipForItem(item.itemName || item.description || '', tooltips);
        console.log(`Item ${index + 1} (${item.itemName || item.description}): tooltip =`, tooltip ? 'found' : 'not found');
        if (tooltip) {
          enhanced.tooltip = tooltip;
        }
      }

      // 商品リンクを追加
      if (productLinks) {
        const link = productLinks.get(item.productId || item.itemName || item.description || '');
        if (link) {
          enhanced.productLink = link;
        }
      }

      // 詳細説明を追加
      const itemText = item.itemName || item.description || '';
      if (itemText.length > 50) {
        enhanced.details = itemText;
        enhanced.itemName = itemText.substring(0, 50) + '...';
      }

      return enhanced;
    }),
  };
}

/**
 * アイテムに対応するツールチップを検索
 */
function findTooltipForItem(
  description: string,
  tooltips: Map<string, string>
): string | undefined {
  // 専門用語を検出してツールチップを返す
  const terms = Array.from(tooltips.keys());
  for (const term of terms) {
    if (description.includes(term)) {
      return tooltips.get(term);
    }
  }
  return undefined;
}

/**
 * トラッキングID生成
 */
function generateTrackingId(): string {
  return `qt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * プレーンテキスト版生成
 */
function generatePlainText(quote: Quote, companyInfo: CompanyInfo): string {
  const lines: string[] = [];
  
  lines.push('=' .repeat(60));
  lines.push('お見積書');
  lines.push('=' .repeat(60));
  lines.push('');
  lines.push(`見積書番号: ${quote.quoteNumber}`);
  lines.push(`発行日: ${formatDate(quote.issueDate)}`);
  lines.push(`有効期限: ${formatDate(quote.validityDate)}`);
  lines.push('');
  lines.push('-' .repeat(60));
  lines.push('【見積内容】');
  lines.push('-' .repeat(60));
  
  quote.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.itemName || item.description || ''}`);
    lines.push(`   数量: ${item.quantity} ${item.unit || '個'}`);
    lines.push(`   単価: ${formatCurrency(item.unitPrice)}`);
    lines.push(`   金額: ${formatCurrency(item.amount)}`);
    lines.push('');
  });
  
  lines.push('-' .repeat(60));
  lines.push(`小計: ${formatCurrency(quote.subtotal)}`);
  lines.push(`消費税（${quote.taxRate}%）: ${formatCurrency(quote.taxAmount)}`);
  lines.push(`合計金額: ${formatCurrency(quote.totalAmount)}`);
  lines.push('-' .repeat(60));
  
  if (quote.notes) {
    lines.push('');
    lines.push('【備考】');
    lines.push(quote.notes);
  }
  
  lines.push('');
  lines.push('=' .repeat(60));
  lines.push(companyInfo.companyName || companyInfo.name || '');
  if (companyInfo.postalCode) {
    const address = [
      `〒${companyInfo.postalCode}`,
      companyInfo.prefecture,
      companyInfo.city,
      companyInfo.address1,
      companyInfo.address2
    ].filter(Boolean).join(' ');
    lines.push(address);
  }
  if (companyInfo.phone) {
    lines.push(`TEL: ${companyInfo.phone}`);
  }
  if (companyInfo.email) {
    lines.push(`Email: ${companyInfo.email}`);
  }
  if (companyInfo.website) {
    lines.push(`Web: ${companyInfo.website}`);
  }
  
  return lines.join('\n');
}

/**
 * 件名生成
 */
function generateSubject(quote: Quote, companyInfo: CompanyInfo): string {
  const companyName = companyInfo.companyName || companyInfo.name || '';
  if (quote.title) {
    return `【お見積書】${quote.title} - ${companyName}`;
  }
  return `お見積書（No.${quote.quoteNumber}）- ${companyName}`;
}

/**
 * プレビューテキスト生成
 */
function generatePreviewText(quote: Quote, companyInfo: CompanyInfo): string {
  const total = formatCurrency(quote.totalAmount);
  if (quote.title) {
    return `${quote.title} お見積金額：${total}`;
  }
  return `お見積金額：${total} | 有効期限：${formatDate(quote.validityDate)}`;
}

/**
 * 日付フォーマット
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/**
 * 通貨フォーマット
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount);
}

/**
 * デフォルトの提案オプションを生成
 */
export function generateDefaultSuggestedOptions(
  quote: Quote
): SuggestedOption[] {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accounting-automation.vercel.app';
  const suggestions: SuggestedOption[] = [];

  // 見積金額に応じた提案を生成
  const totalAmount = quote.totalAmount;

  if (totalAmount < 500000) {
    suggestions.push({
      title: '🚀 プレミアムサポートプラン',
      description: '優先サポートと拡張保証でビジネスを加速',
      price: '月額 ¥20,000',
      features: [
        '24時間以内の優先対応',
        '専任サポート担当者',
        '月次レポート作成',
        '無償アップデート',
      ],
      ctaText: '詳細を見る',
      ctaUrl: `${baseUrl}/plans/premium-support`,
    });
  }

  if (totalAmount > 300000) {
    suggestions.push({
      title: '📊 データ分析オプション',
      description: 'AIを活用した高度な分析でビジネスインサイトを獲得',
      price: '¥50,000/回',
      features: [
        'カスタムダッシュボード作成',
        '予測分析レポート',
        'ROI最適化提案',
        '競合分析',
      ],
      ctaText: 'サンプルを見る',
      ctaUrl: `${baseUrl}/plans/data-analytics`,
    });
  }

  suggestions.push({
    title: '🎯 年間契約割引',
    description: '年間契約で15%の特別割引を適用',
    price: `年額 ¥${Math.floor(totalAmount * 12 * 0.85).toLocaleString()}`,
    features: [
      '15%割引適用',
      '請求書発行の簡素化',
      '優先アップデート',
      '無料カスタマイズ（3回まで）',
    ],
    ctaText: '年間契約に切り替える',
    ctaUrl: `${baseUrl}/quotes/${quote._id}/upgrade-annual`,
  });

  return suggestions;
}

/**
 * 専門用語の辞書を生成
 */
export function generateDefaultTooltips(): Map<string, string> {
  const tooltips = new Map<string, string>();

  // IT関連用語
  tooltips.set('LLMO', 'Large Language Model Optimization - 大規模言語モデル最適化技術');
  tooltips.set('SaaS', 'Software as a Service - クラウド経由で提供されるソフトウェア');
  tooltips.set('API', 'Application Programming Interface - システム間の連携インターフェース');
  tooltips.set('UI/UX', 'ユーザーインターフェース/ユーザー体験 - 使いやすさとデザイン');
  tooltips.set('レスポンシブ', 'PC・スマホ・タブレットなど、あらゆる画面サイズに対応');
  tooltips.set('SEO', 'Search Engine Optimization - 検索エンジン最適化');
  
  // ビジネス用語
  tooltips.set('ROI', 'Return on Investment - 投資収益率');
  tooltips.set('KPI', 'Key Performance Indicator - 重要業績評価指標');
  tooltips.set('リードタイム', '発注から納品までの期間');
  
  // より一般的な用語を追加
  tooltips.set('システム', 'コンピュータとソフトウェアを組み合わせた仕組み');
  tooltips.set('開発', 'ソフトウェアやシステムを設計・構築すること');
  tooltips.set('構築', 'システムやWebサイトを作り上げること');
  tooltips.set('設計', 'システムの設計図を作成すること');
  tooltips.set('保守', 'システムの維持・管理・改善作業');
  tooltips.set('運用', 'システムを日常的に運用・管理すること');
  tooltips.set('メンテナンス', 'システムの保守点検・改良作業');
  tooltips.set('アップデート', 'ソフトウェアやシステムの更新・改善');
  tooltips.set('カスタマイズ', 'お客様のご要望に合わせた独自の調整・改修');
  tooltips.set('サポート', '技術支援・問題解決・使い方指導');
  
  return tooltips;
}

/**
 * メール送信用の純粋なHTML文字列を生成（Gmail対応）
 */
export async function generateSimpleHtmlQuote({
  quote,
  companyInfo,
  recipientName,
  customMessage,
}: {
  quote: any;
  companyInfo: any;
  recipientName?: string;
  customMessage?: string;
}): Promise<{ html: string; plainText: string; subject: string }> {
  const customerName = recipientName || quote.customer?.name || quote.customer?.companyName || 'お客様';
  const issueDate = new Date(quote.issueDate || new Date()).toLocaleDateString('ja-JP');
  const validityDate = new Date(quote.validityDate || new Date()).toLocaleDateString('ja-JP');
  
  const subtotal = quote.subtotal || 0;
  const taxAmount = quote.taxAmount || 0;
  const totalAmount = quote.totalAmount || 0;

  // 会社情報の取得（スナップショットを優先）
  const companyName = quote.companySnapshot?.companyName || companyInfo?.companyName || companyInfo?.name || '会社名未設定';
  const companyAddress = quote.companySnapshot?.address || 
    [companyInfo?.postalCode && `〒${companyInfo.postalCode}`,
     companyInfo?.prefecture,
     companyInfo?.city,
     companyInfo?.address1,
     companyInfo?.address2].filter(Boolean).join(' ') || '';
  const companyPhone = quote.companySnapshot?.phone || companyInfo?.phone || '';
  const companyEmail = quote.companySnapshot?.email || companyInfo?.email || '';
  const companyWebsite = companyInfo?.website || '';

  // ツールチップ辞書を生成
  const tooltips = generateDefaultTooltips();
  
  // ベースURL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accounting-automation.vercel.app';
  
  // トラッキングID生成
  const trackingId = `qt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  
  // CTA URLs
  const viewOnlineUrl = `${baseUrl}/quotes/view/${quote._id}?t=${trackingId}`;
  const acceptUrl = `${baseUrl}/quotes/accept/${quote._id}?t=${trackingId}`;
  const discussUrl = `${baseUrl}/quotes/discuss/${quote._id}?t=${trackingId}`;

  // HTMLメール用のテンプレート（インラインCSS、Gmail対応、機能的要素付き）
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>お見積書 - ${quote.quoteNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Meiryo', 'MS PGothic', sans-serif; background-color: #f5f5f5;">
  <!-- オンライン版を見るリンク（ボタン化） -->
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 15px 0;">
        <a href="${viewOnlineUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: all 0.3s;">
          🌐 ウェブブラウザで見積書を表示する
        </a>
      </td>
    </tr>
  </table>
  
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 10px 0 20px 0;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- ヘッダー -->
          <tr>
            <td style="padding: 40px 40px 30px 40px;">
              <h1 style="margin: 0; text-align: center; color: #333333; font-size: 28px; font-weight: bold;">お見積書</h1>
            </td>
          </tr>
          
          <!-- 顧客情報 -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold; color: #333333;">${customerName} 様</p>
              <p style="margin: 0 0 5px 0; font-size: 14px; color: #666666; line-height: 1.6;">平素より格別のご高配を賜り、厚く御礼申し上げます。</p>
              <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6;">ご依頼いただきました件について、下記の通りお見積りさせていただきます。</p>
            </td>
          </tr>

          ${customMessage ? `
          <!-- カスタムメッセージ -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #e3f2fd; border-radius: 6px;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; font-size: 14px; color: #1976d2; line-height: 1.6;">${customMessage}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- 見積情報 -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="33%" style="padding: 5px 0;">
                    <span style="font-size: 12px; color: #999999;">見積書番号</span><br>
                    <span style="font-size: 14px; color: #333333; font-weight: bold;">${quote.quoteNumber}</span>
                  </td>
                  <td width="33%" style="padding: 5px 0;">
                    <span style="font-size: 12px; color: #999999;">発行日</span><br>
                    <span style="font-size: 14px; color: #333333; font-weight: bold;">${issueDate}</span>
                  </td>
                  <td width="34%" style="padding: 5px 0;">
                    <span style="font-size: 12px; color: #999999;">有効期限</span><br>
                    <span style="font-size: 14px; color: #333333; font-weight: bold;">${validityDate}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 見積内容 -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #333333; border-bottom: 2px solid #333333; padding-bottom: 8px;">見積内容</h2>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f8f8f8;">
                    <th style="border: 1px solid #dddddd; padding: 10px; text-align: left; font-size: 13px; color: #333333; font-weight: bold;">品目</th>
                    <th style="border: 1px solid #dddddd; padding: 10px; text-align: center; font-size: 13px; color: #333333; font-weight: bold; width: 60px;">数量</th>
                    <th style="border: 1px solid #dddddd; padding: 10px; text-align: right; font-size: 13px; color: #333333; font-weight: bold; width: 100px;">単価</th>
                    <th style="border: 1px solid #dddddd; padding: 10px; text-align: right; font-size: 13px; color: #333333; font-weight: bold; width: 100px;">金額</th>
                  </tr>
                </thead>
                <tbody>
                  ${quote.items.map((item: any) => {
                    // ツールチップを検索
                    let tooltipText = '';
                    const itemText = (item.itemName || '') + ' ' + (item.description || '');
                    for (const [term, explanation] of tooltips.entries()) {
                      if (itemText.includes(term)) {
                        tooltipText = explanation;
                        break;
                      }
                    }
                    
                    return `
                  <tr>
                    <td style="border: 1px solid #dddddd; padding: 10px; vertical-align: top;">
                      <div style="font-size: 14px; color: #333333; font-weight: bold; margin: 0 0 4px 0;">
                        ${item.itemName || ''}
                        ${tooltipText ? `<span style="font-size: 11px; color: #1976d2; font-weight: normal; margin-left: 5px;">[※]</span>` : ''}
                      </div>
                      ${item.description ? `<div style="font-size: 12px; color: #666666; line-height: 1.4;">${item.description}</div>` : ''}
                      ${tooltipText ? `
                      <div style="margin-top: 5px; padding: 8px; background-color: #e3f2fd; border-left: 3px solid #1976d2; border-radius: 3px;">
                        <span style="font-size: 11px; color: #1565c0; font-weight: bold;">💡 用語解説:</span>
                        <span style="font-size: 11px; color: #424242; line-height: 1.4; display: block; margin-top: 3px;">${tooltipText}</span>
                      </div>
                      ` : ''}
                    </td>
                    <td style="border: 1px solid #dddddd; padding: 10px; text-align: center; font-size: 14px; color: #333333;">${item.quantity || 0}${item.unit || ''}</td>
                    <td style="border: 1px solid #dddddd; padding: 10px; text-align: right; font-size: 14px; color: #333333;">¥${(item.unitPrice || 0).toLocaleString()}</td>
                    <td style="border: 1px solid #dddddd; padding: 10px; text-align: right; font-size: 14px; color: #333333; font-weight: bold;">¥${(item.amount || 0).toLocaleString()}</td>
                  </tr>
                  `;
                  }).join('')}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- 合計 -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="60%"></td>
                  <td width="40%">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 5px 10px; text-align: right; font-size: 14px; color: #666666;">小計:</td>
                        <td style="padding: 5px 0; text-align: right; font-size: 14px; color: #333333; width: 120px;">¥${subtotal.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 10px; text-align: right; font-size: 14px; color: #666666;">消費税(10%):</td>
                        <td style="padding: 5px 0; text-align: right; font-size: 14px; color: #333333;">¥${taxAmount.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="border-top: 2px solid #333333; padding-top: 8px;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="padding: 5px 10px; text-align: right; font-size: 16px; color: #333333; font-weight: bold;">合計金額:</td>
                              <td style="padding: 5px 0; text-align: right; font-size: 18px; color: #1976d2; font-weight: bold; width: 120px;">¥${totalAmount.toLocaleString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA ボタンセクション -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <h3 style="margin: 0 0 20px 0; font-size: 16px; color: #333333; font-weight: bold;">📋 次のステップ</h3>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <!-- 承認ボタン -->
                        <td style="padding: 0 10px;">
                          <a href="${acceptUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 30px; background-color: #4caf50; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">✓ 見積を承認する</a>
                        </td>
                        <!-- 相談ボタン -->
                        <td style="padding: 0 10px;">
                          <a href="${discussUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 30px; background-color: #2196f3; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">💬 相談する</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 追加提案セクション -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 2px dashed #ffc107; border-radius: 8px; padding: 20px; background-color: #fffbf0;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #f57c00; font-weight: bold;">🎯 おすすめオプション</h3>
                    
                    <!-- プレミアムサポート -->
                    <div style="margin-bottom: 15px; padding: 12px; background-color: #ffffff; border-radius: 6px; border-left: 4px solid #4caf50;">
                      <h4 style="margin: 0 0 5px 0; font-size: 14px; color: #333333;">🚀 プレミアムサポートプラン</h4>
                      <p style="margin: 0 0 8px 0; font-size: 12px; color: #666666; line-height: 1.4;">24時間以内の優先対応、専任サポート担当者、月次レポート作成</p>
                      <span style="font-size: 13px; color: #4caf50; font-weight: bold;">月額 ¥20,000</span>
                    </div>
                    
                    <!-- 年間契約割引 -->
                    <div style="padding: 12px; background-color: #ffffff; border-radius: 6px; border-left: 4px solid #2196f3;">
                      <h4 style="margin: 0 0 5px 0; font-size: 14px; color: #333333;">💰 年間契約割引</h4>
                      <p style="margin: 0 0 8px 0; font-size: 12px; color: #666666; line-height: 1.4;">年間契約で15%割引＋請求書発行簡素化＋優先アップデート</p>
                      <span style="font-size: 13px; color: #2196f3; font-weight: bold;">15%割引適用</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${quote.notes ? `
          <!-- 備考 -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9f9f9; border-radius: 6px;">
                <tr>
                  <td style="padding: 15px;">
                    <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #333333; font-weight: bold;">備考</h3>
                    <p style="margin: 0; font-size: 13px; color: #666666; line-height: 1.6; white-space: pre-wrap;">${cleanDuplicateSignatures(quote.notes)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- 会社情報フッター -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; border-top: 1px solid #dddddd;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="50%">
                    <p style="margin: 0 0 5px 0; font-size: 14px; color: #333333; font-weight: bold;">${companyName}</p>
                    ${companyAddress ? `<p style="margin: 0 0 3px 0; font-size: 12px; color: #666666;">${companyAddress}</p>` : ''}
                    ${companyPhone ? `<p style="margin: 0 0 3px 0; font-size: 12px; color: #666666;">TEL: ${companyPhone}</p>` : ''}
                    ${companyEmail ? `<p style="margin: 0 0 3px 0; font-size: 12px; color: #666666;">Email: ${companyEmail}</p>` : ''}
                    ${companyWebsite ? `<p style="margin: 0; font-size: 12px;"><a href="${companyWebsite}" style="color: #1976d2; text-decoration: none;">${companyWebsite}</a></p>` : ''}
                  </td>
                  <td width="50%" align="right" valign="bottom">
                    <p style="margin: 0; font-size: 11px; color: #999999;">お問い合わせ</p>
                    <a href="mailto:${companyEmail}?subject=見積書${quote.quoteNumber}について" style="display: inline-block; margin-top: 5px; padding: 8px 20px; background-color: #f5f5f5; color: #333333; text-decoration: none; font-size: 12px; border-radius: 4px; border: 1px solid #dddddd;">📧 メールで問い合わせ</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  
  <!-- トラッキングピクセル -->
  <img src="${baseUrl}/api/tracking/open?id=${trackingId}&doc=quote&qid=${quote._id}" width="1" height="1" style="display: none;" alt="" />
</body>
</html>
  `.trim();

  // プレーンテキスト版
  const plainText = `
お見積書

${customerName} 様

平素より格別のご高配を賜り、厚く御礼申し上げます。
ご依頼いただきました件について、下記の通りお見積りさせていただきます。

${customMessage ? customMessage + '\n\n' : ''}
見積書番号: ${quote.quoteNumber}
発行日: ${issueDate}
有効期限: ${validityDate}

【見積内容】
${quote.items.map((item: any) => `
・${item.itemName || ''}
  ${item.description ? item.description + '\n  ' : ''}数量: ${item.quantity || 0}${item.unit || ''}
  単価: ¥${(item.unitPrice || 0).toLocaleString()}
  金額: ¥${(item.amount || 0).toLocaleString()}
`).join('')}

小計: ¥${subtotal.toLocaleString()}
消費税: ¥${taxAmount.toLocaleString()}
合計金額: ¥${totalAmount.toLocaleString()}

${quote.notes ? '【備考】\n' + cleanDuplicateSignatures(quote.notes) + '\n\n' : ''}
${companyName}
${companyAddress}
${companyPhone ? 'TEL: ' + companyPhone : ''}
${companyEmail ? 'Email: ' + companyEmail : ''}
${companyWebsite || ''}
  `.trim();

  const subject = `お見積書 ${quote.quoteNumber} - ${companyName}`;

  return { html, plainText, subject };
}