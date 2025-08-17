import React from 'react';
import {
  Body,
  Button,
  Container,
  Column,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components';
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
  
  // 各キーワードをライトグレーマーカー付きスパンに変換
  allKeywords.forEach(keyword => {
    if (details.includes(keyword)) {
      const markerStyle = `
        background: linear-gradient(180deg, transparent 60%, #e5e7eb 60%);
        cursor: help;
        position: relative;
        border-radius: 2px;
        padding: 0 1px;
      `;
      processedDetails = processedDetails.replace(
        new RegExp(`(${keyword})`, 'g'),
        `<span style="${markerStyle}" title="${tooltip}">$1</span>`
      );
    }
  });
  
  // キーワードが見つからない場合は、文頭の重要そうな語句にマーカーを付ける
  if (processedDetails === details && details.length > 0) {
    // 最初の単語（英数字または3文字以上の語句）を対象にする
    const firstWord = details.match(/^[A-Za-z0-9]+|^[ァ-ヶー]{2,}|^[一-龯]{2,}/);
    if (firstWord && firstWord[0]) {
      const word = firstWord[0];
      const markerStyle = `
        background: linear-gradient(180deg, transparent 60%, #e5e7eb 60%);
        cursor: help;
        position: relative;
        border-radius: 2px;
        padding: 0 1px;
      `;
      processedDetails = details.replace(
        word,
        `<span style="${markerStyle}" title="${tooltip}">${word}</span>`
      );
    }
  }
  
  return <span dangerouslySetInnerHTML={{ __html: processedDetails }} />;
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
    <Html>
      <Head />
      <Preview>
        {quote.title || `お見積書 #${quote.quoteNumber}`} - {quote.companySnapshot?.companyName || companyInfo?.companyName || companyInfo?.name || '会社名未設定'}より
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* ヘッダー */}
          <Section style={header}>
            {companyInfo?.logoUrl && (
              <Img
                src={companyInfo.logoUrl}
                width="150"
                height="50"
                alt={companyInfo?.companyName || companyInfo?.name || ''}
                style={logo}
              />
            )}
            <Text style={headerText}>{quote.companySnapshot?.companyName || companyInfo?.companyName || companyInfo?.name || '会社名未設定'}</Text>
          </Section>


          {/* メインコンテンツ */}
          <Section style={mainContent}>
            <Heading style={h1}>お見積書</Heading>
            
            <Text style={greeting}>
              {recipientName || 
               (quote.customer?.storeName 
                 ? `${quote.customer.storeName}（${quote.customer?.companyName}）`
                 : quote.customerName || quote.customer?.companyName || quote.customer?.name || 'お客様')} 様
            </Text>

            <Text style={message}>
              平素より格別のご高配を賜り、厚く御礼申し上げます。
              <br />
              ご依頼いただきました件について、下記の通りお見積りさせていただきます。
            </Text>

            {customMessage && (
              <Section style={customMessageSection}>
                <div 
                  dangerouslySetInnerHTML={{ __html: customMessage }}
                  style={customMessageText}
                />
              </Section>
            )}

            {/* 見積書情報 */}
            <Section style={quoteInfo}>
              <Row>
                <Column style={infoColumn}>
                  <Text style={infoLabel}>見積書番号</Text>
                  <Text style={infoValue}>{quote.quoteNumber}</Text>
                </Column>
                <Column style={infoColumn}>
                  <Text style={infoLabel}>発行日</Text>
                  <Text style={infoValue}>{formatDate(quote.issueDate)}</Text>
                </Column>
                <Column style={infoColumn}>
                  <Text style={infoLabel}>有効期限</Text>
                  <Text style={infoValue}>{formatDate(quote.validityDate)}</Text>
                </Column>
              </Row>
            </Section>

            <Hr style={divider} />

            {/* 見積項目 */}
            <Section style={itemsSection}>
              <Heading as="h2" style={h2}>見積内容</Heading>
              
              {quote.items.map((item, index) => {
                // 値引き判定
                const isDiscount = (item.amount < 0) || 
                  (item.itemName && (item.itemName.includes('値引き') || item.itemName.includes('割引') || item.itemName.includes('ディスカウント')));
                const discountStyle = isDiscount ? { color: '#dc2626', fontWeight: 'bold' } : {};
                
                return (
                <Section key={index} style={itemRow}>
                  <Row>
                    <Column style={itemNameColumn}>
                      <Text style={{...itemName, ...discountStyle}}>
                        {item.productLink ? (
                          <Link href={item.productLink} style={productLink}>
                            {item.tooltip ? 
                              renderDetailsWithTooltip(item.itemName || item.description || '', item.tooltip) :
                              (item.itemName || item.description || '')
                            }
                          </Link>
                        ) : (
                          item.tooltip ? 
                            renderDetailsWithTooltip(item.itemName || item.description || '', item.tooltip) :
                            (item.itemName || item.description || '')
                        )}
                      </Text>
                      {item.details && (
                        <Text style={{...(item.tooltip ? itemDetailsWithTooltip : itemDetails), ...discountStyle}}>
                          {item.tooltip ? 
                            renderDetailsWithTooltip(item.details, item.tooltip) :
                            item.details
                          }
                        </Text>
                      )}
                    </Column>
                    <Column style={itemQuantityColumn}>
                      <Text style={{...itemQuantity, ...discountStyle}}>
                        {item.quantity} {item.unit || '個'}
                      </Text>
                    </Column>
                    <Column style={itemPriceColumn}>
                      <Text style={{...itemPrice, ...discountStyle}}>
                        {formatCurrency(item.unitPrice)}
                      </Text>
                    </Column>
                    <Column style={itemTotalColumn}>
                      <Text style={{...itemTotal, ...discountStyle}}>
                        {formatCurrency(item.amount)}
                      </Text>
                    </Column>
                  </Row>
                </Section>
                );
              })
            </Section>

            <Hr style={divider} />

            {/* 合計金額 */}
            <Section style={totalSection}>
              <Row>
                <Column style={totalLabelColumn}>
                  <Text style={totalLabel}>小計</Text>
                </Column>
                <Column style={totalValueColumn}>
                  <Text style={totalValue}>
                    {formatCurrency(Math.round(quote.subtotal))}
                  </Text>
                </Column>
              </Row>
              <Row>
                <Column style={totalLabelColumn}>
                  <Text style={totalLabel}>消費税（{quote.taxRate}%）</Text>
                </Column>
                <Column style={totalValueColumn}>
                  <Text style={totalValue}>
                    {formatCurrency(Math.round(quote.taxAmount))}
                  </Text>
                </Column>
              </Row>
              <Row>
                <Column style={grandTotalColumn}>
                  <Text style={grandTotalLabel}>合計金額</Text>
                </Column>
                <Column style={grandTotalValueColumn}>
                  <Text style={grandTotalValue}>
                    {formatCurrency(quote.totalAmount)}
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* 追加提案オプション */}
            {suggestedOptions.length > 0 && (
              <Section style={suggestionsSection}>
                <Hr style={divider} />
                <Heading as="h2" style={h2}>
                  🎯 お客様におすすめのオプション
                </Heading>
                
                {suggestedOptions.map((option, index) => (
                  <Section key={index} style={suggestionCard}>
                    <Row>
                      <Column>
                        <Text style={suggestionTitle}>{option.title}</Text>
                        <Text style={suggestionDescription}>
                          {option.description.split('\n').map((line, index) => (
                            <span key={index}>
                              {line}
                              {index < option.description.split('\n').length - 1 && <br />}
                            </span>
                          ))}
                        </Text>
                        {option.price && (
                          <Text style={suggestionPrice}>
                            追加料金: {option.price}
                          </Text>
                        )}
                        {option.features && option.features.length > 0 && (
                          <ul style={featureList}>
                            {option.features.map((feature, fIndex) => (
                              <li key={fIndex} style={featureItem}>
                                <Text style={featureText}>{feature}</Text>
                              </li>
                            ))}
                          </ul>
                        )}
                        {option.ctaUrl && option.ctaText && (
                          <Button
                            href={option.ctaUrl}
                            style={suggestionButton}
                          >
                            {option.ctaText}
                          </Button>
                        )}
                      </Column>
                    </Row>
                  </Section>
                ))}
              </Section>
            )}

            {/* CTA ボタン */}
            <Section style={ctaSection}>
              <Row>
                <Column align="center">
                  {acceptUrl && (
                    <Button
                      href={acceptUrl}
                      style={primaryButton}
                    >
                      見積を承認する
                    </Button>
                  )}
                  {considerUrl && (
                    <Button
                      href={considerUrl}
                      style={secondaryButton}
                    >
                      検討する
                    </Button>
                  )}
                  {discussUrl && (
                    <Button
                      href={discussUrl}
                      style={tertiaryButton}
                    >
                      相談する
                    </Button>
                  )}
                </Column>
              </Row>
            </Section>

            {/* 備考 */}
            {quote.notes && (
              <Section style={notesSection}>
                <Heading as="h3" style={h3}>備考</Heading>
                <Text style={notesText}>{cleanDuplicateSignatures(quote.notes)}</Text>
              </Section>
            )}

            {/* 会社情報 */}
            <Section style={companySection}>
              <Hr style={divider} />
              <Row>
                <Column>
                  <Text style={companyName}>
                    {quote.companySnapshot?.companyName || companyInfo?.companyName || companyInfo?.name || '会社名未設定'}
                  </Text>
                  <Text style={companyDetails}>
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
                  </Text>
                  {(quote.companySnapshot?.phone || companyInfo?.phone) && (
                    <Text style={companyDetails}>
                      TEL: {quote.companySnapshot?.phone || companyInfo?.phone}
                    </Text>
                  )}
                  {(quote.companySnapshot?.email || companyInfo?.email) && (
                    <Text style={companyDetails}>
                      Email: {quote.companySnapshot?.email || companyInfo?.email}
                    </Text>
                  )}
                  {companyInfo?.website && (
                    <Link href={companyInfo.website} style={companyWebsite}>
                      {companyInfo.website}
                    </Link>
                  )}
                  <Hr style={signatureDivider} />
                  <Text style={signatureText}>
                    {quote.companySnapshot?.companyName || companyInfo?.companyName || companyInfo?.name || '会社名未設定'}
                  </Text>
                  {companyInfo?.representativeName && (
                    <Text style={signatureName}>
                      代表取締役 {companyInfo.representativeName}
                    </Text>
                  )}
                  {quote.assignee && (
                    <Text style={signatureAssignee}>
                      担当: {quote.assignee}
                    </Text>
                  )}
                </Column>
              </Row>
            </Section>
          </Section>

          {/* フッター */}
          <Section style={footer}>
            <Text style={footerText}>
              このメールは {quote.companySnapshot?.companyName || companyInfo?.companyName || companyInfo?.name || '会社名未設定'} より送信されました。
            </Text>
            <Text style={footerLinks}>
              <Link href={`${baseUrl}/privacy`} style={footerLink}>
                プライバシーポリシー
              </Link>
              {' | '}
              <Link href={`${baseUrl}/terms`} style={footerLink}>
                利用規約
              </Link>
              {' | '}
              <Link href={`${baseUrl}/contact`} style={footerLink}>
                お問い合わせ
              </Link>
            </Text>
            <Hr style={systemSignatureDivider} />
            <Text style={systemSignatureText}>
              このシステムはAI駆動によるAAM-Accountingシステムです powered by <Link 
                href="https://notion.effect.moe/"
                target="_blank"
                rel="noopener noreferrer"
                style={systemSignatureLink}
              >
                EFFECT Inc.
              </Link>
            </Text>
          </Section>

          {/* トラッキングピクセル */}
          {trackingPixelUrl && (
            <Img
              src={trackingPixelUrl}
              width="1"
              height="1"
              alt=""
              style={{ display: 'none' }}
            />
          )}
        </Container>
      </Body>
    </Html>
  );
}

// スタイル定義
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  width: '100%',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 10px',
  width: '100%',
  maxWidth: '600px',
};

const header = {
  padding: '24px 20px',
  textAlign: 'center' as const,
  backgroundColor: '#f8fafc',
};

const logo = {
  margin: '0 auto',
};

const headerText = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: '16px 0 0 0',
};

const viewOnlineSection = {
  padding: '12px 20px',
  textAlign: 'right' as const,
};

const viewOnlineLink = {
  color: '#3B82F6',
  fontSize: '14px',
  textDecoration: 'underline',
};

const mainContent = {
  padding: '0 20px',
};

const h1 = {
  color: '#1f2937',
  fontSize: '32px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '30px 0',
};

const h2 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '30px 0 20px',
};

const h3 = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '20px 0 10px',
};

const greeting = {
  fontSize: '18px',
  color: '#1f2937',
  margin: '20px 0',
  fontWeight: 'bold',
};

const message = {
  fontSize: '16px',
  color: '#4b5563',
  lineHeight: '28px',
  margin: '16px 0',
};

const customMessageSection = {
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  padding: '16px',
  margin: '20px 0',
};

const customMessageText = {
  fontSize: '15px',
  color: '#1e40af',
  lineHeight: '24px',
  margin: 0,
};

const quoteInfo = {
  margin: '30px 0',
};

const infoColumn = {
  paddingRight: '20px',
};

const infoLabel = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0 0 4px 0',
};

const infoValue = {
  fontSize: '16px',
  color: '#1f2937',
  fontWeight: 'bold',
  margin: 0,
};

const divider = {
  borderColor: '#e5e7eb',
  margin: '30px 0',
};

const itemsSection = {
  margin: '30px 0',
};

const itemRow = {
  borderBottom: '1px solid #f3f4f6',
  paddingBottom: '16px',
  marginBottom: '16px',
};

const itemNameColumn = {
  width: '50%',
};

const itemName = {
  fontSize: '15px',
  color: '#1f2937',
  fontWeight: '500',
  margin: '0 0 4px 0',
};

const productLink = {
  color: '#3B82F6',
  textDecoration: 'none',
};

const itemDetails = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '4px 0',
  lineHeight: '20px',
};

const itemDetailsWithTooltip = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '4px 0',
  lineHeight: '20px',
};

// tooltipHintとtooltipMarkerは削除（新しいマーカー方式を使用）

const itemQuantityColumn = {
  width: '15%',
  textAlign: 'right' as const,
};

const itemQuantity = {
  fontSize: '15px',
  color: '#4b5563',
  margin: 0,
};

const itemPriceColumn = {
  width: '17.5%',
  textAlign: 'right' as const,
};

const itemPrice = {
  fontSize: '15px',
  color: '#4b5563',
  margin: 0,
};

const itemTotalColumn = {
  width: '17.5%',
  textAlign: 'right' as const,
};

const itemTotal = {
  fontSize: '15px',
  color: '#1f2937',
  fontWeight: 'bold',
  margin: 0,
};

const totalSection = {
  margin: '30px 0',
};

const totalLabelColumn = {
  textAlign: 'right' as const,
  paddingRight: '20px',
  width: '70%',
};

const totalLabel = {
  fontSize: '16px',
  color: '#4b5563',
  margin: '8px 0',
};

const totalValueColumn = {
  textAlign: 'right' as const,
  width: '30%',
};

const totalValue = {
  fontSize: '16px',
  color: '#1f2937',
  margin: '8px 0',
};

const grandTotalColumn = {
  textAlign: 'right' as const,
  paddingRight: '20px',
  width: '70%',
  borderTop: '2px solid #1f2937',
  paddingTop: '12px',
};

const grandTotalLabel = {
  fontSize: '18px',
  color: '#1f2937',
  fontWeight: 'bold',
  margin: '8px 0',
};

const grandTotalValueColumn = {
  textAlign: 'right' as const,
  width: '30%',
  borderTop: '2px solid #1f2937',
  paddingTop: '12px',
};

const grandTotalValue = {
  fontSize: '24px',
  color: '#3B82F6',
  fontWeight: 'bold',
  margin: '8px 0',
};

const suggestionsSection = {
  margin: '40px 0',
};

const suggestionCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '20px',
  margin: '16px 0',
  border: '1px solid #e5e7eb',
};

const suggestionTitle = {
  fontSize: '18px',
  color: '#1f2937',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const suggestionDescription = {
  fontSize: '14px',
  color: '#4b5563',
  lineHeight: '22px',
  margin: '8px 0',
  whiteSpace: 'pre-wrap' as const,
};

const suggestionPrice = {
  fontSize: '16px',
  color: '#10B981',
  fontWeight: 'bold',
  margin: '12px 0',
};

const featureList = {
  margin: '12px 0',
  paddingLeft: '20px',
};

const featureItem = {
  margin: '4px 0',
};

const featureText = {
  fontSize: '14px',
  color: '#4b5563',
  margin: 0,
};

const suggestionButton = {
  backgroundColor: '#10B981',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '160px',
  padding: '10px',
  marginTop: '16px',
};

const ctaSection = {
  margin: '40px 0',
  textAlign: 'center' as const,
};

const primaryButton = {
  backgroundColor: '#3B82F6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
  margin: '0 8px',
};

const secondaryButton = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  color: '#3B82F6',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
  margin: '0 8px',
  border: '2px solid #3B82F6',
};

const tertiaryButton = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  color: '#6B7280',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
  margin: '0 8px',
  border: '2px solid #6B7280',
};

const notesSection = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '20px',
  margin: '30px 0',
};

const notesText = {
  fontSize: '14px',
  color: '#4b5563',
  lineHeight: '22px',
  margin: 0,
};

const companySection = {
  margin: '40px 0',
};

const companyName = {
  fontSize: '16px',
  color: '#1f2937',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const companyDetails = {
  fontSize: '14px',
  color: '#4b5563',
  margin: '4px 0',
};

const companyWebsite = {
  fontSize: '14px',
  color: '#3B82F6',
  textDecoration: 'none',
  margin: '4px 0',
  display: 'inline-block',
};

const footer = {
  padding: '24px 20px',
  textAlign: 'center' as const,
  backgroundColor: '#f8fafc',
};

const footerText = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '0 0 8px 0',
};

const footerLinks = {
  fontSize: '12px',
  color: '#6b7280',
  margin: 0,
};

const footerLink = {
  color: '#3B82F6',
  textDecoration: 'none',
};

const signatureDivider = {
  borderColor: '#e5e7eb',
  margin: '20px 0 10px 0',
};

const signatureText = {
  fontSize: '14px',
  color: '#1f2937',
  fontWeight: 'bold',
  margin: '10px 0 5px 0',
};

const signatureName = {
  fontSize: '16px',
  color: '#1f2937',
  fontWeight: 'bold',
  margin: '5px 0',
};

const signatureAssignee = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '5px 0',
};

const systemSignatureDivider = {
  borderColor: '#e5e7eb',
  margin: '20px 0 10px 0',
};

const systemSignatureText = {
  fontSize: '12px',
  color: '#6b7280',
  textAlign: 'center' as const,
  margin: '10px 0',
};

const systemSignatureLink = {
  color: '#3b82f6',
  textDecoration: 'none',
};