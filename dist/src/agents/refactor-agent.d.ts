import { RefactorResult, RefactorInput } from '../types/refactor-types';
interface RefactorAgent {
    id: string;
    name: string;
    description: string;
    execute: (input: RefactorInput) => Promise<RefactorResult>;
}
export declare const refactorAgent: RefactorAgent;
export default refactorAgent;
