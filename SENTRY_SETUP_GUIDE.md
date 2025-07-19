# Sentry設定ガイド

## 1. Sentryアカウントの準備

1. [Sentry.io](https://sentry.io)にログインします
2. 新しいプロジェクトを作成するか、既存のプロジェクトを使用します
   - プラットフォーム: Next.js
   - プロジェクト名: `mastra-accounting`（推奨）

## 2. DSNの取得

1. Sentryダッシュボードで、設定 → プロジェクト → [プロジェクト名] → Client Keys (DSN)に移動
2. DSNをコピーします（形式: `https://xxxxx@oxxxxx.ingest.sentry.io/xxxxxx`）

## 3. 環境変数の設定

`.env.local`ファイルの以下の値を更新してください：

```env
# SentryのDSN（必須）
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@oXXXXXX.ingest.sentry.io/XXXXXXXXX

# Sentryの組織名（必須）
SENTRY_ORG=your-organization-slug

# Sentryのプロジェクト名（必須）
SENTRY_PROJECT=mastra-accounting

# Sentry認証トークン（ソースマップアップロード用 - オプション）
SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 4. next.config.jsの更新

`next.config.js`の以下の部分を更新してください：

```javascript
const sentryWebpackPluginOptions = {
  silent: true,
  org: "your-org-slug", // あなたのSentry組織名に置き換え
  project: "mastra-accounting", // あなたのプロジェクト名に置き換え
};
```

## 5. .sentryclirc の更新（オプション）

ソースマップを自動アップロードする場合は、`.sentryclirc`ファイルを更新します：

```ini
[defaults]
org = your-org-slug
project = mastra-accounting

[auth]
token = YOUR_SENTRY_AUTH_TOKEN
```

## 6. 認証トークンの作成（オプション）

ソースマップのアップロードを有効にする場合：

1. Sentry → Settings → Account → Auth Tokens
2. "Create New Token"をクリック
3. スコープ: `project:releases`を選択
4. トークンを`.env.local`の`SENTRY_AUTH_TOKEN`に設定

## 7. 動作確認

1. アプリケーションを起動：
   ```bash
   npm run dev
   ```

2. テストページにアクセス：
   ```
   http://localhost:3000/sentry-example-page
   ```

3. 「エラーをSentryに送信」ボタンをクリック

4. Sentryダッシュボードでエラーが記録されていることを確認

## 8. 本番環境の設定

Vercel等のホスティングサービスを使用している場合：

1. 環境変数をプロダクション環境に設定
2. `NEXT_PUBLIC_SENTRY_DSN`は公開可能（フロントエンドで使用）
3. `SENTRY_AUTH_TOKEN`は秘密情報として扱う

## トラブルシューティング

### エラーがSentryに送信されない場合

1. ブラウザのコンソールでエラーを確認
2. DSNが正しく設定されているか確認
3. ネットワークタブでSentryへのリクエストを確認

### ソースマップがアップロードされない場合

1. `SENTRY_AUTH_TOKEN`が正しく設定されているか確認
2. トークンに適切な権限があるか確認
3. ビルドログでSentry関連のエラーを確認

## セキュリティ上の注意

- `SENTRY_AUTH_TOKEN`は絶対にGitにコミットしないでください
- `.sentryclirc`ファイルは`.gitignore`に追加することを推奨
- 本番環境では環境変数として設定してください