"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MastraClient = void 0;
exports.getMastraClient = getMastraClient;
class MastraClient {
    baseUrl;
    apiKey;
    constructor(baseUrl = 'http://localhost:3001', apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }
    async request(endpoint, options = {}) {
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
    async executeAgent(agentName, input) {
        return this.request(`/api/agents/${agentName}/execute`, {
            method: 'POST',
            body: JSON.stringify(input),
        });
    }
    // Workflow methods
    async listWorkflows() {
        return this.request('/api/workflows');
    }
    async executeWorkflow(workflowName, input) {
        return this.request(`/api/workflows/${workflowName}/execute`, {
            method: 'POST',
            body: JSON.stringify(input),
        });
    }
    // Accounting specific methods
    async processTransaction(data) {
        return this.request('/api/accounting/transaction', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    async generateComplianceReport(data) {
        return this.request('/api/compliance/report', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    async createInvoice(data) {
        return this.request('/api/invoices/create', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    async processOCR(documents) {
        return this.request('/api/ocr/process', {
            method: 'POST',
            body: JSON.stringify({ documents }),
        });
    }
    async calculateTax(data) {
        return this.request('/api/tax/calculate', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
}
exports.MastraClient = MastraClient;
// Singleton instance for Next.js
let mastraClient = null;
function getMastraClient() {
    if (!mastraClient) {
        const apiKey = process.env.MASTRA_API_SECRET || '';
        const baseUrl = process.env.MASTRA_API_URL || 'http://localhost:3001';
        mastraClient = new MastraClient(baseUrl, apiKey);
    }
    return mastraClient;
}
