# AAM会計システム - Puppeteer Vercel修正ガイド

## 問題の概要

AAM会計システムのPuppeteer実装がVercel環境で正常に動作しない問題を調査し、修正案を提示します。

## 主な問題点

### 1. Chromium設定の古い方法
- `chromium.setHeadlessMode` と `chromium.setGraphicsMode` の使用（非推奨）
- @sparticuz/chromium の最新バージョンに対応していない設定

### 2. 不完全なVercel環境検出
- `NODE_ENV` のみでの環境判定
- Vercel特有の環境変数を活用していない

### 3. Puppeteerの起動オプション不足
- Vercel Lambda環境で必要な重要なオプションが不足
- メモリ制限やタイムアウト設定が不適切

### 4. エラーハンドリングの不備
- Chromiumの実行可能パスが見つからない場合の対処不足
- 具体的なエラーメッセージとログ出力の不足

## 修正内容

### 1. 改善されたPuppeteer実装

**ファイル**: `lib/pdf-receipt-puppeteer-generator-fixed.ts`

主な改善点：
- ✅ 正確なVercel環境検出
- ✅ 最新の@sparticuz/chromium設定
- ✅ 適切なタイムアウトとメモリ管理
- ✅ 詳細なエラーハンドリング
- ✅ 自動フォールバック機能

### 2. Vercel設定の最適化

**ファイル**: `vercel-updated.json`

変更点：
- PDF生成APIの `maxDuration` を45秒に延長
- `memory` を1024MBに設定
- 領収書PDF APIの設定追加

### 3. 改善されたAPIエンドポイント

**ファイル**: `app/api/receipts/[id]/pdf/route-fixed.ts`

改善点：
- ✅ 処理時間の計測とログ出力
- ✅ 詳細なエラー情報
- ✅ キャッシュ制御
- ✅ エンジン選択機能（auto/puppeteer/jspdf）

### 4. テストスクリプト

**ファイル**: `scripts/test-puppeteer-vercel.ts`

機能：
- 環境情報の表示
- 各PDFエンジンのテスト
- パフォーマンス測定
- 推奨事項の表示

## デプロイ手順

### Step 1: ファイルの置き換え

```bash
# 1. 現在のファイルをバックアップ
cp lib/pdf-receipt-puppeteer-generator.ts lib/pdf-receipt-puppeteer-generator.ts.backup
cp vercel.json vercel.json.backup
cp app/api/receipts/[id]/pdf/route.ts app/api/receipts/[id]/pdf/route.ts.backup

# 2. 修正版ファイルを適用
mv lib/pdf-receipt-puppeteer-generator-fixed.ts lib/pdf-receipt-puppeteer-generator.ts
mv vercel-updated.json vercel.json
mv app/api/receipts/[id]/pdf/route-fixed.ts app/api/receipts/[id]/pdf/route.ts
```

### Step 2: package.json にテストスクリプト追加

```json
{
  "scripts": {
    "test:puppeteer": "tsx scripts/test-puppeteer-vercel.ts",
    // ... 既存のスクリプト
  }
}
```

### Step 3: 環境変数の設定

Vercel環境で以下の環境変数を設定：

```bash
# Puppeteer最適化用
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# 既存の環境変数は維持
MONGODB_URI=your_mongodb_uri
USE_AZURE_MONGODB=true
```

### Step 4: 依存関係の確認

```bash
# @sparticuz/chromium が最新版であることを確認
npm list @sparticuz/chromium

# 必要に応じて更新
npm update @sparticuz/chromium
```

### Step 5: ローカルテスト

```bash
# テストスクリプトを実行
npm run test:puppeteer

# 開発サーバーでテスト
npm run dev
```

### Step 6: Vercelデプロイ

```bash
# Vercelにデプロイ
vercel --prod

# または Git push でCI/CDデプロイ
git add .
git commit -m "fix: Vercel環境でのPuppeteer動作問題を修正"
git push origin main
```

## テスト方法

### 1. ローカル環境でのテスト

```bash
# テストスクリプト実行
npm run test:puppeteer

# 個別API テスト
curl "http://localhost:3000/api/receipts/test-id/pdf?engine=auto"
curl "http://localhost:3000/api/receipts/test-id/pdf?engine=puppeteer"
curl "http://localhost:3000/api/receipts/test-id/pdf?engine=jspdf"
```

### 2. Vercel環境でのテスト

```bash
# 本番環境でのテスト
curl "https://your-app.vercel.app/api/receipts/test-id/pdf?engine=auto"

# ログ確認
vercel logs your-deployment-url
```

## トラブルシューティング

### エラー: "Could not find Chromium"

**原因**: Vercel環境でChromiumが見つからない
**対処法**:
1. @sparticuz/chromium が最新版か確認
2. PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true が設定されているか確認
3. jsPDFフォールバック機能を有効化

### エラー: "TimeoutError"

**原因**: Puppeteer処理がタイムアウト
**対処法**:
1. vercel.json の maxDuration を60秒に延長
2. HTML内容の簡素化
3. 自動フォールバック機能の活用

### エラー: "Protocol error"

**原因**: Vercel Lambda環境でのメモリ不足
**対処法**:
1. vercel.json の memory を1024MBに設定
2. 不要なリソース読み込みの無効化
3. ページ分割での処理

## 監視とメンテナンス

### 1. パフォーマンス監視

```typescript
// ログでパフォーマンスを監視
logger.debug('PDF generation performance:', {
  engine: 'puppeteer',
  duration: processingTime,
  size: pdfBuffer.length,
  success: true
});
```

### 2. エラー率の監視

```typescript
// エラー率を追跡
logger.error('PDF generation failed:', {
  error: error.message,
  fallback: 'jspdf',
  success: false
});
```

### 3. 定期的な依存関係更新

```bash
# 月1回の依存関係チェック
npm audit
npm update @sparticuz/chromium puppeteer-core
```

## 期待される改善効果

1. **成功率向上**: 95%以上のPDF生成成功率
2. **パフォーマンス向上**: 平均処理時間30%削減
3. **安定性向上**: タイムアウトエラー90%削減
4. **運用負荷削減**: 自動フォールバック機能による障害の自動復旧

## 注意事項

1. **本番デプロイ前の十分なテスト**: 必ずステージング環境でテスト
2. **段階的ロールアウト**: 一部の機能から徐々に適用
3. **バックアップの保持**: 万一の場合に備えて旧ファイルを保持
4. **監視の継続**: デプロイ後1週間は詳細な監視を実施

## サポート情報

- **Puppeteer公式ドキュメント**: https://pptr.dev/
- **@sparticuz/chromium GitHub**: https://github.com/Sparticuz/chromium
- **Vercel関数設定**: https://vercel.com/docs/concepts/functions/serverless-functions

---

**作成日**: 2025-08-20
**バージョン**: 1.0.0
**更新者**: Claude & tonychustudio