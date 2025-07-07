import { Octokit } from '@octokit/rest';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch?: string;
}

export interface MastraLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  agent?: string;
  workflow?: string;
  message: string;
  details?: any;
  executionTime?: number;
}

export interface MastraVersion {
  version: string;
  timestamp: string;
  changes: string[];
  agents: string[];
  workflows: string[];
  config: any;
}

export class GitHubIntegration {
  private octokit: Octokit;
  private config: GitHubConfig;

  constructor(config: GitHubConfig) {
    this.config = {
      ...config,
      branch: config.branch || 'main'
    };
    this.octokit = new Octokit({
      auth: config.token,
    });
  }

  // ログをGitHubに保存
  async saveLogs(logs: MastraLog[]) {
    const date = new Date();
    const fileName = `logs/aam-system/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/logs-${date.toISOString().split('T')[0]}.json`;
    
    try {
      // 既存ファイルの取得を試みる
      let existingLogs: MastraLog[] = [];
      let sha: string | undefined;
      
      try {
        const { data } = await this.octokit.repos.getContent({
          owner: this.config.owner,
          repo: this.config.repo,
          path: fileName,
          ref: this.config.branch,
        });
        
        if ('content' in data && data.content) {
          const content = Buffer.from(data.content, 'base64').toString('utf-8');
          existingLogs = JSON.parse(content);
          sha = data.sha;
        }
      } catch (error: any) {
        // ファイルが存在しない場合は新規作成
        if (error.status !== 404) {
          throw error;
        }
      }

      // ログをマージ
      const allLogs = [...existingLogs, ...logs].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // GitHubに保存
      const content = Buffer.from(JSON.stringify(allLogs, null, 2)).toString('base64');
      
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.config.owner,
        repo: this.config.repo,
        path: fileName,
        message: `chore: AAMシステムログを更新 - ${logs.length}件の新規ログ`,
        content,
        branch: this.config.branch,
        sha,
      });

      return { success: true, path: fileName, count: logs.length };
    } catch (error) {
      console.error('GitHub log save error:', error);
      throw error;
    }
  }

  // バージョン情報の保存
  async saveVersion(version: MastraVersion) {
    const fileName = `versions/aam-system/v${version.version}.json`;
    
    try {
      const content = Buffer.from(JSON.stringify(version, null, 2)).toString('base64');
      
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.config.owner,
        repo: this.config.repo,
        path: fileName,
        message: `feat: AAMシステムバージョン ${version.version} をリリース`,
        content,
        branch: this.config.branch,
      });

      // タグも作成
      await this.createTag(`aam-v${version.version}`, version.changes.join('\n'));

      return { success: true, path: fileName, tag: `aam-v${version.version}` };
    } catch (error) {
      console.error('GitHub version save error:', error);
      throw error;
    }
  }

  // エージェント設定のバックアップ
  async backupAgentConfigs(agents: Record<string, any>) {
    const date = new Date().toISOString();
    const fileName = `backups/agents/backup-${date.split('T')[0]}.json`;
    
    try {
      const backup = {
        timestamp: date,
        agents,
        metadata: {
          count: Object.keys(agents).length,
          names: Object.keys(agents),
        }
      };

      const content = Buffer.from(JSON.stringify(backup, null, 2)).toString('base64');
      
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.config.owner,
        repo: this.config.repo,
        path: fileName,
        message: `backup: エージェント設定のバックアップ - ${Object.keys(agents).length}個のエージェント`,
        content,
        branch: this.config.branch,
      });

      return { success: true, path: fileName };
    } catch (error) {
      console.error('GitHub backup error:', error);
      throw error;
    }
  }

  // 統計レポートの生成
  async generateReport(startDate: Date, endDate: Date) {
    try {
      // ログファイルの取得
      const logs: MastraLog[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const fileName = `logs/aam-system/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/logs-${d.toISOString().split('T')[0]}.json`;
        
        try {
          const { data } = await this.octokit.repos.getContent({
            owner: this.config.owner,
            repo: this.config.repo,
            path: fileName,
            ref: this.config.branch,
          });

          if ('content' in data && data.content) {
            const content = Buffer.from(data.content, 'base64').toString('utf-8');
            const dailyLogs = JSON.parse(content);
            logs.push(...dailyLogs);
          }
        } catch (error: any) {
          if (error.status !== 404) {
            console.error(`Error fetching logs for ${fileName}:`, error);
          }
        }
      }

      // 統計を計算
      const stats = {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        totalLogs: logs.length,
        byLevel: {
          info: logs.filter(l => l.level === 'info').length,
          warning: logs.filter(l => l.level === 'warning').length,
          error: logs.filter(l => l.level === 'error').length,
          success: logs.filter(l => l.level === 'success').length,
        },
        byAgent: {} as Record<string, number>,
        byWorkflow: {} as Record<string, number>,
        avgExecutionTime: 0,
        topErrors: [] as { message: string; count: number }[],
      };

      // エージェント別集計
      logs.forEach(log => {
        if (log.agent) {
          stats.byAgent[log.agent] = (stats.byAgent[log.agent] || 0) + 1;
        }
        if (log.workflow) {
          stats.byWorkflow[log.workflow] = (stats.byWorkflow[log.workflow] || 0) + 1;
        }
      });

      // 平均実行時間
      const timeLogs = logs.filter(l => l.executionTime);
      if (timeLogs.length > 0) {
        stats.avgExecutionTime = timeLogs.reduce((sum, l) => sum + (l.executionTime || 0), 0) / timeLogs.length;
      }

      // エラー集計
      const errorMap = new Map<string, number>();
      logs.filter(l => l.level === 'error').forEach(log => {
        const count = errorMap.get(log.message) || 0;
        errorMap.set(log.message, count + 1);
      });
      stats.topErrors = Array.from(errorMap.entries())
        .map(([message, count]) => ({ message, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // レポートを保存
      const reportFileName = `reports/aam-system/report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.json`;
      const content = Buffer.from(JSON.stringify(stats, null, 2)).toString('base64');
      
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.config.owner,
        repo: this.config.repo,
        path: reportFileName,
        message: `report: AAMシステム統計レポート ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
        content,
        branch: this.config.branch,
      });

      return { success: true, stats, path: reportFileName };
    } catch (error) {
      console.error('Report generation error:', error);
      throw error;
    }
  }

  // タグの作成
  private async createTag(tagName: string, message: string) {
    try {
      // 最新のコミットを取得
      const { data: ref } = await this.octokit.git.getRef({
        owner: this.config.owner,
        repo: this.config.repo,
        ref: `heads/${this.config.branch}`,
      });

      // タグオブジェクトを作成
      const { data: tag } = await this.octokit.git.createTag({
        owner: this.config.owner,
        repo: this.config.repo,
        tag: tagName,
        message,
        object: ref.object.sha,
        type: 'commit',
        tagger: {
          name: 'AAM System',
          email: 'aam@example.com',
          date: new Date().toISOString(),
        },
      });

      // タグ参照を作成
      await this.octokit.git.createRef({
        owner: this.config.owner,
        repo: this.config.repo,
        ref: `refs/tags/${tagName}`,
        sha: tag.sha,
      });

      return tag;
    } catch (error: any) {
      // タグが既に存在する場合は無視
      if (error.status !== 422) {
        throw error;
      }
    }
  }

  // 最新バージョンの取得
  async getLatestVersion(): Promise<MastraVersion | null> {
    try {
      const { data: contents } = await this.octokit.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path: 'versions/aam-system',
        ref: this.config.branch,
      });

      if (!Array.isArray(contents)) {
        return null;
      }

      // バージョンファイルをソート
      const versionFiles = contents
        .filter(file => file.name.endsWith('.json'))
        .sort((a, b) => b.name.localeCompare(a.name));

      if (versionFiles.length === 0) {
        return null;
      }

      // 最新バージョンを取得
      const { data } = await this.octokit.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path: versionFiles[0].path,
        ref: this.config.branch,
      });

      if ('content' in data && data.content) {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return JSON.parse(content);
      }

      return null;
    } catch (error) {
      console.error('Get latest version error:', error);
      return null;
    }
  }
}

// シングルトンインスタンス
let githubIntegration: GitHubIntegration | null = null;

export function getGitHubIntegration(): GitHubIntegration {
  if (!githubIntegration) {
    const config: GitHubConfig = {
      token: process.env.GITHUB_TOKEN || '',
      owner: process.env.GITHUB_OWNER || 'tonychustudio',
      repo: process.env.GITHUB_REPO || 'mastra-logs',
      branch: process.env.GITHUB_BRANCH || 'main',
    };
    githubIntegration = new GitHubIntegration(config);
  }
  return githubIntegration;
}