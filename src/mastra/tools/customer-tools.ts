import { getDatabase } from '@/lib/mongodb-client';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * 新規顧客を登録
 */
export const createCustomerTool = {
  name: 'create_customer',
  description: '新規顧客を登録します',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: '顧客名（会社名または個人名）' },
      name_kana: { type: 'string', description: '顧客名（カナ）' },
      email: { type: 'string', description: 'メールアドレス' },
      phone: { type: 'string', description: '電話番号' },
      address: { type: 'string', description: '住所' },
      tax_id: { type: 'string', description: '法人番号または個人番号' },
      payment_terms: { type: 'number', description: '支払条件（日数）' },
      credit_limit: { type: 'number', description: '与信限度額' },
      notes: { type: 'string', description: '備考' },
    },
    required: ['name', 'name_kana', 'email'],
  },
  handler: async (params: any) => {
    logger.info('Creating customer via Mastra:', params);
    console.log('🔍 Mastra createCustomerTool 受信パラメータ:', JSON.stringify(params, null, 2));
    
    const db = await getDatabase();
    const collection = db.collection('customers');
    
    // メールアドレスの重複チェック
    if (params.email) {
      const existing = await collection.findOne({ email: params.email });
      if (existing) {
        throw new Error(`メールアドレス ${params.email} は既に登録されています`);
      }
    }
    
    // 住所情報が個別に渡されている場合はそれを使用
    let prefecture = params.prefecture || '';
    let city = params.city || '';
    let address1 = params.address1 || '';
    let address2 = params.address2 || '';
    let postalCode = params.postalCode || '';
    
    // 住所が分割されていない場合のみ、addressフィールドから分割を試みる
    if (!prefecture && !city && !address1 && params.address) {
      // 郵便番号を除去
      let cleanAddress = params.address.replace(/〒?\d{3}-?\d{4}\s*/, '');
      
      // 都道府県の抽出
      const prefectureMatch = cleanAddress.match(/(東京都|大阪府|京都府|北海道|.+?県)/);
      if (prefectureMatch) {
        prefecture = prefectureMatch[1];
        cleanAddress = cleanAddress.replace(prefectureMatch[1], '');
      }
      
      // 市区町村の抽出
      const cityMatch = cleanAddress.match(/^(.+?[市区町村])/);
      if (cityMatch) {
        city = cityMatch[1];
        cleanAddress = cleanAddress.replace(cityMatch[1], '');
      }
      
      // 残りをaddress1に
      address1 = cleanAddress.trim();
    }
    
    const customer = {
      customerId: `CUST-${Date.now()}`,
      companyName: params.name,
      companyNameKana: params.name_kana,
      email: params.email,
      phone: params.phone,
      fax: params.fax || '',
      taxId: params.tax_id || '',
      postalCode: postalCode,
      prefecture: prefecture,
      city: city,
      address1: address1,
      address2: address2,
      website: params.website || '',
      paymentTerms: params.payment_terms || 30,
      creditLimit: params.credit_limit || 0,
      notes: params.notes || '',
      tags: [],
      contacts: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await collection.insertOne(customer);
    
    return {
      success: true,
      customer_id: result.insertedId.toString(),
      customer_code: customer.customerId,
      ...customer
    };
  }
};

/**
 * 顧客情報を更新
 */
export const updateCustomerTool = {
  name: 'update_customer',
  description: '顧客情報を更新します',
  parameters: {
    type: 'object',
    properties: {
      customer_id: { type: 'string', description: '顧客ID' },
      updates: {
        type: 'object',
        description: '更新する項目',
        properties: {
          name: { type: 'string', description: '顧客名' },
          email: { type: 'string', description: 'メールアドレス' },
          phone: { type: 'string', description: '電話番号' },
          address: { type: 'string', description: '住所' },
          credit_limit: { type: 'number', description: '与信限度額' },
          status: { type: 'string', enum: ['active', 'inactive', 'suspended'], description: 'ステータス' },
        },
      },
    },
    required: ['customer_id', 'updates'],
  },
  handler: async (params: any) => {
    logger.info('Updating customer via Mastra:', params);
    
    const db = await getDatabase();
    const collection = db.collection('customers');
    
    const updates: any = {
      updatedAt: new Date()
    };
    
    // 更新フィールドのマッピング
    if (params.updates.name) updates.companyName = params.updates.name;
    if (params.updates.email) updates.email = params.updates.email;
    if (params.updates.phone) updates.phone = params.updates.phone;
    if (params.updates.credit_limit !== undefined) updates.creditLimit = params.updates.credit_limit;
    if (params.updates.status) updates.isActive = params.updates.status === 'active';
    
    if (params.updates.address) {
      const addressParts = params.updates.address.split(/(?=市|区|町|村)/);
      updates.prefecture = addressParts[0] || '';
      updates.city = addressParts[1] || '';
      updates.address1 = addressParts.slice(2).join('') || '';
    }
    
    const result = await collection.updateOne(
      { customerId: params.customer_id },
      { $set: updates }
    );
    
    if (result.matchedCount === 0) {
      throw new Error(`顧客ID ${params.customer_id} が見つかりません`);
    }
    
    return {
      success: true,
      customer_id: params.customer_id,
      updated_fields: Object.keys(params.updates),
      updated_at: updates.updatedAt
    };
  }
};

/**
 * 顧客を検索
 */
export const searchCustomersTool = {
  name: 'search_customers',
  description: '条件に基づいて顧客を検索します',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '検索キーワード' },
      filters: {
        type: 'object',
        description: 'フィルター条件',
        properties: {
          status: { type: 'string', enum: ['active', 'inactive', 'suspended'], description: 'ステータス' },
          min_revenue: { type: 'number', description: '最小売上高' },
          max_revenue: { type: 'number', description: '最大売上高' },
          created_after: { type: 'string', description: '作成日（以降）' },
          created_before: { type: 'string', description: '作成日（以前）' },
        },
      },
      sort_by: { type: 'string', enum: ['name', 'revenue', 'created_date'], description: 'ソート項目' },
      limit: { type: 'number', description: '取得件数' },
    },
    required: [],
  },
  handler: async (params: any) => {
    logger.info('Searching customers via Mastra:', params);
    
    const db = await getDatabase();
    const collection = db.collection('customers');
    
    // 検索条件の構築
    const query: any = {};
    
    if (params.query) {
      query.$or = [
        { companyName: { $regex: params.query, $options: 'i' } },
        { companyNameKana: { $regex: params.query, $options: 'i' } },
        { email: { $regex: params.query, $options: 'i' } },
        { customerId: { $regex: params.query, $options: 'i' } }
      ];
    }
    
    if (params.filters) {
      if (params.filters.status) {
        query.isActive = params.filters.status === 'active';
      }
      if (params.filters.created_after) {
        query.createdAt = { $gte: new Date(params.filters.created_after) };
      }
      if (params.filters.created_before) {
        query.createdAt = { ...query.createdAt, $lte: new Date(params.filters.created_before) };
      }
    }
    
    // ソート条件
    const sort: any = {};
    if (params.sort_by === 'name') {
      sort.companyName = 1;
    } else if (params.sort_by === 'created_date') {
      sort.createdAt = -1;
    } else {
      sort.createdAt = -1;
    }
    
    const customers = await collection
      .find(query)
      .sort(sort)
      .limit(params.limit || 20)
      .toArray();
    
    return {
      success: true,
      count: customers.length,
      customers: customers.map(c => ({
        customer_id: c.customerId,
        name: c.companyName,
        email: c.email,
        phone: c.phone,
        status: c.isActive ? 'active' : 'inactive',
        created_at: c.createdAt
      }))
    };
  }
};

/**
 * 顧客の取引履歴を分析
 */
export const analyzeCustomerTool = {
  name: 'analyze_customer',
  description: '顧客の取引履歴を分析します',
  parameters: {
    type: 'object',
    properties: {
      customer_id: { type: 'string', description: '顧客ID' },
      analysis_type: {
        type: 'string',
        enum: ['transaction_history', 'revenue_trend', 'payment_behavior', 'profitability'],
        description: '分析タイプ',
      },
      period_start: { type: 'string', description: '分析期間開始日' },
      period_end: { type: 'string', description: '分析期間終了日' },
    },
    required: ['customer_id', 'analysis_type'],
  },
  handler: async (params: any) => {
    logger.info('Analyzing customer via Mastra:', params);
    
    const db = await getDatabase();
    
    // 顧客情報を取得
    const customer = await db.collection('customers').findOne({ customerId: params.customer_id });
    if (!customer) {
      throw new Error(`顧客ID ${params.customer_id} が見つかりません`);
    }
    
    const startDate = params.period_start ? new Date(params.period_start) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const endDate = params.period_end ? new Date(params.period_end) : new Date();
    
    // 請求書データを取得
    const invoices = await db.collection('invoices').find({
      customerName: customer.companyName,
      issueDate: { $gte: startDate, $lte: endDate }
    }).toArray();
    
    let analysisResult: any = {
      customer_id: params.customer_id,
      customer_name: customer.companyName,
      analysis_type: params.analysis_type,
      period: {
        start: startDate,
        end: endDate
      }
    };
    
    switch (params.analysis_type) {
      case 'transaction_history':
        analysisResult.transactions = invoices.map(inv => ({
          invoice_number: inv.invoiceNumber,
          date: inv.issueDate,
          amount: inv.totalAmount,
          status: inv.status,
          due_date: inv.dueDate
        }));
        analysisResult.total_transactions = invoices.length;
        analysisResult.total_amount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        break;
        
      case 'revenue_trend':
        const monthlyRevenue: Record<string, number> = {};
        invoices.forEach(inv => {
          const month = new Date(inv.issueDate).toISOString().substring(0, 7);
          monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (inv.totalAmount || 0);
        });
        
        analysisResult.monthly_revenue = monthlyRevenue;
        analysisResult.average_monthly_revenue = 
          Object.values(monthlyRevenue).reduce((sum, val) => sum + val, 0) / Object.keys(monthlyRevenue).length;
        analysisResult.trend = Object.values(monthlyRevenue).length > 1 
          ? (Object.values(monthlyRevenue)[Object.values(monthlyRevenue).length - 1] > Object.values(monthlyRevenue)[0] ? 'increasing' : 'decreasing')
          : 'stable';
        break;
        
      case 'payment_behavior':
        const paidInvoices = invoices.filter(inv => inv.status === 'paid');
        const unpaidInvoices = invoices.filter(inv => inv.status === 'unpaid');
        const overdueInvoices = invoices.filter(inv => 
          inv.status === 'unpaid' && new Date(inv.dueDate) < new Date()
        );
        
        analysisResult.payment_stats = {
          total_invoices: invoices.length,
          paid_invoices: paidInvoices.length,
          unpaid_invoices: unpaidInvoices.length,
          overdue_invoices: overdueInvoices.length,
          payment_rate: invoices.length > 0 ? (paidInvoices.length / invoices.length * 100).toFixed(2) + '%' : '0%',
          average_payment_days: customer.paymentTerms || 30
        };
        break;
        
      case 'profitability':
        const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const estimatedCost = totalRevenue * 0.6; // 仮の原価率60%
        const estimatedProfit = totalRevenue - estimatedCost;
        
        analysisResult.profitability = {
          total_revenue: totalRevenue,
          estimated_cost: estimatedCost,
          estimated_profit: estimatedProfit,
          profit_margin: totalRevenue > 0 ? (estimatedProfit / totalRevenue * 100).toFixed(2) + '%' : '0%',
          customer_rank: estimatedProfit > 1000000 ? 'A' : estimatedProfit > 500000 ? 'B' : 'C'
        };
        break;
    }
    
    return {
      success: true,
      analysis: analysisResult
    };
  }
};

/**
 * 顧客生涯価値（CLV）を計算
 */
export const calculateCustomerLifetimeValueTool = {
  name: 'calculate_customer_lifetime_value',
  description: '顧客生涯価値（CLV）を計算します',
  parameters: {
    type: 'object',
    properties: {
      customer_id: { type: 'string', description: '顧客ID' },
      projection_years: { type: 'number', description: '予測年数' },
      discount_rate: { type: 'number', description: '割引率' },
    },
    required: ['customer_id'],
  },
  handler: async (params: any) => {
    logger.info('Calculating customer lifetime value via Mastra:', params);
    
    const db = await getDatabase();
    
    // 顧客情報を取得
    const customer = await db.collection('customers').findOne({ customerId: params.customer_id });
    if (!customer) {
      throw new Error(`顧客ID ${params.customer_id} が見つかりません`);
    }
    
    // 過去の取引履歴を取得
    const invoices = await db.collection('invoices').find({
      customerName: customer.companyName
    }).toArray();
    
    // 年間平均売上を計算
    const firstInvoiceDate = invoices.reduce((min, inv) => 
      inv.issueDate < min ? inv.issueDate : min, 
      invoices[0]?.issueDate || new Date()
    );
    const lastInvoiceDate = invoices.reduce((max, inv) => 
      inv.issueDate > max ? inv.issueDate : max, 
      invoices[0]?.issueDate || new Date()
    );
    
    const yearsActive = Math.max(1, (lastInvoiceDate.getTime() - firstInvoiceDate.getTime()) / (365 * 24 * 60 * 60 * 1000));
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const annualRevenue = totalRevenue / yearsActive;
    
    // CLVを計算
    const projectionYears = params.projection_years || 5;
    const discountRate = params.discount_rate || 0.1;
    let clv = 0;
    
    for (let year = 1; year <= projectionYears; year++) {
      const discountedValue = annualRevenue / Math.pow(1 + discountRate, year);
      clv += discountedValue;
    }
    
    return {
      success: true,
      customer_id: params.customer_id,
      customer_name: customer.companyName,
      calculation: {
        historical_data: {
          total_revenue: totalRevenue,
          years_active: yearsActive.toFixed(1),
          annual_revenue: annualRevenue,
          transaction_count: invoices.length
        },
        projection: {
          years: projectionYears,
          discount_rate: (discountRate * 100).toFixed(2) + '%',
          clv: Math.round(clv),
          clv_formatted: '¥' + Math.round(clv).toLocaleString()
        }
      }
    };
  }
};

/**
 * 顧客レポートを生成
 */
export const generateCustomerReportTool = {
  name: 'generate_customer_report',
  description: '顧客レポートを生成します',
  parameters: {
    type: 'object',
    properties: {
      report_type: {
        type: 'string',
        enum: ['summary', 'detailed', 'segment_analysis', 'top_customers'],
        description: 'レポートタイプ',
      },
      period_start: { type: 'string', description: '期間開始日' },
      period_end: { type: 'string', description: '期間終了日' },
      format: { type: 'string', enum: ['pdf', 'excel', 'json'], description: '出力形式' },
    },
    required: ['report_type', 'period_start', 'period_end'],
  },
  handler: async (params: any) => {
    logger.info('Generating customer report via Mastra:', params);
    
    const db = await getDatabase();
    const startDate = new Date(params.period_start);
    const endDate = new Date(params.period_end);
    
    let reportData: any = {
      report_type: params.report_type,
      period: {
        start: startDate,
        end: endDate
      },
      generated_at: new Date()
    };
    
    switch (params.report_type) {
      case 'summary':
        const customers = await db.collection('customers').find({}).toArray();
        const activeCustomers = customers.filter(c => c.isActive);
        
        reportData.summary = {
          total_customers: customers.length,
          active_customers: activeCustomers.length,
          inactive_customers: customers.length - activeCustomers.length,
          new_customers_period: customers.filter(c => 
            c.createdAt >= startDate && c.createdAt <= endDate
          ).length
        };
        break;
        
      case 'top_customers':
        // 期間内の売上でトップ顧客を取得
        const invoices = await db.collection('invoices').find({
          issueDate: { $gte: startDate, $lte: endDate }
        }).toArray();
        
        const customerRevenue: Record<string, number> = {};
        invoices.forEach(inv => {
          const customerName = inv.customerName || 'Unknown';
          customerRevenue[customerName] = (customerRevenue[customerName] || 0) + (inv.totalAmount || 0);
        });
        
        reportData.top_customers = Object.entries(customerRevenue)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([name, revenue], index) => ({
            rank: index + 1,
            customer_name: name,
            revenue: revenue,
            revenue_formatted: '¥' + revenue.toLocaleString()
          }));
        break;
        
      case 'segment_analysis':
        const allCustomers = await db.collection('customers').find({}).toArray();
        
        // 地域別セグメント
        const prefectureSegment: Record<string, number> = {};
        allCustomers.forEach(c => {
          const prefecture = c.prefecture || '不明';
          prefectureSegment[prefecture] = (prefectureSegment[prefecture] || 0) + 1;
        });
        
        reportData.segments = {
          by_prefecture: prefectureSegment,
          by_payment_terms: {
            immediate: allCustomers.filter(c => c.paymentTerms === 0).length,
            net_30: allCustomers.filter(c => c.paymentTerms === 30).length,
            net_60: allCustomers.filter(c => c.paymentTerms === 60).length,
            other: allCustomers.filter(c => c.paymentTerms && c.paymentTerms !== 0 && c.paymentTerms !== 30 && c.paymentTerms !== 60).length
          }
        };
        break;
    }
    
    // レポートを保存
    const reportsCollection = db.collection('customer_reports');
    const result = await reportsCollection.insertOne(reportData);
    
    return {
      success: true,
      report_id: result.insertedId.toString(),
      report: reportData,
      format: params.format || 'json'
    };
  }
};

// すべてのツールをエクスポート
export const customerTools = [
  createCustomerTool,
  updateCustomerTool,
  searchCustomersTool,
  analyzeCustomerTool,
  calculateCustomerLifetimeValueTool,
  generateCustomerReportTool
];