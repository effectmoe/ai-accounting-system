import { mcpManager } from '@/lib/mcp-client';

export class MCPService {
  /**
   * Google Apps Script関連の操作
   */
  static gas = {
    // プロジェクト作成
    createProject: async (title: string) => {
      return await mcpManager.callTool('gas', 'gas_project_create', { title });
    },
    
    // ファイル書き込み
    writeFile: async (path: string, content: string) => {
      return await mcpManager.callTool('gas', 'gas_write', { path, content });
    },
    
    // コード実行
    runCode: async (scriptId: string, jsStatement: string) => {
      return await mcpManager.callTool('gas', 'gas_run', { 
        scriptId, 
        js_statement: jsStatement 
      });
    },
    
    // プロジェクト一覧
    listProjects: async () => {
      return await mcpManager.callTool('gas', 'gas_ls', { path: '' });
    }
  };
  
  /**
   * Google Drive関連の操作
   */
  static gdrive = {
    // ファイル検索
    search: async (query: string) => {
      return await mcpManager.callTool('gdrive', 'gdrive_search', { query });
    },
    
    // ファイル読み取り
    readFile: async (fileId: string) => {
      return await mcpManager.callTool('gdrive', 'gdrive_read_file', { fileId });
    },
    
    // スプレッドシート読み取り
    readSheet: async (spreadsheetId: string, ranges?: string[]) => {
      return await mcpManager.callTool('gdrive', 'gsheets_read', { 
        spreadsheetId, 
        ranges 
      });
    },
    
    // セル更新
    updateCell: async (fileId: string, range: string, value: string) => {
      return await mcpManager.callTool('gdrive', 'gsheets_update_cell', { 
        fileId, 
        range, 
        value 
      });
    }
  };

  /**
   * Google Sheets関連の操作
   */
  static sheets = {
    // スプレッドシート作成
    createSpreadsheet: async (title: string) => {
      return await mcpManager.callTool('gas', 'sheets_create_spreadsheet', { title });
    },
    
    // 値の更新
    updateValues: async (spreadsheetId: string, range: string, values: any[][]) => {
      return await mcpManager.callTool('gas', 'sheets_update_values', {
        spreadsheetId,
        range,
        values
      });
    },
    
    // 値の取得
    getValues: async (spreadsheetId: string, range: string) => {
      return await mcpManager.callTool('gas', 'sheets_get_values', {
        spreadsheetId,
        range
      });
    },
    
    // セルのフォーマット
    formatCells: async (spreadsheetId: string, range: string, format: any) => {
      return await mcpManager.callTool('gas', 'sheets_format_cells', {
        spreadsheetId,
        range,
        format
      });
    },
    
    // 列幅の自動調整
    autoResizeColumns: async (spreadsheetId: string, sheetName: string, startColumn: number, endColumn: number) => {
      return await mcpManager.callTool('gas', 'sheets_auto_resize_columns', {
        spreadsheetId,
        sheetName,
        startColumn,
        endColumn
      });
    }
  };
  
  /**
   * Supabase関連の操作
   */
  static supabase = {
    // クエリ実行
    query: async (query: string) => {
      return await mcpManager.callTool('supabase', 'supabase_query', { query });
    },
    
    // テーブル一覧
    listTables: async () => {
      return await mcpManager.callTool('supabase', 'supabase_list_tables', {});
    },
    
    // データ挿入
    insert: async (table: string, data: any) => {
      return await mcpManager.callTool('supabase', 'supabase_insert', { 
        table, 
        data 
      });
    },
    
    // データ取得
    select: async (table: string, conditions?: any) => {
      return await mcpManager.callTool('supabase', 'supabase_select', { 
        table, 
        conditions 
      });
    }
  };
}

// 使用例
export async function demonstrateMCPUsage() {
  try {
    // GAS: 新規プロジェクト作成
    const project = await MCPService.gas.createProject('AI会計処理スクリプト');
    console.log('Created GAS project:', project);
    
    // GAS: コード書き込み
    await MCPService.gas.writeFile(
      `${(project as any).scriptId}/main`,
      `function processInvoice(data) {
        console.log('Processing invoice:', data);
        return { success: true };
      }`
    );
    
    // Google Drive: ファイル検索
    const files = await MCPService.gdrive.search('請求書');
    console.log('Found files:', files);
    
    // Supabase: データ取得
    const companies = await MCPService.supabase.select('companies');
    console.log('Companies:', companies);
    
  } catch (error) {
    console.error('MCP operation failed:', error);
  }
}