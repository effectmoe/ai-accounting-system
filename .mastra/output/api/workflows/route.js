export async function GET() {
  return Response.json({
    workflows: [
      { id: "accounting-workflow", name: "Accounting Workflow", description: "会計処理ワークフロー" },
      { id: "compliance-workflow", name: "Compliance Workflow", description: "コンプライアンスワークフロー" },
      { id: "invoice-processing-workflow", name: "Invoice Processing Workflow", description: "請求書処理ワークフロー" },
      { id: "deployment-workflow", name: "Deployment Workflow", description: "デプロイメントワークフロー" }
    ]
  });
}