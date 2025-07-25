"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const github_integration_1 = require("@/services/github-integration");
// バージョンの保存
async function POST(request) {
    try {
        const body = await request.json();
        const { version, changes, agents, workflows, config } = body;
        if (!version || !changes || !Array.isArray(changes)) {
            return server_1.NextResponse.json({ error: 'Version and changes are required' }, { status: 400 });
        }
        const versionData = {
            version,
            timestamp: new Date().toISOString(),
            changes,
            agents: agents || [],
            workflows: workflows || [],
            config: config || {}
        };
        const github = (0, github_integration_1.getGitHubIntegration)();
        const result = await github.saveVersion(versionData);
        return server_1.NextResponse.json({
            success: true,
            ...result
        });
    }
    catch (error) {
        console.error('Version save error:', error);
        return server_1.NextResponse.json({
            error: 'Failed to save version',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
// 最新バージョンの取得
async function GET() {
    try {
        const github = (0, github_integration_1.getGitHubIntegration)();
        const version = await github.getLatestVersion();
        if (!version) {
            return server_1.NextResponse.json({
                version: '0.0.0',
                message: 'No version found'
            });
        }
        return server_1.NextResponse.json(version);
    }
    catch (error) {
        console.error('Get version error:', error);
        return server_1.NextResponse.json({
            error: 'Failed to get version',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
