# 現在のMongoDB設定

作成日: 2025-07-18

## 現在の接続情報

```
MONGODB_URI=mongodb+srv://accounting-user:Monchan5454%40@accounting-cluster.nld0j20.mongodb.net/accounting?retryWrites=true&w=majority&appName=accounting-cluster
MONGODB_DB_NAME=accounting
```

## 接続詳細

- **ホスト**: accounting-cluster.nld0j20.mongodb.net
- **ユーザー名**: accounting-user
- **パスワード**: Monchan5454@（URLエンコード済み）
- **データベース名**: accounting
- **オプション**: 
  - retryWrites=true
  - w=majority
  - appName=accounting-cluster

## 重要事項

1. 現在のMongoDBはMongoDBクラスタに接続されています
2. パスワードに特殊文字（@）が含まれているため、URLエンコードされています
3. 接続文字列はSupabaseからMongoDBへの移行の一環として設定されています