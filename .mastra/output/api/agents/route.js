export async function GET() {
  return Response.json({
    agents: [
      { id: "accounting-agent", name: "Accounting Agent", description: "会計処理エージェント" },
      { id: "customer-agent", name: "Customer Agent", description: "顧客管理エージェント" },
      { id: "database-agent", name: "Database Agent", description: "DB操作エージェント" },
      { id: "deployment-agent", name: "Deployment Agent", description: "デプロイエージェント" },
      { id: "japan-tax-agent", name: "Japan Tax Agent", description: "日本税制エージェント" },
      { id: "ocr-agent", name: "OCR Agent", description: "OCRエージェント" },
      { id: "problem-solving-agent", name: "Problem Solving Agent", description: "問題解決エージェント" },
      { id: "product-agent", name: "Product Agent", description: "商品管理エージェント" },
      { id: "refactor-agent", name: "Refactor Agent", description: "リファクタリングエージェント" },
      { id: "ui-agent", name: "UI Agent", description: "UIエージェント" },
      { id: "construction-agent", name: "Construction Agent", description: "建設業エージェント" },
      { id: "web-scraper-agent", name: "Web Scraper Agent", description: "Webスクレイパーエージェント" }
    ]
  });
}