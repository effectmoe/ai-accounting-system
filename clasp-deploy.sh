#!/bin/bash

# Google Apps Script CLIデプロイスクリプト
# clasp（Command Line Apps Script Projects）を使用した自動デプロイ

echo "🚀 Google Apps Script 自動デプロイツール"
echo "=========================================="

# プロジェクト設定
SCRIPT_ID="AKfycbzKFGiF14PPGpMaTxPDtKc8CNDkAdyZx_98m7bGBBHRdp8oDvD_VS65AjYs5CGiboQ"
SOURCE_FILE="/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/docs/gas-ocr-webhook.gs"
PROJECT_NAME="AI会計OCR Web Apps"

# claspがインストールされているか確認
if ! command -v clasp &> /dev/null; then
    echo "❌ claspがインストールされていません"
    echo "以下のコマンドでインストールしてください:"
    echo "npm install -g @google/clasp"
    exit 1
fi

# claspにログインしているか確認
echo "📋 clasp認証状態を確認中..."
if ! clasp login --status &> /dev/null; then
    echo "❌ claspにログインしていません"
    echo "以下のコマンドでログインしてください:"
    echo "clasp login"
    exit 1
fi

# 一時ディレクトリを作成
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo "📂 プロジェクトをクローン中..."
# プロジェクトをクローン
clasp clone "$SCRIPT_ID"

# ファイルが存在するか確認
if [ ! -f "$SOURCE_FILE" ]; then
    echo "❌ ソースファイルが見つかりません: $SOURCE_FILE"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# コードをコピー
echo "📝 新しいコードをコピー中..."
cp "$SOURCE_FILE" "Code.gs"

# アップロード前の確認
echo ""
echo "⚠️  以下の内容でデプロイを実行します:"
echo "  プロジェクト: $PROJECT_NAME"
echo "  スクリプトID: $SCRIPT_ID"
echo "  ソースファイル: $SOURCE_FILE"
echo ""
read -p "続行しますか？ (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ デプロイをキャンセルしました"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# コードをプッシュ
echo "🔄 コードをアップロード中..."
if clasp push; then
    echo "✅ コードのアップロードが完了しました"
else
    echo "❌ アップロードに失敗しました"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# デプロイを作成
echo "🚀 新しいデプロイを作成中..."
DEPLOY_DESCRIPTION="OCR Webhook Update $(date +%Y-%m-%d)"
if clasp deploy -d "$DEPLOY_DESCRIPTION"; then
    echo "✅ デプロイが完了しました"
else
    echo "❌ デプロイに失敗しました"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# 一時ディレクトリをクリーンアップ
cd ..
rm -rf "$TEMP_DIR"

echo ""
echo "=========================================="
echo "✨ デプロイが正常に完了しました！"
echo ""
echo "次のステップ:"
echo "1. Google Apps Scriptエディタでテスト関数を実行"
echo "   - testOCRManually()"
echo "   - testLatestFileInFolder()"
echo ""
echo "2. エディタを開く:"
echo "   https://script.google.com/d/$SCRIPT_ID/edit"
echo ""