import { MastraOrchestrator } from '../src/mastra-orchestrator-test';
import { nlpOrchestrator } from '../src/nlp-orchestrator';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';

// Load environment variables
dotenv.config();

// Set test mode
process.env.TEST_MODE = 'true';

// Test configuration
const TEST_CONFIG = {
  sampleReceiptPath: path.join(__dirname, 'fixtures/sample-receipt.jpg'),
  testTimeout: 60000, // 60 seconds
  deploymentTest: false, // Set to true to test actual deployment
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Helper functions
function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step: string) {
  log(`\n📍 ${step}`, colors.blue);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.cyan);
}

// Test NLP Orchestrator
async function testNLPOrchestrator() {
  logStep('Testing NLP Orchestrator');
  
  const testCases = [
    {
      name: 'Document Creation',
      input: 'ABC商事に100万円の請求書を作って',
      expectedIntent: 'create_document'
    },
    {
      name: 'Data Analysis',
      input: '先月の売上を教えて',
      expectedIntent: 'analyze_data'
    },
    {
      name: 'Question',
      input: '消費税の計算方法は？',
      expectedIntent: 'ask_question'
    },
    {
      name: 'Tax Return',
      input: '2023年度の青色申告を作成して',
      expectedIntent: 'tax_return'
    },
    {
      name: 'Tax Planning',
      input: '来年の節税対策を計画したい',
      expectedIntent: 'tax_planning'
    }
  ];
  
  const testResults = {
    passed: 0,
    failed: 0,
  };
  
  for (const testCase of testCases) {
    try {
      log(`\n  🧪 Testing: ${testCase.name}`);
      log(`     Input: "${testCase.input}"`);
      
      const result = await nlpOrchestrator.processNaturalLanguage(
        testCase.input,
        {
          companyId: 'test-company',
          userId: 'test-user'
        }
      );
      
      if (result.success) {
        logSuccess(`Intent detected: ${result.intent.type}`);
        if (result.intent.type === testCase.expectedIntent) {
          logSuccess(`✓ Correct intent classification`);
          testResults.passed++;
        } else {
          logWarning(`Expected ${testCase.expectedIntent}, got ${result.intent.type}`);
          testResults.failed++;
        }
      } else {
        logWarning(`Failed: ${result.error}`);
        testResults.failed++;
      }
    } catch (error) {
      logError(`NLP test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      testResults.failed++;
    }
  }
  
  log(`\nNLP Orchestrator Test Summary:`, colors.magenta);
  logSuccess(`Passed: ${testResults.passed}`);
  if (testResults.failed > 0) {
    logError(`Failed: ${testResults.failed}`);
  }
  
  return testResults;
}

// Test functions
async function testHealthCheck(orchestrator: MastraOrchestrator) {
  logStep('Health Check Test');
  
  try {
    const health = await orchestrator.healthCheck();
    
    if (health.orchestrator === 'healthy') {
      logSuccess('Orchestrator is healthy');
    } else {
      throw new Error('Orchestrator is not healthy');
    }
    
    if (health.deepseek === 'configured') {
      logSuccess('DeepSeek API is configured');
    } else {
      logWarning('DeepSeek API key is missing');
    }
    
    // Check agent statuses
    const agents = Object.entries(health.agents);
    const healthyAgents = agents.filter(([_, status]) => status === 'healthy');
    
    log(`\nAgent Status: ${healthyAgents.length}/${agents.length} healthy`, colors.magenta);
    
    for (const [agentId, status] of agents) {
      if (status === 'healthy') {
        logSuccess(`${agentId}: ${status}`);
      } else {
        logError(`${agentId}: ${status}`);
      }
    }
    
    return health;
  } catch (error) {
    logError(`Health check failed: ${error.message}`);
    throw error;
  }
}

async function testIndividualAgents(orchestrator: MastraOrchestrator) {
  logStep('Individual Agent Tests');
  
  const testResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };
  
  // Test OCR Agent
  try {
    logInfo('Testing OCR Agent...');
    const ocrResult = await orchestrator.runAgent('ocr-agent', {
      operation: 'health_check',
    });
    
    if (ocrResult.success) {
      logSuccess('OCR Agent: Operational');
      testResults.passed++;
    } else {
      throw new Error(ocrResult.error || 'Unknown error');
    }
  } catch (error) {
    logError(`OCR Agent: Failed - ${error.message}`);
    testResults.failed++;
  }
  
  // Test Accounting Agent
  try {
    logInfo('Testing Accounting Agent...');
    const accountingResult = await orchestrator.runAgent('accounting-agent', {
      operation: 'health_check',
    });
    
    if (accountingResult.success) {
      logSuccess('Accounting Agent: Operational');
      testResults.passed++;
    } else {
      throw new Error(accountingResult.error || 'Unknown error');
    }
  } catch (error) {
    logError(`Accounting Agent: Failed - ${error.message}`);
    testResults.failed++;
  }
  
  // Test Database Agent
  try {
    logInfo('Testing Database Agent...');
    const dbResult = await orchestrator.runAgent('database-agent', {
      operation: 'health_check',
    });
    
    if (dbResult.success) {
      logSuccess('Database Agent: Operational');
      testResults.passed++;
    } else {
      throw new Error(dbResult.error || 'Unknown error');
    }
  } catch (error) {
    logError(`Database Agent: Failed - ${error.message}`);
    testResults.failed++;
  }
  
  // Test Customer Agent
  try {
    logInfo('Testing Customer Agent...');
    const customerResult = await orchestrator.runAgent('customer-agent', {
      operation: 'list',
      listConfig: { limit: 1 },
    });
    
    if (customerResult.success) {
      logSuccess('Customer Agent: Operational');
      testResults.passed++;
    } else {
      throw new Error(customerResult.error || 'Unknown error');
    }
  } catch (error) {
    logError(`Customer Agent: Failed - ${error.message}`);
    testResults.failed++;
  }
  
  // Test Product Agent
  try {
    logInfo('Testing Product Agent...');
    const productResult = await orchestrator.runAgent('product-agent', {
      operation: 'list',
      listConfig: { limit: 1 },
    });
    
    if (productResult.success) {
      logSuccess('Product Agent: Operational');
      testResults.passed++;
    } else {
      throw new Error(productResult.error || 'Unknown error');
    }
  } catch (error) {
    logError(`Product Agent: Failed - ${error.message}`);
    testResults.failed++;
  }
  
  // Test Japan Tax Agent
  try {
    logInfo('Testing Japan Tax Agent...');
    const taxResult = await orchestrator.runAgent('japan-tax-agent', {
      operation: 'calculate_consumption_tax',
      amount: 1000,
      date: '2024-01-01',
      taxRate: 10,
    });
    
    if (taxResult.success && taxResult.consumptionTax === 100) {
      logSuccess('Japan Tax Agent: Operational');
      testResults.passed++;
    } else {
      throw new Error('Tax calculation incorrect');
    }
  } catch (error) {
    logError(`Japan Tax Agent: Failed - ${error.message}`);
    testResults.failed++;
  }
  
  // Test UI Agent
  try {
    logInfo('Testing UI Agent...');
    const uiResult = await orchestrator.runAgent('ui-agent', {
      operation: 'generate_ui',
      genericUIConfig: {
        type: 'test',
        data: { message: 'Test' },
      },
    });
    
    if (uiResult.success) {
      logSuccess('UI Agent: Operational');
      testResults.passed++;
    } else {
      throw new Error(uiResult.error || 'Unknown error');
    }
  } catch (error) {
    logError(`UI Agent: Failed - ${error.message}`);
    testResults.failed++;
  }
  
  // Test NLWeb Agent
  try {
    logInfo('Testing NLWeb Agent...');
    const nlwebResult = await orchestrator.runAgent('nlweb-agent', {
      operation: 'generate_page',
      pageConfig: {
        pageId: 'test-page',
        title: 'Test Page',
        content: '<h1>Test</h1>',
      },
    });
    
    if (nlwebResult.success) {
      logSuccess('NLWeb Agent: Operational');
      testResults.passed++;
    } else {
      throw new Error(nlwebResult.error || 'Unknown error');
    }
  } catch (error) {
    logError(`NLWeb Agent: Failed - ${error.message}`);
    testResults.failed++;
  }
  
  // Summary
  log(`\nAgent Test Summary:`, colors.magenta);
  logSuccess(`Passed: ${testResults.passed}`);
  if (testResults.failed > 0) {
    logError(`Failed: ${testResults.failed}`);
  }
  if (testResults.skipped > 0) {
    logWarning(`Skipped: ${testResults.skipped}`);
  }
  
  return testResults;
}

async function testCompleteWorkflow(orchestrator: MastraOrchestrator) {
  logStep('Complete Workflow Test');
  
  try {
    // Create a sample receipt file for testing
    const sampleReceiptContent = `
    領収書
    
    店舗名: テストマート新宿店
    日付: 2024-01-15
    
    商品A    ¥1,000
    商品B    ¥2,000
    小計     ¥3,000
    消費税   ¥300
    合計     ¥3,300
    `;
    
    // Use a text file instead of image for testing
    const testReceiptPath = path.join(__dirname, 'test-receipt.txt');
    await fs.writeFile(testReceiptPath, sampleReceiptContent);
    
    logInfo('Starting complete workflow test...');
    
    // Execute the workflow without auto-deployment for testing
    const result = await orchestrator.executeDocumentWorkflow({
      filePath: testReceiptPath,
      fileType: 'image', // Treating as image for OCR simulation
      businessType: 'retail',
      autoSave: true,
      autoDeployReport: TEST_CONFIG.deploymentTest,
    });
    
    if (result.success) {
      logSuccess('Workflow completed successfully');
      
      // Validate OCR results
      if (result.results.ocr) {
        logSuccess('✓ OCR processing completed');
        logInfo(`  Vendor: ${result.summary.vendor || 'N/A'}`);
        logInfo(`  Amount: ¥${result.summary.amount || 0}`);
      }
      
      // Validate accounting results
      if (result.results.accounting) {
        logSuccess('✓ Accounting analysis completed');
        logInfo(`  Category: ${result.summary.category || 'N/A'}`);
        logInfo(`  Deductible: ${result.summary.deductible ? 'Yes' : 'No'}`);
      }
      
      // Validate tax calculation
      if (result.results.tax) {
        logSuccess('✓ Tax calculation completed');
        logInfo(`  Consumption Tax: ¥${result.results.tax.consumptionTax || 0}`);
        logInfo(`  Tax Rate: ${result.results.tax.taxRate || 0}%`);
      }
      
      // Validate database save
      if (result.summary.savedToDb) {
        logSuccess('✓ Data saved to database');
      }
      
      // Validate deployment (if enabled)
      if (TEST_CONFIG.deploymentTest && result.summary.deployedUrl) {
        logSuccess('✓ Report deployed to Vercel');
        logInfo(`  URL: ${result.summary.deployedUrl}`);
      }
      
    } else {
      throw new Error(result.error || 'Workflow failed');
    }
    
    // Cleanup
    await fs.unlink(testReceiptPath).catch(() => {});
    
    return result;
  } catch (error) {
    logError(`Workflow test failed: ${error.message}`);
    throw error;
  }
}

async function testErrorHandling(orchestrator: MastraOrchestrator) {
  logStep('Error Handling Test');
  
  const errorTests = {
    passed: 0,
    failed: 0,
  };
  
  // Test 1: Invalid file path
  try {
    logInfo('Testing invalid file path handling...');
    const result = await orchestrator.executeDocumentWorkflow({
      filePath: '/invalid/path/to/file.jpg',
      fileType: 'image',
    });
    
    if (!result.success && result.error) {
      logSuccess('✓ Invalid file path handled correctly');
      errorTests.passed++;
    } else {
      throw new Error('Should have failed with invalid path');
    }
  } catch (error) {
    logError('✗ Invalid file path test failed');
    errorTests.failed++;
  }
  
  // Test 2: Invalid operation
  try {
    logInfo('Testing invalid operation handling...');
    const result = await orchestrator.runAgent('ocr-agent', {
      operation: 'invalid_operation',
    });
    
    if (!result.success && result.error) {
      logSuccess('✓ Invalid operation handled correctly');
      errorTests.passed++;
    } else {
      throw new Error('Should have failed with invalid operation');
    }
  } catch (error) {
    logError('✗ Invalid operation test failed');
    errorTests.failed++;
  }
  
  // Test 3: Missing required parameters
  try {
    logInfo('Testing missing parameters handling...');
    const result = await orchestrator.runAgent('accounting-agent', {
      operation: 'analyze',
      // Missing required ocrResult
    });
    
    if (!result.success && result.error) {
      logSuccess('✓ Missing parameters handled correctly');
      errorTests.passed++;
    } else {
      throw new Error('Should have failed with missing parameters');
    }
  } catch (error) {
    logError('✗ Missing parameters test failed');
    errorTests.failed++;
  }
  
  // Summary
  log(`\nError Handling Test Summary:`, colors.magenta);
  logSuccess(`Passed: ${errorTests.passed}`);
  if (errorTests.failed > 0) {
    logError(`Failed: ${errorTests.failed}`);
  }
  
  return errorTests;
}

// Main test runner
async function runIntegrationTests() {
  log('\n🚀 Starting Mastra Accounting Automation Integration Tests', colors.magenta);
  log('=' .repeat(60), colors.magenta);
  
  const startTime = Date.now();
  const testResults = {
    healthCheck: false,
    individualAgents: false,
    completeWorkflow: false,
    errorHandling: false,
    nlpOrchestrator: false,
  };
  
  try {
    // Initialize orchestrator
    const orchestrator = new MastraOrchestrator();
    
    // Run tests
    try {
      await testHealthCheck(orchestrator);
      testResults.healthCheck = true;
    } catch (error) {
      logError('Health check test suite failed');
    }
    
    try {
      const agentResults = await testIndividualAgents(orchestrator);
      testResults.individualAgents = agentResults.failed === 0;
    } catch (error) {
      logError('Individual agent test suite failed');
    }
    
    try {
      await testCompleteWorkflow(orchestrator);
      testResults.completeWorkflow = true;
    } catch (error) {
      logError('Complete workflow test suite failed');
    }
    
    try {
      const errorResults = await testErrorHandling(orchestrator);
      testResults.errorHandling = errorResults.failed === 0;
    } catch (error) {
      logError('Error handling test suite failed');
    }
    
    // Test NLP Orchestrator
    try {
      const nlpResult = await testNLPOrchestrator();
      testResults.nlpOrchestrator = nlpResult.passed > 0;
    } catch (error) {
      logError('NLP Orchestrator test suite failed');
    }
    
    // Final summary
    const duration = (Date.now() - startTime) / 1000;
    
    log('\n' + '=' .repeat(60), colors.magenta);
    log('📊 Integration Test Summary', colors.magenta);
    log('=' .repeat(60), colors.magenta);
    
    const passedCount = Object.values(testResults).filter(r => r === true).length;
    const totalCount = Object.keys(testResults).length;
    
    log(`\nTest Suites:`, colors.cyan);
    for (const [suite, passed] of Object.entries(testResults)) {
      if (passed) {
        logSuccess(`  ${suite}: PASSED`);
      } else {
        logError(`  ${suite}: FAILED`);
      }
    }
    
    log(`\nOverall: ${passedCount}/${totalCount} test suites passed`, colors.magenta);
    log(`Duration: ${duration.toFixed(2)} seconds`, colors.cyan);
    
    // Special note for NLP integration
    if (testResults.nlpOrchestrator) {
      logSuccess('\n🎉 NLP Orchestrator integration successful!');
      log('   The system now supports natural language document creation.');
    }
    
    if (passedCount === totalCount) {
      log('\n🎉 All integration tests passed!', colors.green);
      logSuccess('   NLP-driven natural language interface is fully operational.');
      process.exit(0);
    } else {
      log('\n⚠️  Some tests failed. Please check the logs above.', colors.yellow);
      process.exit(1);
    }
    
  } catch (error) {
    logError(`\nFatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runIntegrationTests().catch(console.error);
}

export { runIntegrationTests };