interface MLDataPoint {
    id: string;
    timestamp: Date;
    features: Record<string, number>;
    label?: string;
    metadata?: Record<string, any>;
}
interface MLAnalysisRequest {
    data: MLDataPoint[];
    analysisType: 'classification' | 'anomaly_detection' | 'pattern_recognition' | 'prediction' | 'time_series' | 'clustering';
    parameters?: {
        targetFeature?: string;
        classificationMethod?: 'naive_bayes' | 'decision_tree' | 'knn' | 'svm';
        anomalyThreshold?: number;
        anomalyMethod?: 'isolation_forest' | 'one_class_svm' | 'statistical';
        patternType?: 'frequent' | 'sequential' | 'association';
        minSupport?: number;
        predictionHorizon?: number;
        predictionMethod?: 'linear_regression' | 'polynomial' | 'neural_network';
        timeWindow?: number;
        seasonality?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none';
        numberOfClusters?: number;
        clusteringMethod?: 'kmeans' | 'hierarchical' | 'dbscan';
    };
}
interface MLAnalysisResult {
    success: boolean;
    analysisType: string;
    results: {
        classifications?: Array<{
            id: string;
            predictedClass: string;
            confidence: number;
            features: Record<string, number>;
        }>;
        anomalies?: Array<{
            id: string;
            anomalyScore: number;
            isAnomaly: boolean;
            explanation: string;
        }>;
        patterns?: Array<{
            pattern: string;
            support: number;
            confidence: number;
            instances: string[];
        }>;
        predictions?: Array<{
            timestamp: Date;
            predictedValue: number;
            confidence: number;
            bounds?: {
                lower: number;
                upper: number;
            };
        }>;
        timeSeriesAnalysis?: {
            trend: 'increasing' | 'decreasing' | 'stable';
            seasonality: boolean;
            cyclical: boolean;
            volatility: number;
            forecast?: Array<{
                timestamp: Date;
                value: number;
                confidence: number;
            }>;
        };
        clusters?: Array<{
            clusterId: number;
            center: Record<string, number>;
            members: string[];
            characteristics: string[];
        }>;
    };
    metadata: {
        dataPoints: number;
        features: string[];
        executionTime: number;
        accuracy?: number;
        modelInfo?: Record<string, any>;
    };
    insights: string[];
    recommendations: string[];
    error?: string;
}
export declare class MLAnalyticsManager {
    private cache;
    private cacheExpiry;
    constructor();
    analyze(request: MLAnalysisRequest): Promise<MLAnalysisResult>;
    private performClassification;
    private performAnomalyDetection;
    private performPatternRecognition;
    private performPrediction;
    private performTimeSeriesAnalysis;
    private performClustering;
    private extractFeatureNames;
    private generateCacheKey;
    private cleanupCache;
    private getMostFrequentClass;
    private getValueRange;
    private calculateLinearTrend;
    private calculateAverageTimeInterval;
    private describeTrend;
    private analyzeTrend;
    private detectSeasonality;
    private detectCyclical;
    private calculateVolatility;
    private calculateAutocorrelation;
    private generateForecast;
    private performKMeans;
    private euclideanDistance;
    private generateClusterCharacteristics;
    healthCheck(): Promise<{
        available: boolean;
        capabilities: string[];
        performance: {
            cacheSize: number;
            avgExecutionTime: number;
        };
        error?: string;
    }>;
}
export {};
