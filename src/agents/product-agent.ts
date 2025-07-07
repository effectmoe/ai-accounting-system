import { z } from 'zod';
import { createAgent } from '@mastra/core';
import { spawn } from 'child_process';
import path from 'path';

// 商品操作結果のスキーマ
const productResultSchema = z.object({
  success: z.boolean(),
  operation: z.string(),
  product: z.object({
    id: z.string(),
    product_code: z.string(),
    product_name: z.string(),
    created_at: z.string().optional(),
  }).optional(),
  products: z.array(z.any()).optional(),
  inventory: z.any().optional(),
  pricing: z.any().optional(),
  profitability: z.any().optional(),
  availability: z.any().optional(),
  price_history: z.array(z.any()).optional(),
  count: z.number().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  timestamp: z.string(),
});

// 商品エージェントの入力スキーマ
const productInputSchema = z.object({
  operation: z.enum([
    'create',
    'get',
    'update',
    'search',
    'update_inventory',
    'get_price_history',
    'calculate_pricing',
    'check_availability',
    'identify'
  ]),
  
  // 商品作成用
  productData: z.object({
    product_code: z.string(),
    product_name: z.string(),
    product_name_kana: z.string().optional(),
    description: z.string().optional(),
    category: z.string(),
    subcategory: z.string().optional(),
    unit: z.string(),
    price: z.object({
      list_price: z.number(),
      cost_price: z.number().optional(),
      tax_rate: z.number(),
      tax_included: z.boolean().default(false),
    }),
    inventory: z.object({
      current_stock: z.number(),
      minimum_stock: z.number(),
      location: z.string().optional(),
    }).optional(),
    supplier: z.object({
      supplier_name: z.string(),
      supplier_code: z.string().optional(),
      lead_time_days: z.number().optional(),
    }).optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
  
  // 商品取得用
  productId: z.string().optional(),
  productCode: z.string().optional(),
  
  // 商品更新用
  updates: z.object({
    product_name: z.string().optional(),
    description: z.string().optional(),
    price: z.any().optional(),
    inventory: z.any().optional(),
    supplier: z.any().optional(),
    tags: z.array(z.string()).optional(),
    is_active: z.boolean().optional(),
  }).optional(),
  
  // 検索用
  searchParams: z.object({
    query: z.string().optional(),
    filters: z.object({
      category: z.string().optional(),
      subcategory: z.string().optional(),
      supplier: z.string().optional(),
      tags: z.array(z.string()).optional(),
      is_active: z.boolean().optional(),
      price_min: z.number().optional(),
      price_max: z.number().optional(),
    }).optional(),
    limit: z.number().default(50),
  }).optional(),
  
  // 在庫更新用
  inventoryMovement: z.object({
    type: z.enum(['in', 'out', 'adjustment']),
    quantity: z.number(),
    reference: z.string(),
    reason: z.string().optional(),
  }).optional(),
  
  // 価格履歴用
  priceHistoryParams: z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  }).optional(),
  
  // 価格計算用
  pricingParams: z.object({
    quantity: z.number(),
    customerType: z.enum(['retail', 'wholesale', 'special']).default('retail'),
    discountRate: z.number().default(0),
  }).optional(),
  
  // 在庫確認用
  availabilityCheckQuantity: z.number().optional(),
  
  // 商品識別用（領収書から）
  identifyParams: z.object({
    itemDescription: z.string(),
    category: z.string().optional(),
    unitPrice: z.number().optional(),
  }).optional(),
});

// MCP Client for Product MCP Server
class ProductMCPClient {
  async callTool(toolName: string, args: any): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const mcpServerPath = path.join(__dirname, '../mcp-servers/product-mcp-server.ts');
        
        // Start MCP server process
        const mcpProcess = spawn('npx', ['tsx', mcpServerPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let responseData = '';
        let errorData = '';

        // Prepare MCP request
        const request = {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args,
          },
        };

        // Send request to MCP server
        mcpProcess.stdin.write(JSON.stringify(request) + '\n');
        mcpProcess.stdin.end();

        // Handle response
        mcpProcess.stdout.on('data', (data) => {
          responseData += data.toString();
        });

        mcpProcess.stderr.on('data', (data) => {
          errorData += data.toString();
        });

        mcpProcess.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Product MCP Server exited with code ${code}: ${errorData}`));
            return;
          }

          try {
            // Parse response
            const lines = responseData.trim().split('\n');
            let result = null;

            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.result) {
                  result = parsed.result;
                  break;
                }
              } catch (e) {
                continue;
              }
            }

            if (result && result.content && result.content[0]) {
              const content = JSON.parse(result.content[0].text);
              resolve(content);
            } else {
              reject(new Error('Invalid MCP response format'));
            }
          } catch (error) {
            reject(new Error(`Failed to parse MCP response: ${error.message}`));
          }
        });

        mcpProcess.on('error', (error) => {
          reject(new Error(`Product MCP Server process error: ${error.message}`));
        });

        // Timeout
        setTimeout(() => {
          mcpProcess.kill();
          reject(new Error('Product MCP Server request timeout'));
        }, 30000);

      } catch (error) {
        reject(new Error(`Product MCP Client error: ${error.message}`));
      }
    });
  }
}

// 商品エージェント定義
export const productAgent = createAgent({
  id: 'product-agent',
  name: 'Product Management Agent with MCP Integration',
  description: 'Manage product catalog and inventory',
  
  inputSchema: productInputSchema,
  outputSchema: productResultSchema,
  
  tools: {
    // 商品作成
    createProduct: {
      description: 'Create a new product record',
      execute: async ({ productData }) => {
        const mcpClient = new ProductMCPClient();
        
        try {
          const result = await mcpClient.callTool('create_product', {
            productData,
          });

          return result;
        } catch (error) {
          throw new Error(`Product creation failed: ${error.message}`);
        }
      },
    },

    // 商品取得
    getProduct: {
      description: 'Get product information',
      execute: async ({ productId, productCode }) => {
        const mcpClient = new ProductMCPClient();
        
        try {
          const result = await mcpClient.callTool('get_product', {
            productId,
            productCode,
          });

          return result;
        } catch (error) {
          throw new Error(`Product retrieval failed: ${error.message}`);
        }
      },
    },

    // 商品更新
    updateProduct: {
      description: 'Update product information',
      execute: async ({ productId, updates }) => {
        const mcpClient = new ProductMCPClient();
        
        try {
          const result = await mcpClient.callTool('update_product', {
            productId,
            updates,
          });

          return result;
        } catch (error) {
          throw new Error(`Product update failed: ${error.message}`);
        }
      },
    },

    // 商品検索
    searchProducts: {
      description: 'Search products with filters',
      execute: async ({ query, filters, limit }) => {
        const mcpClient = new ProductMCPClient();
        
        try {
          const result = await mcpClient.callTool('search_products', {
            query,
            filters,
            limit,
          });

          return result;
        } catch (error) {
          throw new Error(`Product search failed: ${error.message}`);
        }
      },
    },

    // 在庫更新
    updateInventory: {
      description: 'Update product inventory',
      execute: async ({ productId, movement }) => {
        const mcpClient = new ProductMCPClient();
        
        try {
          const result = await mcpClient.callTool('update_inventory', {
            productId,
            movement,
          });

          return result;
        } catch (error) {
          throw new Error(`Inventory update failed: ${error.message}`);
        }
      },
    },

    // 価格履歴取得
    getPriceHistory: {
      description: 'Get product price history',
      execute: async ({ productId, dateFrom, dateTo }) => {
        const mcpClient = new ProductMCPClient();
        
        try {
          const result = await mcpClient.callTool('get_price_history', {
            productId,
            dateFrom,
            dateTo,
          });

          return result;
        } catch (error) {
          throw new Error(`Price history retrieval failed: ${error.message}`);
        }
      },
    },

    // 価格計算
    calculatePricing: {
      description: 'Calculate product pricing with discounts',
      execute: async ({ productId, quantity, customerType, discountRate }) => {
        const mcpClient = new ProductMCPClient();
        
        try {
          const result = await mcpClient.callTool('calculate_pricing', {
            productId,
            quantity,
            customerType,
            discountRate,
          });

          return result;
        } catch (error) {
          throw new Error(`Pricing calculation failed: ${error.message}`);
        }
      },
    },

    // 在庫確認
    checkAvailability: {
      description: 'Check product availability',
      execute: async ({ productId, requestedQuantity }) => {
        const mcpClient = new ProductMCPClient();
        
        try {
          const result = await mcpClient.callTool('check_availability', {
            productId,
            requestedQuantity,
          });

          return result;
        } catch (error) {
          throw new Error(`Availability check failed: ${error.message}`);
        }
      },
    },

    // 商品識別（領収書から）
    identifyProductFromReceipt: {
      description: 'Identify product from receipt item description',
      execute: async ({ itemDescription, category, unitPrice }) => {
        // 領収書の商品説明から既存商品を特定
        const mcpClient = new ProductMCPClient();
        
        try {
          // 商品説明で検索
          const result = await mcpClient.callTool('search_products', {
            query: itemDescription,
            filters: category ? { category } : {},
            limit: 10,
          });

          if (result.success && result.products && result.products.length > 0) {
            // 価格が近い商品を優先
            if (unitPrice !== undefined) {
              const sortedProducts = result.products.sort((a: any, b: any) => {
                const aDiff = Math.abs(a.price.list_price - unitPrice);
                const bDiff = Math.abs(b.price.list_price - unitPrice);
                return aDiff - bDiff;
              });

              const bestMatch = sortedProducts[0];
              const priceDiff = Math.abs(bestMatch.price.list_price - unitPrice);
              const priceMatchRate = 1 - (priceDiff / unitPrice);

              if (priceMatchRate > 0.8) {
                return {
                  success: true,
                  identified: true,
                  product: bestMatch,
                  confidence: priceMatchRate,
                  message: 'Product identified with high confidence',
                };
              }
            }

            // 価格情報がない場合は最初の結果を返す
            return {
              success: true,
              identified: true,
              product: result.products[0],
              confidence: 0.7,
              candidates: result.products.slice(0, 3),
              message: 'Potential product match found',
            };
          }

          return {
            success: true,
            identified: false,
            message: 'No matching product found',
            suggestion: 'Create new product record or refine search',
          };

        } catch (error) {
          throw new Error(`Product identification failed: ${error.message}`);
        }
      },
    },
  },
  
  // メイン実行ロジック
  execute: async ({ input, tools }) => {
    try {
      console.log('📦 [Product Agent] Starting product operation:', input.operation);

      switch (input.operation) {
        case 'create': {
          if (!input.productData) {
            throw new Error('Product data is required');
          }

          const result = await tools.createProduct({
            productData: input.productData,
          });

          return {
            success: result.success,
            operation: 'create',
            product: result.product,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'get': {
          if (!input.productId && !input.productCode) {
            throw new Error('Product ID or code is required');
          }

          const result = await tools.getProduct({
            productId: input.productId,
            productCode: input.productCode,
          });

          return {
            success: result.success,
            operation: 'get',
            product: result.product,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'update': {
          if (!input.productId || !input.updates) {
            throw new Error('Product ID and updates are required');
          }

          const result = await tools.updateProduct({
            productId: input.productId,
            updates: input.updates,
          });

          return {
            success: result.success,
            operation: 'update',
            product: result.product,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'search': {
          const searchParams = input.searchParams || {};
          const result = await tools.searchProducts({
            query: searchParams.query,
            filters: searchParams.filters,
            limit: searchParams.limit,
          });

          return {
            success: result.success,
            operation: 'search',
            products: result.products,
            count: result.count,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'update_inventory': {
          if (!input.productId || !input.inventoryMovement) {
            throw new Error('Product ID and inventory movement are required');
          }

          const result = await tools.updateInventory({
            productId: input.productId,
            movement: input.inventoryMovement,
          });

          return {
            success: result.success,
            operation: 'update_inventory',
            product: result.product,
            inventory: result.inventory,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'get_price_history': {
          if (!input.productId) {
            throw new Error('Product ID is required');
          }

          const historyParams = input.priceHistoryParams || {};
          const result = await tools.getPriceHistory({
            productId: input.productId,
            dateFrom: historyParams.dateFrom,
            dateTo: historyParams.dateTo,
          });

          return {
            success: result.success,
            operation: 'get_price_history',
            product: result.product,
            price_history: result.price_history,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'calculate_pricing': {
          if (!input.productId || !input.pricingParams?.quantity) {
            throw new Error('Product ID and quantity are required');
          }

          const result = await tools.calculatePricing({
            productId: input.productId,
            quantity: input.pricingParams.quantity,
            customerType: input.pricingParams.customerType,
            discountRate: input.pricingParams.discountRate,
          });

          return {
            success: result.success,
            operation: 'calculate_pricing',
            product: result.product,
            pricing: result.pricing,
            profitability: result.profitability,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'check_availability': {
          if (!input.productId || input.availabilityCheckQuantity === undefined) {
            throw new Error('Product ID and quantity are required');
          }

          const result = await tools.checkAvailability({
            productId: input.productId,
            requestedQuantity: input.availabilityCheckQuantity,
          });

          return {
            success: result.success,
            operation: 'check_availability',
            product: result.product,
            availability: result.availability,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'identify': {
          if (!input.identifyParams?.itemDescription) {
            throw new Error('Item description is required for product identification');
          }

          const result = await tools.identifyProductFromReceipt({
            itemDescription: input.identifyParams.itemDescription,
            category: input.identifyParams.category,
            unitPrice: input.identifyParams.unitPrice,
          });

          return {
            success: result.success,
            operation: 'identify',
            product: result.product,
            message: result.message,
            timestamp: new Date().toISOString(),
            error: result.error,
          };
        }

        default:
          throw new Error(`Unknown operation: ${input.operation}`);
      }

    } catch (error) {
      console.error('❌ [Product Agent] Operation failed:', error);
      return {
        success: false,
        operation: input.operation || 'unknown',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },
});

export default productAgent;