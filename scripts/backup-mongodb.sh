#!/bin/bash

###############################################################################
# MongoDB 手動バックアップスクリプト
# 用途: 週次での手動バックアップ実行
# 実行方法: ./scripts/backup-mongodb.sh
###############################################################################

set -e

# カラー出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== MongoDB バックアップスクリプト ===${NC}"

# 環境変数の読み込み
if [ ! -f .env.local ]; then
  echo -e "${RED}エラー: .env.local が見つかりません${NC}"
  exit 1
fi

# MONGODB_URIを取得（改行を削除）
MONGODB_URI=$(grep MONGODB_URI .env.local | cut -d '=' -f2- | tr -d '"' | tr -d '\n')

if [ -z "$MONGODB_URI" ]; then
  echo -e "${RED}エラー: MONGODB_URI が設定されていません${NC}"
  exit 1
fi

# バックアップディレクトリの作成
BACKUP_DIR="backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${DATE}"

mkdir -p "${BACKUP_PATH}"

echo -e "${YELLOW}バックアップ先: ${BACKUP_PATH}${NC}"

# mongodumpの実行確認
if ! command -v mongodump &> /dev/null; then
  echo -e "${RED}エラー: mongodump コマンドが見つかりません${NC}"
  echo "MongoDB Database Toolsをインストールしてください："
  echo "  macOS: brew install mongodb/brew/mongodb-database-tools"
  echo "  または: https://www.mongodb.com/try/download/database-tools"
  exit 1
fi

# mongodumpでバックアップ実行
echo -e "${GREEN}バックアップを開始します...${NC}"

mongodump \
  --uri="${MONGODB_URI}" \
  --out="${BACKUP_PATH}" \
  --gzip

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ バックアップが完了しました${NC}"
  echo -e "${GREEN}保存先: ${BACKUP_PATH}${NC}"

  # バックアップサイズを表示
  BACKUP_SIZE=$(du -sh "${BACKUP_PATH}" | cut -f1)
  echo -e "${YELLOW}バックアップサイズ: ${BACKUP_SIZE}${NC}"

  # 古いバックアップの削除（30日以上前）
  echo -e "${YELLOW}古いバックアップを削除しています...${NC}"
  find "${BACKUP_DIR}" -type d -mtime +30 -exec rm -rf {} + 2>/dev/null || true

  echo -e "${GREEN}✓ 完了${NC}"
else
  echo -e "${RED}✗ バックアップが失敗しました${NC}"
  exit 1
fi

# バックアップ一覧を表示
echo ""
echo -e "${YELLOW}=== 既存のバックアップ一覧 ===${NC}"
ls -lht "${BACKUP_DIR}" | head -10
