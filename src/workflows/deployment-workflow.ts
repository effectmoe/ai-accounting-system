import { Workflow } from '@mastra/core';
import deploymentAgent from '../agents/deployment-agent';

const deploymentWorkflow = new Workflow({
  name: 'deployment-workflow',
  description: 'Complete deployment workflow for the accounting automation system',
  version: '1.0.0',

  steps: [
    {
      id: 'validate-config',
      name: 'Validate Configuration',
      agent: deploymentAgent,
      action: 'validateConfig',
      input: {
        platform: 'vercel',
        environment: 'production',
        buildCommand: 'npm run build'
      }
    },
    {
      id: 'build-and-deploy',
      name: 'Build and Deploy',
      agent: deploymentAgent,
      action: 'deployToVercel',
      input: {
        platform: 'vercel',
        environment: 'production',
        buildCommand: 'npm run build'
      },
      dependencies: ['validate-config']
    },
    {
      id: 'check-status',
      name: 'Check Deployment Status',
      agent: deploymentAgent,
      action: 'checkDeploymentStatus',
      input: {
        deploymentId: '{{ steps.build-and-deploy.output.deploymentId }}'
      },
      dependencies: ['build-and-deploy']
    }
  ],

  // Workflow hooks
  hooks: {
    beforeWorkflow: async (context: any) => {
      console.log('[Deployment Workflow] Starting deployment workflow...');
    },
    
    afterWorkflow: async (context: any, result: any) => {
      console.log('[Deployment Workflow] Workflow completed');
      
      if (result.success) {
        console.log(`[Deployment Workflow] Successfully deployed to: ${result.url}`);
      } else {
        console.error(`[Deployment Workflow] Deployment failed: ${result.error}`);
      }
    },
    
    onError: async (error: any, context: any) => {
      console.error(`[Deployment Workflow] Error in step ${context.currentStep}:`, error);
    }
  }
});

export default deploymentWorkflow;