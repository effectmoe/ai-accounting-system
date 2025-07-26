import { logger } from '@/lib/logger';
import { createMCPToolLegacyLegacy } from '../../mcp/mcp-tool-adapter';
import { z } from 'zod';
import type { Tool } from '@mastra/core';

/**
 * 会計エージェント用のMCP統合ツール
 * 
 * このモジュールは会計処理に特化した高度なMCPツールを提供します。
 * 複数のMCPサーバーを組み合わせて、より複雑なタスクを実行できます。
 */

// パラメータスキーマ定義
const organizeReceiptsSchema = z.object({
  source_directory: z.string().describe('領収書ファイルのソースディレクトリ'),
  target_directory: z.string().optional().describe('整理先のターゲットディレクトリ'),
});

const searchTaxInfoSchema = z.object({
  topic: z.string().describe('検索する税制トピック（例：インボイス制度、電子帳簿保存法）'),
  save_directory: z.string().optional().describe('レポートの保存先ディレクトリ'),
});

const backupAccountingDocsSchema = z.object({
  source_directory: z.string().describe('バックアップ元ディレクトリ'),
  github_repo: z.string().describe('GitHubリポジトリ（owner/repo形式）'),
  branch: z.string().optional().describe('ブランチ名'),
});

// 結果の型定義
interface OrganizeReceiptsResult {
  success: boolean;
  summary: {
    total_files: number;
    moved_files: number;
    created_directories: number;
    errors: number;
  };
  details: {
    moved: Array<{
      file: string;
      from: string;
      to: string;
      date: string;
    }>;
    created_directories: string[];
    errors: Array<{
      file: string;
      error: string;
    }>;
  };
}

interface SearchTaxInfoResult {
  success: boolean;
  topic: string;
  search_results_count: number;
  ai_analysis_available: boolean;
  report_saved: boolean;
  report_path?: string;
}

interface BackupAccountingDocsResult {
  success: boolean;
  backed_up_files?: number;
  repository?: string;
  branch?: string;
  commit?: any;
  message?: string;
}

/**
 * 領収書ファイルの自動整理ツール
 * 
 * ファイル名から日付を抽出し、年月別のディレクトリに自動整理します。
 * 対応形式: receipt_YYYY-MM-DD_*.pdf など
 */
export const organizeReceiptsTool: Tool = {
  name: 'organize_receipts',
  description: '領収書ファイルを年月別に自動整理します',
  parameters: {
    type: 'object',
    properties: {
      source_directory: { 
        type: 'string', 
        description: '領収書ファイルのソースディレクトリ' 
      },
      target_directory: { 
        type: 'string', 
        description: '整理先のターゲットディレクトリ（省略時はソースディレクトリ内に整理）' 
      },
    },
    required: ['source_directory'],
  },
  handler: async (params: z.infer<typeof organizeReceiptsSchema>): Promise<OrganizeReceiptsResult> => {
    logger.info('[MCPAccounting] 領収書整理開始:', params);
    
    const result: OrganizeReceiptsResult = {
      success: false,
      summary: {
        total_files: 0,
        moved_files: 0,
        created_directories: 0,
        errors: 0,
      },
      details: {
        moved: [],
        created_directories: [],
        errors: [],
      },
    };
    
    try {
      // 1. ソースディレクトリのファイルをリスト
      const listDirTool = createMCPToolLegacyLegacy('filesystem', 'list_directory', 'List directory');
      const files = await listDirTool.handler({ path: params.source_directory });
      
      if (!files.entries || files.entries.length === 0) {
        logger.warn('[MCPAccounting] ソースディレクトリにファイルが見つかりません');
        result.success = true;
        return result;
      }
      
      result.summary.total_files = files.entries.filter((f: any) => f.type === 'file').length;
      logger.debug('[MCPAccounting] 検出されたファイル数:', result.summary.total_files);
      
      // 2. 各ファイルを処理
      const createDirTool = createMCPToolLegacy('filesystem', 'create_directory', 'Create directory');
      const moveFileTool = createMCPToolLegacy('filesystem', 'move_file', 'Move file');
      
      for (const file of files.entries) {
        if (file.type !== 'file') continue;
        
        try {
          // ファイル名から日付を抽出
          const dateMatch = file.name.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (!dateMatch) {
            logger.warn(`[MCPAccounting] 日付を抽出できません: ${file.name}`);
            result.details.errors.push({
              file: file.name,
              error: '日付パターンが見つかりません（YYYY-MM-DD形式が必要）',
            });
            result.summary.errors++;
            continue;
          }
          
          const [, year, month] = dateMatch;
          const targetBase = params.target_directory || params.source_directory;
          const targetDir = `${targetBase}/${year}/${month}`;
          
          // ディレクトリが存在しない場合は作成
          try {
            await createDirTool.handler({ path: targetDir });
            if (!result.details.created_directories.includes(targetDir)) {
              result.details.created_directories.push(targetDir);
              result.summary.created_directories++;
              logger.debug(`[MCPAccounting] ディレクトリ作成: ${targetDir}`);
            }
          } catch (e: any) {
            // ディレクトリが既に存在する場合はエラーを無視
            if (!e.message?.includes('already exists')) {
              throw e;
            }
          }
          
          // ファイルを移動
          const sourcePath = `${params.source_directory}/${file.name}`;
          const destPath = `${targetDir}/${file.name}`;
          
          await moveFileTool.handler({
            source: sourcePath,
            destination: destPath,
          });
          
          result.details.moved.push({
            file: file.name,
            from: sourcePath,
            to: destPath,
            date: `${year}-${month}`,
          });
          result.summary.moved_files++;
          
          logger.info(`[MCPAccounting] ファイル移動完了: ${file.name} → ${year}/${month}/`);
          
        } catch (error) {
          logger.error(`[MCPAccounting] ファイル処理エラー ${file.name}:`, error);
          result.details.errors.push({
            file: file.name,
            error: error instanceof Error ? error.message : '不明なエラー',
          });
          result.summary.errors++;
        }
      }
      
      result.success = true;
      logger.info('[MCPAccounting] 領収書整理完了:', result.summary);
      
    } catch (error) {
      logger.error('[MCPAccounting] 領収書整理エラー:', error);
      throw error;
    }
    
    return result;
  },
};

/**
 * 税制情報の検索と保存ツール
 * 
 * 最新の税制情報をWeb検索とAI分析で調査し、レポートとして保存します。
 * Brave SearchとPerplexity AIを組み合わせて、より正確な情報を提供します。
 */
export const searchTaxInfoTool: Tool = {
  name: 'search_and_save_tax_info',
  description: '最新の税制情報を検索してレポートとして保存します',
  parameters: {
    type: 'object',
    properties: {
      topic: { 
        type: 'string', 
        description: '検索する税制トピック（例：インボイス制度、電子帳簿保存法）' 
      },
      save_directory: { 
        type: 'string', 
        description: 'レポートの保存先ディレクトリ' 
      },
    },
    required: ['topic'],
  },
  handler: async (params: z.infer<typeof searchTaxInfoSchema>): Promise<SearchTaxInfoResult> => {
    logger.info('[MCPAccounting] 税制情報検索開始:', params);
    
    const results = {
      web_search: null as any,
      perplexity_search: null as any,
      saved_report: null as any,
    };
    
    const result: SearchTaxInfoResult = {
      success: false,
      topic: params.topic,
      search_results_count: 0,
      ai_analysis_available: false,
      report_saved: false,
    };
    
    try {
      // 1. Brave Searchで基本情報を収集
      try {
        const webSearchTool = createMCPToolLegacy('search', 'brave_web_search', 'Web search');
        results.web_search = await webSearchTool.handler({
          query: `日本 ${params.topic} 最新情報 ${new Date().getFullYear()}年`,
          max: 10,
        });
        
        result.search_results_count = results.web_search?.web?.results?.length || 0;
        logger.debug('[MCPAccounting] Web検索結果数:', result.search_results_count);
      } catch (e) {
        logger.warn('[MCPAccounting] Web検索失敗:', e);
      }
      
      // 2. Perplexityで詳細な分析
      try {
        const perplexityTool = createMCPToolLegacy('perplexity', 'perplexity_search_web', 'Perplexity search');
        results.perplexity_search = await perplexityTool.handler({
          query: `${params.topic}の詳細な解説と実務上の注意点を教えてください`,
        });
        
        result.ai_analysis_available = !!results.perplexity_search;
        logger.debug('[MCPAccounting] AI分析完了');
      } catch (e) {
        logger.warn('[MCPAccounting] Perplexity検索失敗:', e);
      }
      
      // 3. レポートを作成
      const reportContent = generateTaxInfoReport(params.topic, results);
      
      // 4. レポートを保存
      if (params.save_directory) {
        try {
          const writeFileTool = createMCPToolLegacy('filesystem', 'write_file', 'Write file');
          const fileName = generateReportFileName(params.topic);
          const filePath = `${params.save_directory}/${fileName}`;
          
          await writeFileTool.handler({
            path: filePath,
            content: reportContent,
          });
          
          result.report_saved = true;
          result.report_path = filePath;
          logger.info('[MCPAccounting] レポート保存完了:', filePath);
        } catch (e) {
          logger.error('[MCPAccounting] レポート保存エラー:', e);
        }
      }
      
      result.success = true;
      
    } catch (error) {
      logger.error('[MCPAccounting] 税制情報検索エラー:', error);
      throw error;
    }
    
    return result;
  },
};

/**
 * 会計ドキュメントのバックアップツール
 * 
 * 会計関連ドキュメントをGitHubリポジトリにバックアップします。
 * 日付別に整理して保存し、バージョン管理を実現します。
 */
export const backupAccountingDocsTool: Tool = {
  name: 'backup_accounting_documents',
  description: '会計ドキュメントをGitHubにバックアップします',
  parameters: {
    type: 'object',
    properties: {
      source_directory: { 
        type: 'string', 
        description: 'バックアップ元ディレクトリ' 
      },
      github_repo: { 
        type: 'string', 
        description: 'GitHubリポジトリ（owner/repo形式）' 
      },
      branch: { 
        type: 'string', 
        description: 'ブランチ名' 
      },
    },
    required: ['source_directory', 'github_repo'],
  },
  handler: async (params: z.infer<typeof backupAccountingDocsSchema>): Promise<BackupAccountingDocsResult> => {
    logger.info('[MCPAccounting] 会計ドキュメントバックアップ開始:', params);
    
    try {
      const [owner, repo] = params.github_repo.split('/');
      if (!owner || !repo) {
        throw new Error('GitHubリポジトリはowner/repo形式で指定してください');
      }
      
      const branch = params.branch || 'main';
      
      // 1. ディレクトリ内のファイルをリスト
      const listDirTool = createMCPToolLegacy('filesystem', 'list_directory', 'List directory');
      const files = await listDirTool.handler({ path: params.source_directory });
      
      if (!files.entries || files.entries.length === 0) {
        logger.warn('[MCPAccounting] バックアップするファイルが見つかりません');
        return {
          success: false,
          message: 'バックアップするファイルが見つかりません',
        };
      }
      
      // 2. 各ファイルを読み込んで準備
      const readFileTool = createMCPToolLegacy('filesystem', 'read_file', 'Read file');
      const filesToPush = [];
      const backupDate = new Date().toISOString().split('T')[0];
      
      for (const file of files.entries) {
        if (file.type !== 'file') continue;
        
        try {
          const content = await readFileTool.handler({
            path: `${params.source_directory}/${file.name}`,
          });
          
          filesToPush.push({
            path: `accounting-backup/${backupDate}/${file.name}`,
            content: content,
          });
        } catch (e) {
          logger.warn(`[MCPAccounting] ファイル読み込みエラー ${file.name}:`, e);
        }
      }
      
      // 3. GitHubにプッシュ
      if (filesToPush.length > 0) {
        const pushFilesTool = createMCPToolLegacy('github', 'push_files', 'Push files to GitHub');
        const commitMessage = `会計バックアップ - ${new Date().toLocaleString('ja-JP')}`;
        
        const pushResult = await pushFilesTool.handler({
          owner,
          repo,
          branch,
          message: commitMessage,
          files: filesToPush,
        });
        
        logger.info('[MCPAccounting] バックアップ完了:', {
          files: filesToPush.length,
          repository: params.github_repo,
        });
        
        return {
          success: true,
          backed_up_files: filesToPush.length,
          repository: params.github_repo,
          branch,
          commit: pushResult,
        };
      }
      
      return {
        success: false,
        message: 'バックアップ可能なファイルがありません',
      };
      
    } catch (error) {
      logger.error('[MCPAccounting] バックアップエラー:', error);
      throw error;
    }
  },
};

/**
 * 税制情報レポートを生成
 * @param topic トピック
 * @param searchResults 検索結果
 * @returns レポート内容
 */
function generateTaxInfoReport(topic: string, searchResults: any): string {
  const now = new Date();
  const timestamp = now.toLocaleString('ja-JP');
  
  let report = `# ${topic} 調査レポート

## 作成日時
${timestamp}

## 概要
${topic}に関する最新情報の調査結果をまとめました。

`;

  // Web検索結果
  if (searchResults.web_search?.web?.results?.length > 0) {
    report += `## Web検索結果

`;
    searchResults.web_search.web.results.forEach((result: any, index: number) => {
      report += `### ${index + 1}. ${result.title || '無題'}
- URL: ${result.url}
- 概要: ${result.description || 'なし'}

`;
    });
  } else {
    report += `## Web検索結果
検索結果が見つかりませんでした。

`;
  }

  // AI分析結果
  if (searchResults.perplexity_search) {
    report += `## AI分析結果（Perplexity）

${searchResults.perplexity_search.answer || searchResults.perplexity_search}

`;
  } else {
    report += `## AI分析結果（Perplexity）
分析結果を取得できませんでした。

`;
  }

  report += `## 注意事項
- このレポートは自動生成されました
- 最新の公式情報は必ず国税庁等の公式サイトでご確認ください
- 実務への適用に際しては、専門家にご相談ください

---
Generated by MCP Accounting Tools
`;

  return report;
}

/**
 * レポートファイル名を生成
 * @param topic トピック
 * @returns ファイル名
 */
function generateReportFileName(topic: string): string {
  const sanitizedTopic = topic.replace(/[^a-zA-Z0-9ぁ-んァ-ヶー一-龠]/g, '_');
  const date = new Date().toISOString().split('T')[0];
  return `tax_report_${sanitizedTopic}_${date}.md`;
}

// すべての会計MCPツールをエクスポート
export const mcpAccountingTools: Tool[] = [
  organizeReceiptsTool,
  searchTaxInfoTool,
  backupAccountingDocsTool,
];