# GAS OCR Web Apps デプロイ手順

## MCPサーバーを使った直接実装

### 前提条件
- Google Apps Script MCPが設定済み
- OAuth認証が完了済み

### 実装手順

1. **GASプロジェクトを作成**
```
「Google Apps ScriptでOCR Web Appsプロジェクトを作成して」
```

2. **コードを追加**
```
「作成したプロジェクトに/docs/gas-ocr-script.gsの内容を追加して」
```

3. **Drive APIを有効化**
```
「このプロジェクトでGoogle Drive APIを有効にして」
```

4. **Webアプリとしてデプロイ**
```
「このスクリプトをWebアプリとしてデプロイして。
アクセス権は全員、実行ユーザーは自分として」
```

5. **デプロイURLを取得**
```
「デプロイされたWebアプリのURLを教えて」
```

6. **テスト**
```
「デプロイしたWebアプリのGETエンドポイントにアクセスして動作確認して」
```

## 環境変数の設定

取得したURLを以下に設定：
- Vercel: `GAS_OCR_URL=https://script.google.com/macros/s/xxxxx/exec`
- ローカル: `.env`ファイルに追加

## 確認事項

1. プロジェクトが作成されたか
2. Drive APIが有効になっているか
3. デプロイが成功したか
4. URLが取得できたか