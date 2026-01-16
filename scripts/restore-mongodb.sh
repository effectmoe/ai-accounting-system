#!/bin/bash

###############################################################################
# MongoDB リストアスクリプト
# 用途: バックアップからのデータ復元
# 実行方法: ./scripts/restore-mongodb.sh [バックアップディレクトリ]
###############################################################################

set -e

# カラー出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== MongoDB リストアスクリプト ===${NC}"

# 引数チェック
if [ -z "$1" ]; then
  echo -e "${RED}使用方法: $0 [バックアップディレクトリ]${NC}"
  echo ""
  echo -e "${YELLOW}例: $0 backups/mongodb/20250107_150000${NC}"
  echo ""
  echo -e "${YELLOW}利用可能なバックアップ:${NC}"
  ls -lt backups/mongodb/ 2>/dev/null | head -10 || echo "バックアップが見つかりません"
  exit 1
fi

BACKUP_PATH=$1

if [ ! -d "$BACKUP_PATH" ]; then
  echo -e "${RED}エラー: バックアップディレクトリが見つかりません: ${BACKUP_PATH}${NC}"
  exit 1
fi

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

# mongorestoreの実行確認
if ! command -v mongorestore &> /dev/null; then
  echo -e "${RED}エラー: mongorestore コマンドが見つかりません${NC}"
  echo "MongoDB Database Toolsをインストールしてください："
  echo "  macOS: brew install mongodb/brew/mongodb-database-tools"
  exit 1
fi

# 警告表示
echo -e "${RED}⚠️  警告: 既存のデータが上書きされる可能性があります${NC}"
echo -e "${YELLOW}リストア元: ${BACKUP_PATH}${NC}"
echo ""
read -p "本当に実行しますか？ (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo -e "${YELLOW}キャンセルしました${NC}"
  exit 0
fi

# mongorestoreでリストア実行
echo -e "${GREEN}リストアを開始します...${NC}"

mongorestore \
  --uri="${MONGODB_URI}" \
  --gzip \
  --drop \
  "${BACKUP_PATH}"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ リストアが完了しました${NC}"
else
  echo -e "${RED}✗ リストアが失敗しました${NC}"
  exit 1
fi
