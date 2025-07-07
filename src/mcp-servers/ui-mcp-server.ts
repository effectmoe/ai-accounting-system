#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// UI要素の型定義
interface UIComponent {
  id: string;
  type: 'form' | 'table' | 'chart' | 'card' | 'modal' | 'dashboard';
  props: Record<string, any>;
  children?: UIComponent[];
  events?: Record<string, string>;
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'file' | 'checkbox' | 'radio';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

interface TableColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'action';
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area';
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string;
    }>;
  };
  options?: Record<string, any>;
}

interface DashboardLayout {
  grid: {
    columns: number;
    rows: number;
    gap: string;
  };
  widgets: Array<{
    id: string;
    component: UIComponent;
    position: {
      column: number;
      row: number;
      columnSpan?: number;
      rowSpan?: number;
    };
  }>;
}

// UI MCP Server
class UIMCPServer {
  private server: Server;
  private components: Map<string, UIComponent> = new Map();
  private themes: Map<string, any> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'ui-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.initializeThemes();
    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private initializeThemes(): void {
    // デフォルトテーマ設定
    this.themes.set('default', {
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
        success: '#10B981',
        background: '#FFFFFF',
        surface: '#F3F4F6',
        text: '#1F2937',
        textSecondary: '#6B7280',
      },
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
        },
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        full: '9999px',
      },
    });

    // 日本向けテーマ
    this.themes.set('japanese', {
      colors: {
        primary: '#DC2626', // 赤
        secondary: '#1E40AF', // 藍色
        error: '#DC2626',
        warning: '#F59E0B',
        info: '#3B82F6',
        success: '#059669',
        background: '#FFFFFF',
        surface: '#F9FAFB',
        text: '#111827',
        textSecondary: '#6B7280',
      },
      typography: {
        fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
        },
      },
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[UI MCP Server] Error:', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'generate_form',
            description: 'Generate a form UI component',
            inputSchema: {
              type: 'object',
              properties: {
                formId: { type: 'string' },
                title: { type: 'string' },
                fields: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      label: { type: 'string' },
                      type: { type: 'string' },
                      required: { type: 'boolean' },
                      placeholder: { type: 'string' },
                      options: { type: 'array' },
                      validation: { type: 'object' },
                    },
                  },
                },
                submitLabel: { type: 'string' },
                layout: {
                  type: 'string',
                  enum: ['vertical', 'horizontal', 'grid'],
                },
              },
              required: ['formId', 'title', 'fields'],
            },
          },
          {
            name: 'generate_table',
            description: 'Generate a data table UI component',
            inputSchema: {
              type: 'object',
              properties: {
                tableId: { type: 'string' },
                title: { type: 'string' },
                columns: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      key: { type: 'string' },
                      label: { type: 'string' },
                      type: { type: 'string' },
                      sortable: { type: 'boolean' },
                      width: { type: 'string' },
                      align: { type: 'string' },
                    },
                  },
                },
                data: { type: 'array' },
                features: {
                  type: 'object',
                  properties: {
                    pagination: { type: 'boolean' },
                    search: { type: 'boolean' },
                    export: { type: 'boolean' },
                    selection: { type: 'boolean' },
                  },
                },
              },
              required: ['tableId', 'columns'],
            },
          },
          {
            name: 'generate_chart',
            description: 'Generate a chart visualization component',
            inputSchema: {
              type: 'object',
              properties: {
                chartId: { type: 'string' },
                title: { type: 'string' },
                chartConfig: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['line', 'bar', 'pie', 'doughnut', 'area'],
                    },
                    data: {
                      type: 'object',
                      properties: {
                        labels: { type: 'array' },
                        datasets: { type: 'array' },
                      },
                    },
                    options: { type: 'object' },
                  },
                },
                size: {
                  type: 'object',
                  properties: {
                    width: { type: 'string' },
                    height: { type: 'string' },
                  },
                },
              },
              required: ['chartId', 'chartConfig'],
            },
          },
          {
            name: 'generate_dashboard',
            description: 'Generate a dashboard layout with widgets',
            inputSchema: {
              type: 'object',
              properties: {
                dashboardId: { type: 'string' },
                title: { type: 'string' },
                layout: {
                  type: 'object',
                  properties: {
                    columns: { type: 'number' },
                    rows: { type: 'number' },
                    gap: { type: 'string' },
                  },
                },
                widgets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      widgetId: { type: 'string' },
                      type: { type: 'string' },
                      title: { type: 'string' },
                      content: { type: 'object' },
                      position: { type: 'object' },
                    },
                  },
                },
              },
              required: ['dashboardId', 'title', 'widgets'],
            },
          },
          {
            name: 'generate_receipt_upload',
            description: 'Generate receipt upload UI component',
            inputSchema: {
              type: 'object',
              properties: {
                uploadId: { type: 'string' },
                mode: {
                  type: 'string',
                  enum: ['printed', 'handwritten'],
                },
                allowedFormats: { type: 'array' },
                maxFileSize: { type: 'number' },
              },
              required: ['uploadId', 'mode'],
            },
          },
          {
            name: 'generate_expense_form',
            description: 'Generate expense entry form for manual input',
            inputSchema: {
              type: 'object',
              properties: {
                formId: { type: 'string' },
                categories: { type: 'array' },
                vendors: { type: 'array' },
                enableReceipt: { type: 'boolean' },
              },
              required: ['formId'],
            },
          },
          {
            name: 'apply_theme',
            description: 'Apply a theme to UI components',
            inputSchema: {
              type: 'object',
              properties: {
                themeName: { type: 'string' },
                customTheme: { type: 'object' },
              },
            },
          },
          {
            name: 'generate_report_viewer',
            description: 'Generate report viewer component',
            inputSchema: {
              type: 'object',
              properties: {
                viewerId: { type: 'string' },
                reportType: {
                  type: 'string',
                  enum: ['monthly', 'quarterly', 'annual', 'tax', 'expense'],
                },
                features: {
                  type: 'object',
                  properties: {
                    print: { type: 'boolean' },
                    export: { type: 'boolean' },
                    share: { type: 'boolean' },
                  },
                },
              },
              required: ['viewerId', 'reportType'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'generate_form':
            return await this.handleGenerateForm(args);
          case 'generate_table':
            return await this.handleGenerateTable(args);
          case 'generate_chart':
            return await this.handleGenerateChart(args);
          case 'generate_dashboard':
            return await this.handleGenerateDashboard(args);
          case 'generate_receipt_upload':
            return await this.handleGenerateReceiptUpload(args);
          case 'generate_expense_form':
            return await this.handleGenerateExpenseForm(args);
          case 'apply_theme':
            return await this.handleApplyTheme(args);
          case 'generate_report_viewer':
            return await this.handleGenerateReportViewer(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
      }
    });
  }

  // Generate form
  private async handleGenerateForm(args: any) {
    const { formId, title, fields, submitLabel = '送信', layout = 'vertical' } = args;

    try {
      const formComponent: UIComponent = {
        id: formId,
        type: 'form',
        props: {
          title,
          layout,
          submitLabel,
          className: 'expense-form',
        },
        children: fields.map((field: FormField) => ({
          id: `${formId}-field-${field.name}`,
          type: 'form',
          props: {
            ...field,
            className: `form-field form-field-${field.type}`,
          },
        })),
        events: {
          onSubmit: `handle${formId}Submit`,
          onValidate: `validate${formId}`,
        },
      };

      // HTML生成
      const html = this.generateFormHTML(formComponent, fields);
      
      // CSS生成
      const css = this.generateFormCSS(layout);
      
      // JavaScript生成
      const js = this.generateFormJS(formId, fields);

      this.components.set(formId, formComponent);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              component: formComponent,
              code: {
                html,
                css,
                js,
              },
              message: 'Form component generated successfully',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Generate table
  private async handleGenerateTable(args: any) {
    const { tableId, title, columns, data = [], features = {} } = args;

    try {
      const tableComponent: UIComponent = {
        id: tableId,
        type: 'table',
        props: {
          title,
          columns,
          data,
          features: {
            pagination: features.pagination ?? true,
            search: features.search ?? true,
            export: features.export ?? false,
            selection: features.selection ?? false,
          },
          className: 'data-table',
        },
        events: {
          onRowClick: `handle${tableId}RowClick`,
          onSort: `handle${tableId}Sort`,
        },
      };

      // HTML生成
      const html = this.generateTableHTML(tableComponent, columns);
      
      // CSS生成
      const css = this.generateTableCSS();
      
      // JavaScript生成（DataTables使用）
      const js = this.generateTableJS(tableId, columns, features);

      this.components.set(tableId, tableComponent);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              component: tableComponent,
              code: {
                html,
                css,
                js,
              },
              message: 'Table component generated successfully',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Generate chart
  private async handleGenerateChart(args: any) {
    const { chartId, title, chartConfig, size = {} } = args;

    try {
      const chartComponent: UIComponent = {
        id: chartId,
        type: 'chart',
        props: {
          title,
          chartConfig,
          width: size.width || '100%',
          height: size.height || '400px',
          className: 'chart-container',
        },
      };

      // HTML生成
      const html = `
<div class="chart-wrapper" id="${chartId}-wrapper">
  ${title ? `<h3 class="chart-title">${title}</h3>` : ''}
  <canvas id="${chartId}" width="${size.width || '100%'}" height="${size.height || '400'}"></canvas>
</div>`;

      // CSS生成
      const css = `
.chart-wrapper {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.chart-title {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1F2937;
}`;

      // JavaScript生成（Chart.js使用）
      const js = `
// Chart initialization for ${chartId}
const ${chartId}Ctx = document.getElementById('${chartId}').getContext('2d');
const ${chartId}Chart = new Chart(${chartId}Ctx, ${JSON.stringify(chartConfig, null, 2)});

// Optional: Add responsiveness
window.addEventListener('resize', () => {
  ${chartId}Chart.resize();
});`;

      this.components.set(chartId, chartComponent);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              component: chartComponent,
              code: {
                html,
                css,
                js,
              },
              dependencies: ['Chart.js v3'],
              message: 'Chart component generated successfully',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Generate dashboard
  private async handleGenerateDashboard(args: any) {
    const { dashboardId, title, layout = { columns: 12, rows: 'auto', gap: '20px' }, widgets } = args;

    try {
      const dashboardComponent: UIComponent = {
        id: dashboardId,
        type: 'dashboard',
        props: {
          title,
          layout,
          className: 'dashboard-container',
        },
        children: widgets.map((widget: any) => ({
          id: widget.widgetId,
          type: 'card',
          props: {
            title: widget.title,
            content: widget.content,
            position: widget.position,
          },
        })),
      };

      // HTML生成
      const html = this.generateDashboardHTML(dashboardId, title, widgets);
      
      // CSS生成（Grid Layout使用）
      const css = this.generateDashboardCSS(layout);
      
      // JavaScript生成
      const js = this.generateDashboardJS(dashboardId, widgets);

      this.components.set(dashboardId, dashboardComponent);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              component: dashboardComponent,
              code: {
                html,
                css,
                js,
              },
              message: 'Dashboard generated successfully',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Generate receipt upload
  private async handleGenerateReceiptUpload(args: any) {
    const { uploadId, mode, allowedFormats = ['jpg', 'jpeg', 'png', 'pdf'], maxFileSize = 10485760 } = args;

    try {
      const uploadComponent: UIComponent = {
        id: uploadId,
        type: 'form',
        props: {
          mode,
          allowedFormats,
          maxFileSize,
          className: 'receipt-upload',
        },
        events: {
          onUpload: `handle${uploadId}Upload`,
          onProcess: `process${mode}Receipt`,
        },
      };

      // HTML生成
      const html = `
<div class="receipt-upload-container" id="${uploadId}">
  <div class="upload-header">
    <h3>${mode === 'printed' ? '印刷領収書アップロード' : '手書き領収書アップロード'}</h3>
    <p class="upload-description">
      ${mode === 'printed' ? 'レシートや印刷された領収書をアップロードしてください' : '手書きの領収書をアップロードしてください'}
    </p>
  </div>
  
  <div class="upload-area" id="${uploadId}-dropzone">
    <input type="file" id="${uploadId}-input" accept="${allowedFormats.map(f => `.${f}`).join(',')}" hidden>
    <svg class="upload-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
    <p class="upload-text">ドラッグ＆ドロップまたはクリックしてファイルを選択</p>
    <p class="upload-info">対応形式: ${allowedFormats.join(', ').toUpperCase()} (最大${(maxFileSize / 1048576).toFixed(0)}MB)</p>
  </div>
  
  <div class="upload-preview" id="${uploadId}-preview" style="display: none;">
    <img id="${uploadId}-preview-image" src="" alt="Preview">
    <div class="preview-info">
      <p id="${uploadId}-filename"></p>
      <button type="button" id="${uploadId}-remove" class="btn-remove">削除</button>
    </div>
  </div>
  
  <button type="button" id="${uploadId}-process" class="btn-primary" disabled>
    ${mode === 'printed' ? 'OCR処理を開始' : '手書き認識を開始'}
  </button>
</div>`;

      // CSS生成
      const css = `
.receipt-upload-container {
  max-width: 600px;
  margin: 0 auto;
}

.upload-area {
  border: 2px dashed #CBD5E1;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #F9FAFB;
}

.upload-area:hover {
  border-color: #3B82F6;
  background: #EFF6FF;
}

.upload-area.dragover {
  border-color: #3B82F6;
  background: #DBEAFE;
}

.upload-icon {
  color: #9CA3AF;
  margin-bottom: 16px;
}

.upload-preview {
  margin: 20px 0;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.upload-preview img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
}`;

      // JavaScript生成
      const js = this.generateReceiptUploadJS(uploadId, mode, allowedFormats, maxFileSize);

      this.components.set(uploadId, uploadComponent);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              component: uploadComponent,
              code: {
                html,
                css,
                js,
              },
              message: 'Receipt upload component generated successfully',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Generate expense form
  private async handleGenerateExpenseForm(args: any) {
    const { formId, categories = [], vendors = [], enableReceipt = true } = args;

    try {
      // 経費入力フォーム用のフィールド定義
      const fields: FormField[] = [
        {
          name: 'expense_date',
          label: '日付',
          type: 'date',
          required: true,
        },
        {
          name: 'vendor_name',
          label: '支払先',
          type: 'text',
          required: true,
          placeholder: '例: 株式会社サンプル',
        },
        {
          name: 'category',
          label: 'カテゴリ',
          type: 'select',
          required: true,
          options: categories.length > 0 ? categories : [
            { value: 'office_supplies', label: '消耗品費' },
            { value: 'travel', label: '旅費交通費' },
            { value: 'entertainment', label: '接待交際費' },
            { value: 'utilities', label: '水道光熱費' },
            { value: 'other', label: 'その他' },
          ],
        },
        {
          name: 'amount',
          label: '金額（税込）',
          type: 'number',
          required: true,
          placeholder: '0',
          validation: {
            min: 1,
          },
        },
        {
          name: 'tax_rate',
          label: '税率',
          type: 'select',
          required: true,
          options: [
            { value: '0.1', label: '10%（標準）' },
            { value: '0.08', label: '8%（軽減）' },
            { value: '0', label: '非課税' },
          ],
        },
        {
          name: 'description',
          label: '摘要',
          type: 'text',
          required: false,
          placeholder: '購入内容や目的を入力',
        },
      ];

      if (enableReceipt) {
        fields.push({
          name: 'receipt_file',
          label: '領収書',
          type: 'file',
          required: false,
        });
      }

      // フォーム生成
      const formResult = await this.handleGenerateForm({
        formId,
        title: '経費入力',
        fields,
        submitLabel: '経費を登録',
        layout: 'vertical',
      });

      return formResult;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Apply theme
  private async handleApplyTheme(args: any) {
    const { themeName, customTheme } = args;

    try {
      let theme;
      
      if (customTheme) {
        theme = customTheme;
        this.themes.set('custom', theme);
      } else {
        theme = this.themes.get(themeName) || this.themes.get('default');
      }

      // CSS変数として出力
      const cssVariables = this.generateCSSVariables(theme);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              theme: {
                name: themeName || 'custom',
                applied: theme,
              },
              css: cssVariables,
              message: 'Theme applied successfully',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Generate report viewer
  private async handleGenerateReportViewer(args: any) {
    const { viewerId, reportType, features = {} } = args;

    try {
      const viewerComponent: UIComponent = {
        id: viewerId,
        type: 'dashboard',
        props: {
          reportType,
          features: {
            print: features.print ?? true,
            export: features.export ?? true,
            share: features.share ?? false,
          },
          className: 'report-viewer',
        },
      };

      // HTML生成
      const html = `
<div class="report-viewer-container" id="${viewerId}">
  <div class="report-header">
    <h2 class="report-title">${this.getReportTitle(reportType)}</h2>
    <div class="report-actions">
      ${features.print !== false ? '<button class="btn-icon" onclick="window.print()"><svg><!-- Print icon --></svg>印刷</button>' : ''}
      ${features.export !== false ? '<button class="btn-icon" onclick="exportReport()"><svg><!-- Export icon --></svg>エクスポート</button>' : ''}
      ${features.share ? '<button class="btn-icon" onclick="shareReport()"><svg><!-- Share icon --></svg>共有</button>' : ''}
    </div>
  </div>
  
  <div class="report-filters">
    <select id="${viewerId}-period" class="form-select">
      <option value="current">今月</option>
      <option value="last">先月</option>
      <option value="quarter">四半期</option>
      <option value="year">年度</option>
    </select>
  </div>
  
  <div class="report-content" id="${viewerId}-content">
    <!-- Report content will be loaded here -->
  </div>
</div>`;

      // CSS生成
      const css = this.generateReportViewerCSS();
      
      // JavaScript生成
      const js = this.generateReportViewerJS(viewerId, reportType);

      this.components.set(viewerId, viewerComponent);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              component: viewerComponent,
              code: {
                html,
                css,
                js,
              },
              message: 'Report viewer generated successfully',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Helper methods
  private generateFormHTML(component: UIComponent, fields: FormField[]): string {
    return `
<form id="${component.id}" class="${component.props.className}">
  <h2>${component.props.title}</h2>
  ${fields.map(field => this.generateFieldHTML(field)).join('\n  ')}
  <div class="form-actions">
    <button type="submit" class="btn-primary">${component.props.submitLabel}</button>
    <button type="reset" class="btn-secondary">リセット</button>
  </div>
</form>`;
  }

  private generateFieldHTML(field: FormField): string {
    const required = field.required ? 'required' : '';
    
    switch (field.type) {
      case 'select':
        return `
  <div class="form-group">
    <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
    <select id="${field.name}" name="${field.name}" ${required}>
      <option value="">選択してください</option>
      ${field.options?.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('\n      ')}
    </select>
  </div>`;
      
      default:
        return `
  <div class="form-group">
    <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
    <input 
      type="${field.type}" 
      id="${field.name}" 
      name="${field.name}" 
      placeholder="${field.placeholder || ''}"
      ${required}
      ${field.validation?.min ? `min="${field.validation.min}"` : ''}
      ${field.validation?.max ? `max="${field.validation.max}"` : ''}
    >
  </div>`;
    }
  }

  private generateFormCSS(layout: string): string {
    return `
.expense-form {
  max-width: ${layout === 'horizontal' ? '800px' : '600px'};
  margin: 0 auto;
  padding: 24px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 16px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3B82F6;
  color: white;
}

.btn-primary:hover {
  background: #2563EB;
}

.btn-secondary {
  background: #E5E7EB;
  color: #374151;
}`;
  }

  private generateFormJS(formId: string, fields: FormField[]): string {
    return `
// Form handling for ${formId}
document.getElementById('${formId}').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  
  // Validation
  ${fields.filter(f => f.validation).map(f => `
  if (data.${f.name} && ${JSON.stringify(f.validation)}) {
    // Apply validation rules
  }`).join('')}
  
  try {
    // Submit to backend
    const response = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      alert('経費を登録しました');
      e.target.reset();
    }
  } catch (error) {
    alert('エラーが発生しました');
  }
});`;
  }

  private generateTableHTML(component: UIComponent, columns: TableColumn[]): string {
    return `
<div class="${component.props.className}">
  ${component.props.title ? `<h2>${component.props.title}</h2>` : ''}
  <table id="${component.id}" class="display" style="width:100%">
    <thead>
      <tr>
        ${columns.map(col => `<th>${col.label}</th>`).join('\n        ')}
      </tr>
    </thead>
    <tbody>
      <!-- Data will be loaded dynamically -->
    </tbody>
  </table>
</div>`;
  }

  private generateTableCSS(): string {
    return `
.data-table {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.data-table h2 {
  margin: 0 0 20px 0;
  color: #1F2937;
}`;
  }

  private generateTableJS(tableId: string, columns: TableColumn[], features: any): string {
    return `
// DataTable initialization for ${tableId}
$(document).ready(function() {
  $('#${tableId}').DataTable({
    columns: ${JSON.stringify(columns.map(col => ({ data: col.key, type: col.type })))},
    responsive: true,
    language: {
      url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Japanese.json'
    },
    ${features.pagination !== false ? 'paging: true,' : 'paging: false,'}
    ${features.search !== false ? 'searching: true,' : 'searching: false,'}
    ${features.export ? `
    dom: 'Bfrtip',
    buttons: ['copy', 'csv', 'excel', 'pdf', 'print'],` : ''}
  });
});`;
  }

  private generateDashboardHTML(dashboardId: string, title: string, widgets: any[]): string {
    return `
<div class="dashboard-container" id="${dashboardId}">
  <div class="dashboard-header">
    <h1>${title}</h1>
  </div>
  <div class="dashboard-grid">
    ${widgets.map(widget => `
    <div class="dashboard-widget" style="grid-column: span ${widget.position.columnSpan || 1}; grid-row: span ${widget.position.rowSpan || 1};">
      <div class="widget-content">
        <h3>${widget.title}</h3>
        <div id="${widget.widgetId}">
          <!-- Widget content -->
        </div>
      </div>
    </div>`).join('\n    ')}
  </div>
</div>`;
  }

  private generateDashboardCSS(layout: any): string {
    return `
.dashboard-container {
  padding: 24px;
  background: #F3F4F6;
  min-height: 100vh;
}

.dashboard-header {
  margin-bottom: 24px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(${layout.columns}, 1fr);
  gap: ${layout.gap};
}

.dashboard-widget {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.widget-content h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #1F2937;
}`;
  }

  private generateDashboardJS(dashboardId: string, widgets: any[]): string {
    return `
// Dashboard initialization for ${dashboardId}
document.addEventListener('DOMContentLoaded', () => {
  // Initialize widgets
  ${widgets.map(widget => `
  // Initialize ${widget.widgetId}
  loadWidget('${widget.widgetId}', ${JSON.stringify(widget.content)});`).join('\n  ')}
});

function loadWidget(widgetId, content) {
  // Load widget content dynamically
  const element = document.getElementById(widgetId);
  if (element) {
    // Render widget based on content type
  }
}`;
  }

  private generateReceiptUploadJS(uploadId: string, mode: string, formats: string[], maxSize: number): string {
    return `
// Receipt upload handling for ${uploadId}
const dropzone = document.getElementById('${uploadId}-dropzone');
const input = document.getElementById('${uploadId}-input');
const preview = document.getElementById('${uploadId}-preview');
const processBtn = document.getElementById('${uploadId}-process');

// Drag and drop
dropzone.addEventListener('click', () => input.click());

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});

input.addEventListener('change', (e) => {
  handleFiles(e.target.files);
});

function handleFiles(files) {
  if (files.length === 0) return;
  
  const file = files[0];
  const ext = file.name.split('.').pop().toLowerCase();
  
  // Validate file
  if (!${JSON.stringify(formats)}.includes(ext)) {
    alert('対応していないファイル形式です');
    return;
  }
  
  if (file.size > ${maxSize}) {
    alert('ファイルサイズが大きすぎます');
    return;
  }
  
  // Show preview
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('${uploadId}-preview-image').src = e.target.result;
      document.getElementById('${uploadId}-filename').textContent = file.name;
      preview.style.display = 'flex';
      processBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }
}

// Process receipt
processBtn.addEventListener('click', async () => {
  const file = input.files[0];
  if (!file) return;
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', '${mode}');
  
  processBtn.disabled = true;
  processBtn.textContent = '処理中...';
  
  try {
    const response = await fetch('/api/receipts/process', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const result = await response.json();
      // Handle OCR result
      console.log('OCR Result:', result);
    }
  } catch (error) {
    alert('処理中にエラーが発生しました');
  } finally {
    processBtn.disabled = false;
    processBtn.textContent = '${mode === 'printed' ? 'OCR処理を開始' : '手書き認識を開始'}';
  }
});`;
  }

  private generateCSSVariables(theme: any): string {
    return `:root {
  /* Colors */
  ${Object.entries(theme.colors).map(([key, value]) => `--color-${key}: ${value};`).join('\n  ')}
  
  /* Typography */
  --font-family: ${theme.typography.fontFamily};
  ${Object.entries(theme.typography.fontSize).map(([key, value]) => `--text-${key}: ${value};`).join('\n  ')}
  
  /* Spacing */
  ${Object.entries(theme.spacing).map(([key, value]) => `--space-${key}: ${value};`).join('\n  ')}
  
  /* Border Radius */
  ${Object.entries(theme.borderRadius).map(([key, value]) => `--radius-${key}: ${value};`).join('\n  ')}
}`;
  }

  private generateReportViewerCSS(): string {
    return `
.report-viewer-container {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.report-title {
  margin: 0;
  font-size: 24px;
  color: #1F2937;
}

.report-actions {
  display: flex;
  gap: 12px;
}

.btn-icon {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid #E5E7EB;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #F9FAFB;
}

.report-filters {
  margin-bottom: 24px;
}

.form-select {
  padding: 8px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  background: white;
}

@media print {
  .report-actions,
  .report-filters {
    display: none;
  }
}`;
  }

  private generateReportViewerJS(viewerId: string, reportType: string): string {
    return `
// Report viewer for ${viewerId}
const reportViewer = {
  currentPeriod: 'current',
  reportType: '${reportType}',
  
  init() {
    document.getElementById('${viewerId}-period').addEventListener('change', (e) => {
      this.currentPeriod = e.target.value;
      this.loadReport();
    });
    
    this.loadReport();
  },
  
  async loadReport() {
    const contentEl = document.getElementById('${viewerId}-content');
    contentEl.innerHTML = '<div class="loading">レポートを読み込み中...</div>';
    
    try {
      const response = await fetch(\`/api/reports/\${this.reportType}?period=\${this.currentPeriod}\`);
      const data = await response.json();
      
      contentEl.innerHTML = this.renderReport(data);
    } catch (error) {
      contentEl.innerHTML = '<div class="error">レポートの読み込みに失敗しました</div>';
    }
  },
  
  renderReport(data) {
    // Render report based on type
    switch(this.reportType) {
      case 'expense':
        return this.renderExpenseReport(data);
      case 'tax':
        return this.renderTaxReport(data);
      default:
        return '<div>レポートを表示</div>';
    }
  },
  
  renderExpenseReport(data) {
    // Expense report rendering logic
    return \`
      <div class="report-summary">
        <h3>経費サマリー</h3>
        <!-- Report content -->
      </div>
    \`;
  },
  
  renderTaxReport(data) {
    // Tax report rendering logic
    return \`
      <div class="report-summary">
        <h3>税務サマリー</h3>
        <!-- Report content -->
      </div>
    \`;
  }
};

reportViewer.init();`;
  }

  private getReportTitle(reportType: string): string {
    const titles: Record<string, string> = {
      monthly: '月次レポート',
      quarterly: '四半期レポート',
      annual: '年次レポート',
      tax: '税務レポート',
      expense: '経費レポート',
    };
    return titles[reportType] || 'レポート';
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('UI MCP Server running on stdio');
  }
}

// Create and run server
const server = new UIMCPServer();
server.run().catch((error) => {
  console.error('Fatal error in UI MCP server:', error);
  process.exit(1);
});