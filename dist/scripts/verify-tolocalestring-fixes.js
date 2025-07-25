#!/usr/bin/env tsx
"use strict";
/**
 * 仕入先見積書のtoLocaleString修正デプロイ確認スクリプト
 * Mastraデプロイメント後の検証テスト
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
class DeploymentVerifier {
    baseUrl;
    results = [];
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async testEndpoint(name, url, expectedStatus = 200) {
        try {
            console.log(chalk_1.default.blue(`🔍 Testing: ${name}`));
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Deployment-Verifier/1.0'
                }
            });
            if (response.status === expectedStatus) {
                const contentType = response.headers.get('content-type');
                let details = `Status: ${response.status}`;
                if (contentType?.includes('application/json')) {
                    const data = await response.json();
                    details += `, JSON Response: ${JSON.stringify(data).substring(0, 100)}...`;
                }
                else if (contentType?.includes('text/html')) {
                    const html = await response.text();
                    // Check for JavaScript errors in HTML
                    const hasJsError = html.includes('toLocaleString') &&
                        (html.includes('error') || html.includes('Error') || html.includes('undefined'));
                    details += `, HTML Length: ${html.length}, JS Errors: ${hasJsError ? 'FOUND' : 'None'}`;
                    if (hasJsError) {
                        return {
                            name,
                            success: false,
                            details,
                            error: 'Potential JavaScript errors detected in HTML'
                        };
                    }
                }
                return {
                    name,
                    success: true,
                    details
                };
            }
            else {
                return {
                    name,
                    success: false,
                    details: `Unexpected status: ${response.status}`,
                    error: `Expected ${expectedStatus}, got ${response.status}`
                };
            }
        }
        catch (error) {
            return {
                name,
                success: false,
                details: 'Request failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async runTests() {
        console.log(chalk_1.default.blue.bold(`
╔══════════════════════════════════════════════════╗
║     Deployment Verification - toLocaleString     ║
║                 Fixes Testing                    ║
╚══════════════════════════════════════════════════╝
    `));
        console.log(chalk_1.default.blue(`🌐 Base URL: ${this.baseUrl}\n`));
        // Test 1: Health Check
        this.results.push(await this.testEndpoint('Health Check', `${this.baseUrl}/api/health`));
        // Test 2: Health Check (Detailed)
        this.results.push(await this.testEndpoint('Detailed Health Check', `${this.baseUrl}/api/health-check`));
        // Test 3: Supplier Quotes API
        this.results.push(await this.testEndpoint('Supplier Quotes API', `${this.baseUrl}/api/supplier-quotes`));
        // Test 4: Supplier Quotes List Page
        this.results.push(await this.testEndpoint('Supplier Quotes List Page', `${this.baseUrl}/supplier-quotes`));
        // Test 5: Supplier Quotes New Page
        this.results.push(await this.testEndpoint('Supplier Quotes New Page', `${this.baseUrl}/supplier-quotes/new`));
        // Test 6: Check if there are any existing supplier quotes to test detail page
        try {
            const response = await fetch(`${this.baseUrl}/api/supplier-quotes`);
            const data = await response.json();
            if (data.supplierQuotes && data.supplierQuotes.length > 0) {
                const firstQuoteId = data.supplierQuotes[0]._id;
                // Test 7: Supplier Quote Detail Page
                this.results.push(await this.testEndpoint('Supplier Quote Detail Page', `${this.baseUrl}/supplier-quotes/${firstQuoteId}`));
                // Test 8: Supplier Quote Edit Page
                this.results.push(await this.testEndpoint('Supplier Quote Edit Page', `${this.baseUrl}/supplier-quotes/${firstQuoteId}/edit`));
                // Test 9: Supplier Quote API Detail
                this.results.push(await this.testEndpoint('Supplier Quote API Detail', `${this.baseUrl}/api/supplier-quotes/${firstQuoteId}`));
            }
            else {
                console.log(chalk_1.default.yellow('⚠️ No existing supplier quotes found for detail testing'));
            }
        }
        catch (error) {
            console.log(chalk_1.default.yellow('⚠️ Could not fetch supplier quotes for detail testing'));
        }
        // Display Results
        this.displayResults();
    }
    displayResults() {
        console.log(chalk_1.default.blue('\n📊 Test Results:\n'));
        let passed = 0;
        let failed = 0;
        this.results.forEach((result, index) => {
            const status = result.success ? chalk_1.default.green('✅ PASS') : chalk_1.default.red('❌ FAIL');
            console.log(`${index + 1}. ${status} ${result.name}`);
            console.log(`   ${chalk_1.default.gray(result.details)}`);
            if (result.error) {
                console.log(`   ${chalk_1.default.red('Error:')} ${result.error}`);
            }
            console.log('');
            if (result.success) {
                passed++;
            }
            else {
                failed++;
            }
        });
        // Summary
        console.log(chalk_1.default.blue('═'.repeat(50)));
        console.log(chalk_1.default.blue.bold('📈 Summary:'));
        console.log(`${chalk_1.default.green('✅ Passed:')} ${passed}`);
        console.log(`${chalk_1.default.red('❌ Failed:')} ${failed}`);
        console.log(`${chalk_1.default.blue('📊 Total:')} ${this.results.length}`);
        if (failed === 0) {
            console.log(chalk_1.default.green.bold('\n🎉 All tests passed! Deployment is successful.'));
            console.log(chalk_1.default.green('✅ toLocaleString fixes are working correctly.'));
        }
        else {
            console.log(chalk_1.default.red.bold('\n⚠️ Some tests failed. Please check the issues above.'));
        }
        console.log(chalk_1.default.blue('\n🔗 Application URL:'), chalk_1.default.cyan(this.baseUrl));
    }
}
async function main() {
    const baseUrl = process.argv[2] || 'https://accounting-automation-873chsc1j-effectmoes-projects.vercel.app';
    const verifier = new DeploymentVerifier(baseUrl);
    await verifier.runTests();
}
// エラーハンドリング
main().catch(error => {
    console.error(chalk_1.default.red('\n予期しないエラー:'), error);
    process.exit(1);
});
