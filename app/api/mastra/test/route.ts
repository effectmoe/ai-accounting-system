import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '@/src/mastra';
import { MastraAccountingAgent, MastraCustomerAgent, MastraJapanTaxAgent, MastraOcrAgent, MastraDatabaseAgent } from '@/src/lib/mastra-integration';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testType = 'all' } = body;
    
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: []
    };
    
    // 利用可能なエージェントを確認
    const agents = await mastra.getAgents();
    const availableAgents = Object.keys(agents);
    
    results.availableAgents = availableAgents;
    results.agentCount = availableAgents.length;
    
    // 各エージェントのテストを実行
    if (testType === 'all' || testType === 'accounting') {
      try {
        const accountingTest = await MastraAccountingAgent.calculateTax({
          tax_type: 'consumption_tax',
          taxable_amount: 10000,
          tax_rate: 0.1
        });
        
        results.tests.push({
          agent: 'accountingAgent',
          operation: 'calculate_tax',
          status: 'success',
          result: accountingTest
        });
      } catch (error) {
        results.tests.push({
          agent: 'accountingAgent',
          operation: 'calculate_tax',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    if (testType === 'all' || testType === 'customer') {
      try {
        const customerTest = await MastraCustomerAgent.searchCustomers({
          query: 'test',
          limit: 5
        });
        
        results.tests.push({
          agent: 'customerAgent',
          operation: 'search_customers',
          status: 'success',
          result: customerTest
        });
      } catch (error) {
        results.tests.push({
          agent: 'customerAgent',
          operation: 'search_customers',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    if (testType === 'all' || testType === 'tax') {
      try {
        const taxTest = await MastraJapanTaxAgent.calculateConsumptionTax({
          amount: 1000,
          tax_rate: 0.1,
          item_type: 'standard',
          calculation_method: 'item_by_item',
          is_tax_included: false
        });
        
        results.tests.push({
          agent: 'japanTaxAgent',
          operation: 'calculate_consumption_tax',
          status: 'success',
          result: taxTest
        });
      } catch (error) {
        results.tests.push({
          agent: 'japanTaxAgent',
          operation: 'calculate_consumption_tax',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // テスト結果のサマリー
    const successCount = results.tests.filter((t: any) => t.status === 'success').length;
    const failureCount = results.tests.filter((t: any) => t.status === 'failed').length;
    
    results.summary = {
      totalTests: results.tests.length,
      successCount,
      failureCount,
      successRate: results.tests.length > 0 
        ? ((successCount / results.tests.length) * 100).toFixed(2) + '%'
        : '0%'
    };
    
    logger.info('Mastra agent tests completed:', results.summary);
    
    return NextResponse.json(results);
    
  } catch (error) {
    logger.error('Error testing Mastra agents:', error);
    
    return NextResponse.json({
      error: 'Failed to test Mastra agents',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'Mastra Agent Test',
    method: 'POST',
    description: 'Test Mastra agents functionality',
    availableTests: ['all', 'accounting', 'customer', 'tax', 'ocr', 'database'],
    exampleRequest: {
      testType: 'all' // or specific agent type
    },
    timestamp: new Date().toISOString()
  });
}