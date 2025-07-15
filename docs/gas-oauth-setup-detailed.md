# Google Apps Script MCP OAuth設定 完全ガイド

## 🎯 設定完了後にできること
- GASプロジェクトの自動作成・管理
- Supabase → Google Sheets の自動同期スクリプト作成
- 月次レポートの自動生成
- 税務申告用データの自動整形

## 📋 事前準備
- Googleアカウント
- Google Cloud Consoleへのアクセス
- 約15分の作業時間

## ステップ1: Google Cloud Consoleにアクセス

### 1.1 プロジェクト選択
1. [Google Cloud Console](https://console.cloud.google.com) を開く
2. 画面上部のプロジェクト名をクリック
3. 「新しいプロジェクト」または既存のプロジェクトを選択
   - プロジェクト名の例: `AI-Accounting-System`
   - プロジェクトIDをメモ（後で使用）

## ステップ2: Google Apps Script APIを有効化

### 2.1 APIライブラリへ移動
1. 左メニュー「☰」→「APIとサービス」→「ライブラリ」

### 2.2 APIを検索して有効化
1. 検索窓に「Google Apps Script API」と入力
2. 検索結果から「Google Apps Script API」をクリック
3. 「有効にする」ボタンをクリック
4. 有効化完了まで待つ（約30秒）

### 2.3 追加で有効化するAPI（推奨）
以下も同様に有効化：
- Google Drive API
- Google Sheets API
- Google Docs API

## ステップ3: OAuth同意画面の設定

### 3.1 OAuth同意画面へ移動
1. 左メニュー「APIとサービス」→「OAuth同意画面」

### 3.2 アプリケーションタイプの選択
1. 「外部」を選択（組織外の場合）
2. 「作成」をクリック

### 3.3 アプリ情報の入力
| 項目 | 入力内容 |
|------|----------|
| アプリ名 | AI会計システム GAS Manager |
| ユーザーサポートメール | あなたのメールアドレス |
| アプリのロゴ | （スキップ可） |
| アプリケーションのホームページ | （スキップ可） |
| アプリケーションのプライバシーポリシー | （スキップ可） |
| アプリケーションの利用規約 | （スキップ可） |
| 承認済みドメイン | （スキップ可） |
| デベロッパーの連絡先情報 | あなたのメールアドレス |

「保存して次へ」をクリック

### 3.4 スコープの追加
1. 「スコープを追加または削除」をクリック
2. 以下のスコープを検索して追加：
   ```
   https://www.googleapis.com/auth/script.projects
   https://www.googleapis.com/auth/script.deployments
   https://www.googleapis.com/auth/script.processes
   https://www.googleapis.com/auth/drive
   https://www.googleapis.com/auth/spreadsheets
   ```
3. 「更新」→「保存して次へ」

### 3.5 テストユーザーの追加
1. 「ADD USERS」をクリック
2. あなたのGmailアドレスを入力
3. 「追加」→「保存して次へ」

## ステップ4: OAuth 2.0 クライアントIDの作成

### 4.1 認証情報ページへ移動
1. 左メニュー「APIとサービス」→「認証情報」

### 4.2 認証情報を作成
1. 「＋認証情報を作成」をクリック
2. 「OAuth クライアント ID」を選択

### 4.3 アプリケーションタイプの設定
1. アプリケーションの種類: **「デスクトップアプリ」**
2. 名前: `GAS MCP Client`
3. 「作成」をクリック

### 4.4 認証情報をダウンロード
1. 作成完了画面が表示される
2. 「JSONをダウンロード」をクリック
3. ファイルがダウンロードされる（例: `client_secret_xxxxx.json`）

## ステップ5: oauth-config.jsonの配置

### 5.1 ファイル名を変更
ダウンロードしたファイルを `oauth-config.json` にリネーム

### 5.2 ファイルを配置
```bash
# ファイルを正しい場所にコピー
cp ~/Downloads/oauth-config.json /Users/tonychustudio/Documents/aam-orchestration/accounting-automation/gas-mcp-server/
```

### 5.3 内容を確認
```bash
# ファイルが正しく配置されたか確認
ls -la /Users/tonychustudio/Documents/aam-orchestration/accounting-automation/gas-mcp-server/oauth-config.json
```

## ステップ6: 初回認証の実行

### 6.1 GAS MCPサーバーディレクトリへ移動
```bash
cd /Users/tonychustudio/Documents/aam-orchestration/accounting-automation/gas-mcp-server
```

### 6.2 認証を開始
```bash
npm start
```

### 6.3 ブラウザでの認証
1. ブラウザが自動的に開く
2. Googleアカウントを選択
3. 「このアプリは確認されていません」と表示された場合：
   - 「詳細」をクリック
   - 「AI会計システム GAS Manager（安全ではないページ）に移動」をクリック
4. 権限を確認して「許可」をクリック
5. 「認証が完了しました」というメッセージが表示される

### 6.4 認証の確認
```bash
# トークンが保存されたか確認
ls -la ~/.mcp-gas-auth/
```

## ステップ7: Mastraから実行

### 7.1 プロジェクトルートに戻る
```bash
cd /Users/tonychustudio/Documents/aam-orchestration/accounting-automation
```

### 7.2 GAS OCRをデプロイ
```bash
npm run deploy:gas-ocr
```

## トラブルシューティング

### エラー: 「このアプリは確認されていません」
- これは正常です。自分で作成したアプリなので安全です
- 「詳細」→「安全ではないページに移動」で進めてください

### エラー: 「oauth-config.json not found」
- ファイルパスを確認
- ファイル名が正確に `oauth-config.json` であることを確認

### エラー: 「API is not enabled」
- Google Cloud ConsoleでAPIが有効化されているか確認
- 有効化後、5分程度待ってから再試行

## 次のステップ

OAuth設定が完了したら：
1. `npm run deploy:gas-ocr` でOCRプロジェクトを作成
2. Supabase → Google Sheets同期スクリプトを作成
3. 月次レポート自動生成システムを構築

準備はいいですか？