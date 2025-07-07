/**
 * GAS Deploy Agent for Mastra
 * 
 * This agent handles deployment of Google Apps Script projects,
 * including version creation and deployment management.
 */

import { BaseAgent } from '../lib/base-agent';
import { GoogleAppsScriptIntegration } from '../integrations/google-apps-script';
import type { AgentConfig, AgentContext, AgentResult } from '../lib/base-agent';

export interface GASDeployInput {
  scriptId?: string;
  description?: string;
  files?: Array<{
    name: string;
    type: 'SERVER_JS' | 'HTML';
    source: string;
  }>;
  directory?: string;
  manifestEnabled?: boolean;
  deploymentId?: string; // For updating existing deployment
}

export interface GASDeployOutput {
  deploymentId: string;
  deploymentConfig: {
    scriptId: string;
    versionNumber: number;
    description?: string;
  };
  webAppUrl?: string;
  status: 'success' | 'failed';
  message: string;
  timestamp: string;
}

class GASDeployAgent extends BaseAgent<GASDeployInput, GASDeployOutput> {
  private gas: GoogleAppsScriptIntegration;

  constructor() {
    const config: AgentConfig = {
      name: 'gas-deploy-agent',
      description: 'Deploys Google Apps Script projects with version management',
      version: '1.0.0',
      timeout: 120000, // 2 minutes
      retryPolicy: {
        maxRetries: 2,
        backoffMultiplier: 2,
        initialDelay: 1000,
      },
    };
    
    super(config);
    this.gas = new GoogleAppsScriptIntegration();
  }

  protected async validateInput(input: GASDeployInput): Promise<void> {
    // Either files or directory must be provided for new deployments
    if (!input.deploymentId && !input.files && !input.directory) {
      throw new Error('Either files or directory must be provided for deployment');
    }

    // Validate file types if files are provided
    if (input.files) {
      for (const file of input.files) {
        if (!['SERVER_JS', 'HTML'].includes(file.type)) {
          throw new Error(`Invalid file type: ${file.type}`);
        }
        if (!file.name || !file.source) {
          throw new Error('File must have name and source');
        }
      }
    }
  }

  protected async performTask(
    input: GASDeployInput,
    context: AgentContext
  ): Promise<GASDeployOutput> {
    try {
      const scriptId = input.scriptId || process.env.GAS_PROJECT_ID;
      if (!scriptId) {
        throw new Error('Script ID is required');
      }

      let deploymentResult: any;

      // Check if this is an update to existing deployment
      if (input.deploymentId) {
        this.logInfo(`Updating existing deployment: ${input.deploymentId}`);
        
        // Update files if provided
        if (input.files) {
          await this.gas.updateProject(input.files, scriptId);
          this.logInfo(`Updated ${input.files.length} files`);
        }

        // Update deployment
        deploymentResult = await this.gas.updateDeployment(
          input.deploymentId,
          {
            description: input.description || `Updated at ${new Date().toISOString()}`,
            manifestEnabled: input.manifestEnabled,
          },
          scriptId
        );
      } else {
        // New deployment
        if (input.directory) {
          // Deploy from directory
          this.logInfo(`Deploying from directory: ${input.directory}`);
          deploymentResult = await this.gas.deployFromDirectory(
            input.directory,
            input.description,
            scriptId
          );
        } else if (input.files) {
          // Update files first
          this.logInfo(`Updating ${input.files.length} files`);
          await this.gas.updateProject(input.files, scriptId);
          
          // Then deploy
          deploymentResult = await this.gas.deploy(
            {
              description: input.description || `Deployed at ${new Date().toISOString()}`,
              manifestEnabled: input.manifestEnabled ?? true,
            },
            scriptId
          );
        }
      }

      // Extract web app URL if available
      let webAppUrl: string | undefined;
      if (deploymentResult.deploymentConfig?.webAppConfig?.executeAs) {
        webAppUrl = `https://script.google.com/macros/s/${deploymentResult.deploymentId}/exec`;
      }

      const output: GASDeployOutput = {
        deploymentId: deploymentResult.deploymentId,
        deploymentConfig: {
          scriptId: scriptId,
          versionNumber: deploymentResult.deploymentConfig.versionNumber,
          description: deploymentResult.deploymentConfig.description,
        },
        webAppUrl,
        status: 'success',
        message: `Successfully deployed version ${deploymentResult.deploymentConfig.versionNumber}`,
        timestamp: new Date().toISOString(),
      };

      this.logInfo(`Deployment successful: ${output.deploymentId}`);
      return output;

    } catch (error: any) {
      this.logError(`Deployment failed: ${error.message}`);
      
      return {
        deploymentId: '',
        deploymentConfig: {
          scriptId: input.scriptId || '',
          versionNumber: 0,
        },
        status: 'failed',
        message: `Deployment failed: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  protected async handleError(
    error: Error,
    input: GASDeployInput,
    context: AgentContext
  ): Promise<GASDeployOutput> {
    return {
      deploymentId: '',
      deploymentConfig: {
        scriptId: input.scriptId || '',
        versionNumber: 0,
      },
      status: 'failed',
      message: `Agent error: ${error.message}`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Helper method to get current deployments
   */
  async getCurrentDeployments(scriptId?: string): Promise<any[]> {
    try {
      return await this.gas.listDeployments(scriptId);
    } catch (error: any) {
      this.logError(`Failed to list deployments: ${error.message}`);
      return [];
    }
  }

  /**
   * Helper method to validate deployment before executing
   */
  async validateDeployment(input: GASDeployInput): Promise<boolean> {
    try {
      const scriptId = input.scriptId || process.env.GAS_PROJECT_ID;
      if (!scriptId) return false;

      // Check if project exists
      const project = await this.gas.getProject(scriptId);
      if (!project) return false;

      // If updating, check if deployment exists
      if (input.deploymentId) {
        const deployments = await this.gas.listDeployments(scriptId);
        const exists = deployments.some(d => d.deploymentId === input.deploymentId);
        if (!exists) {
          this.logWarning(`Deployment ${input.deploymentId} not found`);
          return false;
        }
      }

      return true;
    } catch (error: any) {
      this.logError(`Validation failed: ${error.message}`);
      return false;
    }
  }
}

// Export agent instance
export default new GASDeployAgent();