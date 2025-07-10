// Mastra Client for UI Integration
import { z } from 'zod';

export class MastraClient {
  private baseUrl: string;
  private apiKey: string;
  
  constructor(baseUrl: string = 'http://localhost:3001', apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }
  
  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Request failed: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // Agent methods
  async listAgents() {
    return this.request('/api/agents');
  }
  
  async executeAgent(agentName: string, input: any) {
    return this.request(`/api/agents/${agentName}/execute`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }
  
  // Workflow methods
  async listWorkflows() {
    return this.request('/api/workflows');
  }
  
  async executeWorkflow(workflowName: string, input: any) {
    return this.request(`/api/workflows/${workflowName}/execute`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }
  
  // Accounting specific methods
  async processTransaction(data: {
    companyId: string;
    transactionType: 'income' | 'expense' | 'transfer';
    documents?: Array<{
      type: 'invoice' | 'receipt' | 'bank_statement';
      base64Data?: string;
      fileUrl?: string;
    }>;
    amount?: number;
    description?: string;
    date?: string;
  }) {
    return this.request('/api/accounting/transaction', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  async generateComplianceReport(data: {
    companyId: string;
    reportTypes: string[];
    period: {
      startDate: string;
      endDate: string;
    };
  }) {
    return this.request('/api/compliance/report', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  async createInvoice(data: {
    companyId: string;
    customerId: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
    }>;
    dueDate?: string;
    notes?: string;
    autoSend?: boolean;
  }) {
    return this.request('/api/invoices/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  async processOCR(documents: Array<{
    type: 'invoice' | 'receipt' | 'bank_statement' | 'tax_form';
    base64Data?: string;
    fileUrl?: string;
  }>) {
    return this.request('/api/ocr/process', {
      method: 'POST',
      body: JSON.stringify({ documents }),
    });
  }
  
  async calculateTax(data: {
    amount: number;
    taxType?: string;
    category?: string;
  }) {
    return this.request('/api/tax/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Singleton instance for Next.js
let mastraClient: MastraClient | null = null;

export function getMastraClient(): MastraClient {
  if (!mastraClient) {
    const apiKey = process.env.MASTRA_API_SECRET || '';
    const baseUrl = process.env.MASTRA_API_URL || 'http://localhost:3001';
    mastraClient = new MastraClient(baseUrl, apiKey);
  }
  return mastraClient;
}