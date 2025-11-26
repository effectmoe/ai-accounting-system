# AI会計システム - プロジェクトルール

## プロジェクト概要
- **プロジェクト名**: ai-accounting-system
- **技術スタック**: Next.js 14, TypeScript, MongoDB, @react-pdf/renderer, Vercel
- **主要機能**: 見積書・請求書・納品書・領収書のPDF生成・メール送信

---

## トラブルシューティング

### PDF・帳票関連

| 症状 | 原因 | 解決策 |
|------|------|--------|
| PDFで住所とビル名が1行表示される | APIルートで住所生成時にスペース区切り使用 | 4つのAPIルート（quotes, invoices, delivery-notes, receipts）で住所生成ロジックを改行区切り（`\n`）に変更 |
| PDFが2ページにまたがる | コンテンツサイズがA4に収まらない | フォントサイズ調整、余白削減、flexの比率調整 |
| 備考欄がPDFに表示されない | notesフィールドのマッピング漏れ | pdf-generator.tsxでnotesの表示ロジックを追加 |

### 請求書画面関連

| 症状 | 原因 | 解決策 |
|------|------|--------|
| 数量・単価入力時に先頭0が付く（例: "025"） | `parseFloat(e.target.value)`をそのまま使用 | `parseInt(value, 10)`を使用し、フォーカス時に0なら空にする |
| 新規作成画面に商品説明・備考フィールドがない | 編集画面とのUI不一致 | `InvoiceItem`インターフェースに`notes`追加、UIにTextareaフィールド追加 |
| 商品マスター登録でエラー | APIリクエストに`category`フィールドが欠落 | `category: 'その他'`をリクエストボディに追加 |

**詳細レポート**: `/Users/tonychustudio/Documents/alldocs/report/2025-11-26_AI会計システム_請求書画面バグ修正レポート.md`

### メール送信関連

| 症状 | 原因 | 解決策 |
|------|------|--------|
| メール本文で会社名と担当者名が同一行 | `formatCustomerNameForEmail`関数でスペース区切り | `lib/honorific-utils.ts`で改行（`\n`）区切りに変更 |

**正しい宛名フォーマット:**
```typescript
// lib/honorific-utils.ts - formatCustomerNameForEmail関数
if (companyName && contactName) {
  return `${companyName}\n${contactName} 様`;  // 改行で区切る
}
```

**詳細レポート**: `/Users/tonychustudio/Documents/alldocs/report/2025-11-26_AI会計システム_メール宛名改行問題修正レポート.md`

### 住所改行対応の詳細

**修正が必要なファイル（住所生成ロジック変更時）:**
- `app/api/quotes/[id]/route.ts`
- `app/api/invoices/[id]/route.ts`
- `app/api/delivery-notes/[id]/route.ts`
- `app/api/receipts/[id]/route.ts`
- `app/api/send-email/route.ts`

**正しい住所生成パターン:**
```typescript
address: companyInfo ? (() => {
  const postalCode = companyInfo.postalCode ? `〒${companyInfo.postalCode}` : '';
  const mainAddress = `${companyInfo.prefecture || ''}${companyInfo.city || ''}${companyInfo.address1 || ''}`;
  const buildingName = companyInfo.address2 || '';
  if (buildingName) {
    return `${postalCode} ${mainAddress}\n${buildingName}`;
  }
  return `${postalCode} ${mainAddress}`;
})() : '',
```

**詳細レポート**: `/Users/tonychustudio/Documents/alldocs/report/2025-11-27_AI会計システム_PDF住所改行対応レポート.md`

---

## コーディング規約

### ファイル構成
```
ai-accounting-system/
├── app/
│   ├── api/           # APIルート
│   └── (routes)/      # ページコンポーネント
├── components/        # UIコンポーネント
├── lib/               # ユーティリティ、PDF生成
├── services/          # ビジネスロジック
└── types/             # TypeScript型定義
```

### 命名規則
- **ファイル名**: kebab-case（例: `pdf-generator.tsx`）
- **コンポーネント**: PascalCase（例: `InvoiceForm`）
- **関数**: camelCase（例: `getInvoice`）
- **型/インターフェース**: PascalCase（例: `Invoice`, `CompanyInfo`）

### APIルート設計パターン
- GET: 単一リソース取得
- PUT: リソース更新（ステータス変更含む）
- DELETE: リソース削除
- 各ルートで`companySnapshot`を含めてレスポンスを返す

---

## デプロイ

### Vercelデプロイ
```bash
# 本番デプロイ
vercel --prod

# プレビューデプロイ
vercel
```

### 環境変数（必須）
- `MONGODB_URI`: MongoDBの接続文字列
- `RESEND_API_KEY`: Resend APIキー（メール送信用）

---

## 注意事項

### companySnapshot について
- 各帳票（見積書、請求書等）にはドキュメント作成時の会社情報がスナップショットとして保存される
- 会社情報変更後も既存ドキュメントには影響しない
- 住所フォーマットは各APIルートで生成される

### PDF生成（@react-pdf/renderer）
- A4サイズ: 595 x 842 ポイント
- 日本語フォント: Noto Sans JP を使用
- 改行は`\n`で区切り、`split('\n').map()`でレンダリング

---

**最終更新**: 2025-11-27

---

## 関連レポート一覧

| 日付 | タイトル | パス |
|------|---------|------|
| 2025-11-27 | PDF住所改行対応レポート | `/Users/tonychustudio/Documents/alldocs/report/2025-11-27_AI会計システム_PDF住所改行対応レポート.md` |
| 2025-11-26 | 請求書画面バグ修正レポート | `/Users/tonychustudio/Documents/alldocs/report/2025-11-26_AI会計システム_請求書画面バグ修正レポート.md` |
| 2025-11-26 | メール宛名改行問題修正レポート | `/Users/tonychustudio/Documents/alldocs/report/2025-11-26_AI会計システム_メール宛名改行問題修正レポート.md` |
