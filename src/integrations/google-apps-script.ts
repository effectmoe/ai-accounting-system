/**
 * Google Apps Script Integration for Mastra
 * 
 * This integration provides a unified interface for interacting with
 * Google Apps Script projects, including deployment, testing, and code updates.
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

export interface GASConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string[];
  tokenPath?: string;
  projectId?: string;
}

export interface GASFile {
  name: string;
  type: 'SERVER_JS' | 'HTML';
  source: string;
}

export interface GASProject {
  scriptId: string;
  title?: string;
  parentId?: string;
  files?: GASFile[];
}

export interface DeploymentConfig {
  description?: string;
  manifestEnabled?: boolean;
  versionNumber?: number;
}

export class GoogleAppsScriptIntegration {
  private auth: OAuth2Client;
  private script: any;
  private config: GASConfig;

  constructor(config?: GASConfig) {
    this.config = {
      clientId: config?.clientId || process.env.GAS_CLIENT_ID,
      clientSecret: config?.clientSecret || process.env.GAS_CLIENT_SECRET,
      redirectUri: config?.redirectUri || process.env.GAS_REDIRECT_URI || 'http://localhost:3000/auth/callback',
      scopes: config?.scopes || [
        'https://www.googleapis.com/auth/script.projects',
        'https://www.googleapis.com/auth/script.deployments',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/script.external_request'
      ],
      tokenPath: config?.tokenPath || process.env.GAS_TOKEN_PATH || './tokens.json',
      projectId: config?.projectId || process.env.GAS_PROJECT_ID || 'AKfycbzKFGiF14PPGpMaTxPDtKc8CNDkAdyZx_98m7bGBBHRdp8oDvD_VS65AjYs5CGiboQ'
    };

    this.auth = new OAuth2Client(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );

    this.script = google.script({ version: 'v1', auth: this.auth });
    
    // Try to load existing tokens
    this.loadTokens();
  }

  /**
   * Load saved tokens from file
   */
  private async loadTokens(): Promise<void> {
    try {
      if (this.config.tokenPath && fs.existsSync(this.config.tokenPath)) {
        const tokens = JSON.parse(fs.readFileSync(this.config.tokenPath, 'utf8'));
        this.auth.setCredentials(tokens);
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  }

  /**
   * Save tokens to file
   */
  private async saveTokens(tokens: any): Promise<void> {
    try {
      if (this.config.tokenPath) {
        fs.writeFileSync(this.config.tokenPath, JSON.stringify(tokens, null, 2));
      }
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthUrl(): string {
    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: this.config.scopes,
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async authenticate(code: string): Promise<void> {
    const { tokens } = await this.auth.getToken(code);
    this.auth.setCredentials(tokens);
    await this.saveTokens(tokens);
  }

  /**
   * Set credentials directly (for service account or pre-authenticated scenarios)
   */
  setCredentials(credentials: any): void {
    this.auth.setCredentials(credentials);
  }

  /**
   * Get project metadata
   */
  async getProject(scriptId?: string): Promise<GASProject> {
    const projectId = scriptId || this.config.projectId;
    if (!projectId) throw new Error('Project ID is required');

    const response = await this.script.projects.get({ scriptId: projectId });
    return response.data;
  }

  /**
   * Update project files
   */
  async updateProject(files: GASFile[], scriptId?: string): Promise<GASProject> {
    const projectId = scriptId || this.config.projectId;
    if (!projectId) throw new Error('Project ID is required');

    const response = await this.script.projects.updateContent({
      scriptId: projectId,
      requestBody: {
        files: files,
      },
    });
    
    return response.data;
  }

  /**
   * Create a new version
   */
  async createVersion(description: string, scriptId?: string): Promise<any> {
    const projectId = scriptId || this.config.projectId;
    if (!projectId) throw new Error('Project ID is required');

    const response = await this.script.projects.versions.create({
      scriptId: projectId,
      requestBody: {
        description,
      },
    });
    
    return response.data;
  }

  /**
   * Deploy the project
   */
  async deploy(config: DeploymentConfig, scriptId?: string): Promise<any> {
    const projectId = scriptId || this.config.projectId;
    if (!projectId) throw new Error('Project ID is required');

    // First create a version
    const version = await this.createVersion(
      config.description || `Deployment at ${new Date().toISOString()}`,
      projectId
    );

    // Then create deployment
    const response = await this.script.projects.deployments.create({
      scriptId: projectId,
      requestBody: {
        versionNumber: version.versionNumber,
        manifestEnabled: config.manifestEnabled || true,
        description: config.description,
      },
    });
    
    return response.data;
  }

  /**
   * List all deployments
   */
  async listDeployments(scriptId?: string): Promise<any[]> {
    const projectId = scriptId || this.config.projectId;
    if (!projectId) throw new Error('Project ID is required');

    const response = await this.script.projects.deployments.list({
      scriptId: projectId,
    });
    
    return response.data.deployments || [];
  }

  /**
   * Update an existing deployment
   */
  async updateDeployment(deploymentId: string, config: DeploymentConfig, scriptId?: string): Promise<any> {
    const projectId = scriptId || this.config.projectId;
    if (!projectId) throw new Error('Project ID is required');

    // Create a new version if description is provided
    let versionNumber = config.versionNumber;
    if (config.description && !versionNumber) {
      const version = await this.createVersion(config.description, projectId);
      versionNumber = version.versionNumber;
    }

    const response = await this.script.projects.deployments.update({
      scriptId: projectId,
      deploymentId: deploymentId,
      requestBody: {
        deploymentConfig: {
          versionNumber,
          manifestEnabled: config.manifestEnabled,
          description: config.description,
        },
      },
    });
    
    return response.data;
  }

  /**
   * Execute a function in the deployed script
   */
  async run(functionName: string, parameters?: any[], scriptId?: string): Promise<any> {
    const projectId = scriptId || this.config.projectId;
    if (!projectId) throw new Error('Project ID is required');

    const response = await this.script.scripts.run({
      scriptId: projectId,
      requestBody: {
        function: functionName,
        parameters: parameters || [],
        devMode: false,
      },
    });
    
    if (response.data.error) {
      throw new Error(`GAS execution error: ${response.data.error.message}`);
    }
    
    return response.data.response?.result;
  }

  /**
   * Execute a function in development mode
   */
  async runDev(functionName: string, parameters?: any[], scriptId?: string): Promise<any> {
    const projectId = scriptId || this.config.projectId;
    if (!projectId) throw new Error('Project ID is required');

    const response = await this.script.scripts.run({
      scriptId: projectId,
      requestBody: {
        function: functionName,
        parameters: parameters || [],
        devMode: true,
      },
    });
    
    if (response.data.error) {
      throw new Error(`GAS execution error: ${response.data.error.message}`);
    }
    
    return response.data.response?.result;
  }

  /**
   * Get logs from the project
   */
  async getLogs(scriptId?: string): Promise<any> {
    const projectId = scriptId || this.config.projectId;
    if (!projectId) throw new Error('Project ID is required');

    // Note: This requires Cloud Logging API to be enabled
    // For now, we'll return a placeholder
    return {
      message: 'Log retrieval requires Cloud Logging API setup',
      scriptId: projectId,
    };
  }

  /**
   * Helper method to read local GAS files
   */
  async readLocalFiles(directory: string): Promise<GASFile[]> {
    const files: GASFile[] = [];
    const entries = fs.readdirSync(directory);

    for (const entry of entries) {
      const fullPath = path.join(directory, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isFile()) {
        const ext = path.extname(entry);
        const name = path.basename(entry, ext);
        
        if (ext === '.js' || ext === '.gs') {
          files.push({
            name: name,
            type: 'SERVER_JS',
            source: fs.readFileSync(fullPath, 'utf8'),
          });
        } else if (ext === '.html') {
          files.push({
            name: name,
            type: 'HTML',
            source: fs.readFileSync(fullPath, 'utf8'),
          });
        }
      }
    }

    return files;
  }

  /**
   * Deploy from local directory
   */
  async deployFromDirectory(directory: string, description?: string, scriptId?: string): Promise<any> {
    const files = await this.readLocalFiles(directory);
    
    if (files.length === 0) {
      throw new Error('No valid GAS files found in directory');
    }

    // Update project files
    await this.updateProject(files, scriptId);
    
    // Deploy
    return this.deploy({
      description: description || `Deployed from ${directory} at ${new Date().toISOString()}`,
    }, scriptId);
  }
}

// Export singleton instance for convenience
export const gasIntegration = new GoogleAppsScriptIntegration();