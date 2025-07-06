# Supabase × Notion 連携ガイド

## 連携パターン

### 1. Notion API経由
```javascript
// Notion MCPサーバーを使用
const notionData = data.map(entry => ({
  parent: { database_id: 'notion-db-id' },
  properties: {
    '日付': { date: { start: entry.date } },
    '摘要': { title: [{ text: { content: entry.description } }] },
    '借方': { number: entry.debit_amount },
    '貸方': { number: entry.credit_amount },
    'ステータス': { select: { name: entry.status } }
  }
}));

await NotionMCP.createPages(notionData);
```

### 2. Make/Zapier経由
- Supabaseのwebhook → Make/Zapier → Notion
- ノーコードで設定可能

## メリット
- ✅ **リッチなUI**: カンバンビュー、タイムライン表示
- ✅ **ドキュメント統合**: 議事録や資料と一元管理
- ✅ **タスク管理**: 承認フローの実装が簡単
- ✅ **AI機能**: NotionAIでの分析・要約
- ✅ **テンプレート**: 豊富な会計テンプレート

## デメリット
- ❌ 有料（チーム利用時）
- ❌ 計算機能が弱い
- ❌ Excel出力が面倒
- ❌ 税理士への共有が困難