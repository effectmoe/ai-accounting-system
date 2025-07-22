# AAM会計システム テナント機能削除調査レポート

## 調査日時
2025-01-22

## 1. テナント関連ファイルの完全なリスト

### 1.1 型定義ファイル
- `/types/tenant.ts` - テナント管理の型定義（TenantType, Industry, FeatureFlags等）
- `/types/tenant-collections.ts` - テナント対応のコレクション型定義（Project, MonthlyStats等）

### 1.2 Contextファイル
- `/contexts/TenantContext.tsx` - テナント管理のReact Context

### 1.3 UIコンポーネント
- `/app/tenant-switch/page.tsx` - テナントモード切り替えページ
- `/app/dashboard/individual-contractor/page.tsx` - 1人親方向けダッシュボード
- `/components/individual-contractor/Dashboard.tsx` - 1人親方向けダッシュボードコンポーネント
- `/components/individual-contractor/ProjectKanbanView.tsx` - プロジェクトかんばんビュー
- `/components/individual-contractor/TimelineView.tsx` - タイムラインビュー

### 1.4 APIルート
- `/app/api/projects/route.ts` - プロジェクト管理API（tenantIdを使用）

### 1.5 その他
- `/app/app.tsx` - TenantProviderを初期化
- `/app/layout.tsx` - AppInitializerを通じてTenantProviderを適用
- `/app/page.tsx` - ホームページでテナント切り替えリンクを表示

## 2. テナント機能に依存しているコンポーネント

### 2.1 useTenant フックを使用
- `/app/tenant-switch/page.tsx`
- `/app/dashboard/individual-contractor/page.tsx`

### 2.2 TenantProvider を使用
- `/app/app.tsx` - ルートレベルでTenantProviderを設定

### 2.3 テナント関連の型を使用
- `/app/api/projects/route.ts` - Project型を使用
- `/components/individual-contractor/Dashboard.tsx` - Project, TransactionWithProject, MonthlyStats型を使用

## 3. 削除時の影響範囲

### 3.1 データベースへの影響
- `projects`コレクション - tenantId、tenantTypeフィールドを使用
- 将来的に追加される可能性のあるコレクション（quick_entries、tenant_settings等）

### 3.2 APIへの影響
- `/api/projects` - tenantIdパラメータでフィルタリング
- 認証・認可機能との統合が必要（現在TODOコメントで未実装）

### 3.3 UIへの影響
- ホームページのテナント切り替えボタン
- 1人親方専用ダッシュボード全体
- プロジェクト管理機能全体

### 3.4 ビジネスロジックへの影響
- テナントタイプによる機能の有効/無効切り替え
- UIモードの切り替え（エンタープライズ/シンプル）
- ローカルストレージへのテナント設定保存

## 4. 建設業特化機能

### 4.1 建設業向け勘定科目
- `/lib/construction-accounts.ts` - 建設業向け勘定科目マスタ
  - 材料費、労務費、外注費、安全協力費等の特殊勘定科目
  - キーワードマッチングによる自動仕訳ルール

### 4.2 建設業エージェント
- `/src/agents/construction-agent.ts` - 建設業・1人親方専門のAIエージェント
  - 建設業向け仕訳作成
  - プロジェクト原価計算
  - 青色申告65万円控除要件チェック

### 4.3 建設業向けUI要素
- プロジェクトかんばんビュー - 工事の進捗管理
- タイムラインビュー - 時系列での取引確認
- 現場入力機能（計画中）
- 工事別原価管理

## 5. 削除推奨事項

### 5.1 完全に削除可能なファイル
1. `/types/tenant.ts`
2. `/types/tenant-collections.ts`
3. `/contexts/TenantContext.tsx`
4. `/app/tenant-switch/page.tsx`
5. `/app/dashboard/individual-contractor/page.tsx`
6. `/components/individual-contractor/` ディレクトリ全体

### 5.2 修正が必要なファイル
1. `/app/app.tsx` - TenantProviderの削除
2. `/app/layout.tsx` - 特に変更不要（AppInitializerは残す）
3. `/app/page.tsx` - テナント切り替えボタンの削除（169-175行目）
4. `/app/api/projects/route.ts` - tenantId関連の処理を削除

### 5.3 保持を検討すべき機能
1. `/lib/construction-accounts.ts` - 建設業向け勘定科目（汎用的に使える可能性）
2. `/src/agents/construction-agent.ts` - 建設業向けAIエージェント（オプション機能として）

## 6. 推奨される実装アプローチ

### 6.1 段階的な削除
1. **Phase 1**: UIレベルの削除
   - テナント切り替えボタンの削除
   - 1人親方ダッシュボードへのルーティング削除

2. **Phase 2**: Contextの削除
   - TenantProviderの削除
   - useTenantフックの使用箇所を削除

3. **Phase 3**: 型定義の削除
   - tenant.ts、tenant-collections.tsの削除
   - 関連する型の使用箇所を修正

4. **Phase 4**: 建設業機能の再配置
   - 建設業向け機能を独立したモジュールとして再構成
   - 必要に応じてフィーチャーフラグで管理

### 6.2 代替案
- テナント機能の代わりに、ユーザー設定やプロファイルベースの機能切り替えを実装
- 建設業向け機能は、業界選択オプションとして提供

## 7. リスクと注意事項

1. **データ互換性**: 既存のプロジェクトデータにtenantIdが含まれている場合の移行処理が必要
2. **機能の喪失**: 1人親方向けの特化機能が失われる
3. **将来の拡張性**: マルチテナント対応が必要になった場合の再実装コスト

## 8. 結論

テナント機能は現在、主にUIレベルでの機能切り替えに使用されており、データベースレベルでの本格的なマルチテナント実装はまだ行われていません。そのため、削除は比較的容易に実施可能です。

ただし、建設業向けの特化機能（勘定科目、AIエージェント等）は価値があるため、これらは別の形で保持することを推奨します。