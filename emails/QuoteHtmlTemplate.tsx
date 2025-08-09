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

interface QuoteHtmlTemplateProps {
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

export default function QuoteHtmlTemplate({
  quote,
  companyInfo,
  recipientName,
  viewOnlineUrl,
  acceptUrl,
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
        {quote.title || `お見積書 #${quote.quoteNumber}`} - {companyInfo.name}より
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* ヘッダー */}
          <Section style={header}>
            {companyInfo.logo && (
              <Img
                src={companyInfo.logo}
                width="150"
                height="50"
                alt={companyInfo.name}
                style={logo}
              />
            )}
            <Text style={headerText}>{companyInfo.name}</Text>
          </Section>

          {/* オンライン表示リンク */}
          {viewOnlineUrl && (
            <Section style={viewOnlineSection}>
              <Link href={viewOnlineUrl} style={viewOnlineLink}>
                ブラウザで表示 →
              </Link>
            </Section>
          )}

          {/* メインコンテンツ */}
          <Section style={mainContent}>
            <Heading style={h1}>お見積書</Heading>
            
            {recipientName && (
              <Text style={greeting}>
                {recipientName} 様
              </Text>
            )}

            <Text style={message}>
              平素より格別のご高配を賜り、厚く御礼申し上げます。
              <br />
              ご依頼いただきました件について、下記の通りお見積りさせていただきます。
            </Text>

            {customMessage && (
              <Section style={customMessageSection}>
                <Text style={customMessageText}>{customMessage}</Text>
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
                  <Text style={infoValue}>{formatDate(quote.validUntil)}</Text>
                </Column>
              </Row>
            </Section>

            <Hr style={divider} />

            {/* 見積項目 */}
            <Section style={itemsSection}>
              <Heading as="h2" style={h2}>見積内容</Heading>
              
              {quote.items.map((item, index) => (
                <Section key={index} style={itemRow}>
                  <Row>
                    <Column style={itemNameColumn}>
                      <Text style={itemName}>
                        {item.productLink ? (
                          <Link href={item.productLink} style={productLink}>
                            {item.description}
                          </Link>
                        ) : (
                          item.description
                        )}
                      </Text>
                      {item.details && (
                        <Text style={itemDetails}>{item.details}</Text>
                      )}
                      {item.tooltip && (
                        <Text style={tooltip}>
                          💡 {item.tooltip}
                        </Text>
                      )}
                    </Column>
                    <Column style={itemQuantityColumn}>
                      <Text style={itemQuantity}>
                        {item.quantity} {item.unit || '個'}
                      </Text>
                    </Column>
                    <Column style={itemPriceColumn}>
                      <Text style={itemPrice}>
                        {formatCurrency(item.unitPrice)}
                      </Text>
                    </Column>
                    <Column style={itemTotalColumn}>
                      <Text style={itemTotal}>
                        {formatCurrency(item.amount)}
                      </Text>
                    </Column>
                  </Row>
                </Section>
              ))}
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
                    {formatCurrency(quote.subtotal)}
                  </Text>
                </Column>
              </Row>
              <Row>
                <Column style={totalLabelColumn}>
                  <Text style={totalLabel}>消費税（{quote.taxRate}%）</Text>
                </Column>
                <Column style={totalValueColumn}>
                  <Text style={totalValue}>
                    {formatCurrency(quote.taxAmount)}
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
                          {option.description}
                        </Text>
                        <Text style={suggestionPrice}>
                          追加料金: {option.price}
                        </Text>
                        <ul style={featureList}>
                          {option.features.map((feature, fIndex) => (
                            <li key={fIndex} style={featureItem}>
                              <Text style={featureText}>{feature}</Text>
                            </li>
                          ))}
                        </ul>
                        <Button
                          href={option.ctaUrl}
                          style={suggestionButton}
                        >
                          {option.ctaText}
                        </Button>
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
                  {discussUrl && (
                    <Button
                      href={discussUrl}
                      style={secondaryButton}
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
                <Text style={notesText}>{quote.notes}</Text>
              </Section>
            )}

            {/* 会社情報 */}
            <Section style={companySection}>
              <Hr style={divider} />
              <Row>
                <Column>
                  <Text style={companyName}>{companyInfo.name}</Text>
                  <Text style={companyDetails}>
                    {companyInfo.address && `〒${companyInfo.postalCode} ${companyInfo.address}`}
                  </Text>
                  {companyInfo.phone && (
                    <Text style={companyDetails}>
                      TEL: {companyInfo.phone}
                    </Text>
                  )}
                  {companyInfo.email && (
                    <Text style={companyDetails}>
                      Email: {companyInfo.email}
                    </Text>
                  )}
                  {companyInfo.website && (
                    <Link href={companyInfo.website} style={companyWebsite}>
                      {companyInfo.website}
                    </Link>
                  )}
                </Column>
              </Row>
            </Section>
          </Section>

          {/* フッター */}
          <Section style={footer}>
            <Text style={footerText}>
              このメールは {companyInfo.name} より送信されました。
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
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const header = {
  padding: '32px 48px',
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
  padding: '12px 48px',
  textAlign: 'right' as const,
};

const viewOnlineLink = {
  color: '#3B82F6',
  fontSize: '14px',
  textDecoration: 'underline',
};

const mainContent = {
  padding: '0 48px',
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

const tooltip = {
  fontSize: '13px',
  color: '#059669',
  backgroundColor: '#ecfdf5',
  padding: '4px 8px',
  borderRadius: '4px',
  display: 'inline-block',
  margin: '4px 0',
};

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
  padding: '32px 48px',
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