import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export declare class ToolManager {
    private server;
    private activeGroups;
    private readonly MAX_ACTIVE_GROUPS;
    private readonly toolToGroupMap;
    constructor(server: McpServer);
    loadGroup(groupName: string): Promise<void>;
    unloadGroup(groupName: string): Promise<void>;
    private getLeastRecentlyUsedGroup;
    getActiveGroups(): string[];
    private findGroupForTool;
    suggestAndLoadGroups(query: string): Promise<void>;
    getGroupTools(groupName: string): Promise<string[]>;
}
