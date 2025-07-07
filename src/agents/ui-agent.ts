import { z } from 'zod';
import { createAgent } from '@mastra/core';
import { spawn } from 'child_process';
import path from 'path';

// UI操作結果のスキーマ
const uiResultSchema = z.object({
  success: z.boolean(),
  operation: z.string(),
  component: z.any().optional(),
  code: z.object({
    html: z.string(),
    css: z.string(),
    js: z.string(),
  }).optional(),
  theme: z.any().optional(),
  dependencies: z.array(z.string()).optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  timestamp: z.string(),
});

// UIエージェントの入力スキーマ
const uiInputSchema = z.object({
  operation: z.enum([
    'generate_form',
    'generate_table',
    'generate_chart',
    'generate_dashboard',
    'generate_receipt_upload',
    'generate_expense_form',
    'apply_theme',
    'generate_report_viewer',
    'generate_ui'
  ]),
  
  // フォーム生成用
  formConfig: z.object({
    formId: z.string(),
    title: z.string(),
    fields: z.array(z.object({
      name: z.string(),
      label: z.string(),
      type: z.enum(['text', 'number', 'date', 'select', 'file', 'checkbox', 'radio']),
      required: z.boolean().optional(),
      placeholder: z.string().optional(),
      options: z.array(z.object({
        value: z.string(),
        label: z.string(),
      })).optional(),
      validation: z.any().optional(),
    })),
    submitLabel: z.string().optional(),
    layout: z.enum(['vertical', 'horizontal', 'grid']).optional(),
  }).optional(),
  
  // テーブル生成用
  tableConfig: z.object({
    tableId: z.string(),
    title: z.string().optional(),
    columns: z.array(z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(['text', 'number', 'date', 'currency', 'action']).optional(),
      sortable: z.boolean().optional(),
      width: z.string().optional(),
      align: z.enum(['left', 'center', 'right']).optional(),
    })),
    data: z.array(z.any()).optional(),
    features: z.object({
      pagination: z.boolean().optional(),
      search: z.boolean().optional(),
      export: z.boolean().optional(),
      selection: z.boolean().optional(),
    }).optional(),
  }).optional(),
  
  // チャート生成用
  chartConfig: z.object({
    chartId: z.string(),
    title: z.string().optional(),
    chartConfig: z.object({
      type: z.enum(['line', 'bar', 'pie', 'doughnut', 'area']),
      data: z.object({
        labels: z.array(z.string()),
        datasets: z.array(z.any()),
      }),
      options: z.any().optional(),
    }),
    size: z.object({
      width: z.string().optional(),
      height: z.string().optional(),
    }).optional(),
  }).optional(),
  
  // ダッシュボード生成用
  dashboardConfig: z.object({
    dashboardId: z.string(),
    title: z.string(),
    layout: z.object({
      columns: z.number().optional(),
      rows: z.union([z.number(), z.literal('auto')]).optional(),
      gap: z.string().optional(),
    }).optional(),
    widgets: z.array(z.object({
      widgetId: z.string(),
      type: z.string(),
      title: z.string(),
      content: z.any(),
      position: z.object({
        column: z.number(),
        row: z.number(),
        columnSpan: z.number().optional(),
        rowSpan: z.number().optional(),
      }),
    })),
  }).optional(),
  
  // 領収書アップロード用
  uploadConfig: z.object({
    uploadId: z.string(),
    mode: z.enum(['printed', 'handwritten']),
    allowedFormats: z.array(z.string()).optional(),
    maxFileSize: z.number().optional(),
  }).optional(),
  
  // 経費フォーム用
  expenseFormConfig: z.object({
    formId: z.string(),
    categories: z.array(z.object({
      value: z.string(),
      label: z.string(),
    })).optional(),
    vendors: z.array(z.string()).optional(),
    enableReceipt: z.boolean().optional(),
  }).optional(),
  
  // テーマ適用用
  themeConfig: z.object({
    themeName: z.string().optional(),
    customTheme: z.any().optional(),
  }).optional(),
  
  // レポートビューワー用
  reportConfig: z.object({
    viewerId: z.string(),
    reportType: z.enum(['monthly', 'quarterly', 'annual', 'tax', 'expense']),
    features: z.object({
      print: z.boolean().optional(),
      export: z.boolean().optional(),
      share: z.boolean().optional(),
    }).optional(),
  }).optional(),
  
  // 汎用UI生成用（領収書処理結果など）
  genericUIConfig: z.object({
    type: z.enum(['receipt_result', 'journal_entry', 'summary_card', 'notification']),
    data: z.any(),
    options: z.any().optional(),
  }).optional(),
});

// MCP Client for UI MCP Server
class UIMCPClient {
  async callTool(toolName: string, args: any): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const mcpServerPath = path.join(__dirname, '../mcp-servers/ui-mcp-server.ts');
        
        // Start MCP server process
        const mcpProcess = spawn('npx', ['tsx', mcpServerPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let responseData = '';
        let errorData = '';

        // Prepare MCP request
        const request = {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args,
          },
        };

        // Send request to MCP server
        mcpProcess.stdin.write(JSON.stringify(request) + '\n');
        mcpProcess.stdin.end();

        // Handle response
        mcpProcess.stdout.on('data', (data) => {
          responseData += data.toString();
        });

        mcpProcess.stderr.on('data', (data) => {
          errorData += data.toString();
        });

        mcpProcess.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`UI MCP Server exited with code ${code}: ${errorData}`));
            return;
          }

          try {
            // Parse response
            const lines = responseData.trim().split('\n');
            let result = null;

            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.result) {
                  result = parsed.result;
                  break;
                }
              } catch (e) {
                continue;
              }
            }

            if (result && result.content && result.content[0]) {
              const content = JSON.parse(result.content[0].text);
              resolve(content);
            } else {
              reject(new Error('Invalid MCP response format'));
            }
          } catch (error) {
            reject(new Error(`Failed to parse MCP response: ${error.message}`));
          }
        });

        mcpProcess.on('error', (error) => {
          reject(new Error(`UI MCP Server process error: ${error.message}`));
        });

        // Timeout
        setTimeout(() => {
          mcpProcess.kill();
          reject(new Error('UI MCP Server request timeout'));
        }, 30000);

      } catch (error) {
        reject(new Error(`UI MCP Client error: ${error.message}`));
      }
    });
  }
}

// UIエージェント定義
export const uiAgent = createAgent({
  id: 'ui-agent',
  name: 'UI Generation Agent with MCP Integration',
  description: 'Generate user interface components and layouts',
  
  inputSchema: uiInputSchema,
  outputSchema: uiResultSchema,
  
  tools: {
    // フォーム生成
    generateForm: {
      description: 'Generate a form UI component',
      execute: async (config) => {
        const mcpClient = new UIMCPClient();
        
        try {
          const result = await mcpClient.callTool('generate_form', config);
          return result;
        } catch (error) {
          throw new Error(`Form generation failed: ${error.message}`);
        }
      },
    },

    // テーブル生成
    generateTable: {
      description: 'Generate a data table component',
      execute: async (config) => {
        const mcpClient = new UIMCPClient();
        
        try {
          const result = await mcpClient.callTool('generate_table', config);
          return result;
        } catch (error) {
          throw new Error(`Table generation failed: ${error.message}`);
        }
      },
    },

    // チャート生成
    generateChart: {
      description: 'Generate a chart visualization',
      execute: async (config) => {
        const mcpClient = new UIMCPClient();
        
        try {
          const result = await mcpClient.callTool('generate_chart', config);
          return result;
        } catch (error) {
          throw new Error(`Chart generation failed: ${error.message}`);
        }
      },
    },

    // ダッシュボード生成
    generateDashboard: {
      description: 'Generate a dashboard layout',
      execute: async (config) => {
        const mcpClient = new UIMCPClient();
        
        try {
          const result = await mcpClient.callTool('generate_dashboard', config);
          return result;
        } catch (error) {
          throw new Error(`Dashboard generation failed: ${error.message}`);
        }
      },
    },

    // 領収書アップロード生成
    generateReceiptUpload: {
      description: 'Generate receipt upload component',
      execute: async (config) => {
        const mcpClient = new UIMCPClient();
        
        try {
          const result = await mcpClient.callTool('generate_receipt_upload', config);
          return result;
        } catch (error) {
          throw new Error(`Receipt upload generation failed: ${error.message}`);
        }
      },
    },

    // 経費フォーム生成
    generateExpenseForm: {
      description: 'Generate expense entry form',
      execute: async (config) => {
        const mcpClient = new UIMCPClient();
        
        try {
          const result = await mcpClient.callTool('generate_expense_form', config);
          return result;
        } catch (error) {
          throw new Error(`Expense form generation failed: ${error.message}`);
        }
      },
    },

    // テーマ適用
    applyTheme: {
      description: 'Apply theme to UI components',
      execute: async (config) => {
        const mcpClient = new UIMCPClient();
        
        try {
          const result = await mcpClient.callTool('apply_theme', config);
          return result;
        } catch (error) {
          throw new Error(`Theme application failed: ${error.message}`);
        }
      },
    },

    // レポートビューワー生成
    generateReportViewer: {
      description: 'Generate report viewer component',
      execute: async (config) => {
        const mcpClient = new UIMCPClient();
        
        try {
          const result = await mcpClient.callTool('generate_report_viewer', config);
          return result;
        } catch (error) {
          throw new Error(`Report viewer generation failed: ${error.message}`);
        }
      },
    },

    // 領収書処理結果UI生成
    generateReceiptResultUI: {
      description: 'Generate UI for receipt processing result',
      execute: async ({ receiptData, ocrResult, accountingResult }) => {
        // 領収書処理結果を表示するUIを生成
        const cardId = `receipt-result-${Date.now()}`;
        
        const html = `
<div class="receipt-result-card" id="${cardId}">
  <div class="card-header">
    <h3>領収書処理結果</h3>
    <span class="status-badge success">処理完了</span>
  </div>
  
  <div class="card-body">
    <div class="info-grid">
      <div class="info-item">
        <label>店舗名</label>
        <span>${ocrResult.vendor_name}</span>
      </div>
      <div class="info-item">
        <label>日付</label>
        <span>${ocrResult.date}</span>
      </div>
      <div class="info-item">
        <label>金額</label>
        <span class="amount">¥${ocrResult.total_amount.toLocaleString()}</span>
      </div>
      <div class="info-item">
        <label>カテゴリ</label>
        <span>${accountingResult.category}</span>
      </div>
    </div>
    
    <div class="journal-entries">
      <h4>仕訳</h4>
      <table class="journal-table">
        <thead>
          <tr>
            <th>借方</th>
            <th>金額</th>
            <th>貸方</th>
            <th>金額</th>
          </tr>
        </thead>
        <tbody>
          ${accountingResult.entries.map((entry: any) => `
          <tr>
            <td>${entry.debit_account || ''}</td>
            <td>${entry.debit || 0}</td>
            <td>${entry.credit_account || ''}</td>
            <td>${entry.credit || 0}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>
  
  <div class="card-actions">
    <button class="btn-primary" onclick="saveReceipt('${cardId}')">保存</button>
    <button class="btn-secondary" onclick="editReceipt('${cardId}')">編集</button>
  </div>
</div>`;

        const css = `
.receipt-result-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #E5E7EB;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.success {
  background: #D1FAE5;
  color: #065F46;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.info-item label {
  display: block;
  font-size: 12px;
  color: #6B7280;
  margin-bottom: 4px;
}

.amount {
  font-size: 20px;
  font-weight: 600;
  color: #1F2937;
}

.journal-table {
  width: 100%;
  border-collapse: collapse;
}

.journal-table th,
.journal-table td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #E5E7EB;
}`;

        const js = `
function saveReceipt(cardId) {
  // Save receipt data
  console.log('Saving receipt:', cardId);
}

function editReceipt(cardId) {
  // Edit receipt data
  console.log('Editing receipt:', cardId);
}`;

        return {
          success: true,
          component: {
            id: cardId,
            type: 'card',
            props: { receiptData, ocrResult, accountingResult },
          },
          code: { html, css, js },
          message: 'Receipt result UI generated',
        };
      },
    },
  },
  
  // メイン実行ロジック
  execute: async ({ input, tools }) => {
    try {
      console.log('🎨 [UI Agent] Starting UI operation:', input.operation);

      switch (input.operation) {
        case 'generate_form': {
          if (!input.formConfig) {
            throw new Error('Form configuration is required');
          }

          const result = await tools.generateForm(input.formConfig);

          return {
            success: result.success,
            operation: 'generate_form',
            component: result.component,
            code: result.code,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'generate_table': {
          if (!input.tableConfig) {
            throw new Error('Table configuration is required');
          }

          const result = await tools.generateTable(input.tableConfig);

          return {
            success: result.success,
            operation: 'generate_table',
            component: result.component,
            code: result.code,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'generate_chart': {
          if (!input.chartConfig) {
            throw new Error('Chart configuration is required');
          }

          const result = await tools.generateChart(input.chartConfig);

          return {
            success: result.success,
            operation: 'generate_chart',
            component: result.component,
            code: result.code,
            dependencies: result.dependencies,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'generate_dashboard': {
          if (!input.dashboardConfig) {
            throw new Error('Dashboard configuration is required');
          }

          const result = await tools.generateDashboard(input.dashboardConfig);

          return {
            success: result.success,
            operation: 'generate_dashboard',
            component: result.component,
            code: result.code,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'generate_receipt_upload': {
          if (!input.uploadConfig) {
            throw new Error('Upload configuration is required');
          }

          const result = await tools.generateReceiptUpload(input.uploadConfig);

          return {
            success: result.success,
            operation: 'generate_receipt_upload',
            component: result.component,
            code: result.code,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'generate_expense_form': {
          if (!input.expenseFormConfig) {
            throw new Error('Expense form configuration is required');
          }

          const result = await tools.generateExpenseForm(input.expenseFormConfig);

          return {
            success: result.success,
            operation: 'generate_expense_form',
            component: result.component,
            code: result.code,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'apply_theme': {
          if (!input.themeConfig) {
            throw new Error('Theme configuration is required');
          }

          const result = await tools.applyTheme(input.themeConfig);

          return {
            success: result.success,
            operation: 'apply_theme',
            theme: result.theme,
            code: { css: result.css, html: '', js: '' },
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'generate_report_viewer': {
          if (!input.reportConfig) {
            throw new Error('Report configuration is required');
          }

          const result = await tools.generateReportViewer(input.reportConfig);

          return {
            success: result.success,
            operation: 'generate_report_viewer',
            component: result.component,
            code: result.code,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'generate_ui': {
          if (!input.genericUIConfig) {
            throw new Error('UI configuration is required');
          }

          // 汎用UI生成処理
          switch (input.genericUIConfig.type) {
            case 'receipt_result':
              const result = await tools.generateReceiptResultUI({
                receiptData: input.genericUIConfig.data.receipt,
                ocrResult: input.genericUIConfig.data.ocr,
                accountingResult: input.genericUIConfig.data.accounting,
              });
              
              return {
                success: result.success,
                operation: 'generate_ui',
                component: result.component,
                code: result.code,
                message: result.message,
                timestamp: new Date().toISOString(),
              };
              
            default:
              throw new Error(`Unknown UI type: ${input.genericUIConfig.type}`);
          }
        }

        default:
          throw new Error(`Unknown operation: ${input.operation}`);
      }

    } catch (error) {
      console.error('❌ [UI Agent] Operation failed:', error);
      return {
        success: false,
        operation: input.operation || 'unknown',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },
});

export default uiAgent;