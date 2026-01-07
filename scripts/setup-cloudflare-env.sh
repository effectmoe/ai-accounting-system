#!/bin/bash

# Cloudflare Pages 環境変数設定スクリプト
# Usage: ./scripts/setup-cloudflare-env.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== Cloudflare Pages 環境変数設定 ===${NC}"
echo -e "${YELLOW}プロジェクト名: ai-accounting-system${NC}"
echo ""
echo -e "${BLUE}注意: 各環境変数について、値を入力するプロンプトが表示されます${NC}"
echo -e "${BLUE}値は .env.local からコピーしてください${NC}"
echo ""
read -p "続行しますか？ (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
  echo "キャンセルしました"
  exit 0
fi

# 環境変数リスト（.env.localから取得）
ENV_VARS=(
  "DATAFORSEO_API_KEY"
  "DEEPSEEK_API_KEY"
  "ENABLE_OCR"
  "FIRECRAWL_API_KEY"
  "GAS_OCR_URL"
  "GAS_SCRIPT_ID"
  "GAS_WEBHOOK_URL"
  "GITHUB_BRANCH"
  "GITHUB_OWNER"
  "GITHUB_REPO"
  "GITHUB_TOKEN"
  "GMAIL_CLIENT_ID"
  "GMAIL_CLIENT_SECRET"
  "GMAIL_REFRESH_TOKEN"
  "GMAIL_USER"
  "GOOGLE_CLIENT_EMAIL"
  "GOOGLE_CLIENT_ID"
  "GOOGLE_CLIENT_SECRET"
  "GOOGLE_CLOUD_PROJECT_ID"
  "GOOGLE_DRIVE_OCR_FOLDER_ID"
  "GOOGLE_PRIVATE_KEY"
  "GOOGLE_PRIVATE_KEY_ID"
  "MIDSCENE_API_KEY"
  "MIDSCENE_CHROME_EXTENSION_ID"
  "MONGODB_URI"
  "NEXT_PUBLIC_SENTRY_DSN"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_USE_AZURE_MONGODB"
  "NEXTAUTH_SECRET"
  "NEXTAUTH_URL"
  "NLWEB_API_KEY"
  "NLWEB_SITE_URL"
  "OLLAMA_MODEL"
  "OLLAMA_URL"
  "OLLAMA_VISION_MODEL"
  "PERPLEXITY_API_KEY"
  "SENTRY_ORG"
  "SENTRY_PROJECT"
  "SITE_PASSWORD"
  "SQUARE_ACCESS_TOKEN"
  "SQUARE_APPLICATION_ID"
  "SQUARE_ENVIRONMENT"
  "SUPABASE_SERVICE_ROLE_KEY"
  "TRACKING_WORKER_URL"
  "VERCEL_OIDC_TOKEN"
)

TOTAL=${#ENV_VARS[@]}
CURRENT=0

echo ""
echo -e "${GREEN}合計 ${TOTAL} 個の環境変数を設定します${NC}"
echo ""

for VAR_NAME in "${ENV_VARS[@]}"; do
  CURRENT=$((CURRENT + 1))
  echo -e "${YELLOW}[${CURRENT}/${TOTAL}] ${VAR_NAME} を設定しています...${NC}"

  # .env.localから現在の値を取得（参照用）
  CURRENT_VALUE=$(grep "^${VAR_NAME}=" .env.local 2>/dev/null | cut -d '=' -f2- || echo "")

  if [ -n "$CURRENT_VALUE" ]; then
    # 値の最初の20文字だけ表示（セキュリティのため）
    PREVIEW=$(echo "$CURRENT_VALUE" | cut -c 1-20)
    echo -e "${BLUE}現在の値（参考）: ${PREVIEW}...${NC}"
  fi

  # Cloudflare Pages環境変数設定
  echo "$CURRENT_VALUE" | wrangler pages secret put "$VAR_NAME" --project-name=ai-accounting-system

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ ${VAR_NAME} 設定完了${NC}"
  else
    echo -e "${YELLOW}⚠️  ${VAR_NAME} の設定をスキップしました${NC}"
  fi

  echo ""
done

echo ""
echo -e "${GREEN}=== 環境変数設定完了 ===${NC}"
echo -e "${BLUE}設定内容を確認するには:${NC}"
echo "  wrangler pages secret list --project-name=ai-accounting-system"
