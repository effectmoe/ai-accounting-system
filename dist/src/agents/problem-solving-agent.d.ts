import { z } from 'zod';
declare const problemSolvingSchema: z.ZodObject<{
    problem: z.ZodString;
    context: z.ZodObject<{
        priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "critical"]>>;
        domain: z.ZodDefault<z.ZodEnum<["accounting", "ocr", "customer", "general", "system"]>>;
        requiredTools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        constraints: z.ZodOptional<z.ZodObject<{
            timeLimit: z.ZodOptional<z.ZodNumber>;
            budgetLimit: z.ZodOptional<z.ZodNumber>;
            resourceLimit: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            timeLimit?: number | undefined;
            budgetLimit?: number | undefined;
            resourceLimit?: string[] | undefined;
        }, {
            timeLimit?: number | undefined;
            budgetLimit?: number | undefined;
            resourceLimit?: string[] | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        domain: "accounting" | "customer" | "general" | "ocr" | "system";
        priority: "high" | "low" | "medium" | "critical";
        requiredTools?: string[] | undefined;
        constraints?: {
            timeLimit?: number | undefined;
            budgetLimit?: number | undefined;
            resourceLimit?: string[] | undefined;
        } | undefined;
    }, {
        domain?: "accounting" | "customer" | "general" | "ocr" | "system" | undefined;
        priority?: "high" | "low" | "medium" | "critical" | undefined;
        requiredTools?: string[] | undefined;
        constraints?: {
            timeLimit?: number | undefined;
            budgetLimit?: number | undefined;
            resourceLimit?: string[] | undefined;
        } | undefined;
    }>;
    companyId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    companyId: string;
    problem: string;
    context: {
        domain: "accounting" | "customer" | "general" | "ocr" | "system";
        priority: "high" | "low" | "medium" | "critical";
        requiredTools?: string[] | undefined;
        constraints?: {
            timeLimit?: number | undefined;
            budgetLimit?: number | undefined;
            resourceLimit?: string[] | undefined;
        } | undefined;
    };
}, {
    companyId: string;
    problem: string;
    context: {
        domain?: "accounting" | "customer" | "general" | "ocr" | "system" | undefined;
        priority?: "high" | "low" | "medium" | "critical" | undefined;
        requiredTools?: string[] | undefined;
        constraints?: {
            timeLimit?: number | undefined;
            budgetLimit?: number | undefined;
            resourceLimit?: string[] | undefined;
        } | undefined;
    };
}>;
declare const analysisSchema: z.ZodObject<{
    dataType: z.ZodEnum<["financial", "customer", "document", "system", "performance"]>;
    data: z.ZodAny;
    analysisType: z.ZodEnum<["trend", "anomaly", "classification", "prediction", "comparison"]>;
    parameters: z.ZodOptional<z.ZodObject<{
        timeRange: z.ZodOptional<z.ZodObject<{
            startDate: z.ZodOptional<z.ZodString>;
            endDate: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            startDate?: string | undefined;
            endDate?: string | undefined;
        }, {
            startDate?: string | undefined;
            endDate?: string | undefined;
        }>>;
        filters: z.ZodOptional<z.ZodAny>;
        metrics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        filters?: any;
        metrics?: string[] | undefined;
        timeRange?: {
            startDate?: string | undefined;
            endDate?: string | undefined;
        } | undefined;
    }, {
        filters?: any;
        metrics?: string[] | undefined;
        timeRange?: {
            startDate?: string | undefined;
            endDate?: string | undefined;
        } | undefined;
    }>>;
    companyId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    companyId: string;
    analysisType: "classification" | "prediction" | "trend" | "anomaly" | "comparison";
    dataType: "customer" | "system" | "document" | "performance" | "financial";
    data?: any;
    parameters?: {
        filters?: any;
        metrics?: string[] | undefined;
        timeRange?: {
            startDate?: string | undefined;
            endDate?: string | undefined;
        } | undefined;
    } | undefined;
}, {
    companyId: string;
    analysisType: "classification" | "prediction" | "trend" | "anomaly" | "comparison";
    dataType: "customer" | "system" | "document" | "performance" | "financial";
    data?: any;
    parameters?: {
        filters?: any;
        metrics?: string[] | undefined;
        timeRange?: {
            startDate?: string | undefined;
            endDate?: string | undefined;
        } | undefined;
    } | undefined;
}>;
declare const researchSchema: z.ZodObject<{
    topic: z.ZodString;
    scope: z.ZodDefault<z.ZodEnum<["local", "web", "database", "comprehensive"]>>;
    parameters: z.ZodOptional<z.ZodObject<{
        depth: z.ZodDefault<z.ZodEnum<["shallow", "moderate", "deep"]>>;
        sources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        language: z.ZodDefault<z.ZodEnum<["ja", "en", "auto"]>>;
        includeRecent: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        language: "auto" | "ja" | "en";
        depth: "shallow" | "moderate" | "deep";
        includeRecent: boolean;
        sources?: string[] | undefined;
    }, {
        language?: "auto" | "ja" | "en" | undefined;
        depth?: "shallow" | "moderate" | "deep" | undefined;
        sources?: string[] | undefined;
        includeRecent?: boolean | undefined;
    }>>;
    companyId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    companyId: string;
    topic: string;
    scope: "local" | "web" | "database" | "comprehensive";
    parameters?: {
        language: "auto" | "ja" | "en";
        depth: "shallow" | "moderate" | "deep";
        includeRecent: boolean;
        sources?: string[] | undefined;
    } | undefined;
}, {
    companyId: string;
    topic: string;
    parameters?: {
        language?: "auto" | "ja" | "en" | undefined;
        depth?: "shallow" | "moderate" | "deep" | undefined;
        sources?: string[] | undefined;
        includeRecent?: boolean | undefined;
    } | undefined;
    scope?: "local" | "web" | "database" | "comprehensive" | undefined;
}>;
declare const problemSolvingInputSchema: z.ZodObject<{
    operation: z.ZodEnum<["solve_problem", "analyze_data", "research_topic", "optimize_process", "troubleshoot", "generate_insights", "ml_analysis", "anomaly_detection", "predictive_analysis", "cluster_analysis"]>;
    data: z.ZodUnion<[z.ZodObject<{
        problem: z.ZodString;
        context: z.ZodObject<{
            priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "critical"]>>;
            domain: z.ZodDefault<z.ZodEnum<["accounting", "ocr", "customer", "general", "system"]>>;
            requiredTools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            constraints: z.ZodOptional<z.ZodObject<{
                timeLimit: z.ZodOptional<z.ZodNumber>;
                budgetLimit: z.ZodOptional<z.ZodNumber>;
                resourceLimit: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                timeLimit?: number | undefined;
                budgetLimit?: number | undefined;
                resourceLimit?: string[] | undefined;
            }, {
                timeLimit?: number | undefined;
                budgetLimit?: number | undefined;
                resourceLimit?: string[] | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            domain: "accounting" | "customer" | "general" | "ocr" | "system";
            priority: "high" | "low" | "medium" | "critical";
            requiredTools?: string[] | undefined;
            constraints?: {
                timeLimit?: number | undefined;
                budgetLimit?: number | undefined;
                resourceLimit?: string[] | undefined;
            } | undefined;
        }, {
            domain?: "accounting" | "customer" | "general" | "ocr" | "system" | undefined;
            priority?: "high" | "low" | "medium" | "critical" | undefined;
            requiredTools?: string[] | undefined;
            constraints?: {
                timeLimit?: number | undefined;
                budgetLimit?: number | undefined;
                resourceLimit?: string[] | undefined;
            } | undefined;
        }>;
        companyId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        companyId: string;
        problem: string;
        context: {
            domain: "accounting" | "customer" | "general" | "ocr" | "system";
            priority: "high" | "low" | "medium" | "critical";
            requiredTools?: string[] | undefined;
            constraints?: {
                timeLimit?: number | undefined;
                budgetLimit?: number | undefined;
                resourceLimit?: string[] | undefined;
            } | undefined;
        };
    }, {
        companyId: string;
        problem: string;
        context: {
            domain?: "accounting" | "customer" | "general" | "ocr" | "system" | undefined;
            priority?: "high" | "low" | "medium" | "critical" | undefined;
            requiredTools?: string[] | undefined;
            constraints?: {
                timeLimit?: number | undefined;
                budgetLimit?: number | undefined;
                resourceLimit?: string[] | undefined;
            } | undefined;
        };
    }>, z.ZodObject<{
        dataType: z.ZodEnum<["financial", "customer", "document", "system", "performance"]>;
        data: z.ZodAny;
        analysisType: z.ZodEnum<["trend", "anomaly", "classification", "prediction", "comparison"]>;
        parameters: z.ZodOptional<z.ZodObject<{
            timeRange: z.ZodOptional<z.ZodObject<{
                startDate: z.ZodOptional<z.ZodString>;
                endDate: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                startDate?: string | undefined;
                endDate?: string | undefined;
            }, {
                startDate?: string | undefined;
                endDate?: string | undefined;
            }>>;
            filters: z.ZodOptional<z.ZodAny>;
            metrics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            filters?: any;
            metrics?: string[] | undefined;
            timeRange?: {
                startDate?: string | undefined;
                endDate?: string | undefined;
            } | undefined;
        }, {
            filters?: any;
            metrics?: string[] | undefined;
            timeRange?: {
                startDate?: string | undefined;
                endDate?: string | undefined;
            } | undefined;
        }>>;
        companyId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        companyId: string;
        analysisType: "classification" | "prediction" | "trend" | "anomaly" | "comparison";
        dataType: "customer" | "system" | "document" | "performance" | "financial";
        data?: any;
        parameters?: {
            filters?: any;
            metrics?: string[] | undefined;
            timeRange?: {
                startDate?: string | undefined;
                endDate?: string | undefined;
            } | undefined;
        } | undefined;
    }, {
        companyId: string;
        analysisType: "classification" | "prediction" | "trend" | "anomaly" | "comparison";
        dataType: "customer" | "system" | "document" | "performance" | "financial";
        data?: any;
        parameters?: {
            filters?: any;
            metrics?: string[] | undefined;
            timeRange?: {
                startDate?: string | undefined;
                endDate?: string | undefined;
            } | undefined;
        } | undefined;
    }>, z.ZodObject<{
        topic: z.ZodString;
        scope: z.ZodDefault<z.ZodEnum<["local", "web", "database", "comprehensive"]>>;
        parameters: z.ZodOptional<z.ZodObject<{
            depth: z.ZodDefault<z.ZodEnum<["shallow", "moderate", "deep"]>>;
            sources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            language: z.ZodDefault<z.ZodEnum<["ja", "en", "auto"]>>;
            includeRecent: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            language: "auto" | "ja" | "en";
            depth: "shallow" | "moderate" | "deep";
            includeRecent: boolean;
            sources?: string[] | undefined;
        }, {
            language?: "auto" | "ja" | "en" | undefined;
            depth?: "shallow" | "moderate" | "deep" | undefined;
            sources?: string[] | undefined;
            includeRecent?: boolean | undefined;
        }>>;
        companyId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        companyId: string;
        topic: string;
        scope: "local" | "web" | "database" | "comprehensive";
        parameters?: {
            language: "auto" | "ja" | "en";
            depth: "shallow" | "moderate" | "deep";
            includeRecent: boolean;
            sources?: string[] | undefined;
        } | undefined;
    }, {
        companyId: string;
        topic: string;
        parameters?: {
            language?: "auto" | "ja" | "en" | undefined;
            depth?: "shallow" | "moderate" | "deep" | undefined;
            sources?: string[] | undefined;
            includeRecent?: boolean | undefined;
        } | undefined;
        scope?: "local" | "web" | "database" | "comprehensive" | undefined;
    }>]>;
}, "strip", z.ZodTypeAny, {
    data: {
        companyId: string;
        problem: string;
        context: {
            domain: "accounting" | "customer" | "general" | "ocr" | "system";
            priority: "high" | "low" | "medium" | "critical";
            requiredTools?: string[] | undefined;
            constraints?: {
                timeLimit?: number | undefined;
                budgetLimit?: number | undefined;
                resourceLimit?: string[] | undefined;
            } | undefined;
        };
    } | {
        companyId: string;
        analysisType: "classification" | "prediction" | "trend" | "anomaly" | "comparison";
        dataType: "customer" | "system" | "document" | "performance" | "financial";
        data?: any;
        parameters?: {
            filters?: any;
            metrics?: string[] | undefined;
            timeRange?: {
                startDate?: string | undefined;
                endDate?: string | undefined;
            } | undefined;
        } | undefined;
    } | {
        companyId: string;
        topic: string;
        scope: "local" | "web" | "database" | "comprehensive";
        parameters?: {
            language: "auto" | "ja" | "en";
            depth: "shallow" | "moderate" | "deep";
            includeRecent: boolean;
            sources?: string[] | undefined;
        } | undefined;
    };
    operation: "anomaly_detection" | "solve_problem" | "analyze_data" | "research_topic" | "optimize_process" | "troubleshoot" | "generate_insights" | "ml_analysis" | "predictive_analysis" | "cluster_analysis";
}, {
    data: {
        companyId: string;
        problem: string;
        context: {
            domain?: "accounting" | "customer" | "general" | "ocr" | "system" | undefined;
            priority?: "high" | "low" | "medium" | "critical" | undefined;
            requiredTools?: string[] | undefined;
            constraints?: {
                timeLimit?: number | undefined;
                budgetLimit?: number | undefined;
                resourceLimit?: string[] | undefined;
            } | undefined;
        };
    } | {
        companyId: string;
        analysisType: "classification" | "prediction" | "trend" | "anomaly" | "comparison";
        dataType: "customer" | "system" | "document" | "performance" | "financial";
        data?: any;
        parameters?: {
            filters?: any;
            metrics?: string[] | undefined;
            timeRange?: {
                startDate?: string | undefined;
                endDate?: string | undefined;
            } | undefined;
        } | undefined;
    } | {
        companyId: string;
        topic: string;
        parameters?: {
            language?: "auto" | "ja" | "en" | undefined;
            depth?: "shallow" | "moderate" | "deep" | undefined;
            sources?: string[] | undefined;
            includeRecent?: boolean | undefined;
        } | undefined;
        scope?: "local" | "web" | "database" | "comprehensive" | undefined;
    };
    operation: "anomaly_detection" | "solve_problem" | "analyze_data" | "research_topic" | "optimize_process" | "troubleshoot" | "generate_insights" | "ml_analysis" | "predictive_analysis" | "cluster_analysis";
}>;
interface ProblemSolvingResult {
    success: boolean;
    solution?: {
        summary: string;
        steps: Array<{
            step: number;
            action: string;
            rationale: string;
            status: 'completed' | 'in_progress' | 'pending' | 'failed';
            tools_used?: string[];
            duration?: number;
        }>;
        recommendations: string[];
        risks?: string[];
        followUp?: string[];
    };
    analysis?: {
        findings: Array<{
            type: 'insight' | 'anomaly' | 'trend' | 'recommendation';
            description: string;
            confidence: number;
            impact: 'low' | 'medium' | 'high';
            evidence?: any;
        }>;
        metrics?: Record<string, number>;
        visualizations?: Array<{
            type: 'chart' | 'table' | 'graph';
            data: any;
            description: string;
        }>;
    };
    research?: {
        summary: string;
        sources: Array<{
            title: string;
            url?: string;
            type: 'database' | 'web' | 'document' | 'api';
            relevance: number;
            lastUpdated?: string;
        }>;
        keyFindings: string[];
        relatedTopics: string[];
    };
    reasoning: string;
    executionTime: number;
    resourcesUsed: string[];
    error?: string;
    metadata: {
        sessionId: string;
        timestamp: Date;
        agentVersion: string;
        llmModel: string;
    };
}
export declare function solveProblem(operation: string, data: any): Promise<ProblemSolvingResult>;
export declare function analyzeData(data: z.infer<typeof analysisSchema>): Promise<ProblemSolvingResult>;
export declare function generateReport(data: z.infer<typeof researchSchema>): Promise<ProblemSolvingResult>;
export declare function performMLAnalysis(operation: 'ml_analysis' | 'anomaly_detection' | 'predictive_analysis' | 'cluster_analysis', data: any): Promise<ProblemSolvingResult>;
export { problemSolvingSchema, analysisSchema, researchSchema, problemSolvingInputSchema, };
export type { ProblemSolvingResult };
