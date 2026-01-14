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
| Puppeteer/Chromiumエラー | 誤ってPuppeteerを使用 | `@react-pdf/renderer`の`renderToBuffer()`を使用。Puppeteerパッケージを削除 |
| 領収書PDFが生成されない | ReceiptPDFコンポーネントが未定義 | `lib/pdf-receipt-generator.tsx`にReceiptPDFを実装 |

**詳細**: `/Users/tonychustudio/Documents/alldocs/tutorial/2025-12-17_AI会計システム_メールトラッキング_トラブルシューティング.md` セクション8

### 請求書画面関連

| 症状 | 原因 | 解決策 |
|------|------|--------|
| 数量・単価入力時に先頭0が付く（例: "025"） | `parseFloat(e.target.value)`をそのまま使用 | `parseInt(value, 10)`を使用し、フォーカス時に0なら空にする |
| 新規作成画面に商品説明・備考フィールドがない | 編集画面とのUI不一致 | `InvoiceItem`インターフェースに`notes`追加、UIにTextareaフィールド追加 |
| 商品マスター登録でエラー | APIリクエストに`category`フィールドが欠落 | `category: 'その他'`をリクエストボディに追加 |

**詳細レポート**: `/Users/tonychustudio/Documents/alldocs/report/2025-11-26_AI会計システム_請求書画面バグ修正レポート.md`

### メール送信関連（Gmail OAuth2）

| 症状 | 原因 | 解決策 |
|------|------|--------|
| メール本文で会社名と担当者名が同一行 | `formatCustomerNameForEmail`関数でスペース区切り | `lib/honorific-utils.ts`で改行（`\n`）区切りに変更 |
| Gmail not configured | 環境変数未設定 | GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_USER を設定 |
| invalid_grant | リフレッシュトークン失効 | Google OAuth Playground で新規トークン取得 |
| invalid_client | 環境変数に改行文字（`\n`）が含まれている | `echo -n`で環境変数を再追加（セクション1-3参照） |
| トラッキングが記録されない | TRACKING_WORKER_URL未設定 | Cloudflare Workers URLをVercelに設定 |
| 開封が検知されない | 画像ブロック | ユーザー側で画像表示を許可（システム側では制御不可） |
| CC/BCCに自動入力される | ブラウザのautocomplete | `autoComplete="off"`と一意の`name`属性を追加（セクション11参照） |

**正しい宛名フォーマット:**
```typescript
// lib/honorific-utils.ts - formatCustomerNameForEmail関数
if (companyName && contactName) {
  return `${companyName}\n${contactName} 様`;  // 改行で区切る
}
```

**メールトラッキング実装詳細**: `/Users/tonychustudio/Documents/alldocs/tutorial/2025-12-17_AI会計システム_メールトラッキング実装マニュアル.md`

**トラブルシューティング**: `/Users/tonychustudio/Documents/alldocs/tutorial/2025-12-17_AI会計システム_メールトラッキング_トラブルシューティング.md`

### メール分析ダッシュボード関連

| 症状 | 原因 | 解決策 |
|------|------|--------|
| ダッシュボードがモックデータを表示 | `quoteId`未指定時にハードコードされたモックデータを返していた | API呼び出しを常に実行し、Cloudflare Workersから実データを取得 |
| 日付フィルターが機能しない | `dateRange`パラメータがAPIに渡されていない | `fetchData()`で`params.set('dateRange', selectedDateRange)`を追加 |
| グラフにデータが表示されない | APIレスポンスに`timelineData`/`dailyStats`がない | APIルートでCloudflare Workersからの統計データを含めてレスポンス |

**修正対象ファイル:**
- `app/api/email-events/stats/route.ts` - 日付範囲フィルタリングとAPIレスポンス拡張
- `components/email-analytics-dashboard.tsx` - API呼び出しロジック修正とモックデータ削除

**詳細**: `/Users/tonychustudio/Documents/alldocs/tutorial/2025-12-17_AI会計システム_メールトラッキング_トラブルシューティング.md` セクション5

### 検索・フィルター機能関連

| 症状 | 原因 | 解決策 |
|------|------|--------|
| 一覧ページで検索が動作しない | フロントエンドからAPIへ`search`パラメータが送信されていない | `fetchInvoices`/`fetchQuotes`関数内で`params.append('search', debouncedSearchQuery)`を追加 |
| APIが検索クエリを無視する | APIルートで`search`パラメータを取得していない | `app/api/invoices/route.ts`と`app/api/quotes/route.ts`で`searchParams.get('search')`を追加 |
| サービス層で検索が実行されない | `SearchParams`インターフェースに`search`フィールドがない | `services/invoice.service.ts`と`services/quote.service.ts`のインターフェースに`search?: string`を追加し、MongoDBの`$or`と正規表現で検索実装 |
| 日付フィルターが効かない | useEffectの依存配列に`dateFrom`/`dateTo`が含まれていない | `useEffect`の依存配列に`dateFrom, dateTo`を追加 |
| 🚨 顧客名で検索しても結果がヒットしない | MongoDBで`customerId`がObjectId型で保存されているが、検索時に文字列として比較している | ObjectId型とString型の両方で検索するように修正（下記参照） |

**検索機能の3層実装パターン:**

```typescript
// 1. フロントエンド（page.tsx）
const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearchQuery(searchQuery);
    setCurrentPage(1);
  }, 500);
  return () => clearTimeout(timer);
}, [searchQuery]);

// fetchInvoices内で
if (debouncedSearchQuery) {
  params.append('search', debouncedSearchQuery);
}

// 2. APIルート（route.ts）
const search = searchParams.get('search') || undefined;
const result = await service.searchInvoices({ ...params, search });

// 3. サービス層（service.ts）
// 顧客名検索は、顧客コレクションを先に検索してIDを取得する方式
if (params.search) {
  const searchRegex = { $regex: params.search, $options: 'i' };

  // 顧客名で検索する場合、まず顧客を検索してIDを取得
  const matchingCustomers = await db.find<Customer>(Collections.CUSTOMERS, {
    $or: [
      { companyName: searchRegex },
      { companyNameKana: searchRegex },
      { 'contacts.name': searchRegex },
    ]
  });
  const matchingCustomerIds = matchingCustomers.map(c => c._id);

  // 請求書/見積書のフィールドまたは顧客IDで検索
  const searchConditions: any[] = [
    { invoiceNumber: searchRegex }, // または quoteNumber
    { title: searchRegex },
  ];

  // マッチした顧客がいる場合、その顧客IDも検索条件に追加
  // ⚠️ 重要: customerId は ObjectId 型と String 型の両方で検索が必要（DBの保存形式に対応）
  if (matchingCustomerIds.length > 0) {
    const customerIdStrings = matchingCustomerIds.map(id => id?.toString()).filter(Boolean);
    searchConditions.push({
      customerId: {
        $in: [
          ...matchingCustomerIds,  // ObjectId型
          ...customerIdStrings      // String型
        ]
      }
    });
  }

  filter.$or = searchConditions;
}
```

**詳細レポート**: `/Users/tonychustudio/Documents/alldocs/report/2025-11-27_AI会計システム_フィルター機能実装レポート.md`

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

| 変数名 | 説明 | 備考 |
|--------|------|------|
| `MONGODB_URI` | MongoDBの接続文字列 | 必須 |
| `GMAIL_CLIENT_ID` | Google OAuth クライアントID | メール送信用 |
| `GMAIL_CLIENT_SECRET` | Google OAuth クライアントシークレット | メール送信用 |
| `GMAIL_REFRESH_TOKEN` | Gmail API リフレッシュトークン | 90日未使用で失効 |
| `GMAIL_USER` | 送信元メールアドレス | info@effect.moe |
| `TRACKING_WORKER_URL` | Cloudflare Workers URL | メールトラッキング用 |

**注意**: `RESEND_API_KEY`は廃止。Gmail OAuth2に移行済み（2025-12-17）

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
- **⚠️ Puppeteerは使用していない** - `pdf-puppeteer-generator.ts` は名前だけで、実際は `@react-pdf/renderer` の `renderToBuffer()` を使用

### PDF生成ファイル構成
| ファイル | 役割 |
|---------|------|
| `lib/pdf-generator.tsx` | InvoicePDF, DeliveryNotePDF コンポーネント |
| `lib/pdf-receipt-generator.tsx` | ReceiptPDF コンポーネント |
| `lib/pdf-puppeteer-generator.ts` | PDF生成関数（renderToBuffer使用） |

**詳細マニュアル**: `/Users/tonychustudio/Documents/alldocs/tutorial/2025-12-17_AI会計システム_PDF生成_メール添付実装マニュアル.md`

---

**最終更新**: 2025-12-18

---

## 関連レポート一覧

| 日付 | タイトル | パス |
|------|---------|------|
| 2025-12-17 | Gmail OAuth2 invalid_client エラー修正 | トラブルシューティング: セクション1-3, 事例4 |
| 2025-12-17 | メールフォームCC/BCC自動入力修正 | トラブルシューティング: セクション11, 事例5 |
| 2025-12-17 | 「送信専用」バナー削除 | トラブルシューティング: 事例6 |
| 2025-12-18 | ダッシュボードモックデータ問題修正 | トラブルシューティング: `/Users/tonychustudio/Documents/alldocs/tutorial/2025-12-17_AI会計システム_メールトラッキング_トラブルシューティング.md` セクション5 |
| 2025-12-17 | PDF生成・メール添付実装マニュアル | `/Users/tonychustudio/Documents/alldocs/tutorial/2025-12-17_AI会計システム_PDF生成_メール添付実装マニュアル.md` |
| 2025-12-17 | メールトラッキング実装マニュアル | `/Users/tonychustudio/Documents/alldocs/tutorial/2025-12-17_AI会計システム_メールトラッキング実装マニュアル.md` |
| 2025-12-17 | メールトラッキング トラブルシューティング | `/Users/tonychustudio/Documents/alldocs/tutorial/2025-12-17_AI会計システム_メールトラッキング_トラブルシューティング.md` |
| 2025-12-17 | 顧客名検索バグ修正レポート | （本セッションで修正、ObjectId/String型対応） |
| 2025-12-03 | 銀行取引インポート機能実装レポート | `/Users/tonychustudio/Documents/alldocs/report/2025-12-03_AI会計システム_銀行取引インポート機能実装レポート.md` |
| 2025-12-02 | Square同期エラー修正レポート | `/Users/tonychustudio/Documents/alldocs/report/2025-12-02_AI会計システム_Square同期エラー修正レポート.md` |
| 2025-11-27 | フィルター機能実装レポート | `/Users/tonychustudio/Documents/alldocs/report/2025-11-27_AI会計システム_フィルター機能実装レポート.md` |
| 2025-11-27 | PWA化実装レポート | `/Users/tonychustudio/Documents/alldocs/report/2025-11-27_AI会計システム_PWA化実装レポート.md` |
| 2025-11-27 | PDF住所改行対応レポート | `/Users/tonychustudio/Documents/alldocs/report/2025-11-27_AI会計システム_PDF住所改行対応レポート.md` |
| 2025-11-26 | 請求書画面バグ修正レポート | `/Users/tonychustudio/Documents/alldocs/report/2025-11-26_AI会計システム_請求書画面バグ修正レポート.md` |
| 2025-11-26 | メール宛名改行問題修正レポート | `/Users/tonychustudio/Documents/alldocs/report/2025-11-26_AI会計システム_メール宛名改行問題修正レポート.md` |

---

## Claude Code Skills 連携

このプロジェクトはClaude Code Skillsに登録されています。

### スキルファイル
`/Users/tonychustudio/.claude/skills/ai-accounting-system/SKILL.md`

### トリガーフレーズ（省略文章で起動）
以下のフレーズで自動的にこのプロジェクトのコンテキストが読み込まれます：

| フレーズ | 説明 |
|----------|------|
| `会計システム` | AI会計システム全般 |
| `AI会計` | プロジェクト名トリガー |
| `請求書検索` | 請求書検索機能 |
| `見積書PDF` | 見積書PDF生成 |
| `accounting-automation` | Vercel本番URL |

### 関連マニュアル
| マニュアル | パス |
|-----------|------|
| Square API連携構築マニュアル | `/Users/tonychustudio/Documents/alldocs/tutorial/2025-12-02_AI会計システム_Square_API連携構築マニュアル.md` |
