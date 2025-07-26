import { l as logger, g as getDatabase } from '../mongodb-client.mjs';
import '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/mongodb/lib/index.js';
import '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/@sentry/nextjs/build/cjs/index.server.js';

const createCustomerTool = {
  name: "create_customer",
  description: "\u65B0\u898F\u9867\u5BA2\u3092\u767B\u9332\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "\u9867\u5BA2\u540D\uFF08\u4F1A\u793E\u540D\u307E\u305F\u306F\u500B\u4EBA\u540D\uFF09" },
      name_kana: { type: "string", description: "\u9867\u5BA2\u540D\uFF08\u30AB\u30CA\uFF09" },
      email: { type: "string", description: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9" },
      phone: { type: "string", description: "\u96FB\u8A71\u756A\u53F7" },
      address: { type: "string", description: "\u4F4F\u6240" },
      tax_id: { type: "string", description: "\u6CD5\u4EBA\u756A\u53F7\u307E\u305F\u306F\u500B\u4EBA\u756A\u53F7" },
      payment_terms: { type: "number", description: "\u652F\u6255\u6761\u4EF6\uFF08\u65E5\u6570\uFF09" },
      credit_limit: { type: "number", description: "\u4E0E\u4FE1\u9650\u5EA6\u984D" },
      notes: { type: "string", description: "\u5099\u8003" }
    },
    required: ["name", "name_kana", "email"]
  },
  handler: async (params) => {
    logger.info("Creating customer via Mastra:", params);
    const db = await getDatabase();
    const collection = db.collection("customers");
    if (params.email) {
      const existing = await collection.findOne({ email: params.email });
      if (existing) {
        throw new Error(`\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9 ${params.email} \u306F\u65E2\u306B\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u3059`);
      }
    }
    const addressParts = params.address ? params.address.split(/(?=市|区|町|村)/) : [];
    const customer = {
      customerId: `CUST-${Date.now()}`,
      companyName: params.name,
      companyNameKana: params.name_kana,
      email: params.email,
      phone: params.phone,
      fax: "",
      taxId: params.tax_id || "",
      postalCode: "",
      prefecture: addressParts[0] || "",
      city: addressParts[1] || "",
      address1: addressParts.slice(2).join("") || "",
      address2: "",
      website: "",
      paymentTerms: params.payment_terms || 30,
      creditLimit: params.credit_limit || 0,
      notes: params.notes || "",
      tags: [],
      contacts: [],
      isActive: true,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
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
const updateCustomerTool = {
  name: "update_customer",
  description: "\u9867\u5BA2\u60C5\u5831\u3092\u66F4\u65B0\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      customer_id: { type: "string", description: "\u9867\u5BA2ID" },
      updates: {
        type: "object",
        description: "\u66F4\u65B0\u3059\u308B\u9805\u76EE",
        properties: {
          name: { type: "string", description: "\u9867\u5BA2\u540D" },
          email: { type: "string", description: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9" },
          phone: { type: "string", description: "\u96FB\u8A71\u756A\u53F7" },
          address: { type: "string", description: "\u4F4F\u6240" },
          credit_limit: { type: "number", description: "\u4E0E\u4FE1\u9650\u5EA6\u984D" },
          status: { type: "string", enum: ["active", "inactive", "suspended"], description: "\u30B9\u30C6\u30FC\u30BF\u30B9" }
        }
      }
    },
    required: ["customer_id", "updates"]
  },
  handler: async (params) => {
    logger.info("Updating customer via Mastra:", params);
    const db = await getDatabase();
    const collection = db.collection("customers");
    const updates = {
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (params.updates.name) updates.companyName = params.updates.name;
    if (params.updates.email) updates.email = params.updates.email;
    if (params.updates.phone) updates.phone = params.updates.phone;
    if (params.updates.credit_limit !== void 0) updates.creditLimit = params.updates.credit_limit;
    if (params.updates.status) updates.isActive = params.updates.status === "active";
    if (params.updates.address) {
      const addressParts = params.updates.address.split(/(?=市|区|町|村)/);
      updates.prefecture = addressParts[0] || "";
      updates.city = addressParts[1] || "";
      updates.address1 = addressParts.slice(2).join("") || "";
    }
    const result = await collection.updateOne(
      { customerId: params.customer_id },
      { $set: updates }
    );
    if (result.matchedCount === 0) {
      throw new Error(`\u9867\u5BA2ID ${params.customer_id} \u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093`);
    }
    return {
      success: true,
      customer_id: params.customer_id,
      updated_fields: Object.keys(params.updates),
      updated_at: updates.updatedAt
    };
  }
};
const searchCustomersTool = {
  name: "search_customers",
  description: "\u6761\u4EF6\u306B\u57FA\u3065\u3044\u3066\u9867\u5BA2\u3092\u691C\u7D22\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "\u691C\u7D22\u30AD\u30FC\u30EF\u30FC\u30C9" },
      filters: {
        type: "object",
        description: "\u30D5\u30A3\u30EB\u30BF\u30FC\u6761\u4EF6",
        properties: {
          status: { type: "string", enum: ["active", "inactive", "suspended"], description: "\u30B9\u30C6\u30FC\u30BF\u30B9" },
          min_revenue: { type: "number", description: "\u6700\u5C0F\u58F2\u4E0A\u9AD8" },
          max_revenue: { type: "number", description: "\u6700\u5927\u58F2\u4E0A\u9AD8" },
          created_after: { type: "string", description: "\u4F5C\u6210\u65E5\uFF08\u4EE5\u964D\uFF09" },
          created_before: { type: "string", description: "\u4F5C\u6210\u65E5\uFF08\u4EE5\u524D\uFF09" }
        }
      },
      sort_by: { type: "string", enum: ["name", "revenue", "created_date"], description: "\u30BD\u30FC\u30C8\u9805\u76EE" },
      limit: { type: "number", description: "\u53D6\u5F97\u4EF6\u6570" }
    },
    required: []
  },
  handler: async (params) => {
    logger.info("Searching customers via Mastra:", params);
    const db = await getDatabase();
    const collection = db.collection("customers");
    const query = {};
    if (params.query) {
      query.$or = [
        { companyName: { $regex: params.query, $options: "i" } },
        { companyNameKana: { $regex: params.query, $options: "i" } },
        { email: { $regex: params.query, $options: "i" } },
        { customerId: { $regex: params.query, $options: "i" } }
      ];
    }
    if (params.filters) {
      if (params.filters.status) {
        query.isActive = params.filters.status === "active";
      }
      if (params.filters.created_after) {
        query.createdAt = { $gte: new Date(params.filters.created_after) };
      }
      if (params.filters.created_before) {
        query.createdAt = { ...query.createdAt, $lte: new Date(params.filters.created_before) };
      }
    }
    const sort = {};
    if (params.sort_by === "name") {
      sort.companyName = 1;
    } else if (params.sort_by === "created_date") {
      sort.createdAt = -1;
    } else {
      sort.createdAt = -1;
    }
    const customers = await collection.find(query).sort(sort).limit(params.limit || 20).toArray();
    return {
      success: true,
      count: customers.length,
      customers: customers.map((c) => ({
        customer_id: c.customerId,
        name: c.companyName,
        email: c.email,
        phone: c.phone,
        status: c.isActive ? "active" : "inactive",
        created_at: c.createdAt
      }))
    };
  }
};
const analyzeCustomerTool = {
  name: "analyze_customer",
  description: "\u9867\u5BA2\u306E\u53D6\u5F15\u5C65\u6B74\u3092\u5206\u6790\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      customer_id: { type: "string", description: "\u9867\u5BA2ID" },
      analysis_type: {
        type: "string",
        enum: ["transaction_history", "revenue_trend", "payment_behavior", "profitability"],
        description: "\u5206\u6790\u30BF\u30A4\u30D7"
      },
      period_start: { type: "string", description: "\u5206\u6790\u671F\u9593\u958B\u59CB\u65E5" },
      period_end: { type: "string", description: "\u5206\u6790\u671F\u9593\u7D42\u4E86\u65E5" }
    },
    required: ["customer_id", "analysis_type"]
  },
  handler: async (params) => {
    logger.info("Analyzing customer via Mastra:", params);
    const db = await getDatabase();
    const customer = await db.collection("customers").findOne({ customerId: params.customer_id });
    if (!customer) {
      throw new Error(`\u9867\u5BA2ID ${params.customer_id} \u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093`);
    }
    const startDate = params.period_start ? new Date(params.period_start) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1e3);
    const endDate = params.period_end ? new Date(params.period_end) : /* @__PURE__ */ new Date();
    const invoices = await db.collection("invoices").find({
      customerName: customer.companyName,
      issueDate: { $gte: startDate, $lte: endDate }
    }).toArray();
    let analysisResult = {
      customer_id: params.customer_id,
      customer_name: customer.companyName,
      analysis_type: params.analysis_type,
      period: {
        start: startDate,
        end: endDate
      }
    };
    switch (params.analysis_type) {
      case "transaction_history":
        analysisResult.transactions = invoices.map((inv) => ({
          invoice_number: inv.invoiceNumber,
          date: inv.issueDate,
          amount: inv.totalAmount,
          status: inv.status,
          due_date: inv.dueDate
        }));
        analysisResult.total_transactions = invoices.length;
        analysisResult.total_amount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        break;
      case "revenue_trend":
        const monthlyRevenue = {};
        invoices.forEach((inv) => {
          const month = new Date(inv.issueDate).toISOString().substring(0, 7);
          monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (inv.totalAmount || 0);
        });
        analysisResult.monthly_revenue = monthlyRevenue;
        analysisResult.average_monthly_revenue = Object.values(monthlyRevenue).reduce((sum, val) => sum + val, 0) / Object.keys(monthlyRevenue).length;
        analysisResult.trend = Object.values(monthlyRevenue).length > 1 ? Object.values(monthlyRevenue)[Object.values(monthlyRevenue).length - 1] > Object.values(monthlyRevenue)[0] ? "increasing" : "decreasing" : "stable";
        break;
      case "payment_behavior":
        const paidInvoices = invoices.filter((inv) => inv.status === "paid");
        const unpaidInvoices = invoices.filter((inv) => inv.status === "unpaid");
        const overdueInvoices = invoices.filter(
          (inv) => inv.status === "unpaid" && new Date(inv.dueDate) < /* @__PURE__ */ new Date()
        );
        analysisResult.payment_stats = {
          total_invoices: invoices.length,
          paid_invoices: paidInvoices.length,
          unpaid_invoices: unpaidInvoices.length,
          overdue_invoices: overdueInvoices.length,
          payment_rate: invoices.length > 0 ? (paidInvoices.length / invoices.length * 100).toFixed(2) + "%" : "0%",
          average_payment_days: customer.paymentTerms || 30
        };
        break;
      case "profitability":
        const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const estimatedCost = totalRevenue * 0.6;
        const estimatedProfit = totalRevenue - estimatedCost;
        analysisResult.profitability = {
          total_revenue: totalRevenue,
          estimated_cost: estimatedCost,
          estimated_profit: estimatedProfit,
          profit_margin: totalRevenue > 0 ? (estimatedProfit / totalRevenue * 100).toFixed(2) + "%" : "0%",
          customer_rank: estimatedProfit > 1e6 ? "A" : estimatedProfit > 5e5 ? "B" : "C"
        };
        break;
    }
    return {
      success: true,
      analysis: analysisResult
    };
  }
};
const calculateCustomerLifetimeValueTool = {
  name: "calculate_customer_lifetime_value",
  description: "\u9867\u5BA2\u751F\u6DAF\u4FA1\u5024\uFF08CLV\uFF09\u3092\u8A08\u7B97\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      customer_id: { type: "string", description: "\u9867\u5BA2ID" },
      projection_years: { type: "number", description: "\u4E88\u6E2C\u5E74\u6570" },
      discount_rate: { type: "number", description: "\u5272\u5F15\u7387" }
    },
    required: ["customer_id"]
  },
  handler: async (params) => {
    logger.info("Calculating customer lifetime value via Mastra:", params);
    const db = await getDatabase();
    const customer = await db.collection("customers").findOne({ customerId: params.customer_id });
    if (!customer) {
      throw new Error(`\u9867\u5BA2ID ${params.customer_id} \u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093`);
    }
    const invoices = await db.collection("invoices").find({
      customerName: customer.companyName
    }).toArray();
    const firstInvoiceDate = invoices.reduce(
      (min, inv) => inv.issueDate < min ? inv.issueDate : min,
      invoices[0]?.issueDate || /* @__PURE__ */ new Date()
    );
    const lastInvoiceDate = invoices.reduce(
      (max, inv) => inv.issueDate > max ? inv.issueDate : max,
      invoices[0]?.issueDate || /* @__PURE__ */ new Date()
    );
    const yearsActive = Math.max(1, (lastInvoiceDate.getTime() - firstInvoiceDate.getTime()) / (365 * 24 * 60 * 60 * 1e3));
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const annualRevenue = totalRevenue / yearsActive;
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
          discount_rate: (discountRate * 100).toFixed(2) + "%",
          clv: Math.round(clv),
          clv_formatted: "\xA5" + Math.round(clv).toLocaleString()
        }
      }
    };
  }
};
const generateCustomerReportTool = {
  name: "generate_customer_report",
  description: "\u9867\u5BA2\u30EC\u30DD\u30FC\u30C8\u3092\u751F\u6210\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      report_type: {
        type: "string",
        enum: ["summary", "detailed", "segment_analysis", "top_customers"],
        description: "\u30EC\u30DD\u30FC\u30C8\u30BF\u30A4\u30D7"
      },
      period_start: { type: "string", description: "\u671F\u9593\u958B\u59CB\u65E5" },
      period_end: { type: "string", description: "\u671F\u9593\u7D42\u4E86\u65E5" },
      format: { type: "string", enum: ["pdf", "excel", "json"], description: "\u51FA\u529B\u5F62\u5F0F" }
    },
    required: ["report_type", "period_start", "period_end"]
  },
  handler: async (params) => {
    logger.info("Generating customer report via Mastra:", params);
    const db = await getDatabase();
    const startDate = new Date(params.period_start);
    const endDate = new Date(params.period_end);
    let reportData = {
      report_type: params.report_type,
      period: {
        start: startDate,
        end: endDate
      },
      generated_at: /* @__PURE__ */ new Date()
    };
    switch (params.report_type) {
      case "summary":
        const customers = await db.collection("customers").find({}).toArray();
        const activeCustomers = customers.filter((c) => c.isActive);
        reportData.summary = {
          total_customers: customers.length,
          active_customers: activeCustomers.length,
          inactive_customers: customers.length - activeCustomers.length,
          new_customers_period: customers.filter(
            (c) => c.createdAt >= startDate && c.createdAt <= endDate
          ).length
        };
        break;
      case "top_customers":
        const invoices = await db.collection("invoices").find({
          issueDate: { $gte: startDate, $lte: endDate }
        }).toArray();
        const customerRevenue = {};
        invoices.forEach((inv) => {
          const customerName = inv.customerName || "Unknown";
          customerRevenue[customerName] = (customerRevenue[customerName] || 0) + (inv.totalAmount || 0);
        });
        reportData.top_customers = Object.entries(customerRevenue).sort(([, a], [, b]) => b - a).slice(0, 10).map(([name, revenue], index) => ({
          rank: index + 1,
          customer_name: name,
          revenue,
          revenue_formatted: "\xA5" + revenue.toLocaleString()
        }));
        break;
      case "segment_analysis":
        const allCustomers = await db.collection("customers").find({}).toArray();
        const prefectureSegment = {};
        allCustomers.forEach((c) => {
          const prefecture = c.prefecture || "\u4E0D\u660E";
          prefectureSegment[prefecture] = (prefectureSegment[prefecture] || 0) + 1;
        });
        reportData.segments = {
          by_prefecture: prefectureSegment,
          by_payment_terms: {
            immediate: allCustomers.filter((c) => c.paymentTerms === 0).length,
            net_30: allCustomers.filter((c) => c.paymentTerms === 30).length,
            net_60: allCustomers.filter((c) => c.paymentTerms === 60).length,
            other: allCustomers.filter((c) => c.paymentTerms && c.paymentTerms !== 0 && c.paymentTerms !== 30 && c.paymentTerms !== 60).length
          }
        };
        break;
    }
    const reportsCollection = db.collection("customer_reports");
    const result = await reportsCollection.insertOne(reportData);
    return {
      success: true,
      report_id: result.insertedId.toString(),
      report: reportData,
      format: params.format || "json"
    };
  }
};
const customerTools = [
  createCustomerTool,
  updateCustomerTool,
  searchCustomersTool,
  analyzeCustomerTool,
  calculateCustomerLifetimeValueTool,
  generateCustomerReportTool
];

export { analyzeCustomerTool, calculateCustomerLifetimeValueTool, createCustomerTool, customerTools, generateCustomerReportTool, searchCustomersTool, updateCustomerTool };
//# sourceMappingURL=5fbb7b3c-e510-443e-98c1-5cdddd562c52.mjs.map
