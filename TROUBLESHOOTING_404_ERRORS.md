# JavaScript 404エラーのトラブルシューティングガイド

## 問題の概要
仕訳管理ページで複数のJavaScriptファイル（webpack-*.js）が404エラーになり、ボタンが動作しない問題。

## 根本原因
- Vercelのデプロイメントキャッシュ
- 古いビルドのJSファイルへの参照が残っている
- ブラウザのキャッシュ

## 解決方法

### 1. 即座の解決策（ユーザー側）
```bash
# ブラウザのキャッシュをクリア
# Windows/Linux: Ctrl + Shift + R
# Mac: Cmd + Shift + R

# またはシークレット/プライベートウィンドウで確認
```

### 2. Vercelキャッシュのクリア（開発者側）

#### 方法A: 自動スクリプトを使用
```bash
# キャッシュクリアスクリプトを実行
./scripts/clear-vercel-cache.sh

# または強制再ビルドスクリプトを実行
npx tsx scripts/force-rebuild-vercel.ts
```

#### 方法B: 手動でキャッシュクリア
```bash
# 1. ローカルキャッシュを削除
rm -rf .vercel
rm -rf .next
rm -rf node_modules/.cache

# 2. vercel.jsonのFORCE_REBUILDを更新
# "FORCE_REBUILD": "2025-07-23-cache-clear" のような新しい値に変更

# 3. 強制デプロイ
vercel --prod --force --yes
```

#### 方法C: Vercelダッシュボードから
1. Vercelダッシュボードにログイン
2. プロジェクトの Settings > Functions タブへ
3. "Purge Data Cache" ボタンをクリック
4. 再デプロイをトリガー

### 3. Next.js設定の最適化

`next.config.js`に以下の設定を追加済み：
```javascript
generateBuildId: async () => {
  // タイムスタンプベースのビルドIDを生成
  return `build-${Date.now()}`;
},
```

これにより、各ビルドで一意のIDが生成され、キャッシュの問題を防ぎます。

### 4. 問題の診断

#### 診断スクリプトの実行
```bash
npx tsx scripts/verify-journal-page.ts
```

このスクリプトは：
- ページのHTMLを取得
- JavaScriptファイルのリンクを抽出
- 各ファイルの存在を確認
- APIエンドポイントの動作を確認

## 予防策

### 1. 定期的なキャッシュクリア
- 重要なデプロイ前に`clear-vercel-cache.sh`を実行
- FORCE_REBUILDの値を定期的に更新

### 2. ビルド設定の最適化
- `generateBuildId`でタイムスタンプベースのIDを使用
- 静的アセットのキャッシュヘッダーを適切に設定

### 3. モニタリング
- デプロイ後は必ず本番環境で動作確認
- ブラウザの開発者ツールでネットワークタブを確認

## トラブルシューティングチェックリスト

- [ ] ブラウザのキャッシュをクリアした
- [ ] シークレットウィンドウで確認した
- [ ] `vercel --prod --force --yes`で強制デプロイした
- [ ] Vercelダッシュボードでキャッシュをパージした
- [ ] 診断スクリプトを実行して問題を特定した
- [ ] 別のブラウザで確認した
- [ ] CloudflareなどのCDNキャッシュもクリアした（使用している場合）

## 関連ファイル
- `/scripts/clear-vercel-cache.sh` - キャッシュクリアスクリプト
- `/scripts/force-rebuild-vercel.ts` - 強制再ビルドスクリプト
- `/scripts/verify-journal-page.ts` - 診断スクリプト
- `/next.config.js` - Next.js設定ファイル
- `/vercel.json` - Vercel設定ファイル