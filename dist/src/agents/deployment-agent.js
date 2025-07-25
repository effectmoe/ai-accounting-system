"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const logger_1 = require("@/lib/logger");
const deploymentAgent = {
    name: 'deployment-agent',
    description: 'Handles deployment operations for the accounting automation system',
    version: '1.0.0',
    actions: {
        deployToVercel: async (config) => {
            const startTime = Date.now();
            try {
                logger_1.logger.debug('[Deployment Agent] Starting Vercel deployment...');
                try {
                    (0, child_process_1.execSync)('npx vercel --version', { stdio: 'ignore' });
                }
                catch (error) {
                    return {
                        success: false,
                        error: 'Vercel CLI is not installed. Please install it with: npm install -g vercel'
                    };
                }
                logger_1.logger.debug('[Deployment Agent] Building application...');
                const buildCommand = config.buildCommand || 'npm run build';
                const buildResult = (0, child_process_1.execSync)(buildCommand, {
                    encoding: 'utf8',
                    cwd: process.cwd(),
                    stdio: 'pipe'
                });
                logger_1.logger.debug('[Deployment Agent] Build completed successfully');
                const deployCommand = config.environment === 'production'
                    ? 'npx vercel --prod --yes'
                    : 'npx vercel --yes';
                logger_1.logger.debug(`[Deployment Agent] Deploying to ${config.environment}...`);
                const deployResult = (0, child_process_1.execSync)(deployCommand, {
                    encoding: 'utf8',
                    cwd: process.cwd(),
                    stdio: 'pipe'
                });
                const deploymentUrl = deployResult.trim().split('\n').pop()?.trim();
                const duration = Date.now() - startTime;
                return {
                    success: true,
                    url: deploymentUrl,
                    buildLogs: buildResult.split('\n'),
                    duration
                };
            }
            catch (error) {
                const duration = Date.now() - startTime;
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown deployment error',
                    duration
                };
            }
        },
        checkDeploymentStatus: async (deploymentId) => {
            try {
                const result = (0, child_process_1.execSync)(`npx vercel ls`, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                });
                return {
                    status: 'ready',
                    url: 'https://your-app.vercel.app'
                };
            }
            catch (error) {
                return {
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown status check error'
                };
            }
        },
        setEnvironmentVariables: async (variables, environment = 'production') => {
            try {
                logger_1.logger.debug(`[Deployment Agent] Setting environment variables for ${environment}...`);
                for (const [key, value] of Object.entries(variables)) {
                    const command = `npx vercel env add ${key} ${environment}`;
                    logger_1.logger.debug(`[Deployment Agent] Setting ${key}...`);
                    (0, child_process_1.execSync)(command, {
                        input: value,
                        encoding: 'utf8',
                        stdio: 'pipe'
                    });
                }
                return { success: true };
            }
            catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to set environment variables'
                };
            }
        },
        rollback: async (deploymentId) => {
            const startTime = Date.now();
            try {
                logger_1.logger.debug('[Deployment Agent] Rolling back deployment...');
                const deploymentsResult = (0, child_process_1.execSync)('npx vercel ls', {
                    encoding: 'utf8',
                    stdio: 'pipe'
                });
                const rollbackCommand = deploymentId
                    ? `npx vercel rollback ${deploymentId}`
                    : 'npx vercel rollback';
                const rollbackResult = (0, child_process_1.execSync)(rollbackCommand, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                });
                const duration = Date.now() - startTime;
                return {
                    success: true,
                    duration
                };
            }
            catch (error) {
                const duration = Date.now() - startTime;
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Rollback failed',
                    duration
                };
            }
        },
        getDeploymentLogs: async (deploymentId) => {
            try {
                const result = (0, child_process_1.execSync)(`npx vercel logs ${deploymentId}`, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                });
                return {
                    success: true,
                    logs: result.split('\n')
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to get logs'
                };
            }
        },
        validateConfig: async (config) => {
            const errors = [];
            const warnings = [];
            if (!config.platform) {
                errors.push('Platform is required');
            }
            if (!config.environment) {
                errors.push('Environment is required');
            }
            if (config.buildCommand && !(0, fs_1.existsSync)(path_1.default.join(process.cwd(), 'package.json'))) {
                errors.push('package.json not found');
            }
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
exports.default = deploymentAgent;
//# sourceMappingURL=deployment-agent.js.map