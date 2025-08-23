// Stub implementation for build time
// This prevents dynamic import issues during build

export class MCPManager {
  private static instance: MCPManager | null = null;
  
  private constructor() {}
  
  static getInstance(): MCPManager {
    if (!MCPManager.instance) {
      MCPManager.instance = new MCPManager();
    }
    return MCPManager.instance;
  }
  
  async initialize(): Promise<void> {
    // No-op for build
  }
  
  async startServer(): Promise<void> {
    // No-op for build
  }
  
  async stopServer(): Promise<void> {
    // No-op for build
  }
  
  async listTools(): Promise<any[]> {
    return [];
  }
  
  async executeTool(toolName: string, args: any): Promise<any> {
    return { success: false, error: 'MCP not available in build mode' };
  }
  
  isInitialized(): boolean {
    return false;
  }
  
  async destroy(): Promise<void> {
    // No-op for build
  }
}

export const mcpManager = MCPManager.getInstance();