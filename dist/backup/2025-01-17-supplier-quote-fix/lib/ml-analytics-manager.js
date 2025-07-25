"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MLAnalyticsManager = void 0;
class MLAnalyticsManager {
    cache = new Map();
    cacheExpiry = 30 * 60 * 1000; // 30分
    constructor() {
        // キャッシュのクリーンアップを定期実行
        setInterval(() => {
            this.cleanupCache();
        }, 10 * 60 * 1000); // 10分ごと
    }
    /**
     * 機械学習分析を実行
     */
    async analyze(request) {
        const startTime = Date.now();
        // キャッシュキーの生成
        const cacheKey = this.generateCacheKey(request);
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }
        try {
            let result;
            switch (request.analysisType) {
                case 'classification':
                    result = await this.performClassification(request);
                    break;
                case 'anomaly_detection':
                    result = await this.performAnomalyDetection(request);
                    break;
                case 'pattern_recognition':
                    result = await this.performPatternRecognition(request);
                    break;
                case 'prediction':
                    result = await this.performPrediction(request);
                    break;
                case 'time_series':
                    result = await this.performTimeSeriesAnalysis(request);
                    break;
                case 'clustering':
                    result = await this.performClustering(request);
                    break;
                default:
                    throw new Error(`Unsupported analysis type: ${request.analysisType}`);
            }
            result.metadata.executionTime = Date.now() - startTime;
            // 結果をキャッシュ
            this.cache.set(cacheKey, result);
            return result;
        }
        catch (error) {
            return {
                success: false,
                analysisType: request.analysisType,
                results: {},
                metadata: {
                    dataPoints: request.data.length,
                    features: this.extractFeatureNames(request.data),
                    executionTime: Date.now() - startTime,
                },
                insights: [],
                recommendations: ['分析を再実行してください', 'データ品質を確認してください'],
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * データ分類を実行
     */
    async performClassification(request) {
        const { data, parameters } = request;
        const method = parameters?.classificationMethod || 'naive_bayes';
        // 簡易実装：特徴量に基づく分類
        const classifications = data.map(point => {
            const features = point.features;
            let predictedClass = 'unknown';
            let confidence = 0.5;
            // 簡易的な分類ロジック（実際の実装では機械学習ライブラリを使用）
            if (method === 'naive_bayes') {
                // 特徴量の合計に基づく簡易分類
                const featureSum = Object.values(features).reduce((sum, val) => sum + val, 0);
                const featureCount = Object.keys(features).length;
                const average = featureSum / featureCount;
                if (average > 0.7) {
                    predictedClass = 'high';
                    confidence = 0.8;
                }
                else if (average > 0.3) {
                    predictedClass = 'medium';
                    confidence = 0.7;
                }
                else {
                    predictedClass = 'low';
                    confidence = 0.6;
                }
            }
            return {
                id: point.id,
                predictedClass,
                confidence,
                features: point.features,
            };
        });
        // 精度計算（ラベルがある場合）
        let accuracy = undefined;
        const labeledData = data.filter(p => p.label);
        if (labeledData.length > 0) {
            const correct = classifications.filter((c, i) => labeledData[i] && labeledData[i].label === c.predictedClass).length;
            accuracy = correct / labeledData.length;
        }
        return {
            success: true,
            analysisType: 'classification',
            results: {
                classifications,
            },
            metadata: {
                dataPoints: data.length,
                features: this.extractFeatureNames(data),
                executionTime: 0,
                accuracy,
                modelInfo: { method },
            },
            insights: [
                `${classifications.length}件のデータポイントを分類しました`,
                `最も一般的なクラス: ${this.getMostFrequentClass(classifications)}`,
                accuracy ? `分類精度: ${(accuracy * 100).toFixed(1)}%` : '精度計算にはラベル付きデータが必要です',
            ],
            recommendations: [
                '分類結果の妥当性を確認してください',
                'より多くの特徴量を追加することで精度を向上させることができます',
                'ラベル付きデータを増やして精度を測定してください',
            ],
        };
    }
    /**
     * 異常検知を実行
     */
    async performAnomalyDetection(request) {
        const { data, parameters } = request;
        const threshold = parameters?.anomalyThreshold || 2.0;
        const method = parameters?.anomalyMethod || 'statistical';
        const anomalies = data.map(point => {
            const features = Object.values(point.features);
            let anomalyScore = 0;
            let isAnomaly = false;
            let explanation = '';
            if (method === 'statistical') {
                // Z-スコアベースの異常検知
                const mean = features.reduce((sum, val) => sum + val, 0) / features.length;
                const variance = features.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / features.length;
                const stdDev = Math.sqrt(variance);
                anomalyScore = Math.abs((features[0] - mean) / stdDev);
                isAnomaly = anomalyScore > threshold;
                explanation = isAnomaly ?
                    `統計的閾値(${threshold})を超過: ${anomalyScore.toFixed(2)}` :
                    `正常範囲内: ${anomalyScore.toFixed(2)}`;
            }
            return {
                id: point.id,
                anomalyScore,
                isAnomaly,
                explanation,
            };
        });
        const anomalyCount = anomalies.filter(a => a.isAnomaly).length;
        const anomalyRate = anomalyCount / data.length;
        return {
            success: true,
            analysisType: 'anomaly_detection',
            results: {
                anomalies,
            },
            metadata: {
                dataPoints: data.length,
                features: this.extractFeatureNames(data),
                executionTime: 0,
                modelInfo: { method, threshold },
            },
            insights: [
                `${anomalyCount}件の異常が検出されました (${(anomalyRate * 100).toFixed(1)}%)`,
                anomalyRate > 0.1 ? '異常率が高いです' : '異常率は正常範囲内です',
                `使用した検知手法: ${method}`,
            ],
            recommendations: [
                '異常データの詳細調査を実施してください',
                anomalyRate > 0.2 ? '閾値の調整を検討してください' : '',
                '異常の根本原因を特定してください',
            ].filter(Boolean),
        };
    }
    /**
     * パターン認識を実行
     */
    async performPatternRecognition(request) {
        const { data, parameters } = request;
        const patternType = parameters?.patternType || 'frequent';
        const minSupport = parameters?.minSupport || 0.1;
        const patterns = [];
        if (patternType === 'frequent') {
            // 頻出パターンの検出
            const featurePatterns = new Map();
            data.forEach(point => {
                Object.entries(point.features).forEach(([feature, value]) => {
                    const range = this.getValueRange(value);
                    const patternKey = `${feature}:${range}`;
                    if (!featurePatterns.has(patternKey)) {
                        featurePatterns.set(patternKey, []);
                    }
                    featurePatterns.get(patternKey).push(point.id);
                });
            });
            // 最小支持度を満たすパターンを抽出
            featurePatterns.forEach((instances, pattern) => {
                const support = instances.length / data.length;
                if (support >= minSupport) {
                    patterns.push({
                        pattern,
                        support,
                        confidence: support, // 簡易実装
                        instances,
                    });
                }
            });
        }
        // パターンを支持度順にソート
        patterns.sort((a, b) => b.support - a.support);
        return {
            success: true,
            analysisType: 'pattern_recognition',
            results: {
                patterns: patterns.slice(0, 10), // 上位10パターン
            },
            metadata: {
                dataPoints: data.length,
                features: this.extractFeatureNames(data),
                executionTime: 0,
                modelInfo: { patternType, minSupport },
            },
            insights: [
                `${patterns.length}個の有意なパターンが発見されました`,
                patterns.length > 0 ? `最も頻出のパターン: ${patterns[0].pattern}` : 'パターンが見つかりませんでした',
                `最小支持度: ${minSupport}`,
            ],
            recommendations: [
                'パターンの業務的意味を検討してください',
                patterns.length === 0 ? '最小支持度を下げることを検討してください' : '',
                '発見されたパターンを業務改善に活用してください',
            ].filter(Boolean),
        };
    }
    /**
     * 予測分析を実行
     */
    async performPrediction(request) {
        const { data, parameters } = request;
        const horizon = parameters?.predictionHorizon || 5;
        const method = parameters?.predictionMethod || 'linear_regression';
        // 時系列データを作成（タイムスタンプでソート）
        const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const predictions = [];
        if (method === 'linear_regression') {
            // 簡易線形回帰による予測
            const values = sortedData.map(d => Object.values(d.features)[0] || 0);
            const trend = this.calculateLinearTrend(values);
            const lastTimestamp = sortedData[sortedData.length - 1].timestamp;
            const timeInterval = this.calculateAverageTimeInterval(sortedData);
            for (let i = 1; i <= horizon; i++) {
                const predictedTimestamp = new Date(lastTimestamp.getTime() + timeInterval * i);
                const predictedValue = values[values.length - 1] + trend * i;
                const confidence = Math.max(0.1, 1 - (i - 1) * 0.1); // 遠い未来ほど信頼度低下
                predictions.push({
                    timestamp: predictedTimestamp,
                    predictedValue,
                    confidence,
                    bounds: {
                        lower: predictedValue * 0.8,
                        upper: predictedValue * 1.2,
                    },
                });
            }
        }
        return {
            success: true,
            analysisType: 'prediction',
            results: {
                predictions,
            },
            metadata: {
                dataPoints: data.length,
                features: this.extractFeatureNames(data),
                executionTime: 0,
                modelInfo: { method, horizon },
            },
            insights: [
                `${horizon}期間先まで予測しました`,
                predictions.length > 0 ? `予測トレンド: ${this.describeTrend(predictions)}` : '',
                `予測手法: ${method}`,
            ],
            recommendations: [
                '予測結果を実績と比較して精度を評価してください',
                'より多くの履歴データで予測精度を向上させてください',
                '外部要因も考慮した予測モデルの検討をお勧めします',
            ],
        };
    }
    /**
     * 時系列分析を実行
     */
    async performTimeSeriesAnalysis(request) {
        const { data, parameters } = request;
        const timeWindow = parameters?.timeWindow || 7;
        const seasonality = parameters?.seasonality || 'weekly';
        // 時系列データの準備
        const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const values = sortedData.map(d => Object.values(d.features)[0] || 0);
        // トレンド分析
        const trend = this.analyzeTrend(values);
        // 季節性分析
        const hasSeasonality = this.detectSeasonality(values, seasonality);
        // 周期性分析
        const hasCyclical = this.detectCyclical(values);
        // ボラティリティ計算
        const volatility = this.calculateVolatility(values);
        // 簡易予測
        const forecast = this.generateForecast(sortedData, timeWindow);
        return {
            success: true,
            analysisType: 'time_series',
            results: {
                timeSeriesAnalysis: {
                    trend,
                    seasonality: hasSeasonality,
                    cyclical: hasCyclical,
                    volatility,
                    forecast,
                },
            },
            metadata: {
                dataPoints: data.length,
                features: this.extractFeatureNames(data),
                executionTime: 0,
                modelInfo: { timeWindow, seasonality },
            },
            insights: [
                `データのトレンド: ${trend}`,
                `季節性: ${hasSeasonality ? '検出' : '未検出'}`,
                `周期性: ${hasCyclical ? '検出' : '未検出'}`,
                `ボラティリティ: ${volatility.toFixed(2)}`,
            ],
            recommendations: [
                trend === 'increasing' ? '成長トレンドを維持する施策を検討してください' :
                    trend === 'decreasing' ? '下降トレンドの原因調査と対策を検討してください' :
                        '安定したトレンドを維持してください',
                hasSeasonality ? '季節性を考慮した計画立案を行ってください' : '',
                volatility > 0.5 ? '変動が大きいため、リスク管理を強化してください' : '',
            ].filter(Boolean),
        };
    }
    /**
     * クラスタリングを実行
     */
    async performClustering(request) {
        const { data, parameters } = request;
        const numberOfClusters = parameters?.numberOfClusters || 3;
        const method = parameters?.clusteringMethod || 'kmeans';
        // 簡易K-means実装
        const clusters = this.performKMeans(data, numberOfClusters);
        return {
            success: true,
            analysisType: 'clustering',
            results: {
                clusters,
            },
            metadata: {
                dataPoints: data.length,
                features: this.extractFeatureNames(data),
                executionTime: 0,
                modelInfo: { method, numberOfClusters },
            },
            insights: [
                `データを${numberOfClusters}個のクラスターに分類しました`,
                `最大クラスターサイズ: ${Math.max(...clusters.map(c => c.members.length))}`,
                `最小クラスターサイズ: ${Math.min(...clusters.map(c => c.members.length))}`,
            ],
            recommendations: [
                '各クラスターの特徴を分析してください',
                'クラスター数を調整して最適化を検討してください',
                'クラスター結果を業務戦略に活用してください',
            ],
        };
    }
    // ユーティリティメソッド
    extractFeatureNames(data) {
        if (data.length === 0)
            return [];
        return Object.keys(data[0].features);
    }
    generateCacheKey(request) {
        return JSON.stringify({
            type: request.analysisType,
            dataLength: request.data.length,
            params: request.parameters,
            firstDataId: request.data[0]?.id,
        });
    }
    cleanupCache() {
        const now = Date.now();
        const entries = Array.from(this.cache.entries());
        for (const [key, result] of entries) {
            if (now - result.metadata.executionTime > this.cacheExpiry) {
                this.cache.delete(key);
            }
        }
    }
    getMostFrequentClass(classifications) {
        const counts = new Map();
        classifications.forEach(c => {
            counts.set(c.predictedClass, (counts.get(c.predictedClass) || 0) + 1);
        });
        return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
    }
    getValueRange(value) {
        if (value < 0.2)
            return 'very_low';
        if (value < 0.4)
            return 'low';
        if (value < 0.6)
            return 'medium';
        if (value < 0.8)
            return 'high';
        return 'very_high';
    }
    calculateLinearTrend(values) {
        if (values.length < 2)
            return 0;
        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = values.reduce((sum, val, i) => sum + val * i, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
        return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }
    calculateAverageTimeInterval(data) {
        if (data.length < 2)
            return 24 * 60 * 60 * 1000; // 1日をデフォルト
        const intervals = [];
        for (let i = 1; i < data.length; i++) {
            intervals.push(data[i].timestamp.getTime() - data[i - 1].timestamp.getTime());
        }
        return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    }
    describeTrend(predictions) {
        if (predictions.length < 2)
            return '不明';
        const first = predictions[0].predictedValue;
        const last = predictions[predictions.length - 1].predictedValue;
        if (last > first * 1.1)
            return '上昇傾向';
        if (last < first * 0.9)
            return '下降傾向';
        return '横ばい';
    }
    analyzeTrend(values) {
        if (values.length < 2)
            return 'stable';
        const trend = this.calculateLinearTrend(values);
        if (trend > 0.01)
            return 'increasing';
        if (trend < -0.01)
            return 'decreasing';
        return 'stable';
    }
    detectSeasonality(values, seasonality) {
        // 簡易実装：季節性パターンの検出
        const period = seasonality === 'daily' ? 1 :
            seasonality === 'weekly' ? 7 :
                seasonality === 'monthly' ? 30 : 365;
        if (values.length < period * 2)
            return false;
        // 自己相関による季節性検出
        const correlation = this.calculateAutocorrelation(values, period);
        return Math.abs(correlation) > 0.3;
    }
    detectCyclical(values) {
        // 簡易実装：周期性の検出
        return this.calculateVolatility(values) > 0.2 && values.length > 10;
    }
    calculateVolatility(values) {
        if (values.length < 2)
            return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance) / mean;
    }
    calculateAutocorrelation(values, lag) {
        if (values.length <= lag)
            return 0;
        const n = values.length - lag;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < n; i++) {
            numerator += (values[i] - mean) * (values[i + lag] - mean);
        }
        for (let i = 0; i < values.length; i++) {
            denominator += Math.pow(values[i] - mean, 2);
        }
        return numerator / denominator;
    }
    generateForecast(data, window) {
        if (data.length === 0)
            return [];
        const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const lastTimestamp = sortedData[sortedData.length - 1].timestamp;
        const timeInterval = this.calculateAverageTimeInterval(sortedData);
        const values = sortedData.map(d => Object.values(d.features)[0] || 0);
        const trend = this.calculateLinearTrend(values);
        const forecast = [];
        for (let i = 1; i <= window; i++) {
            const timestamp = new Date(lastTimestamp.getTime() + timeInterval * i);
            const value = values[values.length - 1] + trend * i;
            const confidence = Math.max(0.1, 1 - (i - 1) * 0.15);
            forecast.push({ timestamp, value, confidence });
        }
        return forecast;
    }
    performKMeans(data, k) {
        // 簡易K-means実装
        const features = this.extractFeatureNames(data);
        const points = data.map(d => ({
            id: d.id,
            values: features.map(f => d.features[f] || 0),
        }));
        // 初期中心点をランダムに選択
        const centers = [];
        for (let i = 0; i < k; i++) {
            const randomPoint = points[Math.floor(Math.random() * points.length)];
            centers.push([...randomPoint.values]);
        }
        // クラスター割り当て
        const assignments = new Array(points.length);
        for (let iter = 0; iter < 10; iter++) { // 最大10回反復
            // 各点を最近の中心に割り当て
            for (let i = 0; i < points.length; i++) {
                let minDistance = Infinity;
                let closestCenter = 0;
                for (let j = 0; j < centers.length; j++) {
                    const distance = this.euclideanDistance(points[i].values, centers[j]);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestCenter = j;
                    }
                }
                assignments[i] = closestCenter;
            }
            // 中心点を更新
            for (let j = 0; j < centers.length; j++) {
                const clusterPoints = points.filter((_, i) => assignments[i] === j);
                if (clusterPoints.length > 0) {
                    for (let dim = 0; dim < features.length; dim++) {
                        centers[j][dim] = clusterPoints.reduce((sum, p) => sum + p.values[dim], 0) / clusterPoints.length;
                    }
                }
            }
        }
        // クラスター結果の構築
        const clusters = [];
        for (let i = 0; i < k; i++) {
            const members = points.filter((_, idx) => assignments[idx] === i);
            const center = {};
            features.forEach((feature, idx) => {
                center[feature] = centers[i][idx];
            });
            clusters.push({
                clusterId: i,
                center,
                members: members.map(m => m.id),
                characteristics: this.generateClusterCharacteristics(center, features),
            });
        }
        return clusters;
    }
    euclideanDistance(a, b) {
        return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
    }
    generateClusterCharacteristics(center, features) {
        const characteristics = [];
        features.forEach(feature => {
            const value = center[feature];
            if (value > 0.8)
                characteristics.push(`高い${feature}`);
            else if (value < 0.2)
                characteristics.push(`低い${feature}`);
            else
                characteristics.push(`中程度の${feature}`);
        });
        return characteristics;
    }
    /**
     * MLモデルの健全性チェック
     */
    async healthCheck() {
        try {
            // テストデータでの動作確認
            const testData = [
                {
                    id: 'test1',
                    timestamp: new Date(),
                    features: { feature1: 0.5, feature2: 0.7 },
                },
                {
                    id: 'test2',
                    timestamp: new Date(),
                    features: { feature1: 0.3, feature2: 0.9 },
                },
            ];
            const testRequest = {
                data: testData,
                analysisType: 'classification',
            };
            const result = await this.analyze(testRequest);
            return {
                available: result.success,
                capabilities: [
                    'classification',
                    'anomaly_detection',
                    'pattern_recognition',
                    'prediction',
                    'time_series',
                    'clustering',
                ],
                performance: {
                    cacheSize: this.cache.size,
                    avgExecutionTime: result.metadata.executionTime,
                },
            };
        }
        catch (error) {
            return {
                available: false,
                capabilities: [],
                performance: { cacheSize: 0, avgExecutionTime: 0 },
                error: error instanceof Error ? error.message : 'Health check failed',
            };
        }
    }
}
exports.MLAnalyticsManager = MLAnalyticsManager;
