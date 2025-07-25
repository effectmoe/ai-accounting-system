"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@mastra/core");
const deployment_agent_1 = __importDefault(require("../agents/deployment-agent"));
const logger_1 = require("@/lib/logger");
const deploymentWorkflow = new core_1.Workflow({
    name: 'deployment-workflow',
    description: 'Complete deployment workflow for the accounting automation system',
    version: '1.0.0',
    steps: [
        {
            id: 'validate-config',
            name: 'Validate Configuration',
            agent: deployment_agent_1.default,
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
            agent: deployment_agent_1.default,
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
            agent: deployment_agent_1.default,
            action: 'checkDeploymentStatus',
            input: {
                deploymentId: '{{ steps.build-and-deploy.output.deploymentId }}'
            },
            dependencies: ['build-and-deploy']
        }
    ],
    hooks: {
        beforeWorkflow: async (context) => {
            logger_1.logger.debug('[Deployment Workflow] Starting deployment workflow...');
        },
        afterWorkflow: async (context, result) => {
            logger_1.logger.debug('[Deployment Workflow] Workflow completed');
            if (result.success) {
                logger_1.logger.debug(`[Deployment Workflow] Successfully deployed to: ${result.url}`);
            }
            else {
                logger_1.logger.error(`[Deployment Workflow] Deployment failed: ${result.error}`);
            }
        },
        onError: async (error, context) => {
            logger_1.logger.error(`[Deployment Workflow] Error in step ${context.currentStep}:`, error);
        }
    }
});
exports.default = deploymentWorkflow;
//# sourceMappingURL=deployment-workflow.js.map