import { Octokit } from '@octokit/rest';
import { throttling } from '@octokit/plugin-throttling';
import { retry } from '@octokit/plugin-retry';

import { logger } from '@/lib/logger';
// GitHubクライアントの設定
const MyOctokit = Octokit.plugin(throttling, retry);

export interface MastraLog {
  id: string;
  type: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  context?: any;
  timestamp: string;
}

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch?: string;
  logsPath?: string;
}

export class GitHubIntegration {
  private octokit: Octokit;
  private config: GitHubConfig;

  constructor(token: string, config: GitHubConfig) {
    this.octokit = new MyOctokit({
      auth: token,
      throttle: {
        onRateLimit: (retryAfter: number, options: any) => {
          logger.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
          return true;
        },
        onSecondaryRateLimit: (retryAfter: number, options: any) => {
          logger.warn(`Abuse detected for request ${options.method} ${options.url}`);
          return true;
        },
      },
    });

    this.config = {
      branch: 'main',
      logsPath: 'logs',
      ...config,
    };
  }

  /**
   * ログをGitHubに保存
   */
  async saveLogs(logs: MastraLog[]): Promise<{ sha: string; url: string }> {
    try {
      const date = new Date();
      const fileName = `mastra-logs-${date.toISOString().split('T')[0]}.json`;
      const filePath = `${this.config.logsPath}/${fileName}`;

      // 既存のファイルを取得または新規作成
      let existingLogs: MastraLog[] = [];
      let sha: string | undefined;

      try {
        const { data } = await this.octokit.repos.getContent({
          owner: this.config.owner,
          repo: this.config.repo,
          path: filePath,
          ref: this.config.branch,
        });

        if ('content' in data && data.type === 'file') {
          const content = Buffer.from(data.content, 'base64').toString('utf-8');
          existingLogs = JSON.parse(content);
          sha = data.sha;
        }
      } catch (error: any) {
        if (error.status !== 404) {
          throw error;
        }
        // ファイルが存在しない場合は新規作成
      }

      // ログを追加
      const updatedLogs = [...existingLogs, ...logs];
      const content = JSON.stringify(updatedLogs, null, 2);
      const contentBase64 = Buffer.from(content).toString('base64');

      // ファイルを作成または更新
      const { data } = await this.octokit.repos.createOrUpdateFileContents({
        owner: this.config.owner,
        repo: this.config.repo,
        path: filePath,
        message: `Update logs: ${logs.length} new entries`,
        content: contentBase64,
        branch: this.config.branch,
        sha,
      });

      return {
        sha: data.commit.sha,
        url: data.content?.html_url || '',
      };
    } catch (error) {
      logger.error('GitHub save error:', error);
      throw new Error(`Failed to save logs to GitHub: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ログを取得
   */
  async getLogs(date?: string): Promise<MastraLog[]> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const fileName = `mastra-logs-${targetDate}.json`;
      const filePath = `${this.config.logsPath}/${fileName}`;

      const { data } = await this.octokit.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path: filePath,
        ref: this.config.branch,
      });

      if ('content' in data && data.type === 'file') {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return JSON.parse(content);
      }

      return [];
    } catch (error: any) {
      if (error.status === 404) {
        return [];
      }
      logger.error('GitHub get error:', error);
      throw new Error(`Failed to get logs from GitHub: ${error.message}`);
    }
  }

  /**
   * ワークフローをトリガー
   */
  async triggerWorkflow(workflowId: string, inputs?: Record<string, any>): Promise<void> {
    try {
      await this.octokit.actions.createWorkflowDispatch({
        owner: this.config.owner,
        repo: this.config.repo,
        workflow_id: workflowId,
        ref: this.config.branch || 'main',
        inputs,
      });
    } catch (error) {
      logger.error('Workflow trigger error:', error);
      throw new Error(`Failed to trigger workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * リポジトリ情報を取得
   */
  async getRepoInfo(): Promise<any> {
    try {
      const { data } = await this.octokit.repos.get({
        owner: this.config.owner,
        repo: this.config.repo,
      });
      return data;
    } catch (error) {
      logger.error('Get repo info error:', error);
      throw new Error(`Failed to get repository info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 最新のコミットを取得
   */
  async getLatestCommit(): Promise<{ sha: string; message: string; author: string; date: string }> {
    try {
      const { data } = await this.octokit.repos.listCommits({
        owner: this.config.owner,
        repo: this.config.repo,
        sha: this.config.branch,
        per_page: 1,
      });

      if (data.length === 0) {
        throw new Error('No commits found');
      }

      const commit = data[0];
      return {
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author?.name || 'Unknown',
        date: commit.commit.author?.date || new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Get latest commit error:', error);
      throw new Error(`Failed to get latest commit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// シングルトンインスタンス
let githubIntegration: GitHubIntegration | null = null;

/**
 * GitHubインテグレーションのインスタンスを取得
 */
export function getGitHubIntegration(): GitHubIntegration {
  if (!githubIntegration) {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!token || !owner || !repo) {
      throw new Error('GitHub configuration is missing. Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables.');
    }

    githubIntegration = new GitHubIntegration(token, {
      owner,
      repo,
      branch: process.env.GITHUB_BRANCH || 'main',
      logsPath: process.env.GITHUB_LOGS_PATH || 'logs',
    });
  }

  return githubIntegration;
}