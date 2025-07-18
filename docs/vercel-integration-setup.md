# Vercel統合セットアップガイド

作成日: 2025-07-18

## 概要

このガイドでは、accounting-automationプロジェクトにMongoDB AtlasとPerplexity API統合を設定する手順を説明します。

## 前提条件

- Vercelアカウントにアクセス可能であること
- プロジェクト: effectmoes-projects/accounting-automation
- 現在の環境変数がバックアップ済みであること（backup/.env.local.backup）

## 1. MongoDB Atlas統合の設定

### 手順1: Vercel統合ページへのアクセス

1. 以下のURLにアクセス:
   ```
   https://vercel.com/effectmoes-projects/~/integrations/mongodbatlas
   ```

2. 「Install」または「Configure」ボタンをクリック

### 手順2: MongoDB Atlasアカウントの連携

1. MongoDB Atlasアカウントにログイン（未登録の場合は新規作成）
2. Vercelアプリケーションへのアクセスを許可

### 手順3: クラスターの選択・作成

現在のMongoDB接続情報を確認:
- クラスター名: accounting-cluster
- データベース名: accounting

**重要**: 既存のクラスターを使用する場合は、現在の設定と一致することを確認

### 手順4: 環境変数の自動設定

Vercel統合により、以下の環境変数が自動的に設定されます:
- `MONGODB_URI` - 接続文字列（既存の値を上書きする可能性があるため注意）
- その他のMongoDB関連変数

### 手順5: 確認事項

1. 統合後、Vercelプロジェクトの環境変数を確認
2. `MONGODB_URI`が正しく設定されているか確認
3. 必要に応じて`MONGODB_DB_NAME`を手動で設定

## 2. Perplexity API統合の設定

### 手順1: Vercel統合ページへのアクセス

1. 以下のURLにアクセス:
   ```
   https://vercel.com/effectmoes-projects/~/integrations/pplx-api
   ```

2. 「Install」または「Add to Project」ボタンをクリック

### 手順2: Perplexity APIキーの取得

1. Perplexityアカウントにログイン（未登録の場合は新規作成）
2. APIキーページでキーを生成
3. キーをコピー

### 手順3: Vercelでの設定

1. プロジェクトを選択: accounting-automation
2. 環境を選択（Production, Preview, Development）
3. APIキーを入力

### 手順4: 環境変数の確認

統合により以下の環境変数が設定されます:
- `PERPLEXITY_API_KEY` - PerplexityのAPIキー

## 3. 統合後の確認

### Vercelダッシュボードでの確認

1. プロジェクト設定 > 環境変数ページにアクセス
2. 以下の変数が正しく設定されているか確認:
   - `MONGODB_URI`
   - `MONGODB_DB_NAME` 
   - `PERPLEXITY_API_KEY`

### ローカル環境での確認

```bash
# .env.localファイルを更新
vercel env pull .env.local

# 更新内容を確認
cat .env.local | grep -E "(MONGODB|PERPLEXITY)"
```

## 4. ロールバック手順

問題が発生した場合は、以下の手順でロールバックできます:

### 手順1: バックアップファイルの復元

```bash
# バックアップから復元
cp backup/.env.local.backup .env.local
```

### 手順2: Vercel環境変数の手動更新

1. Vercelダッシュボードにアクセス
2. プロジェクト設定 > 環境変数
3. 必要に応じて手動で値を更新

### 手順3: 統合の削除（必要な場合）

1. Vercel統合ページにアクセス
2. 該当の統合を選択
3. 「Remove」または「Uninstall」を選択

## 5. トラブルシューティング

### MongoDB接続エラー

1. 接続文字列の形式を確認
2. ファイアウォール設定（IP許可リスト）を確認
3. ユーザー権限を確認

### Perplexity API エラー

1. APIキーが正しく設定されているか確認
2. APIの利用制限を確認
3. エンドポイントURLを確認

## 注意事項

1. **環境変数の上書き**: 統合により既存の環境変数が上書きされる可能性があります
2. **セキュリティ**: APIキーやデータベース認証情報は絶対に公開しないでください
3. **バックアップ**: 変更前に必ずバックアップを取ってください
4. **テスト**: 本番環境に適用する前に、開発環境でテストしてください

## 参考リンク

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Perplexity API Documentation](https://docs.perplexity.ai/)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)