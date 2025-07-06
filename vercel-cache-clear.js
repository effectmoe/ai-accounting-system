// Vercelのキャッシュをクリアするためのダミーファイル
// このファイルを追加することでビルドハッシュが変わり、キャッシュがクリアされます
// デプロイ後は削除可能
const CACHE_CLEAR_TIMESTAMP = Date.now();
console.log('Cache clear triggered at:', CACHE_CLEAR_TIMESTAMP);