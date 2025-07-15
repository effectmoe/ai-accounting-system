# APIキー取得ガイド

## 問題解決専門エージェント用APIキー取得手順

### 1. DeepSeek API

**用途**: Sequential Thinking（段階的問題解決）

1. https://www.deepseek.com/ にアクセス
2. 「Sign Up」または「Get API Key」をクリック
3. アカウント作成（メールアドレス認証が必要）
4. ダッシュボードから「API Keys」セクションへ
5. 「Create New Key」をクリック
6. キー名を入力（例：`accounting-automation`）
7. 生成されたAPIキーをコピー

**料金**: 
- 無料枠：初回登録で$5分のクレジット
- 有料：$0.14 / 1M トークン（入力）、$0.28 / 1M トークン（出力）

### 2. Perplexity API

**用途**: 高度な検索と分析

1. https://www.perplexity.ai/ にアクセス
2. 右上の「API」リンクをクリック
3. 「Get Started」でアカウント作成
4. APIダッシュボードにアクセス
5. 「Generate API Key」をクリック
6. 生成されたAPIキーをコピー

**料金**:
- 無料枠：月間1,000リクエスト
- Pro: $20/月（10,000リクエスト）
- 従量課金：$0.005/リクエスト

### 3. Firecrawl API

**用途**: Webスクレイピングとデータ抽出

1. https://www.firecrawl.dev/ にアクセス
2. 「Get Started Free」をクリック
3. GitHubまたはGoogleでサインイン
4. ダッシュボードの「API Keys」タブへ
5. 「Generate New Key」をクリック
6. APIキーをコピー

**料金**:
- 無料：500ページ/月
- Hobby: $19/月（3,000ページ）
- Pro: $99/月（20,000ページ）

### 4. DataForSEO API

**用途**: SEO分析と競合調査

1. https://dataforseo.com/ にアクセス
2. 「Sign Up」でアカウント作成
3. メール認証を完了
4. ダッシュボードにログイン
5. 「API Dashboard」→「API Access」
6. APIログイン情報（メールとパスワード）を確認
7. Basic認証形式：`email:password`をBase64エンコード

**料金**:
- 無料トライアル：$1分のクレジット
- Pay as you go：APIコールごとの従量課金
- 月額プラン：$50～

### 5. Midscene API

**用途**: ビジュアル解析とUI自動化

1. https://midscene.ai/ にアクセス
2. 「Get Started」でアカウント作成
3. ダッシュボードにアクセス
4. 「API Keys」セクションへ
5. 「Create API Key」をクリック
6. APIキーをコピー

**Chrome拡張機能（オプション）**:
1. Chrome Web Storeから「Midscene」拡張機能をインストール
2. Chrome拡張機能管理画面（chrome://extensions/）を開く
3. 「Midscene」の詳細を表示
4. 拡張機能IDをコピー

**料金**:
- 無料：1,000リクエスト/月
- Starter: $29/月
- Pro: $99/月

### 6. その他の既存サービス

**NLWeb API**（既存システムとの連携用）:
- 既存のNLWebアカウントから取得
- 管理画面の「API設定」から確認

**GitHub Token**（デプロイ用）:
1. GitHubの「Settings」→「Developer settings」
2. 「Personal access tokens」→「Tokens (classic)」
3. 「Generate new token」
4. 必要なスコープを選択（repo, workflow）
5. トークンを生成してコピー

## APIキー管理のベストプラクティス

### 1. キーのローテーション
- 3ヶ月ごとにAPIキーを更新
- 古いキーは速やかに無効化

### 2. 使用制限の設定
- 各APIサービスで月間/日間の使用上限を設定
- 異常な使用量のアラートを設定

### 3. IPアドレス制限
- 可能な場合はVercelのIPアドレスのみ許可
- Vercelの固定IPアドレス：https://vercel.com/docs/concepts/solutions/static-ip

### 4. 環境別のキー管理
```
開発環境: サンドボックスAPI or モック
ステージング: 本番と同じサービスの別キー
本番環境: 本番用APIキー
```

### 5. コスト管理
- 各サービスの使用量ダッシュボードを定期的に確認
- 予算アラートを設定
- 不要なAPIコールを削減する最適化を実施

## 無料で始める場合の推奨設定

最小限のコストで開始する場合：

1. **DeepSeek**: 初回クレジット$5を使用
2. **Perplexity**: 無料枠（1,000リクエスト/月）
3. **Firecrawl**: 無料プラン（500ページ/月）
4. **DataForSEO**: トライアルクレジット$1
5. **Midscene**: 無料プラン（1,000リクエスト/月）

これらの無料枠内で基本的な動作確認が可能です。本格運用時に有料プランへ移行することをお勧めします。