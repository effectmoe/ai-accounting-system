/**
 * GAS Test Agent for Mastra
 * 
 * This agent handles testing and execution of Google Apps Script functions,
 * supporting both production and development mode execution.
 */

import { BaseAgent } from '../lib/base-agent';
import { GoogleAppsScriptIntegration } from '../integrations/google-apps-script';
import type { AgentConfig, AgentContext, AgentResult } from '../lib/base-agent';

export interface GASTestInput {
  scriptId?: string;
  functionName: string;
  parameters?: any[];
  devMode?: boolean;
  timeout?: number;
  validateOutput?: boolean;
  expectedOutputSchema?: any; // JSON schema for validation
}

export interface GASTestOutput {
  functionName: string;
  result: any;
  executionTime: number;
  status: 'success' | 'failed' | 'error';
  error?: {
    message: string;
    stack?: string;
    details?: any;
  };
  validation?: {
    passed: boolean;
    errors?: string[];
  };
  timestamp: string;
}

class GASTestAgent extends BaseAgent<GASTestInput, GASTestOutput> {
  private gas: GoogleAppsScriptIntegration;

  constructor() {
    const config: AgentConfig = {
      name: 'gas-test-agent',
      description: 'Tests and executes Google Apps Script functions with validation',
      version: '1.0.0',
      timeout: 300000, // 5 minutes default
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 2000,
      },
    };
    
    super(config);
    this.gas = new GoogleAppsScriptIntegration();
  }

  protected async validateInput(input: GASTestInput): Promise<void> {
    if (!input.functionName) {
      throw new Error('Function name is required');
    }

    if (input.parameters && !Array.isArray(input.parameters)) {
      throw new Error('Parameters must be an array');
    }

    if (input.timeout && (input.timeout < 1000 || input.timeout > 360000)) {
      throw new Error('Timeout must be between 1000ms and 360000ms (6 minutes)');
    }
  }

  protected async performTask(
    input: GASTestInput,
    context: AgentContext
  ): Promise<GASTestOutput> {
    const startTime = Date.now();
    const scriptId = input.scriptId || process.env.GAS_PROJECT_ID;
    
    if (!scriptId) {
      throw new Error('Script ID is required');
    }

    try {
      this.logInfo(`Testing function: ${input.functionName}`);
      this.logInfo(`Parameters: ${JSON.stringify(input.parameters || [])}`);
      this.logInfo(`Mode: ${input.devMode ? 'Development' : 'Production'}`);

      // Execute the function
      const result = await this.executeWithTimeout(
        async () => {
          if (input.devMode) {
            return await this.gas.runDev(input.functionName, input.parameters, scriptId);
          } else {
            return await this.gas.run(input.functionName, input.parameters, scriptId);
          }
        },
        input.timeout || this.config.timeout || 300000
      );

      const executionTime = Date.now() - startTime;
      this.logInfo(`Execution completed in ${executionTime}ms`);

      // Validate output if requested
      let validation: GASTestOutput['validation'];
      if (input.validateOutput && input.expectedOutputSchema) {
        validation = this.validateOutput(result, input.expectedOutputSchema);
        this.logInfo(`Validation: ${validation.passed ? 'PASSED' : 'FAILED'}`);
        if (!validation.passed) {
          this.logWarning(`Validation errors: ${validation.errors?.join(', ')}`);
        }
      }

      return {
        functionName: input.functionName,
        result: result,
        executionTime: executionTime,
        status: 'success',
        validation: validation,
        timestamp: new Date().toISOString(),
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      this.logError(`Test failed: ${error.message}`);
      
      return {
        functionName: input.functionName,
        result: null,
        executionTime: executionTime,
        status: 'failed',
        error: {
          message: error.message,
          stack: error.stack,
          details: error.details || error.response?.data,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  protected async handleError(
    error: Error,
    input: GASTestInput,
    context: AgentContext
  ): Promise<GASTestOutput> {
    return {
      functionName: input.functionName,
      result: null,
      executionTime: 0,
      status: 'error',
      error: {
        message: `Agent error: ${error.message}`,
        stack: error.stack,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Execution timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  /**
   * Validate output against schema
   */
  private validateOutput(output: any, schema: any): GASTestOutput['validation'] {
    const errors: string[] = [];
    
    // Simple validation implementation
    // In production, you might want to use a proper JSON schema validator
    
    if (schema.type) {
      const actualType = Array.isArray(output) ? 'array' : typeof output;
      if (actualType !== schema.type) {
        errors.push(`Expected type ${schema.type}, got ${actualType}`);
      }
    }

    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (output && typeof output === 'object' && !(field in output)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    if (schema.properties && typeof output === 'object' && output !== null) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in output && propSchema && typeof propSchema === 'object') {
          const propValidation = this.validateOutput(output[key], propSchema);
          if (!propValidation.passed) {
            errors.push(...(propValidation.errors || []).map(e => `${key}.${e}`));
          }
        }
      }
    }

    return {
      passed: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Helper method to run a test suite
   */
  async runTestSuite(tests: GASTestInput[]): Promise<GASTestOutput[]> {
    const results: GASTestOutput[] = [];
    
    for (const test of tests) {
      this.logInfo(`Running test: ${test.functionName}`);
      const result = await this.execute(test);
      results.push(result);
      
      // Add delay between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * Helper method to create a benchmark test
   */
  async benchmark(
    functionName: string,
    parameters: any[],
    iterations: number = 10,
    scriptId?: string
  ): Promise<{
    functionName: string;
    iterations: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    results: GASTestOutput[];
  }> {
    const results: GASTestOutput[] = [];
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const result = await this.execute({
        scriptId,
        functionName,
        parameters,
        devMode: false,
      });
      
      results.push(result);
      times.push(result.executionTime);
      
      // Add delay between iterations
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return {
      functionName,
      iterations,
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      results,
    };
  }
}

// Export agent instance
export default new GASTestAgent();