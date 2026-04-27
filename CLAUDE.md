## ⚠️ 既知の再発バグ（必ず確認）

### PDF生成フォントURL（要注意）

`lib/pdf-generator.tsx` と `lib/pdf-receipt-generator.tsx` のフォントURLは**必ずGoogle Fonts v56 TTFを使用**すること。

```js
// ✅ 正しい（2026-04-27 確認済み）
src: 'https://fonts.gstatic.com/s/notosansjp/v56/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75s.ttf' // Regular
src: 'https://fonts.gstatic.com/s/notosansjp/v56/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFPYk75s.ttf' // Bold

// ❌ 禁止（廃止済みパス）
src: 'https://fonts.gstatic.com/ea/notosansjp/v5/NotoSansJP-Regular.otf'
// ❌ 禁止（ローカルファイルは破損）
src: '/fonts/NotoSansJP-Regular.ttf'
```

**2回再発した原因：修正後にコミット＆デプロイを忘れた。現在は Stop hook で自動コミット済み。**

---

### ファイル構成

```plain text
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

**最終更新**: 2026-01-16

---

## RAG（領収書分類学習システム）

### 概要

領収書OCR処理時に過去の類似データから勘定科目・但し書きを自動判定するRAGシステム。

### 仕組み

1. 新しい領収書がスキャンされると、ChromaDBで類似の過去データを検索
1. 類似度が0.85以上なら、その勘定科目と但し書きを再利用
1. 類似度が低ければ、従来のルールベース → AI推定にフォールバック
1. 処理後、領収書データをRAGに追加（将来の学習用）
### 分類の優先順位

```plain text
1. RAG（類似度 > 0.85）→ 過去の正解データを採用
2. ルールベース → SKILL.mdのキーワードルール
3. AI推定 → Qwen3-VLの出力
```

### 関連ファイル

| ファイル | 役割 |

|---------|------|

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

```plain text
// lib/honorific-utils.ts - formatCustomerNameForEmail関数
if (companyName && contactName) {
  return `${companyName}\n${contactName} 様`;  // 改行で区切る
}
```

**詳細レポート**: `/Users/tonychustudio/Documents/alldocs/report/2025-11-26_AI会計システム_メール宛名改行問題修正レポート.md`

### 検索・フィルター機能関連

| 症状 | 原因 | 解決策 |

|------|------|--------|

| 一覧ページで検索が動作しない | フロントエンドからAPIへ`search`パラメータが送信されていない | `fetchInvoices`/`fetchQuotes`関数内で`params.append('search', debouncedSearchQuery)`を追加 |

| APIが検索クエリを無視する | APIルートで`search`パラメータを取得していない | `app/api/invoices/route.ts`と`app/api/quotes/route.ts`で`searchParams.get('search')`を追加 |

| サービス層で検索が実行されない | `SearchParams`インターフェースに`search`フィールドがない | `services/invoice.service.ts`と`services/quote.service.ts`のインターフェースに`search?: string`を追加し、MongoDBの`$or`と正規表現で検索実装 |

| 日付フィルターが効かない | useEffectの依存配列に`dateFrom`/`dateTo`が含まれていない | `useEffect`の依存配列に`dateFrom, dateTo`を追加 |

| 🚨 顧客名で検索しても結果がヒットしない | MongoDBで`customerId`がObjectId型で保存されているが、検索時に文字列として比較している | ObjectId型とString型の両方で検索するように修正（下記参照） |

**検索機能の3層実装パターン:**

```plain text
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

```plain text
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

```plain text
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

```plain text
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

**最終更新**: 2026-01-16

---

## RAG（領収書分類学習システム）

### 概要

領収書OCR処理時に過去の類似データから勘定科目・但し書きを自動判定するRAGシステム。

### 仕組み

1. 新しい領収書がスキャンされると、ChromaDBで類似の過去データを検索

1. 類似度が0.85以上なら、その勘定科目と但し書きを再利用

1. 類似度が低ければ、従来のルールベース → AI推定にフォールバック

1. 処理後、領収書データをRAGに追加（将来の学習用）

### 分類の優先順位

```plain text
1. RAG（類似度 > 0.85）→ 過去の正解データを採用
2. ルールベース → SKILL.mdのキーワードルール
3. AI推定 → Qwen3-VLの出力
```

### 関連ファイル

| ファイル | 役割 |

|---------|------|
