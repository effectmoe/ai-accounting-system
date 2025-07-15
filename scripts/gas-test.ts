#!/usr/bin/env tsx
/**
 * GAS Test Script
 * 
 * Test Google Apps Script functions using Mastra agents
 */

import gasTestAgent from '../src/agents/gas-test-agent';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help') {
    console.log(`
Usage: npm run gas:test <function-name> [options]

Options:
  --params <json>        Function parameters as JSON array
  --dev                  Run in development mode
  --script-id <id>       Override default script ID
  --validate             Validate output against schema
  --schema <json>        Expected output schema
  --benchmark <n>        Run benchmark with n iterations
  --timeout <ms>         Custom timeout in milliseconds
  --help                 Show this help message

Examples:
  npm run gas:test doGet
  npm run gas:test processInvoice --params '["INV-001"]'
  npm run gas:test calculateTax --params '[100000, 0.1]' --dev
  npm run gas:test testFunction --benchmark 10
    `);
    process.exit(0);
  }

  try {
    const functionName = args[0];
    
    // Parse options
    const options: any = {
      functionName,
    };
    
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--params':
          options.parameters = JSON.parse(args[++i]);
          break;
        case '--dev':
          options.devMode = true;
          break;
        case '--script-id':
          options.scriptId = args[++i];
          break;
        case '--validate':
          options.validateOutput = true;
          break;
        case '--schema':
          options.expectedOutputSchema = JSON.parse(args[++i]);
          break;
        case '--benchmark':
          options.benchmark = parseInt(args[++i]);
          break;
        case '--timeout':
          options.timeout = parseInt(args[++i]);
          break;
      }
    }

    console.log(`🧪 Testing function: ${functionName}`);
    
    if (options.benchmark) {
      // Run benchmark
      console.log(`📊 Running benchmark with ${options.benchmark} iterations...`);
      
      const benchmarkResult = await gasTestAgent.benchmark(
        functionName,
        options.parameters || [],
        options.benchmark,
        options.scriptId
      );
      
      console.log('\n📈 Benchmark Results:');
      console.log(`  Average time: ${benchmarkResult.averageTime.toFixed(2)}ms`);
      console.log(`  Min time: ${benchmarkResult.minTime}ms`);
      console.log(`  Max time: ${benchmarkResult.maxTime}ms`);
      
      const successCount = benchmarkResult.results.filter(r => r.status === 'success').length;
      console.log(`  Success rate: ${(successCount / benchmarkResult.iterations * 100).toFixed(1)}%`);
      
    } else {
      // Run single test
      const result = await gasTestAgent.execute(options);
      
      if (result.status === 'success') {
        console.log('✅ Test passed!');
        console.log(`⏱️  Execution time: ${result.executionTime}ms`);
        console.log('\n📤 Result:');
        console.log(JSON.stringify(result.result, null, 2));
        
        if (result.validation) {
          if (result.validation.passed) {
            console.log('✅ Output validation passed');
          } else {
            console.log('❌ Output validation failed:');
            result.validation.errors?.forEach(error => {
              console.log(`  - ${error}`);
            });
          }
        }
      } else {
        console.error('❌ Test failed!');
        console.error(`⏱️  Execution time: ${result.executionTime}ms`);
        console.error('\n❌ Error:', result.error?.message);
        if (result.error?.stack) {
          console.error('\nStack trace:', result.error.stack);
        }
        process.exit(1);
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();