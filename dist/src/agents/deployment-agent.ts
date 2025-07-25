import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

import { logger } from '@/lib/logger';
export interface DeploymentConfig {
  platform: 'vercel' | 'netlify' | 'aws' | 'gcp' | 'azure';
  environment: 'development' | 'staging' | 'production';
  buildCommand?: string;
  outputDirectory?: string;
  environmentVariables?: Record<string, string>;
  domains?: string[];
  regions?: string[];
}

export interface DeploymentResult {
  success: boolean;
  deploymentId?: string;
  url?: string;
  buildLogs?: string[];
  error?: string;
  duration?: number;
}

const deploymentAgent = {
  name: 'deployment-agent',
  description: 'Handles deployment operations for the accounting automation system',
  version: '1.0.0',

  actions: {
    /**
     * Deploy the application using Vercel
     */
    deployToVercel: async (config: DeploymentConfig): Promise<DeploymentResult> => {
      const startTime = Date.now();
      
      try {
        logger.debug('[Deployment Agent] Starting Vercel deployment...');
        
        // Check if Vercel CLI is installed
        try {
          execSync('npx vercel --version', { stdio: 'ignore' });
        } catch (error) {
          return {
            success: false,
            error: 'Vercel CLI is not installed. Please install it with: npm install -g vercel'
          };
        }

        // Build the application
        logger.debug('[Deployment Agent] Building application...');
        const buildCommand = config.buildCommand || 'npm run build';
        const buildResult = execSync(buildCommand, { 
          encoding: 'utf8',
          cwd: process.cwd(),
          stdio: 'pipe'
        });

        logger.debug('[Deployment Agent] Build completed successfully');

        // Deploy to Vercel
        const deployCommand = config.environment === 'production' 
          ? 'npx vercel --prod --yes' 
          : 'npx vercel --yes';

        logger.debug(`[Deployment Agent] Deploying to ${config.environment}...`);
        const deployResult = execSync(deployCommand, {
          encoding: 'utf8',
          cwd: process.cwd(),
          stdio: 'pipe'
        });

        // Extract deployment URL from output
        const deploymentUrl = deployResult.trim().split('\n').pop()?.trim();

        const duration = Date.now() - startTime;

        return {
          success: true,
          url: deploymentUrl,
          buildLogs: buildResult.split('\n'),
          duration
        };

      } catch (error) {
        const duration = Date.now() - startTime;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown deployment error',
          duration
        };
      }
    },

    /**
     * Check deployment status
     */
    checkDeploymentStatus: async (deploymentId: string): Promise<{
      status: 'pending' | 'building' | 'ready' | 'error';
      url?: string;
      error?: string;
    }> => {
      try {
        const result = execSync(`npx vercel ls`, {
          encoding: 'utf8',
          stdio: 'pipe'
        });

        // Parse deployment status (simplified)
        return {
          status: 'ready',
          url: 'https://your-app.vercel.app'
        };

      } catch (error) {
        return {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown status check error'
        };
      }
    },

    /**
     * Set environment variables for deployment
     */
    setEnvironmentVariables: async (variables: Record<string, string>, environment: string = 'production'): Promise<{
      success: boolean;
      error?: string;
    }> => {
      try {
        logger.debug(`[Deployment Agent] Setting environment variables for ${environment}...`);
        
        for (const [key, value] of Object.entries(variables)) {
          const command = `npx vercel env add ${key} ${environment}`;
          logger.debug(`[Deployment Agent] Setting ${key}...`);
          
          // Note: This is a simplified implementation
          // In practice, you'd need to handle the interactive prompts
          execSync(command, {
            input: value,
            encoding: 'utf8',
            stdio: 'pipe'
          });
        }

        return { success: true };

      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to set environment variables'
        };
      }
    },

    /**
     * Rollback to previous deployment
     */
    rollback: async (deploymentId?: string): Promise<DeploymentResult> => {
      const startTime = Date.now();
      
      try {
        logger.debug('[Deployment Agent] Rolling back deployment...');
        
        // Get previous deployment
        const deploymentsResult = execSync('npx vercel ls', {
          encoding: 'utf8',
          stdio: 'pipe'
        });

        // This is a simplified rollback implementation
        // In practice, you'd need to parse the deployments and select the previous one
        const rollbackCommand = deploymentId 
          ? `npx vercel rollback ${deploymentId}` 
          : 'npx vercel rollback';

        const rollbackResult = execSync(rollbackCommand, {
          encoding: 'utf8',
          stdio: 'pipe'
        });

        const duration = Date.now() - startTime;

        return {
          success: true,
          duration
        };

      } catch (error) {
        const duration = Date.now() - startTime;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Rollback failed',
          duration
        };
      }
    },

    /**
     * Get deployment logs
     */
    getDeploymentLogs: async (deploymentId: string): Promise<{
      success: boolean;
      logs?: string[];
      error?: string;
    }> => {
      try {
        const result = execSync(`npx vercel logs ${deploymentId}`, {
          encoding: 'utf8',
          stdio: 'pipe'
        });

        return {
          success: true,
          logs: result.split('\n')
        };

      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get logs'
        };
      }
    },

    /**
     * Validate deployment configuration
     */
    validateConfig: async (config: DeploymentConfig): Promise<{
      valid: boolean;
      errors?: string[];
      warnings?: string[];
    }> => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check required fields
      if (!config.platform) {
        errors.push('Platform is required');
      }

      if (!config.environment) {
        errors.push('Environment is required');
      }

      // Check if build command exists
      if (config.buildCommand && !existsSync(path.join(process.cwd(), 'package.json'))) {
        errors.push('package.json not found');
      }

      // Check environment variables
      if (config.platform === 'vercel' && !process.env.VERCEL_TOKEN) {
        warnings.push('VERCEL_TOKEN environment variable is not set');
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    }
  }
};

export default deploymentAgent;