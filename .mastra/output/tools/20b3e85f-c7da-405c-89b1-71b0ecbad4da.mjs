import { l as logger, g as getDatabase } from '../mongodb-client.mjs';
import '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/mongodb/lib/index.js';
import '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/@sentry/nextjs/build/cjs/index.server.js';

const calculateConsumptionTaxTool = {
  name: "calculate_consumption_tax",
  description: "\u6D88\u8CBB\u7A0E\u3092\u8A08\u7B97\u3057\u307E\u3059\uFF08\u8EFD\u6E1B\u7A0E\u7387\u5BFE\u5FDC\uFF09",
  parameters: {
    type: "object",
    properties: {
      amount: { type: "number", description: "\u7A0E\u629C\u91D1\u984D" },
      tax_rate: { type: "number", enum: [0.08, 0.1], description: "\u7A0E\u7387\uFF080.08=8%\u30010.1=10%\uFF09" },
      item_type: {
        type: "string",
        enum: ["food", "newspaper", "standard", "mixed"],
        description: "\u54C1\u76EE\u30BF\u30A4\u30D7"
      },
      calculation_method: {
        type: "string",
        enum: ["item_by_item", "invoice", "total"],
        description: "\u8A08\u7B97\u65B9\u5F0F"
      },
      is_tax_included: { type: "boolean", description: "\u7A0E\u8FBC\u4FA1\u683C\u304B\u3089\u8A08\u7B97\u3059\u308B\u304B" }
    },
    required: ["amount", "tax_rate"]
  },
  handler: async (params) => {
    logger.info("Calculating consumption tax:", params);
    let taxableAmount = params.amount;
    let taxAmount = 0;
    let totalAmount = 0;
    if (params.is_tax_included) {
      taxableAmount = params.amount / (1 + params.tax_rate);
      taxAmount = params.amount - taxableAmount;
      totalAmount = params.amount;
    } else {
      taxAmount = taxableAmount * params.tax_rate;
      totalAmount = taxableAmount + taxAmount;
    }
    taxAmount = Math.floor(taxAmount);
    let itemInfo = "";
    switch (params.item_type) {
      case "food":
        itemInfo = "\u98DF\u54C1\uFF08\u8EFD\u6E1B\u7A0E\u73878%\u9069\u7528\uFF09";
        break;
      case "newspaper":
        itemInfo = "\u65B0\u805E\uFF08\u90312\u56DE\u4EE5\u4E0A\u767A\u884C\u3001\u5B9A\u671F\u8CFC\u8AAD\u5951\u7D04\u3001\u8EFD\u6E1B\u7A0E\u73878%\u9069\u7528\uFF09";
        break;
      case "standard":
        itemInfo = "\u6A19\u6E96\u7A0E\u738710%\u9069\u7528";
        break;
      case "mixed":
        itemInfo = "\u8EFD\u6E1B\u7A0E\u7387\u3068\u6A19\u6E96\u7A0E\u7387\u306E\u6DF7\u5728";
        break;
    }
    return {
      success: true,
      calculation: {
        original_amount: params.amount,
        is_tax_included: params.is_tax_included,
        taxable_amount: Math.floor(taxableAmount),
        tax_rate: params.tax_rate,
        tax_rate_percentage: `${params.tax_rate * 100}%`,
        tax_amount: taxAmount,
        total_amount: Math.floor(totalAmount),
        item_type: params.item_type,
        item_info: itemInfo,
        calculation_method: params.calculation_method || "item_by_item"
      },
      invoice_requirement: params.tax_rate === 0.08 || params.item_type === "mixed" ? "\u9069\u683C\u8ACB\u6C42\u66F8\u306E\u8A18\u8F09\u304C\u5FC5\u8981\u3067\u3059\uFF08\u8EFD\u6E1B\u7A0E\u7387\u5BFE\u8C61\u54C1\u76EE\u306E\u305F\u3081\uFF09" : "\u6A19\u6E96\u7A0E\u7387\u306E\u307F\u306E\u5834\u5408\u3082\u9069\u683C\u8ACB\u6C42\u66F8\u306E\u767A\u884C\u304C\u63A8\u5968\u3055\u308C\u307E\u3059"
    };
  }
};
const calculateWithholdingTaxTool = {
  name: "calculate_withholding_tax",
  description: "\u6E90\u6CC9\u5FB4\u53CE\u7A0E\u3092\u8A08\u7B97\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      payment_type: {
        type: "string",
        enum: ["salary", "bonus", "retirement", "dividend", "interest", "royalty", "professional_fee"],
        description: "\u652F\u6255\u7A2E\u5225"
      },
      gross_amount: { type: "number", description: "\u7DCF\u652F\u6255\u984D" },
      employee_info: {
        type: "object",
        properties: {
          dependents: { type: "number", description: "\u6276\u990A\u4EBA\u6570" },
          insurance_deduction: { type: "number", description: "\u793E\u4F1A\u4FDD\u967A\u6599\u63A7\u9664\u984D" },
          is_resident: { type: "boolean", description: "\u5C45\u4F4F\u8005\u304B" }
        }
      },
      payment_date: { type: "string", description: "\u652F\u6255\u65E5" }
    },
    required: ["payment_type", "gross_amount"]
  },
  handler: async (params) => {
    logger.info("Calculating withholding tax:", params);
    let withholdingAmount = 0;
    let taxRate = 0;
    let calculationMethod = "";
    const db = await getDatabase();
    const collection = db.collection("withholding_tax_calculations");
    switch (params.payment_type) {
      case "salary":
        const monthlyAmount = params.gross_amount;
        const socialInsurance = params.employee_info?.insurance_deduction || monthlyAmount * 0.15;
        const taxableAmount = monthlyAmount - socialInsurance;
        const dependents = params.employee_info?.dependents || 0;
        if (taxableAmount <= 88e3) {
          taxRate = 0;
        } else if (taxableAmount <= 89e3) {
          withholdingAmount = 130;
        } else if (taxableAmount <= 9e4) {
          withholdingAmount = 180;
        } else if (taxableAmount <= 93e3) {
          withholdingAmount = 290;
        } else if (taxableAmount <= 94e3) {
          withholdingAmount = 340;
        } else {
          taxRate = 0.05;
          withholdingAmount = taxableAmount * taxRate;
        }
        withholdingAmount = Math.max(0, withholdingAmount - dependents * 3e3);
        calculationMethod = "\u7D66\u4E0E\u6240\u5F97\u306E\u6E90\u6CC9\u5FB4\u53CE\u7A0E\u984D\u8868\uFF08\u6708\u984D\u8868\uFF09";
        break;
      case "bonus":
        const previousMonthSalary = params.employee_info?.previous_month_salary || 3e5;
        const bonusTaxRate = getBonusTaxRate(previousMonthSalary);
        withholdingAmount = params.gross_amount * bonusTaxRate;
        taxRate = bonusTaxRate;
        calculationMethod = "\u8CDE\u4E0E\u306B\u5BFE\u3059\u308B\u6E90\u6CC9\u5FB4\u53CE\u7A0E\u984D\u306E\u7B97\u51FA\u7387\u8868";
        break;
      case "professional_fee":
        if (params.gross_amount <= 1e6) {
          taxRate = 0.1021;
        } else {
          taxRate = 0.2042;
          withholdingAmount = (params.gross_amount - 1e6) * 0.2042 + 102100;
        }
        if (params.gross_amount <= 1e6) {
          withholdingAmount = params.gross_amount * taxRate;
        }
        calculationMethod = "\u5831\u916C\u30FB\u6599\u91D1\u7B49\u306E\u6E90\u6CC9\u5FB4\u53CE";
        break;
      case "dividend":
        taxRate = params.employee_info?.is_resident ? 0.20315 : 0.20315;
        withholdingAmount = params.gross_amount * taxRate;
        calculationMethod = "\u914D\u5F53\u6240\u5F97\u306E\u6E90\u6CC9\u5FB4\u53CE";
        break;
      default:
        taxRate = 0.20315;
        withholdingAmount = params.gross_amount * taxRate;
        calculationMethod = "\u6A19\u6E96\u7A0E\u7387\u306B\u3088\u308B\u8A08\u7B97";
    }
    const calculation = {
      payment_type: params.payment_type,
      gross_amount: params.gross_amount,
      withholding_amount: Math.floor(withholdingAmount),
      net_amount: params.gross_amount - Math.floor(withholdingAmount),
      tax_rate: taxRate,
      calculation_method: calculationMethod,
      payment_date: params.payment_date || /* @__PURE__ */ new Date(),
      employee_info: params.employee_info,
      created_at: /* @__PURE__ */ new Date()
    };
    await collection.insertOne(calculation);
    return {
      success: true,
      withholding_tax: {
        gross_amount: params.gross_amount,
        withholding_amount: Math.floor(withholdingAmount),
        net_amount: params.gross_amount - Math.floor(withholdingAmount),
        effective_tax_rate: `${(taxRate * 100).toFixed(3)}%`,
        calculation_method: calculationMethod
      },
      payment_slip: {
        payment_date: params.payment_date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        payment_type: params.payment_type,
        deadline: "\u7FCC\u670810\u65E5\u307E\u3067\u306B\u7D0D\u4ED8"
      },
      notes: [
        "\u5FA9\u8208\u7279\u5225\u6240\u5F97\u7A0E\uFF082.1%\uFF09\u3092\u542B\u3080\u7A0E\u7387\u3067\u8A08\u7B97\u3057\u3066\u3044\u307E\u3059",
        "\u5B9F\u969B\u306E\u8A08\u7B97\u306F\u6700\u65B0\u306E\u6E90\u6CC9\u5FB4\u53CE\u7A0E\u984D\u8868\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044"
      ]
    };
  }
};
const optimizeTaxStrategyTool = {
  name: "optimize_tax_strategy",
  description: "\u7BC0\u7A0E\u6226\u7565\u3092\u63D0\u6848\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      company_profile: {
        type: "object",
        properties: {
          industry: { type: "string", description: "\u696D\u7A2E" },
          annual_revenue: { type: "number", description: "\u5E74\u9593\u58F2\u4E0A\u9AD8" },
          employee_count: { type: "number", description: "\u5F93\u696D\u54E1\u6570" },
          capital: { type: "number", description: "\u8CC7\u672C\u91D1" }
        }
      },
      target_areas: {
        type: "array",
        items: {
          type: "string",
          enum: ["depreciation", "tax_credits", "deductions", "timing", "structure"]
        },
        description: "\u6700\u9069\u5316\u5BFE\u8C61\u5206\u91CE"
      }
    },
    required: ["company_profile"]
  },
  handler: async (params) => {
    logger.info("Optimizing tax strategy:", params);
    const strategies = [];
    const isSmallCompany = params.company_profile.capital <= 1e8;
    if (isSmallCompany) {
      strategies.push({
        strategy: "\u4E2D\u5C0F\u4F01\u696D\u6295\u8CC7\u4FC3\u9032\u7A0E\u5236",
        description: "\u6A5F\u68B0\u88C5\u7F6E\u7B49\u306E\u53D6\u5F97\u306B\u5BFE\u3059\u308B\u7279\u5225\u511F\u5374\u307E\u305F\u306F\u7A0E\u984D\u63A7\u9664",
        potential_benefit: "\u53D6\u5F97\u4FA1\u984D\u306E30%\u7279\u5225\u511F\u5374\u307E\u305F\u306F7%\u7A0E\u984D\u63A7\u9664",
        requirements: ["\u8CC7\u672C\u91D11\u5104\u5186\u4EE5\u4E0B", "\u9752\u8272\u7533\u544A\u6CD5\u4EBA", "\u5BFE\u8C61\u8A2D\u5099\u306E\u65B0\u898F\u53D6\u5F97"],
        applicable: true
      });
      strategies.push({
        strategy: "\u4E2D\u5C0F\u4F01\u696D\u7D4C\u55B6\u5F37\u5316\u7A0E\u5236",
        description: "\u7D4C\u55B6\u529B\u5411\u4E0A\u8A08\u753B\u306B\u57FA\u3065\u304F\u8A2D\u5099\u6295\u8CC7\u306E\u5373\u6642\u511F\u5374",
        potential_benefit: "\u53D6\u5F97\u4FA1\u984D\u306E100%\u5373\u6642\u511F\u5374\u307E\u305F\u306F10%\u7A0E\u984D\u63A7\u9664",
        requirements: ["\u7D4C\u55B6\u529B\u5411\u4E0A\u8A08\u753B\u306E\u8A8D\u5B9A", "\u5BFE\u8C61\u8A2D\u5099\u306E\u53D6\u5F97"],
        applicable: true
      });
    }
    strategies.push({
      strategy: "\u5F79\u54E1\u5831\u916C\u306E\u6700\u9069\u5316",
      description: "\u5B9A\u671F\u540C\u984D\u7D66\u4E0E\u306B\u3088\u308B\u640D\u91D1\u7B97\u5165\u3068\u6240\u5F97\u5206\u6563",
      potential_benefit: "\u6CD5\u4EBA\u7A0E\u3068\u6240\u5F97\u7A0E\u306E\u7A0E\u7387\u5DEE\u3092\u6D3B\u7528\u3057\u305F\u7BC0\u7A0E",
      implementation: [
        "\u4E8B\u524D\u78BA\u5B9A\u5C4A\u51FA\u7D66\u4E0E\u306E\u6D3B\u7528",
        "\u9000\u8077\u91D1\u898F\u7A0B\u306E\u6574\u5099",
        "\u793E\u4F1A\u4FDD\u967A\u6599\u306E\u6700\u9069\u5316"
      ]
    });
    strategies.push({
      strategy: "\u6E1B\u4FA1\u511F\u5374\u306E\u6700\u9069\u5316",
      description: "\u5B9A\u7387\u6CD5\u63A1\u7528\u3084\u7279\u5225\u511F\u5374\u306E\u6D3B\u7528",
      potential_benefit: "\u521D\u5E74\u5EA6\u306E\u7D4C\u8CBB\u8A08\u4E0A\u984D\u5897\u52A0\u306B\u3088\u308B\u7BC0\u7A0E",
      implementation: [
        "\u5B9A\u7387\u6CD5\u3078\u306E\u5909\u66F4\u5C4A\u51FA",
        "\u5C11\u984D\u6E1B\u4FA1\u511F\u5374\u8CC7\u7523\u306E\u7279\u4F8B\u6D3B\u7528\uFF0830\u4E07\u5186\u672A\u6E80\uFF09",
        "\u4E00\u62EC\u511F\u5374\u8CC7\u7523\u306E\u6D3B\u7528\uFF0820\u4E07\u5186\u672A\u6E80\uFF09"
      ]
    });
    if (params.company_profile.industry === "IT" || params.company_profile.industry === "\u30BD\u30D5\u30C8\u30A6\u30A7\u30A2") {
      strategies.push({
        strategy: "\u7814\u7A76\u958B\u767A\u7A0E\u5236",
        description: "\u8A66\u9A13\u7814\u7A76\u8CBB\u306E\u7A0E\u984D\u63A7\u9664",
        potential_benefit: "\u8A66\u9A13\u7814\u7A76\u8CBB\u306E8-14%\u3092\u7A0E\u984D\u63A7\u9664",
        requirements: ["\u8A66\u9A13\u7814\u7A76\u8CBB\u306E\u9069\u6B63\u306A\u533A\u5206\u7D4C\u7406", "\u9752\u8272\u7533\u544A\u6CD5\u4EBA"]
      });
    }
    if (params.target_areas?.includes("timing")) {
      strategies.push({
        strategy: "\u6C7A\u7B97\u671F\u5909\u66F4",
        description: "\u5229\u76CA\u306E\u7E70\u308A\u5EF6\u3079\u306B\u3088\u308B\u7BC0\u7A0E",
        potential_benefit: "\u9AD8\u53CE\u76CA\u671F\u306E\u8AB2\u7A0E\u6240\u5F97\u3092\u5206\u6563",
        considerations: ["\u682A\u4E3B\u7DCF\u4F1A\u306E\u627F\u8A8D\u304C\u5FC5\u8981", "\u7A0E\u52D9\u7F72\u3078\u306E\u5C4A\u51FA"]
      });
    }
    const totalPotentialSaving = Math.floor(params.company_profile.annual_revenue * 0.02);
    return {
      success: true,
      company_profile: params.company_profile,
      tax_optimization_strategies: strategies,
      estimated_annual_tax_saving: totalPotentialSaving,
      implementation_priority: [
        "1. \u4E2D\u5C0F\u4F01\u696D\u7A0E\u5236\u306E\u6D3B\u7528\uFF08\u8A72\u5F53\u3059\u308B\u5834\u5408\uFF09",
        "2. \u5F79\u54E1\u5831\u916C\u306E\u898B\u76F4\u3057",
        "3. \u6E1B\u4FA1\u511F\u5374\u65B9\u6CD5\u306E\u6700\u9069\u5316",
        "4. \u5404\u7A2E\u7A0E\u984D\u63A7\u9664\u306E\u6D3B\u7528"
      ],
      next_steps: [
        "\u7A0E\u7406\u58EB\u3068\u306E\u8A73\u7D30\u306A\u76F8\u8AC7",
        "\u5404\u5236\u5EA6\u306E\u8981\u4EF6\u78BA\u8A8D",
        "\u5FC5\u8981\u66F8\u985E\u306E\u6E96\u5099",
        "\u5B9F\u65BD\u30B9\u30B1\u30B8\u30E5\u30FC\u30EB\u306E\u7B56\u5B9A"
      ],
      warnings: [
        "\u7A0E\u5236\u306F\u983B\u7E41\u306B\u6539\u6B63\u3055\u308C\u308B\u305F\u3081\u3001\u6700\u65B0\u60C5\u5831\u306E\u78BA\u8A8D\u304C\u5FC5\u8981\u3067\u3059",
        "\u904E\u5EA6\u306A\u7BC0\u7A0E\u306F\u7A0E\u52D9\u8ABF\u67FB\u306E\u30EA\u30B9\u30AF\u3092\u9AD8\u3081\u308B\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059",
        "\u5C02\u9580\u5BB6\u306E\u30A2\u30C9\u30D0\u30A4\u30B9\u3092\u53D7\u3051\u308B\u3053\u3068\u3092\u63A8\u5968\u3057\u307E\u3059"
      ]
    };
  }
};
function getBonusTaxRate(previousMonthSalary) {
  if (previousMonthSalary <= 68e3) return 0;
  if (previousMonthSalary <= 79e3) return 0.02042;
  if (previousMonthSalary <= 252e3) return 0.04084;
  if (previousMonthSalary <= 3e5) return 0.06126;
  if (previousMonthSalary <= 334e3) return 0.08168;
  if (previousMonthSalary <= 363e3) return 0.1021;
  if (previousMonthSalary <= 395e3) return 0.12252;
  if (previousMonthSalary <= 426e3) return 0.14294;
  if (previousMonthSalary <= 55e4) return 0.16336;
  return 0.18378;
}
const japanTaxTools = [
  calculateConsumptionTaxTool,
  calculateWithholdingTaxTool,
  optimizeTaxStrategyTool
];

export { calculateConsumptionTaxTool, calculateWithholdingTaxTool, japanTaxTools, optimizeTaxStrategyTool };
//# sourceMappingURL=20b3e85f-c7da-405c-89b1-71b0ecbad4da.mjs.map
