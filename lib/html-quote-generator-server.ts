/**
 * サーバーサイド専用のメール生成関数
 * MongoDBとの連携を含む
 */

import { Quote } from '@/types/quote';
import { SuggestedOption } from '@/types/suggested-option';
import { SuggestedOptionService } from '@/services/suggested-option.service';
import { generateDefaultSuggestedOptions, generateDefaultTooltips } from './html-quote-generator';

/**
 * DBから見積金額に応じたおすすめオプションを取得（サーバーサイド専用）
 */
export async function getSuggestedOptionsFromDB(
  quote: Quote
): Promise<SuggestedOption[]> {
  try {
    const suggestedOptionService = new SuggestedOptionService();
    
    const options = await suggestedOptionService.getSuggestedOptionsForQuote({
      amount: quote.totalAmount,
      isActive: true,
      limit: 10
    });
    
    // オプションが見つからない場合はデフォルトを返す
    if (!options || options.length === 0) {
      return generateDefaultSuggestedOptions(quote);
    }
    
    return options;
  } catch (error) {
    console.error('Error fetching suggested options from DB:', error);
    // エラーの場合は従来のデフォルトオプションを返す
    return generateDefaultSuggestedOptions(quote);
  }
}

/**
 * サーバーサイド専用のHTMLメール見積書生成関数
 * DBからおすすめオプションを取得する
 */
export async function generateServerHtmlQuote({
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
  
  // おすすめオプションをDBから取得
  const suggestedOptions = await getSuggestedOptionsFromDB(quote);

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
                    <div style="margin: 0; font-size: 14px; color: #1976d2; line-height: 1.6;">${customMessage}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          
          <!-- 見積番号と日付 -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="width: 50%;">
                    <p style="margin: 0; font-size: 14px; color: #666666;"><strong>見積番号：</strong>${quote.quoteNumber}</p>
                  </td>
                  <td style="width: 50%; text-align: right;">
                    <p style="margin: 0; font-size: 14px; color: #666666;"><strong>見積日：</strong>${issueDate}</p>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 5px;">
                    <p style="margin: 0; font-size: 14px; color: #666666;"><strong>有効期限：</strong>${validityDate}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 見積項目テーブル -->
          <tr>
            <td style="padding: 0 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f8f9fa;">
                    <th style="padding: 12px; text-align: left; border: 1px solid #e0e0e0; font-size: 14px; color: #333333; font-weight: bold;">品目</th>
                    <th style="padding: 12px; text-align: center; border: 1px solid #e0e0e0; font-size: 14px; color: #333333; font-weight: bold; width: 60px;">数量</th>
                    <th style="padding: 12px; text-align: right; border: 1px solid #e0e0e0; font-size: 14px; color: #333333; font-weight: bold; width: 80px;">単価</th>
                    <th style="padding: 12px; text-align: right; border: 1px solid #e0e0e0; font-size: 14px; color: #333333; font-weight: bold; width: 90px;">小計</th>
                    <th style="padding: 12px; text-align: right; border: 1px solid #e0e0e0; font-size: 14px; color: #333333; font-weight: bold; width: 80px;">消費税</th>
                    <th style="padding: 12px; text-align: right; border: 1px solid #e0e0e0; font-size: 14px; color: #333333; font-weight: bold; width: 100px;">金額</th>
                  </tr>
                </thead>
                <tbody>
                  ${(quote.items || []).map((item: any, index: number) => {
                    const isDiscount = (item.amount < 0) || 
                      (item.itemName && (item.itemName.includes('値引き') || item.itemName.includes('割引') || item.itemName.includes('ディスカウント')));
                    const itemColor = isDiscount ? '#dc2626' : '#333333';
                    const subtotalAmount = (item.quantity || 1) * (item.unitPrice || 0);
                    const taxAmount = subtotalAmount * (quote.taxRate || 0.1);
                    
                    // メール版ツールチップ付きの項目名を生成（インライン注釈方式）
                    const renderItemWithTooltip = (itemName: string, tooltip: string) => {
                      if (!tooltip || tooltip.trim() === '') {
                        return itemName;
                      }
                      
                      // HTMLエスケープ処理
                      const escapedName = itemName
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
                      
                      // 長い説明文は50文字で切って省略記号を付ける
                      const trimmedTooltip = tooltip.length > 50 ? tooltip.substring(0, 50) + '...' : tooltip;
                      const escapedTrimmedTooltip = trimmedTooltip
                        .replace(/&/g, '&amp;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                      
                      // メール版ライトグレーマーカースタイル
                      const markerStyle = 'background: linear-gradient(180deg, transparent 60%, rgba(229, 231, 235, 0.8) 60%); padding: 1px 2px; border-radius: 2px; border-bottom: 1px dotted #6b7280;';
                      
                      // インライン注釈スタイル
                      const annotationStyle = 'font-size: 0.75em; color: #6b7280; font-style: italic; margin-left: 4px; font-weight: normal;';
                      
                      return `<span style="${markerStyle}">${escapedName}</span><span style="${annotationStyle}">（※${escapedTrimmedTooltip}）</span>`;
                    };
                    
                    // ツールチップを検索して項目名を拡張
                    let finalItemName = item.itemName || `項目${index + 1}`;
                    let itemTooltip = '';
                    
                    // item.tooltipが既に設定されている場合はそれを使用
                    if (item.tooltip) {
                      itemTooltip = item.tooltip;
                    } else {
                      // ツールチップ辞書からマッチするものを検索
                      const itemText = (item.itemName || '') + ' ' + (item.description || '');
                      for (const [term, explanation] of tooltips.entries()) {
                        if (itemText.toLowerCase().includes(term.toLowerCase()) || term.toLowerCase().includes(itemText.toLowerCase())) {
                          itemTooltip = explanation;
                          break;
                        }
                      }
                    }
                    
                    const itemDisplayName = itemTooltip ? 
                      renderItemWithTooltip(finalItemName, itemTooltip) :
                      finalItemName;
                    
                    return `
                  <tr>
                    <td style="padding: 12px; border: 1px solid #e0e0e0; font-size: 14px; color: ${itemColor};">${itemDisplayName}</td>
                    <td style="padding: 12px; text-align: center; border: 1px solid #e0e0e0; font-size: 14px; color: ${itemColor};">${item.quantity || 1}</td>
                    <td style="padding: 12px; text-align: right; border: 1px solid #e0e0e0; font-size: 14px; color: ${itemColor};">¥${(item.unitPrice || 0).toLocaleString()}</td>
                    <td style="padding: 12px; text-align: right; border: 1px solid #e0e0e0; font-size: 14px; color: ${itemColor};">¥${subtotalAmount.toLocaleString()}</td>
                    <td style="padding: 12px; text-align: right; border: 1px solid #e0e0e0; font-size: 14px; color: ${itemColor};">¥${Math.round(taxAmount).toLocaleString()}</td>
                    <td style="padding: 12px; text-align: right; border: 1px solid #e0e0e0; font-size: 14px; color: ${itemColor}; font-weight: bold;">¥${(item.amount || 0).toLocaleString()}</td>
                  </tr>
                  `;
                  }).join('')}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- 合計金額 -->
          <tr>
            <td style="padding: 20px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="width: 60%;"></td>
                  <td style="width: 40%;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 12px; text-align: right; font-size: 14px; color: #666666; border-bottom: 1px solid #e0e0e0;">小計：</td>
                        <td style="padding: 8px 12px; text-align: right; font-size: 14px; color: #333333; border-bottom: 1px solid #e0e0e0;">¥${subtotal.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 12px; text-align: right; font-size: 14px; color: #666666; border-bottom: 1px solid #e0e0e0;">消費税：</td>
                        <td style="padding: 8px 12px; text-align: right; font-size: 14px; color: #333333; border-bottom: 1px solid #e0e0e0;">¥${taxAmount.toLocaleString()}</td>
                      </tr>
                      <tr style="background-color: #f8f9fa;">
                        <td style="padding: 12px; text-align: right; font-size: 16px; color: #333333; font-weight: bold; border: 2px solid #2196f3;">合計：</td>
                        <td style="padding: 12px; text-align: right; font-size: 16px; color: #2196f3; font-weight: bold; border: 2px solid #2196f3;">¥${totalAmount.toLocaleString()}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${(() => {
            // 備考の内容をチェック（型安全性とcleanDuplicateSignatures適用後の再チェック）
            const originalNotes = quote.notes;
            
            // デバッグログ（開発環境のみ）
            if (process.env.NODE_ENV === 'development') {
              console.log('📝 Server HTML Generator notes check (enhanced):', {
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
              return '';
            }
            
            // 空白文字のみをチェック
            const trimmedNotes = originalNotes.trim();
            if (trimmedNotes.length === 0) {
              if (process.env.NODE_ENV === 'development') {
                console.log('❌ Notes not displayed: empty after trim');
              }
              return '';
            }
            
            // cleanDuplicateSignatures関数を適用
            const { cleanDuplicateSignatures } = require('./utils/clean-duplicate-signatures');
            const cleanedNotes = cleanDuplicateSignatures(trimmedNotes);
            const finalNotes = cleanedNotes.trim();
            
            // 清拭後に内容がない場合は表示しない
            if (finalNotes.length === 0) {
              if (process.env.NODE_ENV === 'development') {
                console.log('❌ Notes not displayed: empty after cleaning signatures');
              }
              return '';
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
            
            return `
          <!-- 備考欄 -->
          <tr>
            <td style="padding: 30px 40px;">
              <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #333333; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px;">備考</h3>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9f9f9; border-radius: 6px;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6; white-space: pre-wrap;">${finalNotes}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
            `;
          })()}

          <!-- おすすめオプション（DBから取得） -->
          ${suggestedOptions && suggestedOptions.length > 0 ? `
          <tr>
            <td style="padding: 30px 40px;">
              <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #333333; text-align: center;">🌟 おすすめオプション</h3>
              ${suggestedOptions.map((option: SuggestedOption) => `
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0;">
                <tr>
                  <td style="padding: 20px;">
                    <h4 style="margin: 0 0 10px 0; font-size: 16px; color: #2196f3; font-weight: bold;">${option.title}</h4>
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666; line-height: 1.6; white-space: pre-wrap;">${option.description}</p>
                    ${option.features && option.features.length > 0 ? `
                    <ul style="margin: 10px 0; padding-left: 20px; font-size: 14px; color: #666666;">
                      ${option.features.map((feature: string) => `<li style="margin-bottom: 4px;">${feature}</li>`).join('')}
                    </ul>
                    ` : ''}
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 15px;">
                      <tr>
                        <td style="width: 50%;">
                          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #e91e63;">${option.price}</p>
                        </td>
                        <td style="width: 50%; text-align: right;">
                          ${option.ctaUrl && option.ctaUrl.trim() !== '' ? `
                          <a href="${option.ctaUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 8px 16px; background-color: #2196f3; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 4px;">
                            ${option.ctaText}
                          </a>
                          ` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              `).join('')}
            </td>
          </tr>
          ` : ''}

          <!-- アクションボタン -->
          <tr>
            <td style="padding: 30px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0" style="display: inline-block;">
                      <tr>
                        <td style="padding: 0 10px;">
                          <a href="${acceptUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 24px; background-color: #4caf50; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            ✅ 承認する
                          </a>
                        </td>
                        <td style="padding: 0 10px;">
                          <a href="${discussUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 24px; background-color: #ff9800; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            💬 相談する
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 会社情報 -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
              <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333333;">お問い合わせ先</h3>
              <p style="margin: 0 0 5px 0; font-size: 14px; color: #333333; font-weight: bold;">${companyName}</p>
              ${companyAddress ? `<p style="margin: 0 0 5px 0; font-size: 14px; color: #666666;">${companyAddress}</p>` : ''}
              ${companyPhone ? `<p style="margin: 0 0 5px 0; font-size: 14px; color: #666666;">TEL: ${companyPhone}</p>` : ''}
              ${companyEmail ? `<p style="margin: 0 0 5px 0; font-size: 14px; color: #666666;">Email: <a href="mailto:${companyEmail}" style="color: #2196f3; text-decoration: none;">${companyEmail}</a></p>` : ''}
              ${companyWebsite ? `<p style="margin: 0; font-size: 14px; color: #666666;">Web: <a href="${companyWebsite}" target="_blank" rel="noopener noreferrer" style="color: #2196f3; text-decoration: none;">${companyWebsite}</a></p>` : ''}
              
              <!-- AAM-Accountingシステム署名 -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 20px; border-top: 1px solid #e0e0e0; padding-top: 15px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
                      このシステムはAI駆動によるAAM-Accountingシステムです powered by 
                      <a href="https://notion.effect.moe/" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: none;">EFFECT Inc.</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- トラッキングピクセル（開封確認用） -->
  <img src="${baseUrl}/api/tracking/email-open?id=${trackingId}" width="1" height="1" style="display:none;" alt="">
</body>
</html>
  `.trim();

  // プレーンテキスト版
  const plainText = `
お見積書 - ${quote.quoteNumber}

${customerName} 様

平素より格別のご高配を賜り、厚く御礼申し上げます。
ご依頼いただきました件について、下記の通りお見積りさせていただきます。

${customMessage ? `【メッセージ】\n${customMessage}\n\n` : ''}

【見積詳細】
見積番号：${quote.quoteNumber}
見積日：${issueDate}
有効期限：${validityDate}

【見積項目】
${(quote.items || []).map((item: any, index: number) => {
  const subtotalAmount = (item.quantity || 1) * (item.unitPrice || 0);
  const taxAmount = subtotalAmount * (quote.taxRate || 0.1);
  const isDiscount = (item.amount < 0) || 
    (item.itemName && (item.itemName.includes('値引き') || item.itemName.includes('割引')));
  const prefix = isDiscount ? '[値引き] ' : '';
  
  return `${index + 1}. ${prefix}${item.itemName || `項目${index + 1}`}
   数量: ${item.quantity || 1} × 単価: ¥${(item.unitPrice || 0).toLocaleString()}
   小計: ¥${subtotalAmount.toLocaleString()} + 消費税: ¥${Math.round(taxAmount).toLocaleString()}
   金額: ¥${(item.amount || 0).toLocaleString()}`;
}).join('\n\n')}

【金額】
小計：¥${subtotal.toLocaleString()}
消費税：¥${taxAmount.toLocaleString()}
合計：¥${totalAmount.toLocaleString()}

${(() => {
  // プレーンテキスト版でも同様の備考チェック（型安全版）
  const originalNotes = quote.notes;
  
  // 型チェック: null, undefined, または文字列以外の場合は表示しない
  if (!originalNotes || typeof originalNotes !== 'string') {
    return '';
  }
  
  // 空白文字のみをチェック
  const trimmedNotes = originalNotes.trim();
  if (trimmedNotes.length === 0) {
    return '';
  }
  
  // cleanDuplicateSignatures関数を適用
  const { cleanDuplicateSignatures } = require('./utils/clean-duplicate-signatures');
  const cleanedNotes = cleanDuplicateSignatures(trimmedNotes);
  const finalNotes = cleanedNotes.trim();
  
  // 清拭後に内容がない場合は表示しない
  if (finalNotes.length === 0) {
    return '';
  }
  
  return `【備考】
${finalNotes}
`;
})()}

${suggestedOptions && suggestedOptions.length > 0 ? `
【おすすめオプション】
${suggestedOptions.map((option: SuggestedOption) => `
・${option.title} - ${option.price}
  ${option.description}${option.ctaUrl && option.ctaUrl.trim() !== '' ? `
  詳細: ${option.ctaUrl}` : ''}
`).join('')}
` : ''}

【お問い合わせ先】
${companyName}
${companyAddress}
${companyPhone ? `TEL: ${companyPhone}` : ''}
${companyEmail ? `Email: ${companyEmail}` : ''}
${companyWebsite ? `Web: ${companyWebsite}` : ''}

オンライン版を表示: ${viewOnlineUrl}
  `.trim();

  return {
    html,
    plainText,
    subject: `お見積書のご送付 - ${quote.quoteNumber} (${companyName})`
  };
}