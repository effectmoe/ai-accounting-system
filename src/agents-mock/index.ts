// Mock agents for testing
export const mockAgent = (id: string) => ({
  id,
  execute: async (input: any) => {
    console.log(`[Mock ${id}] Executing with input:`, input);
    
    // Return mock responses based on agent ID
    switch (id) {
      case 'ocr-agent':
        return {
          success: true,
          text: 'Mock OCR text',
          confidence: 0.95,
          vendor: 'テストマート',
          date: '2024-01-15',
          amount: 3300,
          tax: 300,
        };
        
      case 'accounting-agent':
        return {
          success: true,
          category: '事務用品',
          subcategory: 'PC関連',
          deductible: true,
        };
        
      case 'database-agent':
        return {
          success: true,
          id: 'mock-id-123',
          message: 'Data saved successfully',
        };
        
      case 'customer-agent':
        return {
          success: true,
          customers: [],
          total: 0,
        };
        
      case 'product-agent':
        return {
          success: true,
          products: [],
          total: 0,
        };
        
      case 'japan-tax-agent':
        return {
          success: true,
          consumptionTax: input.amount ? input.amount * 0.1 : 100,
          taxRate: 10,
        };
        
      case 'ui-agent':
        return {
          success: true,
          code: {
            html: '<div>Test UI</div>',
            css: '.test { color: red; }',
            js: 'console.log("Test");',
          },
        };
        
      case 'nlweb-agent':
        return {
          success: true,
          page: { id: 'test-page', title: 'Test' },
          files: [],
        };
        
      default:
        return {
          success: true,
          message: `Mock ${id} executed`,
        };
    }
  },
});

// Export mock agents
export const ocrAgent = mockAgent('ocr-agent');
export const accountingAgent = mockAgent('accounting-agent');
export const databaseAgent = mockAgent('database-agent');
export const customerAgent = mockAgent('customer-agent');
export const productAgent = mockAgent('product-agent');
export const japanTaxAgent = mockAgent('japan-tax-agent');
export const uiAgent = mockAgent('ui-agent');
export const nlwebAgent = mockAgent('nlweb-agent');