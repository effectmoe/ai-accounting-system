#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// 商品情報の型定義
interface ProductRecord {
  id?: string;
  product_code: string;
  product_name: string;
  product_name_kana?: string;
  description?: string;
  category: string;
  subcategory?: string;
  unit: string; // '個', '箱', 'kg', 'L', etc.
  price: {
    list_price: number;
    cost_price?: number;
    tax_rate: number;
    tax_included: boolean;
  };
  inventory?: {
    current_stock: number;
    minimum_stock: number;
    location?: string;
  };
  attributes?: {
    color?: string;
    size?: string;
    weight?: number;
    dimensions?: string;
    [key: string]: any;
  };
  supplier?: {
    supplier_id?: string;
    supplier_name: string;
    supplier_code?: string;
    lead_time_days?: number;
  };
  tags?: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// 価格履歴の型定義
interface PriceHistory {
  product_id: string;
  history: Array<{
    date: string;
    list_price: number;
    cost_price?: number;
    reason?: string;
    updated_by?: string;
  }>;
}

// 在庫移動履歴の型定義
interface InventoryMovement {
  product_id: string;
  movements: Array<{
    date: string;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    reference: string;
    reason?: string;
    balance_after: number;
  }>;
}

// Product MCP Server
class ProductMCPServer {
  private server: Server;
  private products: Map<string, ProductRecord> = new Map();
  private priceHistory: Map<string, PriceHistory> = new Map();
  private inventoryMovements: Map<string, InventoryMovement> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'product-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.initializeData();
    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private initializeData(): void {
    // デモ用の商品データ
    const demoProducts: ProductRecord[] = [
      {
        id: 'prod_001',
        product_code: 'OFF-001',
        product_name: 'A4コピー用紙',
        product_name_kana: 'エーヨンコピーヨウシ',
        description: '高品質A4サイズコピー用紙、500枚入り',
        category: '事務用品',
        subcategory: '用紙',
        unit: '箱',
        price: {
          list_price: 500,
          cost_price: 350,
          tax_rate: 0.1,
          tax_included: false,
        },
        inventory: {
          current_stock: 150,
          minimum_stock: 50,
          location: '倉庫A-1-2',
        },
        supplier: {
          supplier_name: '文具卸株式会社',
          supplier_code: 'SUP-001',
          lead_time_days: 3,
        },
        tags: ['消耗品', '定番商品'],
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'prod_002',
        product_code: 'OFF-002',
        product_name: 'ボールペン（黒）',
        product_name_kana: 'ボールペンクロ',
        description: '油性ボールペン、0.7mm、黒インク',
        category: '事務用品',
        subcategory: '筆記具',
        unit: '本',
        price: {
          list_price: 100,
          cost_price: 60,
          tax_rate: 0.1,
          tax_included: false,
        },
        inventory: {
          current_stock: 500,
          minimum_stock: 100,
          location: '倉庫A-2-5',
        },
        supplier: {
          supplier_name: '文具卸株式会社',
          supplier_code: 'SUP-001',
          lead_time_days: 3,
        },
        tags: ['消耗品', '定番商品'],
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      },
    ];

    // デモデータをMapに格納
    demoProducts.forEach(product => {
      this.products.set(product.id!, product);
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[Product MCP Server] Error:', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'create_product',
            description: 'Create a new product record',
            inputSchema: {
              type: 'object',
              properties: {
                productData: {
                  type: 'object',
                  properties: {
                    product_code: { type: 'string' },
                    product_name: { type: 'string' },
                    product_name_kana: { type: 'string' },
                    description: { type: 'string' },
                    category: { type: 'string' },
                    subcategory: { type: 'string' },
                    unit: { type: 'string' },
                    price: {
                      type: 'object',
                      properties: {
                        list_price: { type: 'number' },
                        cost_price: { type: 'number' },
                        tax_rate: { type: 'number' },
                        tax_included: { type: 'boolean' },
                      },
                      required: ['list_price', 'tax_rate'],
                    },
                    inventory: {
                      type: 'object',
                      properties: {
                        current_stock: { type: 'number' },
                        minimum_stock: { type: 'number' },
                        location: { type: 'string' },
                      },
                    },
                    supplier: {
                      type: 'object',
                      properties: {
                        supplier_name: { type: 'string' },
                        supplier_code: { type: 'string' },
                        lead_time_days: { type: 'number' },
                      },
                    },
                    tags: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['product_code', 'product_name', 'category', 'unit', 'price'],
                },
              },
              required: ['productData'],
            },
          },
          {
            name: 'get_product',
            description: 'Get product information by ID or code',
            inputSchema: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                productCode: { type: 'string' },
              },
            },
          },
          {
            name: 'update_product',
            description: 'Update product information',
            inputSchema: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                updates: {
                  type: 'object',
                  properties: {
                    product_name: { type: 'string' },
                    description: { type: 'string' },
                    price: { type: 'object' },
                    inventory: { type: 'object' },
                    supplier: { type: 'object' },
                    tags: { type: 'array', items: { type: 'string' } },
                    is_active: { type: 'boolean' },
                  },
                },
              },
              required: ['productId', 'updates'],
            },
          },
          {
            name: 'search_products',
            description: 'Search products by various criteria',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                filters: {
                  type: 'object',
                  properties: {
                    category: { type: 'string' },
                    subcategory: { type: 'string' },
                    supplier: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                    is_active: { type: 'boolean' },
                    price_min: { type: 'number' },
                    price_max: { type: 'number' },
                  },
                },
                limit: { type: 'number', default: 50 },
              },
            },
          },
          {
            name: 'update_inventory',
            description: 'Update product inventory levels',
            inputSchema: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                movement: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['in', 'out', 'adjustment'],
                    },
                    quantity: { type: 'number' },
                    reference: { type: 'string' },
                    reason: { type: 'string' },
                  },
                  required: ['type', 'quantity', 'reference'],
                },
              },
              required: ['productId', 'movement'],
            },
          },
          {
            name: 'get_price_history',
            description: 'Get product price change history',
            inputSchema: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                dateFrom: { type: 'string' },
                dateTo: { type: 'string' },
              },
              required: ['productId'],
            },
          },
          {
            name: 'calculate_pricing',
            description: 'Calculate product pricing with tax and margin',
            inputSchema: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                quantity: { type: 'number' },
                customerType: {
                  type: 'string',
                  enum: ['retail', 'wholesale', 'special'],
                },
                discountRate: { type: 'number' },
              },
              required: ['productId', 'quantity'],
            },
          },
          {
            name: 'check_availability',
            description: 'Check product availability and lead time',
            inputSchema: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                requestedQuantity: { type: 'number' },
              },
              required: ['productId', 'requestedQuantity'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_product':
            return await this.handleCreateProduct(args);
          case 'get_product':
            return await this.handleGetProduct(args);
          case 'update_product':
            return await this.handleUpdateProduct(args);
          case 'search_products':
            return await this.handleSearchProducts(args);
          case 'update_inventory':
            return await this.handleUpdateInventory(args);
          case 'get_price_history':
            return await this.handleGetPriceHistory(args);
          case 'calculate_pricing':
            return await this.handleCalculatePricing(args);
          case 'check_availability':
            return await this.handleCheckAvailability(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
      }
    });
  }

  // Create product
  private async handleCreateProduct(args: any) {
    const { productData } = args;

    try {
      // Validate required fields
      if (!productData.product_code || !productData.product_name) {
        throw new Error('Product code and name are required');
      }

      // Check for duplicate product code
      const existingProduct = Array.from(this.products.values()).find(
        p => p.product_code === productData.product_code
      );
      if (existingProduct) {
        throw new Error(`Product code ${productData.product_code} already exists`);
      }

      // Create new product record
      const newProduct: ProductRecord = {
        id: `prod_${Date.now()}`,
        ...productData,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Store product
      this.products.set(newProduct.id!, newProduct);

      // Initialize price history
      this.priceHistory.set(newProduct.id!, {
        product_id: newProduct.id!,
        history: [{
          date: new Date().toISOString(),
          list_price: newProduct.price.list_price,
          cost_price: newProduct.price.cost_price,
          reason: 'Initial price',
        }],
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              product: {
                id: newProduct.id,
                product_code: newProduct.product_code,
                product_name: newProduct.product_name,
                created_at: newProduct.created_at,
              },
              message: 'Product created successfully',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Get product
  private async handleGetProduct(args: any) {
    const { productId, productCode } = args;

    try {
      let product: ProductRecord | undefined;

      if (productId) {
        product = this.products.get(productId);
      } else if (productCode) {
        product = Array.from(this.products.values()).find(
          p => p.product_code === productCode
        );
      }

      if (!product) {
        throw new Error('Product not found');
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              product,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Update product
  private async handleUpdateProduct(args: any) {
    const { productId, updates } = args;

    try {
      const product = this.products.get(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Track price changes
      if (updates.price && (updates.price.list_price !== product.price.list_price || 
          updates.price.cost_price !== product.price.cost_price)) {
        const history = this.priceHistory.get(productId) || {
          product_id: productId,
          history: [],
        };
        history.history.push({
          date: new Date().toISOString(),
          list_price: updates.price.list_price || product.price.list_price,
          cost_price: updates.price.cost_price || product.price.cost_price,
          reason: 'Price update',
        });
        this.priceHistory.set(productId, history);
      }

      // Update product data
      const updatedProduct: ProductRecord = {
        ...product,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Merge nested objects properly
      if (updates.price) {
        updatedProduct.price = {
          ...product.price,
          ...updates.price,
        };
      }
      if (updates.inventory) {
        updatedProduct.inventory = {
          ...product.inventory,
          ...updates.inventory,
        };
      }
      if (updates.supplier) {
        updatedProduct.supplier = {
          ...product.supplier,
          ...updates.supplier,
        };
      }

      // Store updated product
      this.products.set(productId, updatedProduct);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              product: updatedProduct,
              message: 'Product updated successfully',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Search products
  private async handleSearchProducts(args: any) {
    const { query, filters = {}, limit = 50 } = args;

    try {
      let results = Array.from(this.products.values());

      // Apply text search
      if (query) {
        const searchQuery = query.toLowerCase();
        results = results.filter(product => 
          product.product_name.toLowerCase().includes(searchQuery) ||
          product.product_name_kana?.toLowerCase().includes(searchQuery) ||
          product.product_code.toLowerCase().includes(searchQuery) ||
          product.description?.toLowerCase().includes(searchQuery)
        );
      }

      // Apply filters
      if (filters.category) {
        results = results.filter(p => p.category === filters.category);
      }
      if (filters.subcategory) {
        results = results.filter(p => p.subcategory === filters.subcategory);
      }
      if (filters.supplier) {
        results = results.filter(p => p.supplier?.supplier_name === filters.supplier);
      }
      if (filters.tags && filters.tags.length > 0) {
        results = results.filter(p => 
          p.tags?.some(tag => filters.tags.includes(tag))
        );
      }
      if (filters.is_active !== undefined) {
        results = results.filter(p => p.is_active === filters.is_active);
      }
      if (filters.price_min !== undefined) {
        results = results.filter(p => p.price.list_price >= filters.price_min);
      }
      if (filters.price_max !== undefined) {
        results = results.filter(p => p.price.list_price <= filters.price_max);
      }

      // Apply limit
      results = results.slice(0, limit);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              products: results,
              count: results.length,
              query,
              filters,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Update inventory
  private async handleUpdateInventory(args: any) {
    const { productId, movement } = args;

    try {
      const product = this.products.get(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      if (!product.inventory) {
        throw new Error('Product does not have inventory tracking');
      }

      // Calculate new stock level
      let newStock = product.inventory.current_stock;
      if (movement.type === 'in') {
        newStock += movement.quantity;
      } else if (movement.type === 'out') {
        newStock -= movement.quantity;
        if (newStock < 0) {
          throw new Error('Insufficient stock');
        }
      } else if (movement.type === 'adjustment') {
        newStock = movement.quantity;
      }

      // Record movement
      const movements = this.inventoryMovements.get(productId) || {
        product_id: productId,
        movements: [],
      };
      movements.movements.push({
        date: new Date().toISOString(),
        type: movement.type,
        quantity: movement.quantity,
        reference: movement.reference,
        reason: movement.reason,
        balance_after: newStock,
      });
      this.inventoryMovements.set(productId, movements);

      // Update product inventory
      product.inventory.current_stock = newStock;
      product.updated_at = new Date().toISOString();
      this.products.set(productId, product);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              product: {
                id: product.id,
                product_code: product.product_code,
                product_name: product.product_name,
              },
              inventory: {
                previous_stock: product.inventory.current_stock - (movement.type === 'out' ? -movement.quantity : movement.quantity),
                movement_type: movement.type,
                movement_quantity: movement.quantity,
                new_stock: newStock,
                is_low_stock: newStock < product.inventory.minimum_stock,
              },
              message: 'Inventory updated successfully',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Get price history
  private async handleGetPriceHistory(args: any) {
    const { productId, dateFrom, dateTo } = args;

    try {
      const product = this.products.get(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const history = this.priceHistory.get(productId) || {
        product_id: productId,
        history: [],
      };

      // Filter by date range if provided
      let filteredHistory = history.history;
      if (dateFrom || dateTo) {
        filteredHistory = history.history.filter(h => {
          const hDate = new Date(h.date);
          if (dateFrom && hDate < new Date(dateFrom)) return false;
          if (dateTo && hDate > new Date(dateTo)) return false;
          return true;
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              product: {
                id: product.id,
                product_code: product.product_code,
                product_name: product.product_name,
              },
              price_history: filteredHistory,
              current_price: product.price,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Calculate pricing
  private async handleCalculatePricing(args: any) {
    const { productId, quantity, customerType = 'retail', discountRate = 0 } = args;

    try {
      const product = this.products.get(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Base price
      let unitPrice = product.price.list_price;

      // Apply customer type pricing
      if (customerType === 'wholesale') {
        unitPrice *= 0.8; // 20% wholesale discount
      } else if (customerType === 'special') {
        unitPrice *= 0.7; // 30% special customer discount
      }

      // Apply additional discount
      if (discountRate > 0) {
        unitPrice *= (1 - discountRate);
      }

      // Calculate totals
      const subtotal = unitPrice * quantity;
      const taxAmount = product.price.tax_included ? 0 : subtotal * product.price.tax_rate;
      const total = subtotal + taxAmount;

      // Calculate margin
      const costPrice = product.price.cost_price || 0;
      const totalCost = costPrice * quantity;
      const margin = subtotal - totalCost;
      const marginRate = totalCost > 0 ? (margin / subtotal) * 100 : 0;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              product: {
                id: product.id,
                product_code: product.product_code,
                product_name: product.product_name,
              },
              pricing: {
                quantity,
                unit_price: unitPrice,
                list_price: product.price.list_price,
                customer_type: customerType,
                discount_rate: discountRate,
                subtotal,
                tax_rate: product.price.tax_rate,
                tax_amount: taxAmount,
                total,
                tax_included: product.price.tax_included,
              },
              profitability: {
                cost_price: costPrice,
                total_cost: totalCost,
                margin,
                margin_rate: marginRate.toFixed(2) + '%',
              },
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Check availability
  private async handleCheckAvailability(args: any) {
    const { productId, requestedQuantity } = args;

    try {
      const product = this.products.get(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      if (!product.inventory) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                product: {
                  id: product.id,
                  product_code: product.product_code,
                  product_name: product.product_name,
                },
                availability: {
                  is_available: true,
                  requested_quantity: requestedQuantity,
                  message: 'Product does not track inventory',
                },
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        };
      }

      const currentStock = product.inventory.current_stock;
      const isAvailable = currentStock >= requestedQuantity;
      const shortage = isAvailable ? 0 : requestedQuantity - currentStock;

      // Estimate delivery date if out of stock
      let estimatedDelivery = null;
      if (!isAvailable && product.supplier?.lead_time_days) {
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + product.supplier.lead_time_days);
        estimatedDelivery = deliveryDate.toISOString().split('T')[0];
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              product: {
                id: product.id,
                product_code: product.product_code,
                product_name: product.product_name,
              },
              availability: {
                is_available: isAvailable,
                requested_quantity: requestedQuantity,
                current_stock: currentStock,
                shortage,
                minimum_stock: product.inventory.minimum_stock,
                is_low_stock: currentStock < product.inventory.minimum_stock,
              },
              supplier: product.supplier ? {
                supplier_name: product.supplier.supplier_name,
                lead_time_days: product.supplier.lead_time_days,
                estimated_delivery: estimatedDelivery,
              } : null,
              message: isAvailable 
                ? 'Product is available' 
                : `Insufficient stock. ${shortage} units short`,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Product MCP Server running on stdio');
  }
}

// Create and run server
const server = new ProductMCPServer();
server.run().catch((error) => {
  console.error('Fatal error in Product MCP server:', error);
  process.exit(1);
});