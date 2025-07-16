# API Error トラブルシューティングガイド

## 概要

このドキュメントは、accounting-automation システムで発生する API Error の調査結果と解決策をまとめたものです。

## 主な問題点

### 1. MongoDB接続の不安定性

**症状:**
- 接続タイムアウト
- `MongoTopologyClosedError`
- `ECONNREFUSED` エラー

**原因:**
- Vercelのサーバーレス環境での接続プール管理の問題
- MongoDB Atlasへの接続タイムアウト設定が不適切
- キャッシュされた接続の再利用時の健全性チェック不足

**解決策:**
1. MongoDB接続の改善版実装（`/lib/mongodb-client-improved.ts`）
   - 接続の健全性チェック機能追加
   - タイムアウト設定の最適化
   - 接続プールの適切な管理

### 2. DeepSeek APIのタイムアウト

**症状:**
- API呼び出しのタイムアウト
- 504 Gateway Timeout エラー
- レスポンスの遅延

**原因:**
- DeepSeek APIの応答時間が長い
- タイムアウト設定が短すぎる
- エラーハンドリングが不十分

**解決策:**
1. DeepSeekクライアントの改善（`/lib/deepseek-client.ts`）
   - リトライ機能の実装
   - 適切なタイムアウト設定
   - エラーハンドリングの強化

### 3. Vercel環境でのタイムアウト

**症状:**
- Function execution timeout
- 10秒制限によるエラー

**原因:**
- Vercel Hobbyプランの制限（10秒）
- API処理時間が長い

**解決策:**
1. `vercel.json`でのタイムアウト設定
   - 重要なAPIエンドポイントに`maxDuration`設定
   - 適切な関数実行時間の割り当て

### 4. エラーハンドリングの統一性欠如

**症状:**
- 不一致なエラーレスポンス形式
- 適切でないHTTPステータスコード
- デバッグが困難

**解決策:**
1. 統一されたエラーハンドリング（`/lib/api-error-handler.ts`）
   - カスタムエラークラスの実装
   - 標準化されたエラーレスポンス
   - 適切なHTTPステータスコード

## 実装した改善策

### 1. エラーハンドリングライブラリ
```typescript
// /lib/api-error-handler.ts
- カスタムエラークラス（APIError, TimeoutError, DatabaseConnectionError, ExternalAPIError）
- 統一されたエラーレスポンス生成
- リトライ可能なエラーの判定
- エクスポネンシャルバックオフでのリトライ機能
```

### 2. MongoDB接続の改善
```typescript
// /lib/mongodb-client-improved.ts
- 接続の健全性チェック
- 適切なタイムアウト設定
- Vercel環境に最適化された接続オプション
- 接続状態の管理
```

### 3. DeepSeekクライアントの実装
```typescript
// /lib/deepseek-client.ts
- 専用のDeepSeekクライアントクラス
- リトライ機能付きAPI呼び出し
- ストリーミング対応
- APIキー検証機能
```

### 4. ヘルスチェックエンドポイント
```typescript
// /app/api/health-check/route.ts
- 各サービスの健全性チェック
- 詳細なステータスレポート
- 適切なHTTPステータスコード
```

## 推奨事項

### 1. 環境変数の確認
以下の環境変数が正しく設定されていることを確認してください：
- `MONGODB_URI`: MongoDB Atlas接続文字列
- `DEEPSEEK_API_KEY`: DeepSeek APIキー

### 2. Vercelデプロイ設定
- プロジェクトの環境変数が正しく設定されていることを確認
- 必要に応じてProプランへのアップグレードを検討（より長いタイムアウト制限）

### 3. モニタリング
- Vercelのログで定期的にエラーパターンを確認
- `/api/health-check`エンドポイントで定期的な健全性チェック

### 4. 今後の改善案
1. **レート制限の実装**
   - API呼び出しの頻度制限
   - ユーザーごとのクォータ管理

2. **キャッシングの実装**
   - 頻繁にアクセスされるデータのキャッシュ
   - DeepSeek APIレスポンスのキャッシュ

3. **非同期処理の活用**
   - 長時間かかる処理のバックグラウンド実行
   - ジョブキューの実装

4. **エラー通知システム**
   - 重要なエラーの通知
   - エラー頻度のモニタリング

## デプロイ手順

1. 新しいファイルをコミット：
```bash
git add lib/api-error-handler.ts lib/mongodb-client-improved.ts lib/deepseek-client.ts app/api/health-check/route.ts vercel.json
git commit -m "API Error対策: エラーハンドリング改善とタイムアウト設定の最適化"
```

2. Vercelへデプロイ：
```bash
git push origin main
```

3. デプロイ後の確認：
- `/api/health-check`エンドポイントでシステムの健全性を確認
- Vercelのログでエラーが減少していることを確認

## まとめ

これらの改善により、以下の効果が期待できます：
- API Errorの発生頻度の減少
- エラー発生時の適切なハンドリング
- システムの安定性向上
- デバッグの容易化

継続的にモニタリングを行い、必要に応じて追加の改善を実施してください。