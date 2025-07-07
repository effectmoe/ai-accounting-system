/**
 * GAS Update Agent for Mastra
 * 
 * This agent handles code updates for Google Apps Script projects,
 * including file management, version control, and synchronization.
 */

import { BaseAgent } from '../lib/base-agent';
import { GoogleAppsScriptIntegration, GASFile } from '../integrations/google-apps-script';
import type { AgentConfig, AgentContext, AgentResult } from '../lib/base-agent';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface GASUpdateInput {
  scriptId?: string;
  files?: GASFile[];
  directory?: string;
  syncMode?: 'push' | 'pull' | 'merge';
  createBackup?: boolean;
  validateSyntax?: boolean;
  dryRun?: boolean;
}

export interface FileChange {
  name: string;
  type: 'added' | 'modified' | 'deleted' | 'unchanged';
  oldContent?: string;
  newContent?: string;
  hash?: string;
}

export interface GASUpdateOutput {
  scriptId: string;
  changes: FileChange[];
  totalFiles: number;
  filesAdded: number;
  filesModified: number;
  filesDeleted: number;
  filesUnchanged: number;
  backupLocation?: string;
  status: 'success' | 'failed' | 'dry-run';
  message: string;
  timestamp: string;
}

class GASUpdateAgent extends BaseAgent<GASUpdateInput, GASUpdateOutput> {
  private gas: GoogleAppsScriptIntegration;

  constructor() {
    const config: AgentConfig = {
      name: 'gas-update-agent',
      description: 'Updates Google Apps Script project code with version control',
      version: '1.0.0',
      timeout: 180000, // 3 minutes
      retryPolicy: {
        maxRetries: 2,
        backoffMultiplier: 2,
        initialDelay: 1000,
      },
    };
    
    super(config);
    this.gas = new GoogleAppsScriptIntegration();
  }

  protected async validateInput(input: GASUpdateInput): Promise<void> {
    if (!input.files && !input.directory) {
      throw new Error('Either files or directory must be provided');
    }

    if (input.syncMode && !['push', 'pull', 'merge'].includes(input.syncMode)) {
      throw new Error('Invalid sync mode. Must be push, pull, or merge');
    }

    if (input.files) {
      for (const file of input.files) {
        if (!file.name || !file.source) {
          throw new Error('Each file must have name and source');
        }
        if (!['SERVER_JS', 'HTML'].includes(file.type)) {
          throw new Error(`Invalid file type: ${file.type}`);
        }
      }
    }
  }

  protected async performTask(
    input: GASUpdateInput,
    context: AgentContext
  ): Promise<GASUpdateOutput> {
    const scriptId = input.scriptId || process.env.GAS_PROJECT_ID;
    if (!scriptId) {
      throw new Error('Script ID is required');
    }

    try {
      const syncMode = input.syncMode || 'push';
      let changes: FileChange[] = [];
      let backupLocation: string | undefined;

      // Get current project state
      this.logInfo(`Fetching current project state for ${scriptId}`);
      const currentProject = await this.gas.getProject(scriptId);
      const currentFiles = currentProject.files || [];

      // Create backup if requested
      if (input.createBackup && !input.dryRun) {
        backupLocation = await this.createBackup(scriptId, currentFiles);
        this.logInfo(`Backup created at: ${backupLocation}`);
      }

      // Handle different sync modes
      if (syncMode === 'pull') {
        // Pull from GAS to local
        if (!input.directory) {
          throw new Error('Directory is required for pull mode');
        }
        changes = await this.pullFiles(currentFiles, input.directory, input.dryRun);
      } else if (syncMode === 'push') {
        // Push from local to GAS
        let newFiles: GASFile[];
        
        if (input.files) {
          newFiles = input.files;
        } else if (input.directory) {
          newFiles = await this.gas.readLocalFiles(input.directory);
        } else {
          throw new Error('No files to push');
        }

        // Validate syntax if requested
        if (input.validateSyntax) {
          await this.validateSyntax(newFiles);
        }

        changes = await this.calculateChanges(currentFiles, newFiles);
        
        if (!input.dryRun && changes.some(c => c.type !== 'unchanged')) {
          this.logInfo(`Updating ${newFiles.length} files`);
          await this.gas.updateProject(newFiles, scriptId);
        }
      } else if (syncMode === 'merge') {
        // Merge mode - combine local and remote changes
        throw new Error('Merge mode not yet implemented');
      }

      // Calculate statistics
      const stats = this.calculateStats(changes);

      return {
        scriptId,
        changes,
        totalFiles: stats.total,
        filesAdded: stats.added,
        filesModified: stats.modified,
        filesDeleted: stats.deleted,
        filesUnchanged: stats.unchanged,
        backupLocation,
        status: input.dryRun ? 'dry-run' : 'success',
        message: input.dryRun 
          ? `Dry run completed. ${stats.added} files would be added, ${stats.modified} modified, ${stats.deleted} deleted.`
          : `Successfully updated project. ${stats.added} files added, ${stats.modified} modified, ${stats.deleted} deleted.`,
        timestamp: new Date().toISOString(),
      };

    } catch (error: any) {
      this.logError(`Update failed: ${error.message}`);
      
      return {
        scriptId,
        changes: [],
        totalFiles: 0,
        filesAdded: 0,
        filesModified: 0,
        filesDeleted: 0,
        filesUnchanged: 0,
        status: 'failed',
        message: `Update failed: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  protected async handleError(
    error: Error,
    input: GASUpdateInput,
    context: AgentContext
  ): Promise<GASUpdateOutput> {
    return {
      scriptId: input.scriptId || '',
      changes: [],
      totalFiles: 0,
      filesAdded: 0,
      filesModified: 0,
      filesDeleted: 0,
      filesUnchanged: 0,
      status: 'failed',
      message: `Agent error: ${error.message}`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Calculate changes between current and new files
   */
  private async calculateChanges(
    currentFiles: GASFile[],
    newFiles: GASFile[]
  ): Promise<FileChange[]> {
    const changes: FileChange[] = [];
    const currentMap = new Map(currentFiles.map(f => [f.name, f]));
    const newMap = new Map(newFiles.map(f => [f.name, f]));

    // Check for added or modified files
    for (const [name, newFile] of newMap) {
      const currentFile = currentMap.get(name);
      
      if (!currentFile) {
        changes.push({
          name,
          type: 'added',
          newContent: newFile.source,
          hash: this.hashContent(newFile.source),
        });
      } else {
        const currentHash = this.hashContent(currentFile.source);
        const newHash = this.hashContent(newFile.source);
        
        if (currentHash !== newHash) {
          changes.push({
            name,
            type: 'modified',
            oldContent: currentFile.source,
            newContent: newFile.source,
            hash: newHash,
          });
        } else {
          changes.push({
            name,
            type: 'unchanged',
            hash: currentHash,
          });
        }
      }
    }

    // Check for deleted files
    for (const [name, currentFile] of currentMap) {
      if (!newMap.has(name)) {
        changes.push({
          name,
          type: 'deleted',
          oldContent: currentFile.source,
          hash: this.hashContent(currentFile.source),
        });
      }
    }

    return changes;
  }

  /**
   * Pull files from GAS to local directory
   */
  private async pullFiles(
    files: GASFile[],
    directory: string,
    dryRun?: boolean
  ): Promise<FileChange[]> {
    const changes: FileChange[] = [];

    // Ensure directory exists
    if (!dryRun && !fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    for (const file of files) {
      const ext = file.type === 'HTML' ? '.html' : '.gs';
      const filePath = path.join(directory, `${file.name}${ext}`);
      
      let changeType: FileChange['type'] = 'added';
      let oldContent: string | undefined;

      if (fs.existsSync(filePath)) {
        oldContent = fs.readFileSync(filePath, 'utf8');
        const oldHash = this.hashContent(oldContent);
        const newHash = this.hashContent(file.source);
        
        changeType = oldHash === newHash ? 'unchanged' : 'modified';
      }

      changes.push({
        name: file.name,
        type: changeType,
        oldContent,
        newContent: file.source,
        hash: this.hashContent(file.source),
      });

      if (!dryRun && changeType !== 'unchanged') {
        fs.writeFileSync(filePath, file.source, 'utf8');
        this.logInfo(`Pulled ${file.name}${ext}`);
      }
    }

    return changes;
  }

  /**
   * Create backup of current files
   */
  private async createBackup(scriptId: string, files: GASFile[]): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'gas-backups', scriptId, timestamp);
    
    fs.mkdirSync(backupDir, { recursive: true });

    for (const file of files) {
      const ext = file.type === 'HTML' ? '.html' : '.gs';
      const filePath = path.join(backupDir, `${file.name}${ext}`);
      fs.writeFileSync(filePath, file.source, 'utf8');
    }

    // Write metadata
    const metadata = {
      scriptId,
      timestamp,
      fileCount: files.length,
      files: files.map(f => ({ name: f.name, type: f.type, size: f.source.length })),
    };
    
    fs.writeFileSync(
      path.join(backupDir, 'backup-metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf8'
    );

    return backupDir;
  }

  /**
   * Validate JavaScript syntax
   */
  private async validateSyntax(files: GASFile[]): Promise<void> {
    for (const file of files) {
      if (file.type === 'SERVER_JS') {
        try {
          // Basic syntax check using Function constructor
          new Function(file.source);
        } catch (error: any) {
          throw new Error(`Syntax error in ${file.name}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Calculate content hash
   */
  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex').substring(0, 8);
  }

  /**
   * Calculate statistics from changes
   */
  private calculateStats(changes: FileChange[]): {
    total: number;
    added: number;
    modified: number;
    deleted: number;
    unchanged: number;
  } {
    return {
      total: changes.length,
      added: changes.filter(c => c.type === 'added').length,
      modified: changes.filter(c => c.type === 'modified').length,
      deleted: changes.filter(c => c.type === 'deleted').length,
      unchanged: changes.filter(c => c.type === 'unchanged').length,
    };
  }

  /**
   * Helper method to restore from backup
   */
  async restoreFromBackup(backupPath: string, scriptId?: string): Promise<GASUpdateOutput> {
    const metadataPath = path.join(backupPath, 'backup-metadata.json');
    
    if (!fs.existsSync(metadataPath)) {
      throw new Error('Invalid backup directory - metadata not found');
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const files: GASFile[] = [];

    // Read backup files
    for (const fileInfo of metadata.files) {
      const ext = fileInfo.type === 'HTML' ? '.html' : '.gs';
      const filePath = path.join(backupPath, `${fileInfo.name}${ext}`);
      
      if (fs.existsSync(filePath)) {
        files.push({
          name: fileInfo.name,
          type: fileInfo.type,
          source: fs.readFileSync(filePath, 'utf8'),
        });
      }
    }

    // Restore to GAS
    return this.execute({
      scriptId: scriptId || metadata.scriptId,
      files,
      syncMode: 'push',
    });
  }
}

// Export agent instance
export default new GASUpdateAgent();