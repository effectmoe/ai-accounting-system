#!/bin/bash
# GAS手動実行用のテストスクリプト

echo "Google Apps Scriptプロジェクトを開いています..."
echo ""
echo "プロジェクトURL:"
echo "https://script.google.com/d/AKfycbzKFGiF14PPGpMaTxPDtKc8CNDkAdyZx_98m7bGBBHRdp8oDvD_VS65AjYs5CGiboQ/edit"
echo ""

# URLを自動で開く（macOS）
open "https://script.google.com/d/AKfycbzKFGiF14PPGpMaTxPDtKc8CNDkAdyZx_98m7bGBBHRdp8oDvD_VS65AjYs5CGiboQ/edit"

echo "手順:"
echo "1. 上記URLが開いたら、コードエディタのすべてのコードを削除"
echo "2. /Users/tonychustudio/Documents/aam-orchestration/accounting-automation/docs/gas-ocr-webhook.gs の内容をコピー"
echo "3. GASエディタに貼り付けて保存（Cmd+S）"
echo "4. 関数ドロップダウンから 'testOCRManually' を選択"
echo "5. '実行' ボタンをクリック"
echo ""
echo "コードファイルを開きますか？ (y/n)"
read -r answer

if [ "$answer" = "y" ]; then
  open -a "Visual Studio Code" "/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/docs/gas-ocr-webhook.gs"
fi