import { getDatabase } from '@/lib/mongodb-client';
import { logger } from '@/lib/logger';

/**
 * 新商品を登録
 */
export const createProductTool = {
  name: 'create_product',
  description: '新商品を登録します',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: '商品名' },
      name_kana: { type: 'string', description: '商品名（カナ）' },
      code: { type: 'string', description: '商品コード' },
      jan_code: { type: 'string', description: 'JANコード' },
      category: { type: 'string', description: 'カテゴリ' },
      unit_price: { type: 'number', description: '単価' },
      cost_price: { type: 'number', description: '原価' },
      tax_type: { type: 'string', enum: ['standard', 'reduced', 'exempt'], description: '税区分' },
      stock_management: { type: 'boolean', description: '在庫管理対象か' },
      description: { type: 'string', description: '商品説明' },
    },
    required: ['name', 'code', 'unit_price', 'tax_type'],
  },
  handler: async (params: any) => {
    logger.info('Creating product:', params);
    
    const db = await getDatabase();
    const collection = db.collection('products');
    
    // 商品コードの重複チェック
    const existing = await collection.findOne({ code: params.code });
    if (existing) {
      return {
        success: false,
        error: `商品コード ${params.code} は既に使用されています`,
      };
    }
    
    // JANコードのバリデーション（13桁または8桁）
    if (params.jan_code && ![8, 13].includes(params.jan_code.length)) {
      return {
        success: false,
        error: 'JANコードは8桁または13桁である必要があります',
      };
    }
    
    // 利益率の計算
    const profitMargin = params.cost_price 
      ? ((params.unit_price - params.cost_price) / params.unit_price * 100).toFixed(2)
      : null;
    
    const product = {
      name: params.name,
      name_kana: params.name_kana || '',
      code: params.code,
      jan_code: params.jan_code || '',
      category: params.category || '未分類',
      unit_price: params.unit_price,
      cost_price: params.cost_price || 0,
      profit_margin: profitMargin,
      tax_type: params.tax_type,
      tax_rate: params.tax_type === 'reduced' ? 0.08 : params.tax_type === 'exempt' ? 0 : 0.1,
      stock_management: params.stock_management ?? true,
      description: params.description || '',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
      // 初期在庫情報
      stock_info: {
        current_stock: 0,
        reserved_stock: 0,
        available_stock: 0,
        reorder_point: 0,
        reorder_quantity: 0,
      },
      // 販売統計（初期値）
      sales_stats: {
        total_sold: 0,
        total_revenue: 0,
        last_sold_date: null,
        average_daily_sales: 0,
      },
    };
    
    const result = await collection.insertOne(product);
    
    return {
      success: true,
      product_id: result.insertedId.toString(),
      product: {
        ...product,
        _id: result.insertedId,
      },
      message: `商品「${params.name}」を登録しました`,
      next_steps: [
        '初期在庫の登録',
        '発注点の設定',
        '商品画像の追加',
        '関連商品の設定',
      ],
    };
  }
};

/**
 * 在庫分析を実行
 */
export const analyzeInventoryTool = {
  name: 'analyze_inventory',
  description: '在庫分析を実行します',
  parameters: {
    type: 'object',
    properties: {
      analysis_type: {
        type: 'string',
        enum: ['abc_analysis', 'turnover_rate', 'dead_stock', 'reorder_point', 'seasonal_trend'],
        description: '分析タイプ',
      },
      period_days: { type: 'number', description: '分析期間（日数）' },
      category_filter: { type: 'string', description: 'カテゴリフィルター' },
      warehouse_id: { type: 'string', description: '倉庫ID' },
    },
    required: ['analysis_type'],
  },
  handler: async (params: any) => {
    logger.info('Analyzing inventory:', params);
    
    const db = await getDatabase();
    const productsCollection = db.collection('products');
    const inventoryCollection = db.collection('inventory_movements');
    
    const periodDays = params.period_days || 90;
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    
    let analysisResult: any = {
      analysis_type: params.analysis_type,
      period: {
        days: periodDays,
        start_date: startDate,
        end_date: new Date(),
      },
    };
    
    switch (params.analysis_type) {
      case 'abc_analysis':
        // ABC分析（売上貢献度による分類）
        const products = await productsCollection.find(
          params.category_filter ? { category: params.category_filter } : {}
        ).toArray();
        
        // 売上データの集計
        const productSales = await Promise.all(products.map(async (product) => {
          const sales = await inventoryCollection.aggregate([
            {
              $match: {
                product_id: product._id,
                type: 'sale',
                date: { $gte: startDate },
              },
            },
            {
              $group: {
                _id: null,
                total_quantity: { $sum: '$quantity' },
                total_revenue: { $sum: { $multiply: ['$quantity', '$unit_price'] } },
              },
            },
          ]).toArray();
          
          return {
            product_id: product._id,
            product_name: product.name,
            product_code: product.code,
            total_revenue: sales[0]?.total_revenue || 0,
            total_quantity: sales[0]?.total_quantity || 0,
          };
        }));
        
        // 売上高順にソート
        productSales.sort((a, b) => b.total_revenue - a.total_revenue);
        
        // 累積売上高の計算とABC分類
        const totalRevenue = productSales.reduce((sum, p) => sum + p.total_revenue, 0);
        let cumulativeRevenue = 0;
        
        const abcClassification = productSales.map(product => {
          cumulativeRevenue += product.total_revenue;
          const cumulativePercentage = (cumulativeRevenue / totalRevenue) * 100;
          
          let classification = 'C';
          if (cumulativePercentage <= 70) classification = 'A';
          else if (cumulativePercentage <= 90) classification = 'B';
          
          return {
            ...product,
            revenue_percentage: ((product.total_revenue / totalRevenue) * 100).toFixed(2),
            cumulative_percentage: cumulativePercentage.toFixed(2),
            classification,
          };
        });
        
        analysisResult.abc_analysis = {
          total_revenue: totalRevenue,
          classifications: {
            A: abcClassification.filter(p => p.classification === 'A'),
            B: abcClassification.filter(p => p.classification === 'B'),
            C: abcClassification.filter(p => p.classification === 'C'),
          },
          summary: {
            A_items_count: abcClassification.filter(p => p.classification === 'A').length,
            B_items_count: abcClassification.filter(p => p.classification === 'B').length,
            C_items_count: abcClassification.filter(p => p.classification === 'C').length,
          },
        };
        
        analysisResult.recommendations = [
          'A商品：在庫切れを避けるため、安全在庫を高めに設定',
          'B商品：標準的な在庫管理を実施',
          'C商品：在庫削減を検討、廃番候補の評価',
        ];
        break;
        
      case 'turnover_rate':
        // 在庫回転率分析
        const turnoverData = await productsCollection.aggregate([
          {
            $lookup: {
              from: 'inventory_movements',
              let: { product_id: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$product_id', '$$product_id'] },
                        { $eq: ['$type', 'sale'] },
                        { $gte: ['$date', startDate] },
                      ],
                    },
                  },
                },
                {
                  $group: {
                    _id: null,
                    total_sold: { $sum: '$quantity' },
                  },
                },
              ],
              as: 'sales_data',
            },
          },
          {
            $project: {
              name: 1,
              code: 1,
              current_stock: '$stock_info.current_stock',
              total_sold: { $ifNull: [{ $arrayElemAt: ['$sales_data.total_sold', 0] }, 0] },
              average_stock: { $avg: ['$stock_info.current_stock', 0] }, // 簡易計算
            },
          },
          {
            $addFields: {
              turnover_rate: {
                $cond: {
                  if: { $eq: ['$average_stock', 0] },
                  then: 0,
                  else: { $divide: ['$total_sold', '$average_stock'] },
                },
              },
              days_of_inventory: {
                $cond: {
                  if: { $eq: ['$total_sold', 0] },
                  then: 999,
                  else: { $divide: [{ $multiply: ['$current_stock', periodDays] }, '$total_sold'] },
                },
              },
            },
          },
        ]).toArray();
        
        analysisResult.turnover_analysis = {
          products: turnoverData.sort((a, b) => b.turnover_rate - a.turnover_rate),
          average_turnover_rate: (turnoverData.reduce((sum, p) => sum + p.turnover_rate, 0) / turnoverData.length).toFixed(2),
          high_performers: turnoverData.filter(p => p.turnover_rate > 12), // 年12回転以上
          low_performers: turnoverData.filter(p => p.turnover_rate < 4), // 年4回転未満
        };
        break;
        
      case 'dead_stock':
        // 死蔵在庫の検出
        const deadStockThreshold = 180; // 180日以上動きがない在庫
        
        const deadStock = await productsCollection.aggregate([
          {
            $lookup: {
              from: 'inventory_movements',
              let: { product_id: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$product_id', '$$product_id'] },
                        { $in: ['$type', ['sale', 'purchase']] },
                      ],
                    },
                  },
                },
                {
                  $sort: { date: -1 },
                },
                {
                  $limit: 1,
                },
              ],
              as: 'last_movement',
            },
          },
          {
            $addFields: {
              last_movement_date: { $arrayElemAt: ['$last_movement.date', 0] },
              days_since_movement: {
                $divide: [
                  { $subtract: [new Date(), { $ifNull: [{ $arrayElemAt: ['$last_movement.date', 0] }, '$created_at'] }] },
                  1000 * 60 * 60 * 24,
                ],
              },
            },
          },
          {
            $match: {
              $and: [
                { 'stock_info.current_stock': { $gt: 0 } },
                { days_since_movement: { $gte: deadStockThreshold } },
              ],
            },
          },
        ]).toArray();
        
        analysisResult.dead_stock = {
          threshold_days: deadStockThreshold,
          dead_stock_items: deadStock,
          total_dead_stock_value: deadStock.reduce((sum, item) => 
            sum + (item.stock_info.current_stock * item.unit_price), 0
          ),
          recommendations: [
            '特別セールでの在庫処分',
            'バンドル商品としての販売',
            '廃棄処分の検討',
            '仕入先への返品交渉',
          ],
        };
        break;
        
      case 'reorder_point':
        // 発注点の最適化分析
        const reorderAnalysis = await productsCollection.aggregate([
          {
            $lookup: {
              from: 'inventory_movements',
              let: { product_id: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$product_id', '$$product_id'] },
                        { $eq: ['$type', 'sale'] },
                        { $gte: ['$date', startDate] },
                      ],
                    },
                  },
                },
                {
                  $group: {
                    _id: {
                      $dateToString: { format: '%Y-%m-%d', date: '$date' },
                    },
                    daily_sales: { $sum: '$quantity' },
                  },
                },
              ],
              as: 'daily_sales',
            },
          },
          {
            $addFields: {
              average_daily_demand: { $avg: '$daily_sales.daily_sales' },
              demand_std_dev: { $stdDevPop: '$daily_sales.daily_sales' },
            },
          },
        ]).toArray();
        
        analysisResult.reorder_point_analysis = reorderAnalysis.map(product => {
          const leadTimeDays = 7; // デフォルトリードタイム
          const serviceLevel = 0.95; // 95%のサービスレベル
          const zScore = 1.65; // 95%のz値
          
          const avgDemand = product.average_daily_demand || 0;
          const stdDev = product.demand_std_dev || 0;
          
          const reorderPoint = Math.ceil(
            (avgDemand * leadTimeDays) + (zScore * stdDev * Math.sqrt(leadTimeDays))
          );
          
          const reorderQuantity = Math.ceil(avgDemand * 30); // 30日分
          
          return {
            product_id: product._id,
            product_name: product.name,
            average_daily_demand: avgDemand.toFixed(2),
            demand_variability: stdDev.toFixed(2),
            current_reorder_point: product.stock_info?.reorder_point || 0,
            recommended_reorder_point: reorderPoint,
            recommended_reorder_quantity: reorderQuantity,
            needs_adjustment: Math.abs((product.stock_info?.reorder_point || 0) - reorderPoint) > 5,
          };
        });
        break;
    }
    
    return {
      success: true,
      analysis: analysisResult,
      export_available: true,
      export_formats: ['excel', 'csv', 'pdf'],
    };
  }
};

/**
 * 価格最適化を提案
 */
export const optimizePricingTool = {
  name: 'optimize_pricing',
  description: '価格最適化を提案します',
  parameters: {
    type: 'object',
    properties: {
      product_id: { type: 'string', description: '商品ID' },
      optimization_goal: {
        type: 'string',
        enum: ['maximize_profit', 'maximize_volume', 'match_competition', 'clear_inventory'],
        description: '最適化目標',
      },
      competitor_prices: { type: 'array', items: { type: 'number' }, description: '競合価格' },
      price_elasticity: { type: 'number', description: '価格弾力性' },
      constraints: {
        type: 'object',
        properties: {
          min_margin: { type: 'number', description: '最低利益率' },
          max_price: { type: 'number', description: '最高価格' },
          min_price: { type: 'number', description: '最低価格' },
        },
      },
    },
    required: ['product_id', 'optimization_goal'],
  },
  handler: async (params: any) => {
    logger.info('Optimizing pricing:', params);
    
    const db = await getDatabase();
    const productsCollection = db.collection('products');
    const salesCollection = db.collection('inventory_movements');
    
    // 商品情報の取得
    const product = await productsCollection.findOne({ _id: params.product_id });
    if (!product) {
      return {
        success: false,
        error: '商品が見つかりません',
      };
    }
    
    // 過去の販売データから価格弾力性を推定（簡易版）
    const elasticity = params.price_elasticity || -1.5; // デフォルト値
    
    let optimizedPrice = product.unit_price;
    let reasoning = '';
    let projectedImpact: any = {};
    
    switch (params.optimization_goal) {
      case 'maximize_profit':
        // 利益最大化
        // 最適価格 = 原価 / (1 + 1/|弾力性|)
        const optimalMarkup = 1 / Math.abs(elasticity);
        optimizedPrice = product.cost_price / (1 - optimalMarkup);
        reasoning = '需要の価格弾力性に基づいて利益を最大化する価格を計算しました';
        
        projectedImpact = {
          current_margin: ((product.unit_price - product.cost_price) / product.unit_price * 100).toFixed(2) + '%',
          new_margin: ((optimizedPrice - product.cost_price) / optimizedPrice * 100).toFixed(2) + '%',
          volume_change: ((Math.pow(optimizedPrice / product.unit_price, elasticity) - 1) * 100).toFixed(2) + '%',
        };
        break;
        
      case 'maximize_volume':
        // 販売数量最大化（制約内で最低価格）
        const minMarginPrice = product.cost_price / (1 - (params.constraints?.min_margin || 0.1));
        optimizedPrice = Math.max(minMarginPrice, params.constraints?.min_price || minMarginPrice);
        reasoning = '最低利益率を確保しながら販売数量を最大化する価格を設定しました';
        
        projectedImpact = {
          price_reduction: ((1 - optimizedPrice / product.unit_price) * 100).toFixed(2) + '%',
          expected_volume_increase: ((Math.pow(optimizedPrice / product.unit_price, elasticity) - 1) * 100).toFixed(2) + '%',
        };
        break;
        
      case 'match_competition':
        // 競合価格に合わせる
        if (params.competitor_prices && params.competitor_prices.length > 0) {
          const avgCompetitorPrice = params.competitor_prices.reduce((a, b) => a + b, 0) / params.competitor_prices.length;
          optimizedPrice = avgCompetitorPrice * 0.95; // 競合より5%安く
          reasoning = '競合他社の平均価格より5%低い価格を設定し、競争優位性を確保します';
          
          projectedImpact = {
            competitor_average: avgCompetitorPrice,
            price_advantage: '5%',
            market_position: '価格リーダー',
          };
        }
        break;
        
      case 'clear_inventory':
        // 在庫処分
        const clearanceDiscount = 0.3; // 30%割引
        optimizedPrice = product.unit_price * (1 - clearanceDiscount);
        reasoning = '在庫を迅速に処分するため、大幅な割引価格を設定しました';
        
        projectedImpact = {
          discount_percentage: (clearanceDiscount * 100) + '%',
          break_even_volume: Math.ceil(product.cost_price * product.stock_info.current_stock / optimizedPrice),
          expected_clearance_days: 14,
        };
        break;
    }
    
    // 制約条件の適用
    if (params.constraints) {
      if (params.constraints.min_price) {
        optimizedPrice = Math.max(optimizedPrice, params.constraints.min_price);
      }
      if (params.constraints.max_price) {
        optimizedPrice = Math.min(optimizedPrice, params.constraints.max_price);
      }
      
      const margin = (optimizedPrice - product.cost_price) / optimizedPrice;
      if (params.constraints.min_margin && margin < params.constraints.min_margin) {
        optimizedPrice = product.cost_price / (1 - params.constraints.min_margin);
      }
    }
    
    return {
      success: true,
      pricing_optimization: {
        product_name: product.name,
        current_price: product.unit_price,
        optimized_price: Math.round(optimizedPrice),
        price_change: ((optimizedPrice / product.unit_price - 1) * 100).toFixed(2) + '%',
        optimization_goal: params.optimization_goal,
        reasoning: reasoning,
      },
      projected_impact: projectedImpact,
      implementation_strategy: {
        timing: params.optimization_goal === 'clear_inventory' ? '即時' : '段階的',
        test_period: '2週間',
        monitoring_metrics: ['売上高', '販売数量', '在庫回転率', '利益率'],
      },
      risks: [
        '顧客の価格感度による売上への影響',
        '競合他社の価格対抗',
        'ブランドイメージへの影響',
      ],
    };
  }
};

// すべてのツールをエクスポート
export const productTools = [
  createProductTool,
  analyzeInventoryTool,
  optimizePricingTool,
];