# フェーズ2 本番環境デプロイチェックリスト

## 📋 デプロイ前の確認事項

### 1. MongoDBインデックス作成
本番環境のMongoDBでインデックスを作成する必要があります：

```bash
# 本番環境で実行
npm run phase2:indexes
```

作成されるインデックス：
- customers_search_index（テキスト検索用）
- customers_filter_index（フィルター用）
- customers_contact_index（連絡先用）
- customers_kana_sort_index（日本語ソート用）
- customers_email_index
- customers_customer_id_index
- customers_updated_at_index

### 2. プライマリ連絡先フィールドのマイグレーション（オプション）
既存データがある場合、マイグレーションを実行：

```bash
# 本番環境で実行（データが多い場合は注意）
npm run phase2:migrate
```

**注意**: 
- このマイグレーションは既存の全顧客データを更新します
- 実行前にバックアップを取ることを推奨
- データ量によっては時間がかかる場合があります

### 3. Redisキャッシュの設定（オプション）
Upstash Redisを使用する場合：

1. [Upstash](https://upstash.com/)でRedisインスタンスを作成
2. Vercelに環境変数を追加：
   ```
   UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token
   ```

**注意**: Redisが設定されていない場合、システムは正常に動作しますが、キャッシュ機能は無効になります。

### 4. パフォーマンステスト
デプロイ後、以下のエンドポイントでパフォーマンスを確認：

- `/api/customers?page=1&limit=10` - 基本的な一覧取得
- `/api/customers?search=test` - テキスト検索
- `/api/customers?sortBy=primaryContactName` - プライマリ連絡先ソート

期待される応答時間：
- 一般的なクエリ: 100-300ms
- テキスト検索: 50-150ms
- 複雑なフィルター: 200-500ms

### 5. 監視とログ
- Vercelのログで以下のメッセージを確認：
  - `🚀 Optimized query completed in XXXms`
  - `📬 Returning cached customer list`（キャッシュ有効時）
  - エラーがないことを確認

## 🚀 デプロイ手順

1. **コードのプッシュ**
   ```bash
   git push origin main
   ```

2. **Vercelでの自動デプロイ確認**
   - Vercelダッシュボードでビルドの成功を確認
   - エラーがないことを確認

3. **本番環境でのインデックス作成**
   - SSH/コンソールアクセスがある場合は上記コマンドを実行
   - なければ、初回アクセス時に自動作成されます（パフォーマンスは低下）

4. **動作確認**
   - 顧客一覧ページの表示速度確認
   - 検索機能の動作確認
   - ソート機能の動作確認

## ⚠️ ロールバック手順

問題が発生した場合：

1. Vercelダッシュボードから前のデプロイメントに戻す
2. または、以下のコミットに戻す：
   ```bash
   git revert HEAD
   git push origin main
   ```

## 📊 成功基準

- [ ] ビルドエラーなし
- [ ] API応答時間が1秒以内
- [ ] 検索機能が正常動作
- [ ] ソート機能が正常動作
- [ ] エラーログなし

---

最終更新: 2025-01-30