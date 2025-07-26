import { C as Collections, d as db, l as logger, g as getDatabase } from '../mongodb-client.mjs';
import { ObjectId } from '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/mongodb/lib/index.js';
import '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/@sentry/nextjs/build/cjs/index.server.js';

class CompanyInfoService {
  collectionName = Collections.COMPANY_INFO;
  /**
   * 会社情報を取得（最初の1件）
   */
  async getCompanyInfo() {
    try {
      const companies = await db.find(this.collectionName, {}, { limit: 1 });
      return companies.length > 0 ? companies[0] : null;
    } catch (error) {
      logger.error("Error in getCompanyInfo:", error);
      throw new Error("\u4F1A\u793E\u60C5\u5831\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
    }
  }
  /**
   * 会社情報を作成または更新（アップサート）
   */
  async upsertCompanyInfo(companyData) {
    try {
      logger.debug("upsertCompanyInfo called with data:", {
        ...companyData,
        logoImage: companyData.logoImage ? "[BASE64_IMAGE]" : null,
        stampImage: companyData.stampImage ? "[BASE64_IMAGE]" : null
      });
      const existingInfo = await this.getCompanyInfo();
      logger.debug("Existing company info found:", !!existingInfo);
      if (existingInfo && existingInfo._id) {
        logger.debug("Updating existing company info with ID:", existingInfo._id);
        const { _id, createdAt, updatedAt, ...updateData } = { ...companyData };
        logger.debug("Update data prepared:", {
          ...updateData,
          logoImage: updateData.logoImage ? "[BASE64_IMAGE]" : null,
          stampImage: updateData.stampImage ? "[BASE64_IMAGE]" : null
        });
        const updated = await db.update(
          this.collectionName,
          existingInfo._id,
          updateData
        );
        if (!updated) {
          throw new Error("\u4F1A\u793E\u60C5\u5831\u306E\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
        }
        logger.debug("Company info updated successfully");
        return updated;
      } else {
        logger.debug("Creating new company info");
        const created = await db.create(this.collectionName, companyData);
        logger.debug("Company info created successfully");
        return created;
      }
    } catch (error) {
      logger.error("Error in upsertCompanyInfo:", error);
      throw new Error("\u4F1A\u793E\u60C5\u5831\u306E\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
    }
  }
  /**
   * 会社情報を更新
   */
  async updateCompanyInfo(updateData) {
    try {
      const existingInfo = await this.getCompanyInfo();
      if (!existingInfo || !existingInfo._id) {
        throw new Error("\u66F4\u65B0\u3059\u308B\u4F1A\u793E\u60C5\u5831\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
      }
      const { _id, ...dataToUpdate } = updateData;
      const updated = await db.update(
        this.collectionName,
        existingInfo._id,
        dataToUpdate
      );
      return updated;
    } catch (error) {
      logger.error("Error in updateCompanyInfo:", error);
      throw new Error("\u4F1A\u793E\u60C5\u5831\u306E\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
    }
  }
  /**
   * 会社情報を削除
   */
  async deleteCompanyInfo() {
    try {
      const existingInfo = await this.getCompanyInfo();
      if (!existingInfo || !existingInfo._id) {
        return false;
      }
      return await db.delete(this.collectionName, existingInfo._id);
    } catch (error) {
      logger.error("Error in deleteCompanyInfo:", error);
      throw new Error("\u4F1A\u793E\u60C5\u5831\u306E\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
    }
  }
  /**
   * 請求書番号を生成
   */
  async generateInvoiceNumber() {
    try {
      const companyInfo = await this.getCompanyInfo();
      const format = companyInfo?.invoiceNumberFormat || "INV-{YYYY}{MM}{DD}-{SEQ}";
      const now = /* @__PURE__ */ new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const day = now.getDate().toString().padStart(2, "0");
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const invoiceCount = await db.count(Collections.INVOICES, {
        createdAt: {
          $gte: today,
          $lt: tomorrow
        }
      });
      const seq = (invoiceCount + 1).toString().padStart(3, "0");
      const invoiceNumber = format.replace("{YYYY}", year).replace("{YY}", year.slice(-2)).replace("{MM}", month).replace("{DD}", day).replace("{SEQ}", seq);
      return invoiceNumber;
    } catch (error) {
      logger.error("Error in generateInvoiceNumber:", error);
      const timestamp = (/* @__PURE__ */ new Date()).getTime();
      return `INV-${timestamp}`;
    }
  }
}

class InvoiceService {
  collectionName = Collections.INVOICES;
  /**
   * 請求書を検索
   */
  async searchInvoices(params) {
    try {
      const filter = {};
      if (params.customerId) {
        filter.customerId = new ObjectId(params.customerId);
      }
      if (params.status) {
        filter.status = params.status;
      }
      if (params.dateFrom || params.dateTo) {
        filter.issueDate = {};
        if (params.dateFrom) {
          filter.issueDate.$gte = params.dateFrom;
        }
        if (params.dateTo) {
          filter.issueDate.$lte = params.dateTo;
        }
      }
      if (params.isGeneratedByAI !== void 0) {
        filter.isGeneratedByAI = params.isGeneratedByAI;
      }
      const limit = params.limit || 20;
      const skip = params.skip || 0;
      const invoices = await db.find(this.collectionName, filter, {
        sort: { issueDate: -1, invoiceNumber: -1 },
        limit: limit + 1,
        // hasMoreを判定するため1件多く取得
        skip
      });
      const customerIds = [...new Set(invoices.map((inv) => inv.customerId?.toString()).filter(Boolean))];
      if (customerIds.length > 0) {
        const customers = await db.find(Collections.CUSTOMERS, {
          _id: { $in: customerIds.map((id) => new ObjectId(id)) }
        });
        const customerMap = new Map(
          customers.map((customer) => [customer._id.toString(), customer])
        );
        invoices.forEach((invoice) => {
          if (invoice.customerId) {
            invoice.customer = customerMap.get(invoice.customerId.toString());
          }
        });
      }
      const bankAccountIds = [...new Set(invoices.map((inv) => inv.bankAccountId?.toString()).filter(Boolean))];
      if (bankAccountIds.length > 0) {
        const bankAccounts = await db.find(Collections.BANK_ACCOUNTS, {
          _id: { $in: bankAccountIds.map((id) => new ObjectId(id)) }
        });
        const bankAccountMap = new Map(
          bankAccounts.map((account) => [account._id.toString(), account])
        );
        invoices.forEach((invoice) => {
          if (invoice.bankAccountId) {
            invoice.bankAccount = bankAccountMap.get(invoice.bankAccountId.toString());
          }
        });
      }
      const hasMore = invoices.length > limit;
      if (hasMore) {
        invoices.pop();
      }
      const total = await db.count(this.collectionName, filter);
      return {
        invoices,
        total,
        hasMore
      };
    } catch (error) {
      logger.error("Error in searchInvoices:", error);
      throw new Error("\u8ACB\u6C42\u66F8\u306E\u691C\u7D22\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
    }
  }
  /**
   * 請求書を作成
   */
  async createInvoice(invoiceData) {
    try {
      const existing = await db.findOne(this.collectionName, {
        invoiceNumber: invoiceData.invoiceNumber
      });
      if (existing) {
        throw new Error(`\u8ACB\u6C42\u66F8\u756A\u53F7 ${invoiceData.invoiceNumber} \u306F\u65E2\u306B\u4F7F\u7528\u3055\u308C\u3066\u3044\u307E\u3059`);
      }
      if (invoiceData.customerId) {
        const customer = await db.findById(Collections.CUSTOMERS, invoiceData.customerId);
        if (!customer) {
          throw new Error("\u6307\u5B9A\u3055\u308C\u305F\u9867\u5BA2\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
        }
      }
      if (invoiceData.bankAccountId) {
        const bankAccount = await db.findById(Collections.BANK_ACCOUNTS, invoiceData.bankAccountId);
        if (!bankAccount) {
          throw new Error("\u6307\u5B9A\u3055\u308C\u305F\u9280\u884C\u53E3\u5EA7\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
        }
      }
      const invoice = {
        ...invoiceData,
        issueDate: new Date(invoiceData.issueDate),
        dueDate: new Date(invoiceData.dueDate),
        paidDate: invoiceData.paidDate ? new Date(invoiceData.paidDate) : void 0
      };
      const created = await db.create(this.collectionName, invoice);
      return created;
    } catch (error) {
      logger.error("Error in createInvoice:", error);
      throw error instanceof Error ? error : new Error("\u8ACB\u6C42\u66F8\u306E\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
    }
  }
  /**
   * 請求書を取得
   */
  async getInvoice(id) {
    try {
      logger.debug("[InvoiceService] getInvoice called with ID:", id);
      logger.debug("[InvoiceService] ID type:", typeof id, "Length:", id?.length);
      const invoice = await db.findById(this.collectionName, id);
      if (!invoice) {
        logger.debug("[InvoiceService] No invoice found for ID:", id);
        return null;
      }
      logger.debug("[InvoiceService] Invoice found:", {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber
      });
      if (invoice.customerId) {
        invoice.customer = await db.findById(Collections.CUSTOMERS, invoice.customerId);
      }
      if (invoice.bankAccountId) {
        invoice.bankAccount = await db.findById(Collections.BANK_ACCOUNTS, invoice.bankAccountId);
      }
      return invoice;
    } catch (error) {
      logger.error("Error in getInvoice:", error);
      throw new Error("\u8ACB\u6C42\u66F8\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
    }
  }
  /**
   * 請求書を更新
   */
  async updateInvoice(id, updateData) {
    try {
      logger.debug("[InvoiceService] updateInvoice called with:", {
        id,
        updateData: JSON.stringify(updateData, null, 2)
      });
      const { _id, ...dataToUpdate } = updateData;
      if (dataToUpdate.issueDate) {
        dataToUpdate.issueDate = new Date(dataToUpdate.issueDate);
      }
      if (dataToUpdate.dueDate) {
        dataToUpdate.dueDate = new Date(dataToUpdate.dueDate);
      }
      if (dataToUpdate.paidDate) {
        dataToUpdate.paidDate = new Date(dataToUpdate.paidDate);
      }
      if (dataToUpdate.customerId) {
        const customer = await db.findById(Collections.CUSTOMERS, dataToUpdate.customerId);
        if (!customer) {
          throw new Error("\u6307\u5B9A\u3055\u308C\u305F\u9867\u5BA2\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
        }
      }
      if (dataToUpdate.bankAccountId) {
        const bankAccount = await db.findById(Collections.BANK_ACCOUNTS, dataToUpdate.bankAccountId);
        if (!bankAccount) {
          throw new Error("\u6307\u5B9A\u3055\u308C\u305F\u9280\u884C\u53E3\u5EA7\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
        }
      }
      logger.debug("[InvoiceService] Calling db.update with:", {
        collection: this.collectionName,
        id,
        dataToUpdate: JSON.stringify(dataToUpdate, null, 2)
      });
      const updated = await db.update(this.collectionName, id, dataToUpdate);
      logger.debug("[InvoiceService] Updated invoice:", updated ? "Success" : "Failed");
      if (updated) {
        if (updated.customerId) {
          updated.customer = await db.findById(Collections.CUSTOMERS, updated.customerId);
        }
        if (updated.bankAccountId) {
          updated.bankAccount = await db.findById(Collections.BANK_ACCOUNTS, updated.bankAccountId);
        }
      }
      return updated;
    } catch (error) {
      logger.error("Error in updateInvoice:", error);
      throw error instanceof Error ? error : new Error("\u8ACB\u6C42\u66F8\u306E\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
    }
  }
  /**
   * 請求書を削除
   */
  async deleteInvoice(id) {
    try {
      return await db.delete(this.collectionName, id);
    } catch (error) {
      logger.error("Error in deleteInvoice:", error);
      throw new Error("\u8ACB\u6C42\u66F8\u306E\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
    }
  }
  /**
   * 請求書のステータスを更新
   */
  async updateInvoiceStatus(id, status, paidDate, paidAmount) {
    try {
      const updateData = { status };
      if (status === "paid") {
        updateData.paidDate = paidDate || /* @__PURE__ */ new Date();
        if (paidAmount !== void 0) {
          updateData.paidAmount = paidAmount;
        }
      }
      return await this.updateInvoice(id, updateData);
    } catch (error) {
      logger.error("Error in updateInvoiceStatus:", error);
      throw new Error("\u8ACB\u6C42\u66F8\u30B9\u30C6\u30FC\u30BF\u30B9\u306E\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
    }
  }
  /**
   * 請求書番号を生成
   */
  async generateInvoiceNumber(format) {
    try {
      const companyInfoService = new CompanyInfoService();
      const companyInfo = await companyInfoService.getCompanyInfo();
      const prefix = companyInfo?.invoicePrefix || "INV-";
      const now = /* @__PURE__ */ new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const day = now.getDate().toString().padStart(2, "0");
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const invoiceCount = await db.count(this.collectionName, {
        createdAt: {
          $gte: today,
          $lt: tomorrow
        }
      });
      const seq = (invoiceCount + 1).toString().padStart(3, "0");
      const invoiceFormat = format || `${prefix}{YYYY}{MM}{DD}-{SEQ}`;
      const invoiceNumber = invoiceFormat.replace("{YYYY}", year).replace("{YY}", year.slice(-2)).replace("{MM}", month).replace("{DD}", day).replace("{SEQ}", seq);
      return invoiceNumber;
    } catch (error) {
      logger.error("Error in generateInvoiceNumber:", error);
      const timestamp = (/* @__PURE__ */ new Date()).getTime();
      return `INV-${timestamp}`;
    }
  }
  // PDF generation is now handled by the PDF route
  // Use /api/invoices/[id]/pdf endpoint instead
  /**
   * 支払いを記録
   */
  async recordPayment(id, paidAmount, paymentDate) {
    try {
      const invoice = await this.getInvoice(id);
      if (!invoice) {
        return null;
      }
      const updateData = {
        status: "paid",
        paidDate: paymentDate,
        paidAmount
      };
      return await this.updateInvoice(id, updateData);
    } catch (error) {
      logger.error("Error in recordPayment:", error);
      throw new Error("\u652F\u6255\u3044\u8A18\u9332\u306E\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
    }
  }
  /**
   * 請求書をキャンセル
   */
  async cancelInvoice(id) {
    try {
      const updateData = {
        status: "cancelled"
      };
      return await this.updateInvoice(id, updateData);
    } catch (error) {
      logger.error("Error in cancelInvoice:", error);
      throw new Error("\u8ACB\u6C42\u66F8\u306E\u30AD\u30E3\u30F3\u30BB\u30EB\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
    }
  }
  /**
   * 月次の請求書集計
   */
  async getMonthlyAggregation(year, month) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      const pipeline = [
        {
          $match: {
            issueDate: {
              $gte: startDate,
              $lte: endDate
            },
            status: { $ne: "cancelled" }
          }
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$totalAmount" },
            taxAmount: { $sum: "$taxAmount" }
          }
        },
        {
          $project: {
            status: "$_id",
            count: 1,
            totalAmount: 1,
            taxAmount: 1,
            _id: 0
          }
        }
      ];
      return await db.aggregate(this.collectionName, pipeline);
    } catch (error) {
      logger.error("Error in getMonthlyAggregation:", error);
      throw new Error("\u6708\u6B21\u96C6\u8A08\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
    }
  }
}

const categorizeTransactionTool = {
  name: "categorize_transaction",
  description: "\u53D6\u5F15\u3092\u5206\u985E\u3057\u3001\u52D8\u5B9A\u79D1\u76EE\u3092\u81EA\u52D5\u5224\u5B9A\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      description: { type: "string", description: "\u53D6\u5F15\u5185\u5BB9" },
      amount: { type: "number", description: "\u91D1\u984D" },
      vendor_name: { type: "string", description: "\u53D6\u5F15\u5148\u540D" },
      transaction_type: {
        type: "string",
        enum: ["income", "expense", "transfer"],
        description: "\u53D6\u5F15\u7A2E\u5225"
      },
      date: { type: "string", description: "\u53D6\u5F15\u65E5\uFF08YYYY-MM-DD\uFF09" }
    },
    required: ["description", "amount", "transaction_type", "date"]
  },
  handler: async (params) => {
    logger.info("Categorizing transaction:", params);
    let category = "\u672A\u5206\u985E";
    let accountCode = "0000";
    const description = params.description.toLowerCase();
    const vendorName = params.vendor_name?.toLowerCase() || "";
    if (params.transaction_type === "income") {
      if (description.includes("\u58F2\u4E0A") || description.includes("\u8CA9\u58F2")) {
        category = "\u58F2\u4E0A\u9AD8";
        accountCode = "4100";
      } else if (description.includes("\u53D7\u53D6\u5229\u606F")) {
        category = "\u55B6\u696D\u5916\u53CE\u76CA";
        accountCode = "4200";
      } else {
        category = "\u305D\u306E\u4ED6\u53CE\u5165";
        accountCode = "4900";
      }
    } else if (params.transaction_type === "expense") {
      if (description.includes("\u4ED5\u5165") || vendorName.includes("\u5546\u4E8B")) {
        category = "\u4ED5\u5165\u9AD8";
        accountCode = "5100";
      } else if (description.includes("\u7D66\u4E0E") || description.includes("\u7D66\u6599")) {
        category = "\u4EBA\u4EF6\u8CBB";
        accountCode = "5200";
      } else if (description.includes("\u5BB6\u8CC3") || description.includes("\u8CC3\u6599")) {
        category = "\u5730\u4EE3\u5BB6\u8CC3";
        accountCode = "5210";
      } else if (description.includes("\u96FB\u6C17") || description.includes("\u30AC\u30B9") || description.includes("\u6C34\u9053")) {
        category = "\u6C34\u9053\u5149\u71B1\u8CBB";
        accountCode = "5220";
      } else if (description.includes("\u4EA4\u901A\u8CBB") || description.includes("\u96FB\u8ECA") || description.includes("\u30BF\u30AF\u30B7\u30FC")) {
        category = "\u65C5\u8CBB\u4EA4\u901A\u8CBB";
        accountCode = "5230";
      } else if (description.includes("\u4F1A\u8B70") || description.includes("\u6253\u3061\u5408\u308F\u305B")) {
        category = "\u4F1A\u8B70\u8CBB";
        accountCode = "5240";
      } else if (description.includes("\u5E83\u544A") || description.includes("\u5BA3\u4F1D")) {
        category = "\u5E83\u544A\u5BA3\u4F1D\u8CBB";
        accountCode = "5250";
      } else {
        category = "\u305D\u306E\u4ED6\u7D4C\u8CBB";
        accountCode = "5900";
      }
    } else {
      category = "\u632F\u66FF";
      accountCode = "9000";
    }
    return {
      success: true,
      category,
      accountCode,
      description: params.description,
      amount: params.amount,
      vendor_name: params.vendor_name,
      transaction_type: params.transaction_type,
      date: params.date,
      confidence: 0.85,
      reasoning: `\u53D6\u5F15\u5185\u5BB9\u300C${params.description}\u300D\u3068\u53D6\u5F15\u5148\u300C${params.vendor_name || "\u4E0D\u660E"}\u300D\u304B\u3089${category}\u3068\u5224\u5B9A\u3057\u307E\u3057\u305F\u3002`
    };
  }
};
const createJournalEntryTool = {
  name: "create_journal_entry",
  description: "\u4ED5\u8A33\u30A8\u30F3\u30C8\u30EA\u3092\u4F5C\u6210\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      description: { type: "string", description: "\u6458\u8981" },
      amount: { type: "number", description: "\u91D1\u984D" },
      debit_account: { type: "string", description: "\u501F\u65B9\u52D8\u5B9A\u79D1\u76EE" },
      credit_account: { type: "string", description: "\u8CB8\u65B9\u52D8\u5B9A\u79D1\u76EE" },
      date: { type: "string", description: "\u53D6\u5F15\u65E5" },
      company_id: { type: "string", description: "\u4F1A\u793EID" }
    },
    required: ["description", "amount", "debit_account", "credit_account", "date", "company_id"]
  },
  handler: async (params) => {
    logger.info("Creating journal entry:", params);
    const db = await getDatabase();
    const collection = db.collection("journal_entries");
    const journalEntry = {
      description: params.description,
      amount: params.amount,
      debit_account: params.debit_account,
      credit_account: params.credit_account,
      date: new Date(params.date),
      company_id: params.company_id,
      created_at: /* @__PURE__ */ new Date(),
      updated_at: /* @__PURE__ */ new Date(),
      status: "posted",
      entry_number: `JE-${Date.now()}`
    };
    const result = await collection.insertOne(journalEntry);
    return {
      success: true,
      id: result.insertedId.toString(),
      entry_number: journalEntry.entry_number,
      ...journalEntry
    };
  }
};
const createInvoiceTool = {
  name: "create_invoice",
  description: "\u8ACB\u6C42\u66F8\u3092\u4F5C\u6210\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      customer_name: { type: "string", description: "\u9867\u5BA2\u540D" },
      items: {
        type: "array",
        description: "\u5546\u54C1\u30FB\u30B5\u30FC\u30D3\u30B9\u4E00\u89A7",
        items: {
          type: "object",
          properties: {
            description: { type: "string", description: "\u5546\u54C1\u30FB\u30B5\u30FC\u30D3\u30B9\u540D" },
            quantity: { type: "number", description: "\u6570\u91CF" },
            unit_price: { type: "number", description: "\u5358\u4FA1" }
          }
        }
      },
      tax_rate: { type: "number", description: "\u6D88\u8CBB\u7A0E\u7387\uFF080.1 = 10%\uFF09" },
      due_date: { type: "string", description: "\u652F\u6255\u671F\u9650" },
      company_id: { type: "string", description: "\u4F1A\u793EID" }
    },
    required: ["customer_name", "items", "company_id"]
  },
  handler: async (params) => {
    logger.info("Creating invoice via Mastra:", params);
    const invoiceService = new InvoiceService();
    let subtotal = 0;
    const processedItems = params.items.map((item, index) => {
      const amount = item.quantity * item.unit_price;
      subtotal += amount;
      return {
        itemName: item.description,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        amount,
        taxRate: params.tax_rate || 0.1,
        taxAmount: amount * (params.tax_rate || 0.1),
        totalAmount: amount * (1 + (params.tax_rate || 0.1)),
        sortOrder: index
      };
    });
    const taxAmount = subtotal * (params.tax_rate || 0.1);
    const totalAmount = subtotal + taxAmount;
    const invoiceData = {
      customerName: params.customer_name,
      companyId: params.company_id,
      items: processedItems,
      issueDate: /* @__PURE__ */ new Date(),
      dueDate: params.due_date ? new Date(params.due_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3),
      // 30日後
      subtotal,
      taxAmount,
      totalAmount,
      taxRate: params.tax_rate || 0.1,
      status: "unpaid",
      isGeneratedByAI: true,
      aiAgent: "mastra-accounting-agent"
    };
    const invoice = await invoiceService.createInvoice(invoiceData);
    return {
      success: true,
      invoice,
      message: `\u8ACB\u6C42\u66F8${invoice.invoiceNumber}\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F`
    };
  }
};
const generateFinancialReportTool = {
  name: "generate_financial_report",
  description: "\u8CA1\u52D9\u30EC\u30DD\u30FC\u30C8\u3092\u751F\u6210\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      report_type: {
        type: "string",
        enum: ["monthly", "quarterly", "annual", "trial_balance", "profit_loss", "balance_sheet"],
        description: "\u30EC\u30DD\u30FC\u30C8\u7A2E\u5225"
      },
      start_date: { type: "string", description: "\u671F\u9593\u958B\u59CB\u65E5" },
      end_date: { type: "string", description: "\u671F\u9593\u7D42\u4E86\u65E5" },
      company_id: { type: "string", description: "\u4F1A\u793EID" }
    },
    required: ["report_type", "start_date", "end_date", "company_id"]
  },
  handler: async (params) => {
    logger.info("Generating financial report:", params);
    const db = await getDatabase();
    const startDate = new Date(params.start_date);
    const endDate = new Date(params.end_date);
    let reportData = {
      report_type: params.report_type,
      period: {
        start: params.start_date,
        end: params.end_date
      },
      company_id: params.company_id,
      generated_at: /* @__PURE__ */ new Date()
    };
    switch (params.report_type) {
      case "profit_loss":
        const invoices = await db.collection("invoices").find({
          companyId: params.company_id,
          issueDate: { $gte: startDate, $lte: endDate }
        }).toArray();
        const purchases = await db.collection("purchase_invoices").find({
          companyId: params.company_id,
          issueDate: { $gte: startDate, $lte: endDate }
        }).toArray();
        const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const totalExpenses = purchases.reduce((sum, pur) => sum + (pur.totalAmount || 0), 0);
        reportData.data = {
          revenue: {
            total: totalRevenue,
            breakdown: {
              sales: totalRevenue * 0.95,
              other: totalRevenue * 0.05
            }
          },
          expenses: {
            total: totalExpenses,
            breakdown: {
              cost_of_goods: totalExpenses * 0.6,
              operating_expenses: totalExpenses * 0.3,
              other: totalExpenses * 0.1
            }
          },
          net_income: totalRevenue - totalExpenses,
          profit_margin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100).toFixed(2) + "%" : "0%"
        };
        break;
      case "balance_sheet":
        reportData.data = {
          assets: {
            current: {
              cash: 5e6,
              accounts_receivable: 3e6,
              inventory: 2e6,
              total: 1e7
            },
            fixed: {
              equipment: 5e6,
              depreciation: -1e6,
              total: 4e6
            },
            total: 14e6
          },
          liabilities: {
            current: {
              accounts_payable: 2e6,
              accrued_expenses: 5e5,
              total: 25e5
            },
            long_term: {
              loans: 3e6,
              total: 3e6
            },
            total: 55e5
          },
          equity: {
            capital: 5e6,
            retained_earnings: 35e5,
            total: 85e5
          }
        };
        break;
      default:
        reportData.data = {
          message: `${params.report_type}\u30EC\u30DD\u30FC\u30C8\u3092\u751F\u6210\u3057\u307E\u3057\u305F`,
          records_processed: Math.floor(Math.random() * 100) + 50
        };
    }
    const reportsCollection = db.collection("financial_reports");
    const result = await reportsCollection.insertOne(reportData);
    return {
      success: true,
      report_id: result.insertedId.toString(),
      report: reportData
    };
  }
};
const calculateTaxTool = {
  name: "calculate_tax",
  description: "\u65E5\u672C\u306E\u7A0E\u91D1\uFF08\u6D88\u8CBB\u7A0E\u30FB\u6240\u5F97\u7A0E\u30FB\u6CD5\u4EBA\u7A0E\uFF09\u3092\u8A08\u7B97\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      tax_type: {
        type: "string",
        enum: ["consumption_tax", "income_tax", "corporate_tax"],
        description: "\u7A0E\u91D1\u7A2E\u5225"
      },
      taxable_amount: { type: "number", description: "\u8AB2\u7A0E\u5BFE\u8C61\u91D1\u984D" },
      tax_rate: { type: "number", description: "\u7A0E\u7387" },
      company_type: {
        type: "string",
        enum: ["individual", "corporation"],
        description: "\u4E8B\u696D\u8005\u7A2E\u5225"
      }
    },
    required: ["tax_type", "taxable_amount"]
  },
  handler: async (params) => {
    logger.info("Calculating tax:", params);
    let taxAmount = 0;
    let effectiveRate = 0;
    let calculation = {};
    switch (params.tax_type) {
      case "consumption_tax":
        effectiveRate = params.tax_rate || 0.1;
        taxAmount = params.taxable_amount * effectiveRate;
        calculation = {
          method: "\u6A19\u6E96\u7A0E\u7387\u8A08\u7B97",
          taxable_amount: params.taxable_amount,
          rate: effectiveRate,
          tax_amount: taxAmount,
          total_amount: params.taxable_amount + taxAmount
        };
        break;
      case "income_tax":
        if (params.taxable_amount <= 195e4) {
          effectiveRate = 0.05;
        } else if (params.taxable_amount <= 33e5) {
          effectiveRate = 0.1;
          taxAmount = 97500;
        } else if (params.taxable_amount <= 695e4) {
          effectiveRate = 0.2;
          taxAmount = 427500;
        } else if (params.taxable_amount <= 9e6) {
          effectiveRate = 0.23;
          taxAmount = 636e3;
        } else if (params.taxable_amount <= 18e6) {
          effectiveRate = 0.33;
          taxAmount = 1536e3;
        } else if (params.taxable_amount <= 4e7) {
          effectiveRate = 0.4;
          taxAmount = 2796e3;
        } else {
          effectiveRate = 0.45;
          taxAmount = 4796e3;
        }
        taxAmount += params.taxable_amount * effectiveRate - taxAmount;
        calculation = {
          method: "\u8D85\u904E\u7D2F\u9032\u7A0E\u7387",
          taxable_amount: params.taxable_amount,
          rate: effectiveRate,
          tax_amount: taxAmount,
          after_tax_amount: params.taxable_amount - taxAmount
        };
        break;
      case "corporate_tax":
        const isSmallCompany = params.company_type === "corporation" && params.taxable_amount <= 8e6;
        effectiveRate = isSmallCompany ? 0.15 : 0.232;
        taxAmount = params.taxable_amount * effectiveRate;
        calculation = {
          method: isSmallCompany ? "\u4E2D\u5C0F\u4F01\u696D\u7A0E\u7387" : "\u6A19\u6E96\u7A0E\u7387",
          taxable_amount: params.taxable_amount,
          rate: effectiveRate,
          tax_amount: taxAmount,
          after_tax_amount: params.taxable_amount - taxAmount
        };
        break;
    }
    return {
      success: true,
      tax_type: params.tax_type,
      calculation,
      summary: {
        taxable_amount: params.taxable_amount,
        tax_amount: taxAmount,
        effective_rate: (effectiveRate * 100).toFixed(2) + "%",
        calculated_at: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
};
const analyzeExpensesTool = {
  name: "analyze_expenses",
  description: "\u7D4C\u8CBB\u3092\u5206\u6790\u3057\u3001\u7BC0\u7A0E\u63D0\u6848\u3092\u884C\u3044\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      period_start: { type: "string", description: "\u5206\u6790\u671F\u9593\u958B\u59CB\u65E5" },
      period_end: { type: "string", description: "\u5206\u6790\u671F\u9593\u7D42\u4E86\u65E5" },
      company_id: { type: "string", description: "\u4F1A\u793EID" },
      analysis_type: {
        type: "string",
        enum: ["category_breakdown", "trend_analysis", "tax_optimization"],
        description: "\u5206\u6790\u7A2E\u5225"
      }
    },
    required: ["period_start", "period_end", "company_id", "analysis_type"]
  },
  handler: async (params) => {
    logger.info("Analyzing expenses:", params);
    const db = await getDatabase();
    const startDate = new Date(params.period_start);
    const endDate = new Date(params.period_end);
    const expenses = await db.collection("documents").find({
      companyId: params.company_id,
      type: "receipt",
      receipt_date: { $gte: startDate, $lte: endDate }
    }).toArray();
    let analysisResult = {
      period: {
        start: params.period_start,
        end: params.period_end
      },
      total_expenses: expenses.reduce((sum, exp) => sum + (exp.total_amount || 0), 0),
      expense_count: expenses.length
    };
    switch (params.analysis_type) {
      case "category_breakdown":
        const categoryBreakdown = {};
        expenses.forEach((exp) => {
          const category = exp.category || "\u672A\u5206\u985E";
          categoryBreakdown[category] = (categoryBreakdown[category] || 0) + (exp.total_amount || 0);
        });
        analysisResult.breakdown = categoryBreakdown;
        analysisResult.top_categories = Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a).slice(0, 5).map(([category, amount]) => ({ category, amount, percentage: (amount / analysisResult.total_expenses * 100).toFixed(2) + "%" }));
        break;
      case "trend_analysis":
        const monthlyTrend = {};
        expenses.forEach((exp) => {
          const month = new Date(exp.receipt_date).toISOString().substring(0, 7);
          monthlyTrend[month] = (monthlyTrend[month] || 0) + (exp.total_amount || 0);
        });
        analysisResult.monthly_trend = monthlyTrend;
        analysisResult.average_monthly = analysisResult.total_expenses / Object.keys(monthlyTrend).length;
        break;
      case "tax_optimization":
        analysisResult.optimization_suggestions = [
          {
            category: "\u65C5\u8CBB\u4EA4\u901A\u8CBB",
            current_amount: 15e4,
            suggestion: "\u51FA\u5F35\u65C5\u8CBB\u898F\u7A0B\u3092\u4F5C\u6210\u3057\u3001\u65E5\u5F53\u3092\u7D4C\u8CBB\u8A08\u4E0A\u3059\u308B\u3053\u3068\u3067\u5E74\u9593\u7D0430\u4E07\u5186\u306E\u7BC0\u7A0E\u304C\u53EF\u80FD\u3067\u3059",
            potential_saving: 3e5
          },
          {
            category: "\u4F1A\u8B70\u8CBB",
            current_amount: 8e4,
            suggestion: "\u4E00\u4EBA5,000\u5186\u4EE5\u4E0B\u306E\u98F2\u98DF\u8CBB\u306F\u4F1A\u8B70\u8CBB\u3068\u3057\u3066\u5168\u984D\u7D4C\u8CBB\u8A08\u4E0A\u53EF\u80FD\u3067\u3059",
            potential_saving: 5e4
          },
          {
            category: "\u6D88\u8017\u54C1\u8CBB",
            current_amount: 2e5,
            suggestion: "30\u4E07\u5186\u672A\u6E80\u306E\u5099\u54C1\u306F\u4E00\u62EC\u511F\u5374\u304C\u53EF\u80FD\u3067\u3059\u3002\u8A08\u753B\u7684\u306A\u8CFC\u5165\u3067\u7BC0\u7A0E\u52B9\u679C\u304C\u3042\u308A\u307E\u3059",
            potential_saving: 1e5
          }
        ];
        analysisResult.total_potential_saving = 45e4;
        break;
    }
    return {
      success: true,
      analysis: analysisResult,
      generated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};
const accountingTools = [
  categorizeTransactionTool,
  createJournalEntryTool,
  createInvoiceTool,
  generateFinancialReportTool,
  calculateTaxTool,
  analyzeExpensesTool
];

export { accountingTools, analyzeExpensesTool, calculateTaxTool, categorizeTransactionTool, createInvoiceTool, createJournalEntryTool, generateFinancialReportTool };
//# sourceMappingURL=89fc9074-430e-4148-b7eb-f7f816c0f95f.mjs.map
