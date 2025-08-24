#!/bin/bash

# Mastra Agent Execution Script
# AAM会計システム - Mastraエージェント実行ツール

echo "================================================"
echo "AAM会計システム - Mastraエージェント実行ツール"
echo "================================================"
echo ""

# 実行可能なエージェントリスト
echo "利用可能なエージェント:"
echo "1. accounting-agent - 会計処理"
echo "2. customer-agent - 顧客管理"
echo "3. database-agent - データベース操作"
echo "4. deployment-agent - デプロイメント"
echo "5. japan-tax-agent - 日本税務処理"
echo "6. ocr-agent - OCR処理"
echo "7. problem-solving-agent - 問題解決"
echo "8. product-agent - 製品管理"
echo "9. refactor-agent - コードリファクタリング"
echo "10. ui-agent - UI開発"
echo "11. construction-agent - システム構築"
echo "12. web-scraper-agent - Webスクレイピング"
echo ""

# エージェント選択
read -p "実行するエージェント番号を入力してください (1-12): " agent_choice

# タスク入力
echo ""
read -p "実行するタスクを入力してください: " task

# エージェント名マッピング
case $agent_choice in
    1) agent_name="accountingAgent";;
    2) agent_name="customerAgent";;
    3) agent_name="databaseAgent";;
    4) agent_name="deploymentAgent";;
    5) agent_name="japanTaxAgent";;
    6) agent_name="ocrAgent";;
    7) agent_name="problemSolvingAgent";;
    8) agent_name="productAgent";;
    9) agent_name="refactorAgent";;
    10) agent_name="uiAgent";;
    11) agent_name="constructionAgent";;
    12) agent_name="webScraperAgent";;
    *) echo "無効な選択です"; exit 1;;
esac

echo ""
echo "実行中: $agent_name"
echo "タスク: $task"
echo ""

# ローカルMastraサーバーで実行
npm run mastra:agent -- --agent "$agent_name" --task "$task"