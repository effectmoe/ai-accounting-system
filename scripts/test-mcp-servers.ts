#!/usr/bin/env tsx

/**
 * MCP Servers Integration Test
 * 新しく実装されたMCPサーバーの統合テスト
 */

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';

interface MCPServerTest {
  name: string;
  serverPath: string;
  testTools: string[];
  expectedCapabilities: string[];
  timeout: number;
}

const MCP_SERVER_TESTS: MCPServerTest[] = [
  {
    name: 'ML Analytics MCP Server',
    serverPath: './src/mcp-servers/ml-analytics-mcp-server.ts',
    testTools: ['ml_analyze', 'ml_health_check', 'ml_quick_analysis', 'ml_predict', 'ml_detect_anomalies', 'ml_cluster'],
    expectedCapabilities: ['machine learning', 'data analysis', 'anomaly detection', 'prediction', 'clustering'],
    timeout: 10000,
  },
  {
    name: 'WebSocket MCP Server',
    serverPath: './src/mcp-servers/websocket-mcp-server.ts',
    testTools: ['websocket_start_server', 'websocket_get_stats', 'websocket_send_progress', 'websocket_health_check'],
    expectedCapabilities: ['real-time notifications', 'progress updates', 'session management'],
    timeout: 8000,
  },
  {
    name: 'Enhanced Firecrawl MCP Server',
    serverPath: './src/mcp-servers/enhanced-firecrawl-mcp-server.ts',
    testTools: ['firecrawl_scrape', 'firecrawl_analyze_competitor', 'firecrawl_bulk_scrape', 'firecrawl_health_check'],
    expectedCapabilities: ['web scraping', 'competitor analysis', 'data extraction'],
    timeout: 15000,
  },
  {
    name: 'MCP Coordinator',
    serverPath: './src/mcp-servers/mcp-coordinator.ts',
    testTools: ['mcp_list_servers', 'mcp_health_check', 'mcp_get_capabilities', 'mcp_system_overview'],
    expectedCapabilities: ['server management', 'health monitoring', 'request routing'],
    timeout: 8000,
  },
];

class MCPServerTester {
  private testResults: Map<string, any> = new Map();

  async runAllTests(): Promise<void> {
    console.log('🧪 MCP Servers Integration Test');
    console.log('=' .repeat(60));

    const testPromises = MCP_SERVER_TESTS.map(test => this.testMCPServer(test));
    const results = await Promise.allSettled(testPromises);

    // 結果の集計
    let passedTests = 0;
    let failedTests = 0;

    results.forEach((result, index) => {
      const testName = MCP_SERVER_TESTS[index].name;
      
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          passedTests++;
          console.log(`✅ ${testName}: PASSED`);
        } else {
          failedTests++;
          console.log(`❌ ${testName}: FAILED - ${result.value.error}`);
        }
      } else {
        failedTests++;
        console.log(`❌ ${testName}: ERROR - ${result.reason}`);
      }
    });

    // 最終結果
    console.log('\n📊 Test Summary');
    console.log('-'.repeat(30));
    console.log(`Total Tests: ${MCP_SERVER_TESTS.length}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / MCP_SERVER_TESTS.length) * 100).toFixed(1)}%`);

    if (failedTests === 0) {
      console.log('\n🎉 All MCP servers are working correctly!');
    } else {
      console.log('\n⚠️ Some MCP servers need attention.');
    }

    // 詳細結果の表示
    console.log('\n📋 Detailed Results');
    console.log('-'.repeat(30));
    this.testResults.forEach((result, serverName) => {
      console.log(`\n${serverName}:`);
      console.log(`  Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
      console.log(`  Tools Available: ${result.toolsAvailable || 'N/A'}`);
      console.log(`  Health Status: ${result.healthStatus || 'Unknown'}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      if (result.responseTime) {
        console.log(`  Response Time: ${result.responseTime}ms`);
      }
    });
  }

  private async testMCPServer(test: MCPServerTest): Promise<{ success: boolean; error?: string }> {
    const startTime = Date.now();
    
    try {
      console.log(`\n🔍 Testing ${test.name}...`);

      // 1. ファイル存在確認
      const serverExists = await this.checkServerFileExists(test.serverPath);
      if (!serverExists) {
        throw new Error(`Server file not found: ${test.serverPath}`);
      }

      // 2. TypeScript構文チェック
      const syntaxValid = await this.checkServerSyntax(test.serverPath);
      if (!syntaxValid) {
        throw new Error('TypeScript syntax errors detected');
      }

      // 3. サーバー起動テスト
      const serverTest = await this.testServerStartup(test);
      
      const responseTime = Date.now() - startTime;
      
      this.testResults.set(test.name, {
        success: serverTest.success,
        toolsAvailable: serverTest.toolsCount,
        healthStatus: serverTest.healthStatus,
        responseTime,
        error: serverTest.error,
      });

      return { success: serverTest.success, error: serverTest.error };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.testResults.set(test.name, {
        success: false,
        responseTime,
        error: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }

  private async checkServerFileExists(serverPath: string): Promise<boolean> {
    try {
      await fs.access(serverPath);
      return true;
    } catch {
      return false;
    }
  }

  private async checkServerSyntax(serverPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const tscProcess = spawn('npx', ['tsc', '--noEmit', '--skipLibCheck', serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let hasErrors = false;

      tscProcess.stderr.on('data', (data) => {
        const output = data.toString();
        if (output.includes('error TS')) {
          hasErrors = true;
        }
      });

      tscProcess.on('close', (code) => {
        resolve(code === 0 && !hasErrors);
      });

      // タイムアウト
      setTimeout(() => {
        tscProcess.kill();
        resolve(false);
      }, 10000);
    });
  }

  private async testServerStartup(test: MCPServerTest): Promise<{
    success: boolean;
    toolsCount?: number;
    healthStatus?: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const serverProcess = spawn('npx', ['tsx', test.serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          WEBSOCKET_PORT: '3002', // テスト用ポート
        },
      });

      let serverOutput = '';
      let serverError = '';
      let toolsDetected = 0;
      let healthCheckPassed = false;

      // 標準出力の監視
      serverProcess.stdout.on('data', (data) => {
        serverOutput += data.toString();
        
        // ツールの検出
        test.testTools.forEach(tool => {
          if (serverOutput.includes(tool)) {
            toolsDetected++;
          }
        });

        // ヘルスチェックの検出
        if (serverOutput.includes('running on stdio') || 
            serverOutput.includes('server started') ||
            serverOutput.includes('MCP Server')) {
          healthCheckPassed = true;
        }
      });

      // エラー出力の監視
      serverProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        serverError += errorOutput;
        
        // 正常なログメッセージも stderr に出力される場合がある
        if (errorOutput.includes('running on stdio') || 
            errorOutput.includes('server started')) {
          healthCheckPassed = true;
        }
      });

      // プロセス終了の監視
      serverProcess.on('close', (code) => {
        resolve({
          success: false,
          error: `Server exited with code ${code}. Error: ${serverError}`,
        });
      });

      // サーバー起動後の簡易テスト
      setTimeout(() => {
        // JSON-RPCリクエストのテスト
        const listToolsRequest = JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {},
        }) + '\n';

        try {
          serverProcess.stdin.write(listToolsRequest);
        } catch (error) {
          // 書き込みエラーは無視（サーバーが正しく動作していない可能性）
        }

        // 結果の評価
        setTimeout(() => {
          serverProcess.kill();
          
          const success = healthCheckPassed && toolsDetected >= test.testTools.length / 2;
          
          resolve({
            success,
            toolsCount: toolsDetected,
            healthStatus: healthCheckPassed ? 'healthy' : 'unhealthy',
            error: success ? undefined : `Health check failed. Tools detected: ${toolsDetected}/${test.testTools.length}`,
          });
        }, 3000); // 3秒後に評価
      }, 2000); // 2秒後にテスト開始

      // タイムアウト
      setTimeout(() => {
        serverProcess.kill();
        resolve({
          success: false,
          error: `Test timed out after ${test.timeout}ms`,
        });
      }, test.timeout);
    });
  }

  async testMCPConfiguration(): Promise<void> {
    console.log('\n🔧 Testing MCP Configuration');
    console.log('-'.repeat(30));

    try {
      // mcp-servers.json の検証
      const configPath = './mcp-servers.json';
      const configExists = await this.checkServerFileExists(configPath);
      
      if (!configExists) {
        console.log('❌ mcp-servers.json not found');
        return;
      }

      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);

      // 新しいサーバーの設定確認
      const expectedServers = [
        'ml-analytics-server',
        'websocket-server', 
        'enhanced-firecrawl-server',
        'mcp-coordinator'
      ];

      let configuredServers = 0;
      expectedServers.forEach(serverName => {
        if (config.mcpServers && config.mcpServers[serverName]) {
          console.log(`✅ ${serverName}: Configured`);
          configuredServers++;
        } else {
          console.log(`❌ ${serverName}: Not configured`);
        }
      });

      console.log(`\nConfiguration Status: ${configuredServers}/${expectedServers.length} servers configured`);

      // 環境変数の確認
      console.log('\n🌍 Environment Variables Check');
      const requiredEnvVars = [
        'MONGODB_URI',
        'DEEPSEEK_API_KEY',
      ];

      const optionalEnvVars = [
        'ANTHROPIC_API_KEY',
        'OPENAI_API_KEY', 
        'PERPLEXITY_API_KEY',
        'FIRECRAWL_API_KEY',
        'WEBSOCKET_PORT',
      ];

      requiredEnvVars.forEach(envVar => {
        if (process.env[envVar]) {
          console.log(`✅ ${envVar}: Set`);
        } else {
          console.log(`❌ ${envVar}: Missing (Required)`);
        }
      });

      optionalEnvVars.forEach(envVar => {
        if (process.env[envVar]) {
          console.log(`✅ ${envVar}: Set`);
        } else {
          console.log(`⚠️ ${envVar}: Missing (Optional)`);
        }
      });

    } catch (error) {
      console.log(`❌ Configuration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// メイン実行
async function runMCPServerTests() {
  const tester = new MCPServerTester();
  
  try {
    await tester.testMCPConfiguration();
    await tester.runAllTests();
    
    console.log('\n🏁 MCP Server testing completed');
    
  } catch (error) {
    console.error('❌ MCP Server testing failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMCPServerTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { MCPServerTester, runMCPServerTests };