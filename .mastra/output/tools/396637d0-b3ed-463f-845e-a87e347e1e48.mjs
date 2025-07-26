import { l as logger, g as getDatabase } from '../mongodb-client.mjs';
import '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/mongodb/lib/index.js';
import '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/@sentry/nextjs/build/cjs/index.server.js';

const createProductTool = {
  name: "create_product",
  description: "\u65B0\u5546\u54C1\u3092\u767B\u9332\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "\u5546\u54C1\u540D" },
      name_kana: { type: "string", description: "\u5546\u54C1\u540D\uFF08\u30AB\u30CA\uFF09" },
      code: { type: "string", description: "\u5546\u54C1\u30B3\u30FC\u30C9" },
      jan_code: { type: "string", description: "JAN\u30B3\u30FC\u30C9" },
      category: { type: "string", description: "\u30AB\u30C6\u30B4\u30EA" },
      unit_price: { type: "number", description: "\u5358\u4FA1" },
      cost_price: { type: "number", description: "\u539F\u4FA1" },
      tax_type: { type: "string", enum: ["standard", "reduced", "exempt"], description: "\u7A0E\u533A\u5206" },
      stock_management: { type: "boolean", description: "\u5728\u5EAB\u7BA1\u7406\u5BFE\u8C61\u304B" },
      description: { type: "string", description: "\u5546\u54C1\u8AAC\u660E" }
    },
    required: ["name", "code", "unit_price", "tax_type"]
  },
  handler: async (params) => {
    logger.info("Creating product:", params);
    const db = await getDatabase();
    const collection = db.collection("products");
    const existing = await collection.findOne({ code: params.code });
    if (existing) {
      return {
        success: false,
        error: `\u5546\u54C1\u30B3\u30FC\u30C9 ${params.code} \u306F\u65E2\u306B\u4F7F\u7528\u3055\u308C\u3066\u3044\u307E\u3059`
      };
    }
    if (params.jan_code && ![8, 13].includes(params.jan_code.length)) {
      return {
        success: false,
        error: "JAN\u30B3\u30FC\u30C9\u306F8\u6841\u307E\u305F\u306F13\u6841\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059"
      };
    }
    const profitMargin = params.cost_price ? ((params.unit_price - params.cost_price) / params.unit_price * 100).toFixed(2) : null;
    const product = {
      name: params.name,
      name_kana: params.name_kana || "",
      code: params.code,
      jan_code: params.jan_code || "",
      category: params.category || "\u672A\u5206\u985E",
      unit_price: params.unit_price,
      cost_price: params.cost_price || 0,
      profit_margin: profitMargin,
      tax_type: params.tax_type,
      tax_rate: params.tax_type === "reduced" ? 0.08 : params.tax_type === "exempt" ? 0 : 0.1,
      stock_management: params.stock_management ?? true,
      description: params.description || "",
      status: "active",
      created_at: /* @__PURE__ */ new Date(),
      updated_at: /* @__PURE__ */ new Date(),
      // 初期在庫情報
      stock_info: {
        current_stock: 0,
        reserved_stock: 0,
        available_stock: 0,
        reorder_point: 0,
        reorder_quantity: 0
      },
      // 販売統計（初期値）
      sales_stats: {
        total_sold: 0,
        total_revenue: 0,
        last_sold_date: null,
        average_daily_sales: 0
      }
    };
    const result = await collection.insertOne(product);
    return {
      success: true,
      product_id: result.insertedId.toString(),
      product: {
        ...product,
        _id: result.insertedId
      },
      message: `\u5546\u54C1\u300C${params.name}\u300D\u3092\u767B\u9332\u3057\u307E\u3057\u305F`,
      next_steps: [
        "\u521D\u671F\u5728\u5EAB\u306E\u767B\u9332",
        "\u767A\u6CE8\u70B9\u306E\u8A2D\u5B9A",
        "\u5546\u54C1\u753B\u50CF\u306E\u8FFD\u52A0",
        "\u95A2\u9023\u5546\u54C1\u306E\u8A2D\u5B9A"
      ]
    };
  }
};
const analyzeInventoryTool = {
  name: "analyze_inventory",
  description: "\u5728\u5EAB\u5206\u6790\u3092\u5B9F\u884C\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      analysis_type: {
        type: "string",
        enum: ["abc_analysis", "turnover_rate", "dead_stock", "reorder_point", "seasonal_trend"],
        description: "\u5206\u6790\u30BF\u30A4\u30D7"
      },
      period_days: { type: "number", description: "\u5206\u6790\u671F\u9593\uFF08\u65E5\u6570\uFF09" },
      category_filter: { type: "string", description: "\u30AB\u30C6\u30B4\u30EA\u30D5\u30A3\u30EB\u30BF\u30FC" },
      warehouse_id: { type: "string", description: "\u5009\u5EABID" }
    },
    required: ["analysis_type"]
  },
  handler: async (params) => {
    logger.info("Analyzing inventory:", params);
    const db = await getDatabase();
    const productsCollection = db.collection("products");
    const inventoryCollection = db.collection("inventory_movements");
    const periodDays = params.period_days || 90;
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1e3);
    let analysisResult = {
      analysis_type: params.analysis_type,
      period: {
        days: periodDays,
        start_date: startDate,
        end_date: /* @__PURE__ */ new Date()
      }
    };
    switch (params.analysis_type) {
      case "abc_analysis":
        const products = await productsCollection.find(
          params.category_filter ? { category: params.category_filter } : {}
        ).toArray();
        const productSales = await Promise.all(products.map(async (product) => {
          const sales = await inventoryCollection.aggregate([
            {
              $match: {
                product_id: product._id,
                type: "sale",
                date: { $gte: startDate }
              }
            },
            {
              $group: {
                _id: null,
                total_quantity: { $sum: "$quantity" },
                total_revenue: { $sum: { $multiply: ["$quantity", "$unit_price"] } }
              }
            }
          ]).toArray();
          return {
            product_id: product._id,
            product_name: product.name,
            product_code: product.code,
            total_revenue: sales[0]?.total_revenue || 0,
            total_quantity: sales[0]?.total_quantity || 0
          };
        }));
        productSales.sort((a, b) => b.total_revenue - a.total_revenue);
        const totalRevenue = productSales.reduce((sum, p) => sum + p.total_revenue, 0);
        let cumulativeRevenue = 0;
        const abcClassification = productSales.map((product) => {
          cumulativeRevenue += product.total_revenue;
          const cumulativePercentage = cumulativeRevenue / totalRevenue * 100;
          let classification = "C";
          if (cumulativePercentage <= 70) classification = "A";
          else if (cumulativePercentage <= 90) classification = "B";
          return {
            ...product,
            revenue_percentage: (product.total_revenue / totalRevenue * 100).toFixed(2),
            cumulative_percentage: cumulativePercentage.toFixed(2),
            classification
          };
        });
        analysisResult.abc_analysis = {
          total_revenue: totalRevenue,
          classifications: {
            A: abcClassification.filter((p) => p.classification === "A"),
            B: abcClassification.filter((p) => p.classification === "B"),
            C: abcClassification.filter((p) => p.classification === "C")
          },
          summary: {
            A_items_count: abcClassification.filter((p) => p.classification === "A").length,
            B_items_count: abcClassification.filter((p) => p.classification === "B").length,
            C_items_count: abcClassification.filter((p) => p.classification === "C").length
          }
        };
        analysisResult.recommendations = [
          "A\u5546\u54C1\uFF1A\u5728\u5EAB\u5207\u308C\u3092\u907F\u3051\u308B\u305F\u3081\u3001\u5B89\u5168\u5728\u5EAB\u3092\u9AD8\u3081\u306B\u8A2D\u5B9A",
          "B\u5546\u54C1\uFF1A\u6A19\u6E96\u7684\u306A\u5728\u5EAB\u7BA1\u7406\u3092\u5B9F\u65BD",
          "C\u5546\u54C1\uFF1A\u5728\u5EAB\u524A\u6E1B\u3092\u691C\u8A0E\u3001\u5EC3\u756A\u5019\u88DC\u306E\u8A55\u4FA1"
        ];
        break;
      case "turnover_rate":
        const turnoverData = await productsCollection.aggregate([
          {
            $lookup: {
              from: "inventory_movements",
              let: { product_id: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$product_id", "$$product_id"] },
                        { $eq: ["$type", "sale"] },
                        { $gte: ["$date", startDate] }
                      ]
                    }
                  }
                },
                {
                  $group: {
                    _id: null,
                    total_sold: { $sum: "$quantity" }
                  }
                }
              ],
              as: "sales_data"
            }
          },
          {
            $project: {
              name: 1,
              code: 1,
              current_stock: "$stock_info.current_stock",
              total_sold: { $ifNull: [{ $arrayElemAt: ["$sales_data.total_sold", 0] }, 0] },
              average_stock: { $avg: ["$stock_info.current_stock", 0] }
              // 簡易計算
            }
          },
          {
            $addFields: {
              turnover_rate: {
                $cond: {
                  if: { $eq: ["$average_stock", 0] },
                  then: 0,
                  else: { $divide: ["$total_sold", "$average_stock"] }
                }
              },
              days_of_inventory: {
                $cond: {
                  if: { $eq: ["$total_sold", 0] },
                  then: 999,
                  else: { $divide: [{ $multiply: ["$current_stock", periodDays] }, "$total_sold"] }
                }
              }
            }
          }
        ]).toArray();
        analysisResult.turnover_analysis = {
          products: turnoverData.sort((a, b) => b.turnover_rate - a.turnover_rate),
          average_turnover_rate: (turnoverData.reduce((sum, p) => sum + p.turnover_rate, 0) / turnoverData.length).toFixed(2),
          high_performers: turnoverData.filter((p) => p.turnover_rate > 12),
          // 年12回転以上
          low_performers: turnoverData.filter((p) => p.turnover_rate < 4)
          // 年4回転未満
        };
        break;
      case "dead_stock":
        const deadStockThreshold = 180;
        const deadStock = await productsCollection.aggregate([
          {
            $lookup: {
              from: "inventory_movements",
              let: { product_id: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$product_id", "$$product_id"] },
                        { $in: ["$type", ["sale", "purchase"]] }
                      ]
                    }
                  }
                },
                {
                  $sort: { date: -1 }
                },
                {
                  $limit: 1
                }
              ],
              as: "last_movement"
            }
          },
          {
            $addFields: {
              last_movement_date: { $arrayElemAt: ["$last_movement.date", 0] },
              days_since_movement: {
                $divide: [
                  { $subtract: [/* @__PURE__ */ new Date(), { $ifNull: [{ $arrayElemAt: ["$last_movement.date", 0] }, "$created_at"] }] },
                  1e3 * 60 * 60 * 24
                ]
              }
            }
          },
          {
            $match: {
              $and: [
                { "stock_info.current_stock": { $gt: 0 } },
                { days_since_movement: { $gte: deadStockThreshold } }
              ]
            }
          }
        ]).toArray();
        analysisResult.dead_stock = {
          threshold_days: deadStockThreshold,
          dead_stock_items: deadStock,
          total_dead_stock_value: deadStock.reduce(
            (sum, item) => sum + item.stock_info.current_stock * item.unit_price,
            0
          ),
          recommendations: [
            "\u7279\u5225\u30BB\u30FC\u30EB\u3067\u306E\u5728\u5EAB\u51E6\u5206",
            "\u30D0\u30F3\u30C9\u30EB\u5546\u54C1\u3068\u3057\u3066\u306E\u8CA9\u58F2",
            "\u5EC3\u68C4\u51E6\u5206\u306E\u691C\u8A0E",
            "\u4ED5\u5165\u5148\u3078\u306E\u8FD4\u54C1\u4EA4\u6E09"
          ]
        };
        break;
      case "reorder_point":
        const reorderAnalysis = await productsCollection.aggregate([
          {
            $lookup: {
              from: "inventory_movements",
              let: { product_id: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$product_id", "$$product_id"] },
                        { $eq: ["$type", "sale"] },
                        { $gte: ["$date", startDate] }
                      ]
                    }
                  }
                },
                {
                  $group: {
                    _id: {
                      $dateToString: { format: "%Y-%m-%d", date: "$date" }
                    },
                    daily_sales: { $sum: "$quantity" }
                  }
                }
              ],
              as: "daily_sales"
            }
          },
          {
            $addFields: {
              average_daily_demand: { $avg: "$daily_sales.daily_sales" },
              demand_std_dev: { $stdDevPop: "$daily_sales.daily_sales" }
            }
          }
        ]).toArray();
        analysisResult.reorder_point_analysis = reorderAnalysis.map((product) => {
          const leadTimeDays = 7;
          const zScore = 1.65;
          const avgDemand = product.average_daily_demand || 0;
          const stdDev = product.demand_std_dev || 0;
          const reorderPoint = Math.ceil(
            avgDemand * leadTimeDays + zScore * stdDev * Math.sqrt(leadTimeDays)
          );
          const reorderQuantity = Math.ceil(avgDemand * 30);
          return {
            product_id: product._id,
            product_name: product.name,
            average_daily_demand: avgDemand.toFixed(2),
            demand_variability: stdDev.toFixed(2),
            current_reorder_point: product.stock_info?.reorder_point || 0,
            recommended_reorder_point: reorderPoint,
            recommended_reorder_quantity: reorderQuantity,
            needs_adjustment: Math.abs((product.stock_info?.reorder_point || 0) - reorderPoint) > 5
          };
        });
        break;
    }
    return {
      success: true,
      analysis: analysisResult,
      export_available: true,
      export_formats: ["excel", "csv", "pdf"]
    };
  }
};
const optimizePricingTool = {
  name: "optimize_pricing",
  description: "\u4FA1\u683C\u6700\u9069\u5316\u3092\u63D0\u6848\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      product_id: { type: "string", description: "\u5546\u54C1ID" },
      optimization_goal: {
        type: "string",
        enum: ["maximize_profit", "maximize_volume", "match_competition", "clear_inventory"],
        description: "\u6700\u9069\u5316\u76EE\u6A19"
      },
      competitor_prices: { type: "array", items: { type: "number" }, description: "\u7AF6\u5408\u4FA1\u683C" },
      price_elasticity: { type: "number", description: "\u4FA1\u683C\u5F3E\u529B\u6027" },
      constraints: {
        type: "object",
        properties: {
          min_margin: { type: "number", description: "\u6700\u4F4E\u5229\u76CA\u7387" },
          max_price: { type: "number", description: "\u6700\u9AD8\u4FA1\u683C" },
          min_price: { type: "number", description: "\u6700\u4F4E\u4FA1\u683C" }
        }
      }
    },
    required: ["product_id", "optimization_goal"]
  },
  handler: async (params) => {
    logger.info("Optimizing pricing:", params);
    const db = await getDatabase();
    const productsCollection = db.collection("products");
    db.collection("inventory_movements");
    const product = await productsCollection.findOne({ _id: params.product_id });
    if (!product) {
      return {
        success: false,
        error: "\u5546\u54C1\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093"
      };
    }
    const elasticity = params.price_elasticity || -1.5;
    let optimizedPrice = product.unit_price;
    let reasoning = "";
    let projectedImpact = {};
    switch (params.optimization_goal) {
      case "maximize_profit":
        const optimalMarkup = 1 / Math.abs(elasticity);
        optimizedPrice = product.cost_price / (1 - optimalMarkup);
        reasoning = "\u9700\u8981\u306E\u4FA1\u683C\u5F3E\u529B\u6027\u306B\u57FA\u3065\u3044\u3066\u5229\u76CA\u3092\u6700\u5927\u5316\u3059\u308B\u4FA1\u683C\u3092\u8A08\u7B97\u3057\u307E\u3057\u305F";
        projectedImpact = {
          current_margin: ((product.unit_price - product.cost_price) / product.unit_price * 100).toFixed(2) + "%",
          new_margin: ((optimizedPrice - product.cost_price) / optimizedPrice * 100).toFixed(2) + "%",
          volume_change: ((Math.pow(optimizedPrice / product.unit_price, elasticity) - 1) * 100).toFixed(2) + "%"
        };
        break;
      case "maximize_volume":
        const minMarginPrice = product.cost_price / (1 - (params.constraints?.min_margin || 0.1));
        optimizedPrice = Math.max(minMarginPrice, params.constraints?.min_price || minMarginPrice);
        reasoning = "\u6700\u4F4E\u5229\u76CA\u7387\u3092\u78BA\u4FDD\u3057\u306A\u304C\u3089\u8CA9\u58F2\u6570\u91CF\u3092\u6700\u5927\u5316\u3059\u308B\u4FA1\u683C\u3092\u8A2D\u5B9A\u3057\u307E\u3057\u305F";
        projectedImpact = {
          price_reduction: ((1 - optimizedPrice / product.unit_price) * 100).toFixed(2) + "%",
          expected_volume_increase: ((Math.pow(optimizedPrice / product.unit_price, elasticity) - 1) * 100).toFixed(2) + "%"
        };
        break;
      case "match_competition":
        if (params.competitor_prices && params.competitor_prices.length > 0) {
          const avgCompetitorPrice = params.competitor_prices.reduce((a, b) => a + b, 0) / params.competitor_prices.length;
          optimizedPrice = avgCompetitorPrice * 0.95;
          reasoning = "\u7AF6\u5408\u4ED6\u793E\u306E\u5E73\u5747\u4FA1\u683C\u3088\u308A5%\u4F4E\u3044\u4FA1\u683C\u3092\u8A2D\u5B9A\u3057\u3001\u7AF6\u4E89\u512A\u4F4D\u6027\u3092\u78BA\u4FDD\u3057\u307E\u3059";
          projectedImpact = {
            competitor_average: avgCompetitorPrice,
            price_advantage: "5%",
            market_position: "\u4FA1\u683C\u30EA\u30FC\u30C0\u30FC"
          };
        }
        break;
      case "clear_inventory":
        const clearanceDiscount = 0.3;
        optimizedPrice = product.unit_price * (1 - clearanceDiscount);
        reasoning = "\u5728\u5EAB\u3092\u8FC5\u901F\u306B\u51E6\u5206\u3059\u308B\u305F\u3081\u3001\u5927\u5E45\u306A\u5272\u5F15\u4FA1\u683C\u3092\u8A2D\u5B9A\u3057\u307E\u3057\u305F";
        projectedImpact = {
          discount_percentage: clearanceDiscount * 100 + "%",
          break_even_volume: Math.ceil(product.cost_price * product.stock_info.current_stock / optimizedPrice),
          expected_clearance_days: 14
        };
        break;
    }
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
        price_change: ((optimizedPrice / product.unit_price - 1) * 100).toFixed(2) + "%",
        optimization_goal: params.optimization_goal,
        reasoning
      },
      projected_impact: projectedImpact,
      implementation_strategy: {
        timing: params.optimization_goal === "clear_inventory" ? "\u5373\u6642" : "\u6BB5\u968E\u7684",
        test_period: "2\u9031\u9593",
        monitoring_metrics: ["\u58F2\u4E0A\u9AD8", "\u8CA9\u58F2\u6570\u91CF", "\u5728\u5EAB\u56DE\u8EE2\u7387", "\u5229\u76CA\u7387"]
      },
      risks: [
        "\u9867\u5BA2\u306E\u4FA1\u683C\u611F\u5EA6\u306B\u3088\u308B\u58F2\u4E0A\u3078\u306E\u5F71\u97FF",
        "\u7AF6\u5408\u4ED6\u793E\u306E\u4FA1\u683C\u5BFE\u6297",
        "\u30D6\u30E9\u30F3\u30C9\u30A4\u30E1\u30FC\u30B8\u3078\u306E\u5F71\u97FF"
      ]
    };
  }
};
const productTools = [
  createProductTool,
  analyzeInventoryTool,
  optimizePricingTool
];

export { analyzeInventoryTool, createProductTool, optimizePricingTool, productTools };
//# sourceMappingURL=396637d0-b3ed-463f-845e-a87e347e1e48.mjs.map
