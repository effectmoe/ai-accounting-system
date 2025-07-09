import { MongoClient } from 'mongodb';

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// コレクション型定義をエクスポート
export * from './collections';

export {};