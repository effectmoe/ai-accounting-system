export declare function validateEnvironment(): {
    OPENAI_API_KEY?: string | undefined;
    ANTHROPIC_API_KEY?: string | undefined;
    NODE_ENV?: "development" | "production" | "staging" | undefined;
    PORT?: string | undefined;
};
export declare function testApiConnections(): Promise<{
    openai: boolean;
    anthropic: boolean;
    errors: string[];
}>;
export declare const diagnosticsRoute: (registerApiRoute: any) => any;
