/**
 * システム全体のMongoDB対応ヘルスチェックスクリプト（JavaScript版）
 * すべてのエージェント、ワークフロー、設定のMongoDB対応状況を検証
 */

const fs = require('fs');
const path = require('path');

class SystemHealthChecker {
  constructor() {
    this.results = [];
    console.log('🔍 システムヘルスチェック開始...\n');
  }

  /**
   * すべてのヘルスチェックを実行
   */
  async runAllChecks() {
    try {
      // 1. 環境変数チェック
      this.checkEnvironmentVariables();
      
      // 2. エージェントMongoDB対応チェック
      this.checkAgentMongoDBCompliance();
      
      // 3. ワークフローMongoDB対応チェック
      this.checkWorkflowMongoDBCompliance();
      
      // 4. mastra.config.ts チェック
      this.checkMastraConfig();
      
      // 5. データベースクライアント設定チェック
      this.checkDatabaseClientConfig();
      
      // 6. Supabase残存チェック
      this.checkSupabaseReferences();
      
      // 7. Azure設定チェック
      this.checkAzureConfiguration();

      // 結果表示
      this.displayResults();
      
    } catch (error) {
      console.error('❌ ヘルスチェック実行中にエラー:', error);
    }
  }

  /**
   * 環境変数チェック
   */
  checkEnvironmentVariables() {
    const result = {
      component: 'Environment Variables',
      status: 'PASS',
      details: [],
      errors: []
    };

    const requiredEnvVars = [
      'MONGODB_URI',
      'MONGODB_DB_NAME',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'AZURE_FORM_RECOGNIZER_ENDPOINT',
      'AZURE_FORM_RECOGNIZER_KEY'
    ];

    const deprecatedEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_KEY',
      'GOOGLE_CLOUD_PROJECT_ID',
      'GOOGLE_APPLICATION_CREDENTIALS'
    ];

    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        result.details.push(`✅ ${envVar}: 設定済み`);
      } else {
        result.errors.push(`❌ ${envVar}: 未設定`);
        result.status = 'FAIL';
      }
    }

    for (const envVar of deprecatedEnvVars) {
      if (process.env[envVar]) {
        result.details.push(`⚠️  非推奨変数が残存: ${envVar}`);
        result.status = result.status === 'FAIL' ? 'FAIL' : 'WARNING';
      }
    }

    this.results.push(result);
  }

  /**
   * エージェントのMongoDB対応チェック
   */
  checkAgentMongoDBCompliance() {
    const agentsDir = path.join(__dirname, '../src/agents');
    
    if (!fs.existsSync(agentsDir)) {
      this.results.push({
        component: 'Agents Directory',
        status: 'FAIL',
        details: [],
        errors: [`❌ ディレクトリが存在しません: ${agentsDir}`]
      });
      return;
    }

    const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.ts'));

    for (const agentFile of agentFiles) {
      const result = {
        component: `Agent: ${agentFile}`,
        status: 'PASS',
        details: [],
        errors: []
      };

      try {
        const filePath = path.join(agentsDir, agentFile);
        const content = fs.readFileSync(filePath, 'utf-8');

        // MongoDB対応チェックポイント
        const checks = [
          {
            name: 'DatabaseService import',
            pattern: /import.*DatabaseService.*from.*mongodb-client/,
            required: true
          },
          {
            name: 'Collections import',
            pattern: /import.*Collections.*from.*mongodb-client/,
            required: true
          },
          {
            name: 'Supabase reference',
            pattern: /supabase|createClient|from\('@supabase\/supabase-js'\)/i,
            required: false,
            shouldNotExist: true
          },
          {
            name: 'MongoDB operations',
            pattern: /\.(create|findMany|findOne|updateMany|deleteMany)\(/,
            required: true
          },
          {
            name: 'Deprecated table references',
            pattern: /table\s*:/,
            required: false,
            shouldNotExist: true
          },
          {
            name: 'MongoDB query operators',
            pattern: /\$gte|\$lte|\$regex|\$in|\$ne/,
            required: false
          }
        ];

        for (const check of checks) {
          const matches = content.match(check.pattern);
          
          if (check.shouldNotExist) {
            if (matches) {
              result.errors.push(`❌ ${check.name}: 非推奨のコードが残存`);
              result.status = 'FAIL';
            } else {
              result.details.push(`✅ ${check.name}: クリーンアップ済み`);
            }
          } else if (check.required) {
            if (matches) {
              result.details.push(`✅ ${check.name}: 対応済み`);
            } else {
              result.errors.push(`❌ ${check.name}: 未対応`);
              result.status = 'FAIL';
            }
          } else {
            if (matches) {
              result.details.push(`✅ ${check.name}: 使用中`);
            }
          }
        }

      } catch (error) {
        result.errors.push(`ファイル読み込みエラー: ${error.message}`);
        result.status = 'FAIL';
      }

      this.results.push(result);
    }
  }

  /**
   * ワークフローのMongoDB対応チェック
   */
  checkWorkflowMongoDBCompliance() {
    const workflowsDir = path.join(__dirname, '../src/workflows');
    
    if (!fs.existsSync(workflowsDir)) {
      this.results.push({
        component: 'Workflows Directory',
        status: 'FAIL',
        details: [],
        errors: [`❌ ディレクトリが存在しません: ${workflowsDir}`]
      });
      return;
    }

    const workflowFiles = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.ts'));

    for (const workflowFile of workflowFiles) {
      const result = {
        component: `Workflow: ${workflowFile}`,
        status: 'PASS',
        details: [],
        errors: []
      };

      try {
        const filePath = path.join(workflowsDir, workflowFile);
        const content = fs.readFileSync(filePath, 'utf-8');

        // ワークフロー固有のチェック
        const checks = [
          {
            name: 'Database operations',
            pattern: /operation:\s*['"](?:create|findMany|findOne|updateMany|deleteMany)['"]/,
            required: true
          },
          {
            name: 'Collection references',
            pattern: /collection:\s*['"][^'"]+['"]/,
            required: true
          },
          {
            name: 'Deprecated table operations',
            pattern: /operation:\s*['"](?:insert|select|delete)['"]|table\s*:\s*['"][^'"]+['"]/,
            required: false,
            shouldNotExist: true
          },
          {
            name: 'CamelCase field names',
            pattern: /\w+[A-Z]\w*:/,
            required: false
          },
          {
            name: 'Snake_case field names',
            pattern: /(?:data|filters|options):\s*{[^}]*\w+_\w+:/,
            required: false,
            shouldNotExist: true
          }
        ];

        for (const check of checks) {
          const matches = content.match(new RegExp(check.pattern, 'g'));
          
          if (check.shouldNotExist) {
            if (matches) {
              result.errors.push(`❌ ${check.name}: 非推奨形式が残存 (${matches.length}箇所)`);
              result.status = 'FAIL';
            } else {
              result.details.push(`✅ ${check.name}: 変換済み`);
            }
          } else if (check.required) {
            if (matches) {
              result.details.push(`✅ ${check.name}: 対応済み (${matches.length}箇所)`);
            } else {
              result.errors.push(`❌ ${check.name}: 未対応`);
              result.status = 'FAIL';
            }
          } else {
            if (matches) {
              result.details.push(`✅ ${check.name}: 使用中 (${matches.length}箇所)`);
            }
          }
        }

      } catch (error) {
        result.errors.push(`ファイル読み込みエラー: ${error.message}`);
        result.status = 'FAIL';
      }

      this.results.push(result);
    }
  }

  /**
   * mastra.config.ts チェック
   */
  checkMastraConfig() {
    const result = {
      component: 'Mastra Configuration',
      status: 'PASS',
      details: [],
      errors: []
    };

    try {
      const configPath = path.join(__dirname, '../mastra.config.ts');
      const content = fs.readFileSync(configPath, 'utf-8');

      // 設定チェック
      const checks = [
        {
          name: 'MongoDB integration',
          pattern: /mongodb:\s*{[^}]*client:\s*db/,
          required: true
        },
        {
          name: 'Collections reference',
          pattern: /collections:\s*Collections/,
          required: true
        },
        {
          name: 'Azure Form Recognizer',
          pattern: /azureFormRecognizer:\s*{[^}]*endpoint:/,
          required: true
        },
        {
          name: 'Supabase configuration',
          pattern: /supabase:\s*{/,
          required: false,
          shouldNotExist: true
        }
      ];

      for (const check of checks) {
        const matches = content.match(check.pattern);
        
        if (check.shouldNotExist) {
          if (matches) {
            result.errors.push(`❌ ${check.name}: 非推奨設定が残存`);
            result.status = 'FAIL';
          } else {
            result.details.push(`✅ ${check.name}: 削除済み`);
          }
        } else if (check.required) {
          if (matches) {
            result.details.push(`✅ ${check.name}: 設定済み`);
          } else {
            result.errors.push(`❌ ${check.name}: 未設定`);
            result.status = 'FAIL';
          }
        }
      }

    } catch (error) {
      result.errors.push(`設定ファイル読み込みエラー: ${error.message}`);
      result.status = 'FAIL';
    }

    this.results.push(result);
  }

  /**
   * データベースクライアント設定チェック
   */
  checkDatabaseClientConfig() {
    const result = {
      component: 'Database Client Configuration',
      status: 'PASS',
      details: [],
      errors: []
    };

    try {
      const clientPath = path.join(__dirname, '../lib/mongodb-client.ts');
      const content = fs.readFileSync(clientPath, 'utf-8');

      // Collections定数の確認
      const collectionsMatch = content.match(/export const Collections = {([^}]+)}/s);
      if (collectionsMatch) {
        const collectionsContent = collectionsMatch[1];
        const collectionCount = (collectionsContent.match(/\w+:/g) || []).length;
        result.details.push(`✅ Collections定数: ${collectionCount}個定義済み`);
      } else {
        result.errors.push('❌ Collections定数が見つからない');
        result.status = 'FAIL';
      }

      // DatabaseService クラスの確認
      if (content.includes('export class DatabaseService')) {
        result.details.push('✅ DatabaseService クラス: 定義済み');
      } else {
        result.errors.push('❌ DatabaseService クラスが見つからない');
        result.status = 'FAIL';
      }

      // MongoDB固有メソッドの確認
      const mongoMethods = ['create', 'findMany', 'findOne', 'updateMany', 'deleteMany'];
      for (const method of mongoMethods) {
        if (content.includes(`async ${method}(`) || content.includes(`${method}<T>(`)) {
          result.details.push(`✅ ${method}メソッド: 実装済み`);
        } else {
          result.errors.push(`❌ ${method}メソッド: 未実装`);
          result.status = 'FAIL';
        }
      }

    } catch (error) {
      result.errors.push(`クライアント設定読み込みエラー: ${error.message}`);
      result.status = 'FAIL';
    }

    this.results.push(result);
  }

  /**
   * Supabase残存参照チェック
   */
  checkSupabaseReferences() {
    const result = {
      component: 'Supabase References Cleanup',
      status: 'PASS',
      details: [],
      errors: []
    };

    const searchDirs = [
      '../src/agents',
      '../src/workflows',
      '../lib',
      '../src/services'
    ];

    let totalFiles = 0;
    let filesWithSupabase = 0;

    for (const dir of searchDirs) {
      try {
        const fullDir = path.join(__dirname, dir);
        if (!fs.existsSync(fullDir)) continue;

        const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
        
        for (const file of files) {
          totalFiles++;
          const filePath = path.join(fullDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');

          // Supabase関連の検索パターン（Buffer.fromは除外）
          const supabasePatterns = [
            /import.*supabase/i,
            /from\s+['"]@supabase/i,
            /createClient/i,
            /supabaseUrl/i,
            /supabaseKey/i,
            /\.select\(/,
            /\.insert\(/,
            /\.delete\(/,
            /\.eq\(/,
            /\.gte\(/,
            /\.lte\(/
          ];

          // Supabase固有の.from()をチェック（Buffer.fromを除く）
          if (/\.from\(/.test(content) && !/Buffer\.from\(/.test(content)) {
            supabasePatterns.push(/\.from\(/);
          }

          for (const pattern of supabasePatterns) {
            if (pattern.test(content)) {
              filesWithSupabase++;
              result.errors.push(`❌ ${dir}/${file}: Supabase参照が残存`);
              result.status = 'FAIL';
              break;
            }
          }
        }
      } catch (error) {
        result.errors.push(`ディレクトリスキャンエラー ${dir}: ${error.message}`);
      }
    }

    if (filesWithSupabase === 0) {
      result.details.push(`✅ 全${totalFiles}ファイルからSupabase参照を削除完了`);
    } else {
      result.details.push(`⚠️  ${filesWithSupabase}/${totalFiles}ファイルにSupabase参照が残存`);
    }

    this.results.push(result);
  }

  /**
   * Azure設定チェック
   */
  checkAzureConfiguration() {
    const result = {
      component: 'Azure Configuration',
      status: 'PASS',
      details: [],
      errors: []
    };

    // OCRエージェントのAzure対応チェック
    try {
      const ocrAgentPath = path.join(__dirname, '../src/agents/ocr-agent.ts');
      const content = fs.readFileSync(ocrAgentPath, 'utf-8');

      if (content.includes('AzureKeyCredential')) {
        result.details.push('✅ Azure Form Recognizer: 実装済み');
      } else {
        result.errors.push('❌ Azure Form Recognizer: 未実装');
        result.status = 'FAIL';
      }

      if (content.includes('HandwritingOCR')) {
        result.details.push('✅ HandwritingOCR: フォールバック実装済み');
      } else {
        result.details.push('⚠️  HandwritingOCR: フォールバック未実装');
        result.status = result.status === 'FAIL' ? 'FAIL' : 'WARNING';
      }

      // Google Vision API参照の確認
      if (content.includes('google') && content.includes('vision')) {
        result.errors.push('❌ Google Vision API参照が残存');
        result.status = 'FAIL';
      } else {
        result.details.push('✅ Google Vision API: 削除済み');
      }

    } catch (error) {
      result.errors.push(`OCRエージェント読み込みエラー: ${error.message}`);
      result.status = 'FAIL';
    }

    this.results.push(result);
  }

  /**
   * 結果表示
   */
  displayResults() {
    console.log('\n📊 === ヘルスチェック結果 ===\n');

    let totalPass = 0;
    let totalFail = 0;
    let totalWarning = 0;

    for (const result of this.results) {
      const statusIcon = result.status === 'PASS' ? '✅' : 
                        result.status === 'FAIL' ? '❌' : '⚠️';
      
      console.log(`${statusIcon} ${result.component}: ${result.status}`);
      
      if (result.details.length > 0) {
        result.details.forEach(detail => console.log(`   ${detail}`));
      }
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => console.log(`   ${error}`));
      }
      
      console.log('');

      switch (result.status) {
        case 'PASS': totalPass++; break;
        case 'FAIL': totalFail++; break;
        case 'WARNING': totalWarning++; break;
      }
    }

    console.log('📈 === 総合結果 ===');
    console.log(`✅ 正常: ${totalPass}`);
    console.log(`⚠️  警告: ${totalWarning}`);
    console.log(`❌ 失敗: ${totalFail}`);
    console.log(`📊 全体: ${this.results.length}\n`);

    if (totalFail === 0 && totalWarning === 0) {
      console.log('🎉 すべてのチェックがパスしました！システムはMongoDB対応済みです。');
    } else if (totalFail === 0) {
      console.log('⚠️  警告がありますが、基本的にはMongoDB対応済みです。');
    } else {
      console.log('❌ 重要な問題が検出されました。修正が必要です。');
    }
  }
}

// スクリプト実行
async function main() {
  const checker = new SystemHealthChecker();
  await checker.runAllChecks();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { SystemHealthChecker };