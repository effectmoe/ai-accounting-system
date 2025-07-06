# Supabase × Google Sheets 連携ガイド

## 連携パターン

### 1. MCP経由の連携（推奨）
```javascript
// Supabaseからデータ取得
const data = await MCPService.supabase.select('journal_entries', {
  month: '2025-01'
});

// Google Sheetsに書き込み
for (const row of data) {
  await MCPService.gdrive.updateCell({
    fileId: 'sheet-id',
    range: `A${rowIndex}:E${rowIndex}`,
    value: [row.date, row.description, row.debit, row.credit, row.amount]
  });
}
```

### 2. GAS経由の自動同期
```javascript
// GASで定期実行スクリプト
function syncFromSupabase() {
  const response = UrlFetchApp.fetch('https://your-api/supabase-data');
  const data = JSON.parse(response.getContentText());
  
  const sheet = SpreadsheetApp.getActiveSheet();
  data.forEach((row, i) => {
    sheet.getRange(i+2, 1, 1, 5).setValues([[
      row.date, row.description, row.debit, row.credit, row.amount
    ]]);
  });
}
```

## メリット
- ✅ **リアルタイム共有**: 経理担当者とリアルタイムで共有
- ✅ **Excel互換**: 税理士への提出が簡単
- ✅ **グラフ機能**: Googleスプレッドシートの強力な可視化
- ✅ **無料**: 追加コストなし
- ✅ **計算式**: 複雑な集計も可能

## デメリット
- ❌ セル数の制限（1000万セル）
- ❌ 大量データの処理速度
- ❌ バージョン管理が弱い