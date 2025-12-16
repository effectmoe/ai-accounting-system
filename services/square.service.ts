/**
 * Square Service - Square API との連携を管理するサービス
 * 片方向同期: Square → システム
 */

import { db, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { Invoice, InvoiceStatus, InvoiceItem, Customer } from '@/types/collections';
import { logger } from '@/lib/logger';

// Square SDK を動的にインポート（ビルド時のエラーを回避）
let squareClient: any = null;

/**
 * Square API のベース URL を取得
 */
function getSquareBaseUrl(): string {
  return process.env.SQUARE_ENVIRONMENT === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

/**
 * Square API を直接呼び出す（SDK の fetch 問題を回避）
 */
async function squareApiFetch(endpoint: string, options?: RequestInit): Promise<any> {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('SQUARE_ACCESS_TOKEN is not set');
  }

  const baseUrl = getSquareBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': '2024-11-20',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error: any = new Error(`Square API error: ${response.status}`);
    error.statusCode = response.status;
    error.errors = errorBody.errors || [];
    error.body = errorBody;
    throw error;
  }

  return response.json();
}

function getSquareClient() {
  if (!squareClient) {
    // 動的インポートで Square SDK をロード
    // Square SDK v43+ では SquareClient と SquareEnvironment を使用
    const { SquareClient, SquareEnvironment } = require('square');

    squareClient = new SquareClient({
      token: process.env.SQUARE_ACCESS_TOKEN || '',
      environment: process.env.SQUARE_ENVIRONMENT === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
    });
  }
  return squareClient;
}

// Square Invoice を システムの Invoice にマッピングする型
interface SquareInvoiceMapping {
  squareInvoiceId: string;
  squareOrderId: string;
  squareCustomerId: string;
  systemInvoiceId?: string;
  systemCustomerId?: string;
  lastSyncedAt: Date;
  syncStatus: 'synced' | 'failed' | 'pending';
  errorMessage?: string;
}

// Square Customer を システムの Customer にマッピングする型
interface SquareCustomerMapping {
  squareCustomerId: string;
  systemCustomerId?: string;
  lastSyncedAt: Date;
  syncStatus: 'synced' | 'failed' | 'pending';
  errorMessage?: string;
}

export class SquareService {
  private invoiceMappingCollection = 'square_invoice_mappings';
  private customerMappingCollection = 'square_customer_mappings';
  private squareSettingsCollection = 'square_settings';

  /**
   * Square API 接続テスト
   * SDK の fetch 問題を回避するため、直接 HTTP リクエストを使用
   */
  async testConnection(): Promise<{ success: boolean; merchant?: any; error?: string }> {
    try {
      // 環境変数の確認（デバッグ用）
      const accessToken = process.env.SQUARE_ACCESS_TOKEN;
      const environment = process.env.SQUARE_ENVIRONMENT;
      logger.info('[SquareService] Testing connection with:', {
        hasAccessToken: !!accessToken,
        accessTokenLength: accessToken?.length || 0,
        environment,
      });

      if (!accessToken) {
        return { success: false, error: 'SQUARE_ACCESS_TOKEN is not set' };
      }

      // 直接 HTTP リクエストを使用（SDK の fetch 問題を回避）
      const response = await squareApiFetch('/v2/merchants');
      logger.info('[SquareService] API response:', {
        hasMerchant: !!response.merchant,
        responseKeys: Object.keys(response),
      });

      // Direct API では response.merchant（単数形）
      const merchants = response.merchant || [];
      if (merchants.length > 0) {
        const merchant = merchants[0];
        return {
          success: true,
          merchant: {
            id: merchant.id,
            businessName: merchant.business_name,  // snake_case for direct API
            country: merchant.country,
            currency: merchant.currency,
            status: merchant.status,
          }
        };
      }
      return { success: false, error: 'No merchant found' };
    } catch (error: any) {
      logger.error('[SquareService] Connection test failed:', {
        message: error?.message,
        statusCode: error?.statusCode,
        errors: error?.errors,
        body: error?.body,
      });

      // エラーの詳細を取得
      let errorMessage = 'Unknown error';
      if (error?.errors && Array.isArray(error.errors)) {
        errorMessage = error.errors.map((e: any) => e.detail || e.category).join(', ');
      } else if (error?.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Square から請求書一覧を取得（日付範囲フィルタリング対応）
   * SDK の fetch 問題を回避するため、直接 HTTP リクエストを使用
   * 注意: Square API では location_id が必須パラメータです
   */
  async listSquareInvoices(
    locationId?: string,
    limit: number = 100,
    dateFrom?: string,
    dateTo?: string
  ): Promise<any[]> {
    try {
      // locationId が指定されていない場合、デフォルトロケーションを取得
      let effectiveLocationId = locationId;
      if (!effectiveLocationId) {
        const locations = await this.listLocations();
        if (locations.length > 0) {
          effectiveLocationId = locations[0].id;
          logger.info(`[SquareService] Using default location: ${effectiveLocationId}`);
        } else {
          throw new Error('No Square locations found. Please set up a location in Square Dashboard.');
        }
      }

      // 直接 HTTP リクエストを使用
      const params = new URLSearchParams();
      params.append('location_id', effectiveLocationId);
      if (limit) params.append('limit', limit.toString());

      const queryString = params.toString();
      const response = await squareApiFetch(`/v2/invoices${queryString ? '?' + queryString : ''}`);
      let invoices = response.invoices || [];

      // 日付範囲でフィルタリング（直接 API では snake_case）
      if (dateFrom || dateTo) {
        invoices = invoices.filter((invoice: any) => {
          const invoiceDate = new Date(invoice.created_at);

          if (dateFrom) {
            const fromDate = new Date(dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            if (invoiceDate < fromDate) return false;
          }

          if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            if (invoiceDate > toDate) return false;
          }

          return true;
        });
      }

      return invoices;
    } catch (error) {
      logger.error('[SquareService] Failed to list invoices:', error);
      throw error;
    }
  }

  /**
   * Square から請求書詳細を取得
   * SDK の fetch 問題を回避するため、直接 HTTP リクエストを使用
   */
  async getSquareInvoice(invoiceId: string): Promise<any> {
    try {
      const response = await squareApiFetch(`/v2/invoices/${invoiceId}`);
      return response.invoice;
    } catch (error) {
      logger.error('[SquareService] Failed to get invoice:', error);
      throw error;
    }
  }

  /**
   * Square から顧客情報を取得
   * SDK の fetch 問題を回避するため、直接 HTTP リクエストを使用
   */
  async getSquareCustomer(customerId: string): Promise<any> {
    try {
      const response = await squareApiFetch(`/v2/customers/${customerId}`);
      return response.customer;
    } catch (error) {
      logger.error('[SquareService] Failed to get customer:', error);
      throw error;
    }
  }

  /**
   * Square 顧客をシステムにインポート/同期
   */
  async syncCustomerFromSquare(squareCustomerId: string): Promise<Customer | null> {
    try {
      // 既存のマッピングを確認
      const existingMapping = await db.findOne<SquareCustomerMapping>(
        this.customerMappingCollection,
        { squareCustomerId }
      );

      // Square から顧客情報を取得
      const squareCustomer = await this.getSquareCustomer(squareCustomerId);
      if (!squareCustomer) {
        logger.error('[SquareService] Square customer not found:', squareCustomerId);
        return null;
      }

      // 顧客データをマッピング（直接 API では snake_case）
      const companyName = squareCustomer.company_name || squareCustomer.companyName;
      const givenName = squareCustomer.given_name || squareCustomer.givenName || '';
      const familyName = squareCustomer.family_name || squareCustomer.familyName || '';
      const emailAddress = squareCustomer.email_address || squareCustomer.emailAddress;
      const phoneNumber = squareCustomer.phone_number || squareCustomer.phoneNumber;

      const customerData: Partial<Customer> = {
        companyName: companyName || `${givenName} ${familyName}`.trim(),
        email: emailAddress,
        phone: phoneNumber,
        notes: `Square から同期 (ID: ${squareCustomerId})`,
        isActive: true,
      };

      // 住所情報をマッピング（直接 API では snake_case）
      if (squareCustomer.address) {
        const addr = squareCustomer.address;
        customerData.postalCode = addr.postal_code || addr.postalCode;
        customerData.prefecture = addr.administrative_district_level_1 || addr.administrativeDistrictLevel1;
        customerData.city = addr.locality;
        customerData.address1 = addr.address_line_1 || addr.addressLine1;
        customerData.address2 = addr.address_line_2 || addr.addressLine2;
      }

      // 担当者情報
      if (givenName || familyName) {
        customerData.contacts = [{
          name: `${givenName} ${familyName}`.trim(),
          email: emailAddress,
          phone: phoneNumber,
          isPrimary: true,
        }];
      }

      let systemCustomer: Customer;

      if (existingMapping?.systemCustomerId) {
        // 既存顧客を更新
        systemCustomer = await db.update<Customer>(
          Collections.CUSTOMERS,
          existingMapping.systemCustomerId,
          customerData
        ) as Customer;
      } else {
        // 新規顧客を作成
        systemCustomer = await db.create<Customer>(
          Collections.CUSTOMERS,
          customerData as Customer
        );

        // マッピングを保存
        await db.create(this.customerMappingCollection, {
          squareCustomerId,
          systemCustomerId: systemCustomer._id?.toString(),
          lastSyncedAt: new Date(),
          syncStatus: 'synced',
        });
      }

      // マッピングを更新
      if (existingMapping) {
        await db.update(this.customerMappingCollection, existingMapping._id!.toString(), {
          lastSyncedAt: new Date(),
          syncStatus: 'synced',
        });
      }

      logger.info('[SquareService] Customer synced:', { squareCustomerId, systemCustomerId: systemCustomer._id });
      return systemCustomer;
    } catch (error) {
      logger.error('[SquareService] Failed to sync customer:', error);

      // エラーマッピングを保存
      await this.saveCustomerMappingError(squareCustomerId, error);
      return null;
    }
  }

  /**
   * Square 請求書をシステムにインポート/同期
   */
  async syncInvoiceFromSquare(squareInvoiceId: string): Promise<Invoice | null> {
    try {
      // 既存のマッピングを確認
      const existingMapping = await db.findOne<SquareInvoiceMapping>(
        this.invoiceMappingCollection,
        { squareInvoiceId }
      );

      // Square から請求書詳細を取得
      const squareInvoice = await this.getSquareInvoice(squareInvoiceId);
      if (!squareInvoice) {
        logger.error('[SquareService] Square invoice not found:', squareInvoiceId);
        return null;
      }

      // 顧客を同期（直接 API では snake_case: primary_recipient, customer_id）
      let systemCustomerId: string | undefined;
      const primaryRecipient = squareInvoice.primary_recipient || squareInvoice.primaryRecipient;
      const customerId = primaryRecipient?.customer_id || primaryRecipient?.customerId;
      if (customerId) {
        const customer = await this.syncCustomerFromSquare(customerId);
        systemCustomerId = customer?._id?.toString();
      }

      // Square ステータスをシステムステータスにマッピング
      const statusMapping: Record<string, InvoiceStatus> = {
        'DRAFT': 'draft',
        'UNPAID': 'sent',
        'SCHEDULED': 'sent',
        'PARTIALLY_PAID': 'partially_paid',
        'PAID': 'paid',
        'PARTIALLY_REFUNDED': 'paid',
        'REFUNDED': 'paid',
        'CANCELED': 'cancelled',
        'FAILED': 'cancelled',
        'PAYMENT_PENDING': 'sent',
      };

      // 請求書項目を取得（Order API から）
      // SDK の fetch 問題を回避するため、直接 HTTP リクエストを使用
      let items: InvoiceItem[] = [];
      let subtotal = 0;
      let taxAmount = 0;
      let totalAmount = 0;

      // 直接 API では snake_case: order_id
      const orderId = squareInvoice.order_id || squareInvoice.orderId;
      if (orderId) {
        try {
          const orderResponse = await squareApiFetch(`/v2/orders/${orderId}`);
          const order = orderResponse.order;

          // 通貨コードを取得（JPYの場合は割らない）
          const currency = order?.total_money?.currency || 'JPY';
          const divisor = currency === 'JPY' ? 1 : 100;

          // 直接 API では snake_case: line_items, base_price_money, total_money
          if (order?.line_items) {
            items = order.line_items.map((item: any) => {
              const itemCurrency = item.base_price_money?.currency || currency;
              const itemDivisor = itemCurrency === 'JPY' ? 1 : 100;
              return {
                itemName: item.name || 'Unknown Item',
                description: item.note || '',
                quantity: Number(item.quantity) || 1,
                unitPrice: Number(item.base_price_money?.amount || 0) / itemDivisor,
                amount: Number(item.total_money?.amount || 0) / itemDivisor,
                taxRate: 0, // Square は税込み計算のため
              };
            });
          }

          subtotal = Number(order?.total_money?.amount || 0) / divisor;
          taxAmount = Number(order?.total_tax_money?.amount || 0) / divisor;
          totalAmount = subtotal;
        } catch (orderError) {
          logger.error('[SquareService] Failed to fetch order details:', orderError);
        }
      }

      // 支払い情報を取得（直接 API では snake_case）
      let paidAmount: number | undefined;
      let paidDate: Date | undefined;

      const paymentRequests = squareInvoice.payment_requests || squareInvoice.paymentRequests;
      if (paymentRequests?.[0]?.total_completed_amount_money || paymentRequests?.[0]?.totalCompletedAmountMoney) {
        const completedMoney = paymentRequests[0].total_completed_amount_money || paymentRequests[0].totalCompletedAmountMoney;
        // 通貨コードを確認（JPYの場合は割らない）
        const paidCurrency = completedMoney?.currency || 'JPY';
        const paidDivisor = paidCurrency === 'JPY' ? 1 : 100;
        paidAmount = Number(completedMoney?.amount || 0) / paidDivisor;
      }

      // 請求書データをマッピング（直接 API では snake_case）
      const invoiceNumber = squareInvoice.invoice_number || squareInvoice.invoiceNumber;
      const createdAt = squareInvoice.created_at || squareInvoice.createdAt;
      const dueDate = paymentRequests?.[0]?.due_date || paymentRequests?.[0]?.dueDate;

      const invoiceData: Partial<Invoice> = {
        invoiceNumber: invoiceNumber || `SQ-${squareInvoiceId.substring(0, 8)}`,
        title: squareInvoice.title || 'Square請求書',
        issueDate: new Date(createdAt || Date.now()),
        dueDate: dueDate
          ? new Date(dueDate)
          : new Date(createdAt || Date.now()),
        items,
        subtotal,
        taxAmount,
        taxRate: 10, // デフォルト税率
        totalAmount,
        status: statusMapping[squareInvoice.status] || 'draft',
        notes: squareInvoice.description || '',
        internalNotes: `Square から同期 (Invoice ID: ${squareInvoiceId}, Order ID: ${orderId || 'N/A'})`,
        paidAmount,
        paidDate,
      };

      // 顧客IDを設定
      if (systemCustomerId) {
        invoiceData.customerId = new ObjectId(systemCustomerId);
      }

      let systemInvoice: Invoice | null = null;

      if (existingMapping?.systemInvoiceId) {
        // 既存請求書を更新
        systemInvoice = await db.update<Invoice>(
          Collections.INVOICES,
          existingMapping.systemInvoiceId,
          invoiceData
        ) as Invoice | null;

        if (systemInvoice) {
          // 更新成功 - マッピングの同期ステータスを更新
          await db.update(this.invoiceMappingCollection, existingMapping._id!.toString(), {
            lastSyncedAt: new Date(),
            syncStatus: 'synced',
            systemCustomerId,
          });
        } else {
          // 更新失敗（請求書が削除されている場合）- 新規作成してマッピングを更新
          systemInvoice = await db.create<Invoice>(
            Collections.INVOICES,
            invoiceData as Invoice
          );
          await db.update(this.invoiceMappingCollection, existingMapping._id!.toString(), {
            systemInvoiceId: systemInvoice._id?.toString(),
            lastSyncedAt: new Date(),
            syncStatus: 'synced',
            systemCustomerId,
          });
        }
      } else {
        // 新規請求書を作成
        systemInvoice = await db.create<Invoice>(
          Collections.INVOICES,
          invoiceData as Invoice
        );

        // マッピングを新規保存
        await db.create(this.invoiceMappingCollection, {
          squareInvoiceId,
          squareOrderId: orderId || '',
          squareCustomerId: customerId || '',
          systemInvoiceId: systemInvoice._id?.toString(),
          systemCustomerId,
          lastSyncedAt: new Date(),
          syncStatus: 'synced',
        });
      }

      logger.info('[SquareService] Invoice synced:', { squareInvoiceId, systemInvoiceId: systemInvoice._id });
      return systemInvoice;
    } catch (error) {
      logger.error('[SquareService] Failed to sync invoice:', error);

      // エラーマッピングを保存
      await this.saveInvoiceMappingError(squareInvoiceId, error);
      return null;
    }
  }

  /**
   * Square Webhook を処理
   */
  async handleWebhook(eventType: string, data: any): Promise<void> {
    logger.info('[SquareService] Webhook received:', { eventType });

    try {
      switch (eventType) {
        case 'invoice.created':
        case 'invoice.published':
        case 'invoice.updated':
        case 'invoice.payment_made':
        case 'invoice.scheduled_charge_failed':
        case 'invoice.canceled':
        case 'invoice.refunded':
          if (data?.object?.invoice?.id) {
            await this.syncInvoiceFromSquare(data.object.invoice.id);
          }
          break;

        case 'customer.created':
        case 'customer.updated':
          if (data?.object?.customer?.id) {
            await this.syncCustomerFromSquare(data.object.customer.id);
          }
          break;

        default:
          logger.info('[SquareService] Unhandled webhook event type:', eventType);
      }
    } catch (error) {
      logger.error('[SquareService] Webhook processing error:', error);
      throw error;
    }
  }

  /**
   * Square の全請求書をインポート（初期同期用）
   */
  async importAllInvoices(locationId: string): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    try {
      const invoices = await this.listSquareInvoices(locationId);

      for (const invoice of invoices) {
        try {
          await this.syncInvoiceFromSquare(invoice.id);
          success++;
        } catch (error) {
          logger.error('[SquareService] Failed to import invoice:', invoice.id, error);
          failed++;
        }
      }

      logger.info('[SquareService] Import completed:', { success, failed });
      return { success, failed };
    } catch (error) {
      logger.error('[SquareService] Import all invoices failed:', error);
      throw error;
    }
  }

  /**
   * 日付範囲を指定して請求書をインポート
   */
  async importInvoicesByDateRange(
    locationId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<{ success: number; failed: number; total: number }> {
    let success = 0;
    let failed = 0;

    try {
      const invoices = await this.listSquareInvoices(locationId, 500, dateFrom, dateTo);
      const total = invoices.length;

      logger.info('[SquareService] Found invoices in date range:', { dateFrom, dateTo, total });

      for (const invoice of invoices) {
        try {
          await this.syncInvoiceFromSquare(invoice.id);
          success++;
        } catch (error) {
          logger.error('[SquareService] Failed to import invoice:', invoice.id, error);
          failed++;
        }
      }

      logger.info('[SquareService] Date range import completed:', { success, failed, total });
      return { success, failed, total };
    } catch (error) {
      logger.error('[SquareService] Import invoices by date range failed:', error);
      throw error;
    }
  }

  /**
   * 選択した請求書をインポート
   */
  async importSelectedInvoices(
    invoiceIds: string[]
  ): Promise<{ success: number; failed: number; total: number; results: Array<{ id: string; success: boolean; error?: string }> }> {
    const results: Array<{ id: string; success: boolean; error?: string }> = [];
    let success = 0;
    let failed = 0;
    const total = invoiceIds.length;

    logger.info('[SquareService] Importing selected invoices:', { count: total });

    for (const invoiceId of invoiceIds) {
      try {
        await this.syncInvoiceFromSquare(invoiceId);
        results.push({ id: invoiceId, success: true });
        success++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ id: invoiceId, success: false, error: errorMessage });
        logger.error('[SquareService] Failed to import invoice:', invoiceId, error);
        failed++;
      }
    }

    logger.info('[SquareService] Selected import completed:', { success, failed, total });
    return { success, failed, total, results };
  }

  /**
   * 同期マッピングの取得（請求書）
   */
  async getInvoiceMappings(limit: number = 50): Promise<SquareInvoiceMapping[]> {
    return await db.find<SquareInvoiceMapping>(
      this.invoiceMappingCollection,
      {},
      { sort: { lastSyncedAt: -1 }, limit }
    );
  }

  /**
   * 同期マッピングの取得（顧客）
   */
  async getCustomerMappings(limit: number = 50): Promise<SquareCustomerMapping[]> {
    return await db.find<SquareCustomerMapping>(
      this.customerMappingCollection,
      {},
      { sort: { lastSyncedAt: -1 }, limit }
    );
  }

  /**
   * Square 設定を保存
   */
  async saveSettings(settings: {
    accessToken?: string;
    locationId?: string;
    webhookSignatureKey?: string;
    autoSync?: boolean;
  }): Promise<void> {
    const existing = await db.findOne(this.squareSettingsCollection, {});

    if (existing) {
      await db.update(this.squareSettingsCollection, existing._id!.toString(), {
        ...settings,
        updatedAt: new Date(),
      });
    } else {
      await db.create(this.squareSettingsCollection, {
        ...settings,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  /**
   * Square 設定を取得
   */
  async getSettings(): Promise<any> {
    return await db.findOne(this.squareSettingsCollection, {});
  }

  /**
   * 顧客マッピングエラーを保存
   */
  private async saveCustomerMappingError(squareCustomerId: string, error: any): Promise<void> {
    const existing = await db.findOne<SquareCustomerMapping>(
      this.customerMappingCollection,
      { squareCustomerId }
    );

    if (existing) {
      await db.update(this.customerMappingCollection, existing._id!.toString(), {
        lastSyncedAt: new Date(),
        syncStatus: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } else {
      await db.create(this.customerMappingCollection, {
        squareCustomerId,
        lastSyncedAt: new Date(),
        syncStatus: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 請求書マッピングエラーを保存
   */
  private async saveInvoiceMappingError(squareInvoiceId: string, error: any): Promise<void> {
    const existing = await db.findOne<SquareInvoiceMapping>(
      this.invoiceMappingCollection,
      { squareInvoiceId }
    );

    if (existing) {
      await db.update(this.invoiceMappingCollection, existing._id!.toString(), {
        lastSyncedAt: new Date(),
        syncStatus: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } else {
      await db.create(this.invoiceMappingCollection, {
        squareInvoiceId,
        squareOrderId: '',
        squareCustomerId: '',
        lastSyncedAt: new Date(),
        syncStatus: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Square のロケーション一覧を取得
   * SDK の fetch 問題を回避するため、直接 HTTP リクエストを使用
   */
  async listLocations(): Promise<any[]> {
    try {
      const response = await squareApiFetch('/v2/locations');
      return response.locations || [];
    } catch (error) {
      logger.error('[SquareService] Failed to list locations:', error);
      throw error;
    }
  }

  /**
   * Square 顧客一覧を取得
   * SDK の fetch 問題を回避するため、直接 HTTP リクエストを使用
   */
  async listSquareCustomers(limit: number = 100): Promise<any[]> {
    try {
      const response = await squareApiFetch(`/v2/customers?limit=${limit}`);
      return response.customers || [];
    } catch (error) {
      logger.error('[SquareService] Failed to list customers:', error);
      throw error;
    }
  }

  /**
   * システムの請求書 ID から Square 請求書 ID を取得
   */
  async getSquareInvoiceIdBySystemId(systemInvoiceId: string): Promise<string | null> {
    const mapping = await db.findOne<SquareInvoiceMapping>(
      this.invoiceMappingCollection,
      { systemInvoiceId }
    );
    return mapping?.squareInvoiceId || null;
  }

  /**
   * システムの顧客 ID から Square 顧客 ID を取得
   */
  async getSquareCustomerIdBySystemId(systemCustomerId: string): Promise<string | null> {
    const mapping = await db.findOne<SquareCustomerMapping>(
      this.customerMappingCollection,
      { systemCustomerId }
    );
    return mapping?.squareCustomerId || null;
  }
}

// シングルトンインスタンス
export const squareService = new SquareService();
