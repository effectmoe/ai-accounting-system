# バンドルサイズ分析レポート

総バンドルサイズ: 4.45 MB
チャンク数: 94

## 大きなチャンク (Top 10)

1. 7429-437916ad989158c1.js: 548.54 KB
2. 862-bb6b2a7f5260778c.js: 346.00 KB
3. 4120-2ec72485303039fc.js: 343.83 KB
4. b2d98e07-b398bc8ba4b50905.js: 311.21 KB
5. pages/_app-ba74f1dc4952a6f5.js: 248.91 KB
6. ff804112-4f4562887e2cd1f3.js: 233.33 KB
7. fd9d1056-ff867dfff7c89b43.js: 168.49 KB
8. 5848-cda50bbf0f12ae36.js: 143.79 KB
9. framework-e321414dae5f498d.js: 138.02 KB
10. 52774a7f-eeeb400ef4a954f3.js: 121.56 KB

## 大きな依存関係

1. googleapis: 122.13 MB (2747.1%)
2. next: 82.78 MB (1861.8%)
3. lucide-react: 32.42 MB (729.1%)
4. @mastra/core: 22.59 MB (508.0%)
5. date-fns: 6.39 MB (143.7%)
6. recharts: 5.03 MB (113.2%)
7. react-dom: 4.39 MB (98.8%)
8. @azure/ai-form-recognizer: 3.85 MB (86.5%)
9. framer-motion: 2.20 MB (49.6%)
10. @react-pdf/renderer: 2.16 MB (48.5%)

## 最適化の推奨事項

🔴 googleapis (122MB) を個別のAPIクライアントに置き換える:
   - @google-cloud/storage
   - @google-cloud/vision
   - 使用するAPIのみをインポート

🟡 date-fns の import を最適化:
   - import { format } from "date-fns" を使用
   - import * as dateFns from "date-fns" を避ける

🟡 lucide-react のアイコンを個別インポート:
   - import { Search } from "lucide-react"
   - 使用するアイコンのみをインポート

🔴 500KB以上のチャンクを検出。コード分割を推奨:
   - dynamic importの使用
   - React.lazyでコンポーネントを遅延ロード

🟡 以前の分析で14個の未使用依存関係を検出:
   - npm uninstall で削除してバンドルサイズを削減

🟢 画像の最適化:
   - next/imageコンポーネントを使用
   - WebP形式への自動変換
   - 適切なサイズでの配信

🟢 フォントの最適化:
   - next/fontを使用してフォントを最適化
   - 必要なサブセットのみをロード

## 次のステップ

1. 推奨事項に従って大きなパッケージを最適化
2. コード分割を実装してチャンクサイズを削減
3. 未使用の依存関係を削除
4. webpack-bundle-analyzerで詳細な分析を実行