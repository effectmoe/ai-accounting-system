interface AgentConfig {
    id: string;
    name: string;
    description: string;
    inputSchema: any;
    tools: Record<string, {
        description: string;
        execute: (params: any) => Promise<any>;
    }>;
    execute: (context: {
        input: any;
        tools: any;
    }) => Promise<any>;
}
export declare function createAgent(config: AgentConfig): any;
export default createAgent;
