import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export class MCPClientManager {
  private clients: Map<string, Client> = new Map();
  
  async connectServer(name: string, config: MCPServerConfig) {
    try {
      console.log(`Connecting to ${name} MCP server...`);
      
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: {
          ...process.env,
          ...config.env
        } as Record<string, string>
      });
      
      const client = new Client({
        name: `mastra-${name}`,
        version: '1.0.0'
      }, {
        capabilities: {}
      });
      
      await client.connect(transport);
      this.clients.set(name, client);
      
      console.log(`Connected to ${name} MCP server successfully`);
      return client;
    } catch (error) {
      console.error(`Failed to connect to ${name} MCP server:`, error);
      throw error;
    }
  }
  
  async callTool(serverName: string, toolName: string, args: any) {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`MCP server ${serverName} not connected`);
    }
    
    try {
      const result = await client.callTool({
        name: toolName,
        arguments: args
      });
      
      return result.content;
    } catch (error) {
      console.error(`Error calling tool ${toolName} on ${serverName}:`, error);
      throw error;
    }
  }
  
  async disconnect(serverName: string) {
    const client = this.clients.get(serverName);
    if (client) {
      await client.close();
      this.clients.delete(serverName);
      console.log(`Disconnected from ${serverName} MCP server`);
    }
  }
  
  async disconnectAll() {
    for (const [name, client] of this.clients) {
      await client.close();
      console.log(`Disconnected from ${name} MCP server`);
    }
    this.clients.clear();
  }
}

// シングルトンインスタンス
export const mcpManager = new MCPClientManager();