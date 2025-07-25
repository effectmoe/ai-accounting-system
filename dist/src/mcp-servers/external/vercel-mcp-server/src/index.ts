import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ToolManager } from "./tool-manager.js";
import { registerResources } from "./resources.js";

import { logger } from '@/lib/logger';
export const BASE_URL = "https://api.vercel.com";
export const DEFAULT_ACCESS_TOKEN = "Your_Access_Token"; // Replace with your actual token

// Utility function to handle responses
export async function handleResponse(response: Response): Promise<any> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
  }
  return response.json();
}

async function main() {
  try {
    // Create an MCP server instance for Vercel tools
    const server = new McpServer({
      name: "vercel-tools",
      version: "1.0.0"
    });

    // Register resources (these are always available)
    registerResources(server);

    // Create tool manager
    const toolManager = new ToolManager(server);

    // Load only essential groups initially
    await toolManager.loadGroup('projects'); // Most commonly used
    await toolManager.loadGroup('infrastructure'); // Contains core functionality

    // Create transport
    const transport = new StdioServerTransport();

    // Connect transport to server
    await server.connect(transport);

    // Log startup
    logger.error("Vercel MCP Server running on stdio");

    // Keep the process running
    process.stdin.resume();

    // Handle process termination
    process.on('SIGINT', () => {
      logger.error("Shutting down...");
      process.exit(0);
    });

  } catch (error) {
    logger.error("Fatal error:", error);
    process.exit(1);
  }
}

main();
