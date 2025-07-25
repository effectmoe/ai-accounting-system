import { DuplicateBlock, NameSuggestion, FunctionInfo } from '../types/refactor-types';
export declare const refactoringUtils: {
    calculateComplexity(code: string): number;
    extractFunctions(ast: any): FunctionInfo[];
    findDuplicateCode(ast: any): DuplicateBlock[];
    suggestVariableNames(ast: any): NameSuggestion[];
    formatCode(code: string): Promise<string>;
    formatCode(code: string): Promise<string>;
    countLinesOfCode(code: string): number;
    parseCode(code: string): any;
    generateCode(ast: any): string;
    createBackup(filePath: string): Promise<string>;
};
