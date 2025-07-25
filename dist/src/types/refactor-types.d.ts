import { z } from 'zod';
export declare const RefactorTypeEnum: z.ZodEnum<["basic", "advanced", "performance", "maintainability"]>;
export type RefactorType = z.infer<typeof RefactorTypeEnum>;
export declare const RefactorInputSchema: z.ZodObject<{
    filePath: z.ZodString;
    refactorType: z.ZodEnum<["basic", "advanced", "performance", "maintainability"]>;
    preserveComments: z.ZodBoolean;
    createBackup: z.ZodBoolean;
    maxComplexity: z.ZodOptional<z.ZodNumber>;
    minFunctionLength: z.ZodOptional<z.ZodNumber>;
    maxFunctionLength: z.ZodOptional<z.ZodNumber>;
    code: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    filePath: string;
    refactorType: "advanced" | "performance" | "basic" | "maintainability";
    preserveComments: boolean;
    createBackup: boolean;
    code?: string | undefined;
    maxComplexity?: number | undefined;
    minFunctionLength?: number | undefined;
    maxFunctionLength?: number | undefined;
}, {
    filePath: string;
    refactorType: "advanced" | "performance" | "basic" | "maintainability";
    preserveComments: boolean;
    createBackup: boolean;
    code?: string | undefined;
    maxComplexity?: number | undefined;
    minFunctionLength?: number | undefined;
    maxFunctionLength?: number | undefined;
}>;
export type RefactorInput = z.infer<typeof RefactorInputSchema>;
export interface RefactorChange {
    type: string;
    line: number;
    description: string;
}
export interface RefactorMetrics {
    complexityBefore: number;
    complexityAfter: number;
    linesOfCodeBefore: number;
    linesOfCodeAfter: number;
}
export interface RefactorResult {
    success: boolean;
    originalFile: string;
    refactoredFile: string;
    changes: RefactorChange[];
    metrics: RefactorMetrics;
    backupPath?: string;
    error?: string;
}
export interface DuplicateBlock {
    start: number;
    end: number;
    hash: string;
    occurrences: number;
}
export interface NameSuggestion {
    original: string;
    suggested: string;
    reason: string;
}
export interface FunctionInfo {
    name: string;
    start: number;
    end: number;
    complexity: number;
    linesOfCode: number;
}
export interface RefactorPromptConfig {
    systemPrompt: string;
    userPromptTemplate: string;
    temperature: number;
    maxTokens: number;
}
export declare const REFACTOR_CONFIG: {
    basic: {
        description: string;
        prompts: {
            systemPrompt: string;
            temperature: number;
            maxTokens: number;
        };
    };
    advanced: {
        description: string;
        prompts: {
            systemPrompt: string;
            temperature: number;
            maxTokens: number;
        };
    };
    performance: {
        description: string;
        prompts: {
            systemPrompt: string;
            temperature: number;
            maxTokens: number;
        };
    };
    maintainability: {
        description: string;
        prompts: {
            systemPrompt: string;
            temperature: number;
            maxTokens: number;
        };
    };
};
