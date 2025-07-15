# MongoDB移行計画

## 1. 技術スタック
- **MongoDB Atlas**（クラウドホスティング）
- **Prisma** with MongoDB adapter（型安全性）
- **MongoDB Change Streams**（リアルタイム同期）

## 2. スキーマ設計

```javascript
// OCR結果コレクション
{
  _id: ObjectId,
  file_name: String,
  vendor_name: String,
  receipt_date: Date,
  amounts: {
    subtotal: Number,
    tax: Number,
    total: Number,
    payment: Number,
    change: Number
  },
  status: String, // 'pending', 'processed', 'archived'
  linked_document_id: ObjectId,
  created_at: Date,
  updated_at: Date,
  // 柔軟な追加フィールド
  metadata: Object
}

// 文書コレクション
{
  _id: ObjectId,
  document_number: String,
  document_type: String,
  partner_info: {
    name: String,
    company: String,
    phone: String
  },
  amounts: Object,
  status: String,
  created_at: Date,
  updated_at: Date
}
```

## 3. 移行手順

### Phase 1: 並行運用（1週間）
1. MongoDB Atlasセットアップ
2. Prismaスキーマ作成
3. データ同期スクリプト作成
4. 新規データは両方に書き込み

### Phase 2: 読み取り移行（1週間）
1. 読み取りをMongoDBに切り替え
2. Supabaseは書き込みのみ
3. パフォーマンス測定

### Phase 3: 完全移行（1週間）
1. 書き込みもMongoDBに切り替え
2. Supabaseをバックアップとして保持
3. 1ヶ月後にSupabase削除

## 4. 実装例

```typescript
// lib/mongodb.ts
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);

export async function updateOcrStatus(
  id: string, 
  status: string,
  linkedDocId?: string
) {
  const db = client.db('accounting');
  const result = await db.collection('ocr_results').updateOne(
    { _id: new ObjectId(id) },
    { 
      $set: { 
        status,
        linked_document_id: linkedDocId,
        updated_at: new Date()
      }
    }
  );
  
  // Change Streamで自動的にクライアントに反映
  return result;
}
```

## 5. リアルタイム同期

```typescript
// app/api/ocr-results/stream/route.ts
export async function GET() {
  const stream = db.collection('ocr_results').watch();
  
  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const change of stream) {
          controller.enqueue(
            `data: ${JSON.stringify(change)}\n\n`
          );
        }
      }
    }),
    { headers: { 'Content-Type': 'text/event-stream' } }
  );
}
```

## 6. 予想される改善
- 更新の即時反映（< 100ms）
- スキーマの柔軟性向上
- スケーラビリティの向上
- 開発速度の向上

## 7. コスト比較
- Supabase: $25/月（現在）
- MongoDB Atlas: $0〜（M0 Free tier）/ $57/月（M10）

## 8. リスクと対策
- **リスク**: NoSQLの学習曲線
  - **対策**: Prismaで型安全性を確保
- **リスク**: トランザクションの複雑性
  - **対策**: MongoDB 4.0+のACIDトランザクション使用