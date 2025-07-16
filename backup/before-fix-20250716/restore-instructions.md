# バックアップ復元手順

## 作成日時
2025-07-16

## バックアップの概要
3つの問題修正前の現状バックアップ

## 復元対象ファイル

### 1. AI Chat Dialog コンポーネント
- **バックアップファイル**: `ai-chat-dialog.tsx.backup`
- **復元先**: `/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/components/ai-chat-dialog.tsx`

### 2. 型定義ファイル
- **バックアップファイル**: `collections.ts.backup`
- **復元先**: `/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/types/collections.ts`

### 3. 会社情報サービス
- **バックアップファイル**: `company-info.service.ts.backup`
- **復元先**: `/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/services/company-info.service.ts`

## 復元手順

### 手動復元（推奨）
```bash
# プロジェクトディレクトリに移動
cd /Users/tonychustudio/Documents/aam-orchestration/accounting-automation

# 各ファイルを復元
cp backup/before-fix-20250716/ai-chat-dialog.tsx.backup components/ai-chat-dialog.tsx
cp backup/before-fix-20250716/collections.ts.backup types/collections.ts
cp backup/before-fix-20250716/company-info.service.ts.backup services/company-info.service.ts
```

### Git復元（代替手段）
```bash
# 現在の変更を確認
git status

# 特定ファイルの変更を破棄
git checkout HEAD -- components/ai-chat-dialog.tsx
git checkout HEAD -- types/collections.ts
git checkout HEAD -- services/company-info.service.ts

# または、全ての未コミット変更を破棄
git reset --hard HEAD
```

## 復元後の確認事項

1. **ビルドテスト**
   ```bash
   npm run build
   ```

2. **型チェック**
   ```bash
   npm run type-check
   ```

3. **依存関係の確認**
   ```bash
   npm install
   ```

4. **動作確認**
   - AI Chat Dialog の動作確認
   - 音声認識機能の確認
   - 会社情報API の確認

## 注意点

- 復元前に現在の作業内容をコミットすることを推奨
- 復元後は必ずテストを実行して動作を確認
- バックアップファイルは修正作業完了まで保持

## 修正予定の問題

1. **ai-chat-dialog.tsx**: speech recognition 機能の問題
2. **collections.ts**: 型定義の重複と整合性の問題
3. **company-info.service.ts**: API 呼び出しの問題

修正完了後、このバックアップは削除可能です。