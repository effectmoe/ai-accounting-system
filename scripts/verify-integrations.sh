#!/bin/bash

# Vercel統合の検証スクリプト
# 作成日: 2025-07-18

echo "=== Vercel統合検証スクリプト ==="
echo ""

# カラー定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 環境変数の確認関数
check_env_var() {
    local var_name=$1
    local var_value=$(grep "^$var_name=" .env.local 2>/dev/null | cut -d'=' -f2-)
    
    if [ -z "$var_value" ]; then
        echo -e "${RED}❌ $var_name: 未設定${NC}"
        return 1
    else
        # 値の一部を隠す
        if [[ "$var_name" == *"KEY"* ]] || [[ "$var_name" == *"SECRET"* ]]; then
            masked_value="${var_value:0:10}...${var_value: -4}"
            echo -e "${GREEN}✅ $var_name: $masked_value${NC}"
        elif [[ "$var_name" == *"URI"* ]]; then
            # MongoDB URIの場合、ホスト部分のみ表示
            if [[ "$var_value" == *"mongodb"* ]]; then
                host=$(echo "$var_value" | sed -E 's|mongodb(\+srv)?://[^@]+@([^/]+).*|\2|')
                echo -e "${GREEN}✅ $var_name: mongodb://...@$host/...${NC}"
            else
                echo -e "${GREEN}✅ $var_name: 設定済み${NC}"
            fi
        else
            echo -e "${GREEN}✅ $var_name: $var_value${NC}"
        fi
        return 0
    fi
}

# MongoDB接続テスト関数
test_mongodb_connection() {
    echo ""
    echo "📊 MongoDB接続テスト..."
    
    # node.jsスクリプトを使用して接続テスト
    cat > /tmp/test-mongodb.js << 'EOF'
const { MongoClient } = require('mongodb');

async function testConnection() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URIが設定されていません');
        process.exit(1);
    }
    
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log('✅ MongoDB接続成功！');
        
        // データベース情報の取得
        const db = client.db(process.env.MONGODB_DB_NAME || 'accounting');
        const collections = await db.listCollections().toArray();
        console.log(`📁 データベース: ${db.databaseName}`);
        console.log(`📋 コレクション数: ${collections.length}`);
        
    } catch (error) {
        console.error('❌ MongoDB接続エラー:', error.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

testConnection();
EOF

    # 環境変数を読み込んで実行
    if [ -f ".env.local" ]; then
        export $(grep -v '^#' .env.local | xargs)
        node /tmp/test-mongodb.js 2>/dev/null || echo -e "${YELLOW}⚠️  MongoDB接続テストをスキップ（Node.jsまたはMongoDBドライバーが必要）${NC}"
    fi
    
    rm -f /tmp/test-mongodb.js
}

# メイン処理
echo "1️⃣  環境変数の確認"
echo "===================="

# MongoDB関連
echo ""
echo "📦 MongoDB設定:"
check_env_var "MONGODB_URI"
check_env_var "MONGODB_DB_NAME"
check_env_var "USE_AZURE_MONGODB"

# Perplexity関連
echo ""
echo "🔍 Perplexity設定:"
check_env_var "PERPLEXITY_API_KEY"

# その他の重要な設定
echo ""
echo "🔧 その他の設定:"
check_env_var "DEEPSEEK_API_KEY"
check_env_var "MASTRA_API_SECRET"
check_env_var "AZURE_FORM_RECOGNIZER_ENDPOINT"
check_env_var "AZURE_FORM_RECOGNIZER_KEY"

# MongoDB接続テスト（オプション）
echo ""
echo "2️⃣  接続テスト"
echo "=============="
test_mongodb_connection

# サマリー
echo ""
echo "3️⃣  サマリー"
echo "==========="
echo ""
echo "📝 次のステップ:"
echo "1. 未設定の環境変数がある場合は、Vercel統合ページで設定してください"
echo "2. vercel env pull .env.local を実行して最新の環境変数を取得してください"
echo "3. npm run dev でアプリケーションを起動して動作確認してください"
echo ""
echo "🔗 統合URL:"
echo "- MongoDB Atlas: https://vercel.com/effectmoes-projects/~/integrations/mongodbatlas"
echo "- Perplexity API: https://vercel.com/effectmoes-projects/~/integrations/pplx-api"