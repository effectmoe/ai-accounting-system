"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentAgent = void 0;
const core_1 = require("@mastra/core");
const github_integration_1 = require("@/services/github-integration");
/**
 * デプロイメント自動化エージェント
 * ビルドエラーの検出、修正、自動デプロイを行う
 */
class DeploymentAgent extends core_1.Agent {
    name = 'deployment-agent';
    description = 'Vercelデプロイメントの監視と自動修正を行うエージェント';
    githubService;
    constructor() {
        super();
        this.githubService = new github_integration_1.GitHubIntegration({
            token: process.env.GITHUB_TOKEN || '',
            owner: process.env.GITHUB_OWNER || 'effectmoe',
            repo: process.env.GITHUB_REPO || 'ai-accounting-system',
        });
    }
    /**
     * ビルドエラーを分析して修正案を生成
     */
    async analyzeBuildError(errorLog) {
        // エラーログからファイル名とエラータイプを抽出
        const moduleNotFoundPattern = /Module not found: Can't resolve '([^']+)'/g;
        const files = [];
        const suggestedFixes = [];
        let match;
        while ((match = moduleNotFoundPattern.exec(errorLog)) !== null) {
            const missingModule = match[1];
            // インポートパスの修正提案
            if (missingModule.startsWith('@/src/')) {
                const correctedPath = missingModule.replace('@/src/', '@/');
                suggestedFixes.push({
                    file: 'tsconfig.json or import statements',
                    changes: `Change "${missingModule}" to "${correctedPath}"`,
                    description: 'Remove "src/" from import path',
                });
            }
            // 不足しているサービスファイルの検出
            if (missingModule.includes('service') && !missingModule.includes('node_modules')) {
                const serviceName = missingModule.split('/').pop()?.replace('.ts', '');
                suggestedFixes.push({
                    file: missingModule.replace('@/', '') + '.ts',
                    changes: `Create service file for ${serviceName}`,
                    description: `Missing service file needs to be created`,
                });
            }
        }
        return {
            errorType: 'Module Resolution Error',
            files,
            suggestedFixes,
        };
    }
    /**
     * Vercelビルドログを取得
     */
    async getVercelBuildLog(deploymentId) {
        // Vercel APIを使用してビルドログを取得
        const response = await fetch(`https://api.vercel.com/v2/deployments/${deploymentId}/events`, {
            headers: {
                Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
            },
        });
        if (!response.ok) {
            throw new Error('Failed to fetch Vercel build log');
        }
        const events = await response.json();
        return events.map((e) => e.text).join('\n');
    }
    /**
     * 自動修正を実行
     */
    async executeAutoFix(fixes) {
        for (const fix of fixes) {
            console.log(`Applying fix to ${fix.file}: ${fix.changes}`);
            // ファイルの内容を取得
            const content = await this.githubService.getFileContent(fix.file);
            // 修正を適用（簡単な文字列置換の例）
            let modifiedContent = content;
            if (fix.changes.includes('Change "') && fix.changes.includes('" to "')) {
                const [, oldStr, newStr] = fix.changes.match(/Change "(.*)" to "(.*)"/) || [];
                if (oldStr && newStr) {
                    modifiedContent = content.replace(new RegExp(oldStr, 'g'), newStr);
                }
            }
            // 修正をコミット
            await this.githubService.createCommit(`Fix: ${fix.changes}`, [{ path: fix.file, content: modifiedContent }]);
        }
    }
    /**
     * デプロイメントの監視と自動修正
     */
    async monitorAndFix(deploymentUrl) {
        try {
            // デプロイメントIDを抽出
            const deploymentId = deploymentUrl.split('/').pop();
            if (!deploymentId) {
                throw new Error('Invalid deployment URL');
            }
            // ビルドログを取得
            const buildLog = await this.getVercelBuildLog(deploymentId);
            // エラーを分析
            const analysis = await this.analyzeBuildError(buildLog);
            if (analysis.suggestedFixes.length > 0) {
                console.log('Found errors, attempting auto-fix...');
                // 修正を実行
                await this.executeAutoFix(analysis.suggestedFixes.map(fix => ({
                    file: fix.file,
                    changes: fix.changes,
                })));
                console.log('Auto-fix completed. New deployment will be triggered automatically.');
                return {
                    success: true,
                    fixesApplied: analysis.suggestedFixes.length,
                    message: 'Errors fixed and new deployment triggered',
                };
            }
            return {
                success: true,
                fixesApplied: 0,
                message: 'No errors found in deployment',
            };
        }
        catch (error) {
            console.error('Auto-fix failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * エージェントの実行
     */
    async run(input) {
        switch (input.action) {
            case 'monitor':
                return this.monitorAndFix(input.params.deploymentUrl);
            case 'analyze':
                return this.analyzeBuildError(input.params.errorLog);
            default:
                throw new Error(`Unknown action: ${input.action}`);
        }
    }
}
exports.DeploymentAgent = DeploymentAgent;
