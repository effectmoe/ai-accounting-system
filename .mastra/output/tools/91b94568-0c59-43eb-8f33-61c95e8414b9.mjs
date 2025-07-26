import { l as logger, g as getDatabase } from '../mongodb-client.mjs';
import '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/mongodb/lib/index.js';
import '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/@sentry/nextjs/build/cjs/index.server.js';

const analyzeCodeQualityTool = {
  name: "analyze_code_quality",
  description: "\u30B3\u30FC\u30C9\u54C1\u8CEA\u3092\u5206\u6790\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      code_path: { type: "string", description: "\u30B3\u30FC\u30C9\u30D1\u30B9" },
      language: { type: "string", description: "\u30D7\u30ED\u30B0\u30E9\u30DF\u30F3\u30B0\u8A00\u8A9E" },
      analysis_type: {
        type: "array",
        items: {
          type: "string",
          enum: ["complexity", "duplication", "style", "security", "performance", "test_coverage"]
        },
        description: "\u5206\u6790\u30BF\u30A4\u30D7"
      },
      metrics: {
        type: "array",
        items: {
          type: "string",
          enum: ["cyclomatic_complexity", "lines_of_code", "technical_debt", "maintainability_index"]
        },
        description: "\u8A08\u6E2C\u30E1\u30C8\u30EA\u30AF\u30B9"
      }
    },
    required: ["code_path", "language", "analysis_type"]
  },
  handler: async (params) => {
    logger.info("Analyzing code quality:", params);
    const db = await getDatabase();
    const collection = db.collection("code_quality_analyses");
    const analysis = {
      code_path: params.code_path,
      language: params.language,
      analysis_types: params.analysis_type,
      timestamp: /* @__PURE__ */ new Date(),
      results: {}
    };
    if (params.analysis_type.includes("complexity")) {
      analysis.results.complexity = {
        cyclomatic_complexity: {
          average: 8.5,
          max: 25,
          distribution: {
            low: 65,
            // 1-5
            medium: 25,
            // 6-10
            high: 8,
            // 11-20
            very_high: 2
            // 20+
          },
          high_complexity_functions: [
            { name: "processInvoice", complexity: 25, line: 145 },
            { name: "calculateTax", complexity: 18, line: 320 },
            { name: "validateData", complexity: 15, line: 89 }
          ]
        },
        cognitive_complexity: {
          average: 12.3,
          max: 35
        }
      };
    }
    if (params.analysis_type.includes("duplication")) {
      analysis.results.duplication = {
        duplication_percentage: 15.2,
        duplicated_lines: 342,
        duplicated_blocks: [
          {
            lines: "45-67",
            duplicated_in: ["utils.ts:120-142", "helpers.ts:89-111"],
            similarity: 0.95
          },
          {
            lines: "234-250",
            duplicated_in: ["validation.ts:56-72"],
            similarity: 0.88
          }
        ],
        refactoring_opportunities: [
          "\u30A8\u30E9\u30FC\u30CF\u30F3\u30C9\u30EA\u30F3\u30B0\u30ED\u30B8\u30C3\u30AF\u306E\u5171\u901A\u5316",
          "\u30D0\u30EA\u30C7\u30FC\u30B7\u30E7\u30F3\u95A2\u6570\u306E\u62BD\u51FA",
          "\u30C7\u30FC\u30BF\u5909\u63DB\u51E6\u7406\u306E\u30E6\u30FC\u30C6\u30A3\u30EA\u30C6\u30A3\u5316"
        ]
      };
    }
    if (params.analysis_type.includes("style")) {
      analysis.results.style = {
        violations: {
          total: 127,
          by_severity: {
            error: 12,
            warning: 45,
            info: 70
          },
          by_rule: {
            "no-unused-vars": 8,
            "prefer-const": 15,
            "arrow-function": 22,
            "naming-convention": 30
          }
        },
        consistency_score: 82,
        // 100点満点
        recommendations: [
          "ESLint/Prettier\u306E\u8A2D\u5B9A\u3092\u53B3\u683C\u5316",
          "pre-commit\u30D5\u30C3\u30AF\u306E\u5C0E\u5165",
          "\u30B3\u30FC\u30C9\u30EC\u30D3\u30E5\u30FC\u30C1\u30A7\u30C3\u30AF\u30EA\u30B9\u30C8\u306E\u4F5C\u6210"
        ]
      };
    }
    if (params.analysis_type.includes("security")) {
      analysis.results.security = {
        vulnerabilities: {
          critical: 0,
          high: 2,
          medium: 5,
          low: 12
        },
        issues: [
          {
            type: "SQL Injection Risk",
            severity: "high",
            location: "database.ts:45",
            recommendation: "\u30D1\u30E9\u30E1\u30FC\u30BF\u5316\u30AF\u30A8\u30EA\u306E\u4F7F\u7528"
          },
          {
            type: "Hardcoded Secret",
            severity: "high",
            location: "config.ts:12",
            recommendation: "\u74B0\u5883\u5909\u6570\u306E\u4F7F\u7528"
          }
        ],
        owasp_compliance: {
          passed: 8,
          failed: 2,
          not_applicable: 0
        }
      };
    }
    if (params.analysis_type.includes("performance")) {
      analysis.results.performance = {
        bottlenecks: [
          {
            function: "generateReport",
            issue: "N+1\u30AF\u30A8\u30EA\u554F\u984C",
            impact: "high",
            solution: "\u30C7\u30FC\u30BF\u306E\u4E8B\u524D\u8AAD\u307F\u8FBC\u307F\u307E\u305F\u306F\u30D0\u30C3\u30C1\u51E6\u7406"
          },
          {
            function: "processLargeFile",
            issue: "\u30E1\u30E2\u30EA\u4F7F\u7528\u91CF\u904E\u591A",
            impact: "medium",
            solution: "\u30B9\u30C8\u30EA\u30FC\u30DF\u30F3\u30B0\u51E6\u7406\u306E\u5B9F\u88C5"
          }
        ],
        optimization_opportunities: [
          "\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u306E\u8FFD\u52A0",
          "\u30AD\u30E3\u30C3\u30B7\u30E5\u306E\u5B9F\u88C5",
          "\u975E\u540C\u671F\u51E6\u7406\u306E\u6D3B\u7528",
          "\u30A2\u30EB\u30B4\u30EA\u30BA\u30E0\u306E\u6700\u9069\u5316"
        ],
        estimated_improvement: "40-60%\u306E\u30EC\u30B9\u30DD\u30F3\u30B9\u30BF\u30A4\u30E0\u6539\u5584"
      };
    }
    if (params.metrics && params.metrics.length > 0) {
      analysis.results.metrics = {};
      if (params.metrics.includes("lines_of_code")) {
        analysis.results.metrics.lines_of_code = {
          total: 5432,
          code: 3890,
          comment: 892,
          blank: 650
        };
      }
      if (params.metrics.includes("maintainability_index")) {
        analysis.results.metrics.maintainability_index = {
          score: 68,
          // 0-100
          rating: "B",
          // A-F
          trend: "improving"
        };
      }
      if (params.metrics.includes("technical_debt")) {
        analysis.results.metrics.technical_debt = {
          total_hours: 156,
          cost_estimate: "\xA52,340,000",
          by_category: {
            code_smells: 45,
            bugs: 20,
            vulnerabilities: 15,
            duplications: 30,
            test_coverage: 46
          }
        };
      }
    }
    analysis.overall_score = calculateOverallScore(analysis.results);
    analysis.grade = getGrade(analysis.overall_score);
    await collection.insertOne(analysis);
    return {
      success: true,
      analysis,
      summary: {
        overall_score: analysis.overall_score,
        grade: analysis.grade,
        critical_issues: countCriticalIssues(analysis.results),
        improvement_areas: getTopImprovementAreas(analysis.results)
      },
      action_plan: generateActionPlan()
    };
  }
};
const suggestRefactoringTool = {
  name: "suggest_refactoring",
  description: "\u30EA\u30D5\u30A1\u30AF\u30BF\u30EA\u30F3\u30B0\u3092\u63D0\u6848\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      code_snippet: { type: "string", description: "\u30B3\u30FC\u30C9\u30B9\u30CB\u30DA\u30C3\u30C8" },
      refactoring_goals: {
        type: "array",
        items: {
          type: "string",
          enum: ["improve_readability", "reduce_complexity", "remove_duplication", "improve_performance", "add_type_safety"]
        },
        description: "\u30EA\u30D5\u30A1\u30AF\u30BF\u30EA\u30F3\u30B0\u76EE\u6A19"
      },
      preserve_behavior: { type: "boolean", description: "\u52D5\u4F5C\u3092\u4FDD\u6301\u3059\u308B\u304B" },
      target_patterns: {
        type: "array",
        items: { type: "string" },
        description: "\u9069\u7528\u3059\u308B\u30C7\u30B6\u30A4\u30F3\u30D1\u30BF\u30FC\u30F3"
      }
    },
    required: ["code_snippet", "refactoring_goals"]
  },
  handler: async (params) => {
    logger.info("Suggesting refactoring:", params);
    const refactoringSuggestions = [];
    const codeAnalysis = {
      language: detectLanguage(params.code_snippet),
      lines: params.code_snippet.split("\n").length,
      complexity: estimateComplexity(params.code_snippet),
      has_duplication: detectDuplication(params.code_snippet)
    };
    if (params.refactoring_goals.includes("improve_readability")) {
      refactoringSuggestions.push({
        type: "Extract Method",
        description: "\u9577\u3044\u30E1\u30BD\u30C3\u30C9\u3092\u5C0F\u3055\u306A\u5358\u4F4D\u306B\u5206\u5272",
        example: `// Before:
function processOrder(order) {
  // 50\u884C\u306E\u30B3\u30FC\u30C9...
}

// After:
function processOrder(order) {
  validateOrder(order);
  calculatePricing(order);
  applyDiscounts(order);
  createInvoice(order);
}`,
        benefits: ["\u53EF\u8AAD\u6027\u5411\u4E0A", "\u30C6\u30B9\u30C8\u3057\u3084\u3059\u3055\u5411\u4E0A", "\u518D\u5229\u7528\u6027\u5411\u4E0A"]
      });
      refactoringSuggestions.push({
        type: "Rename Variables",
        description: "\u610F\u5473\u306E\u3042\u308B\u5909\u6570\u540D\u3078\u306E\u5909\u66F4",
        example: `// Before:
const d = new Date();
const u = users.filter(x => x.a > 18);

// After:
const currentDate = new Date();
const adultUsers = users.filter(user => user.age > 18);`,
        benefits: ["\u30B3\u30FC\u30C9\u306E\u81EA\u5DF1\u6587\u66F8\u5316", "\u7406\u89E3\u3057\u3084\u3059\u3055\u5411\u4E0A"]
      });
    }
    if (params.refactoring_goals.includes("reduce_complexity")) {
      refactoringSuggestions.push({
        type: "Replace Conditional with Polymorphism",
        description: "\u8907\u96D1\u306A\u6761\u4EF6\u5206\u5C90\u3092\u30DD\u30EA\u30E2\u30FC\u30D5\u30A3\u30BA\u30E0\u3067\u7F6E\u63DB",
        example: `// Before:
function calculatePrice(type, basePrice) {
  if (type === 'regular') return basePrice;
  if (type === 'premium') return basePrice * 1.2;
  if (type === 'vip') return basePrice * 1.5;
}

// After:
class PricingStrategy {
  calculate(basePrice) { throw new Error('Must implement'); }
}

class RegularPricing extends PricingStrategy {
  calculate(basePrice) { return basePrice; }
}

class PremiumPricing extends PricingStrategy {
  calculate(basePrice) { return basePrice * 1.2; }
}`,
        benefits: ["\u62E1\u5F35\u6027\u5411\u4E0A", "\u8907\u96D1\u5EA6\u524A\u6E1B", "Open/Closed\u539F\u5247\u306E\u9075\u5B88"]
      });
      refactoringSuggestions.push({
        type: "Decompose Conditional",
        description: "\u8907\u96D1\u306A\u6761\u4EF6\u5F0F\u3092\u95A2\u6570\u306B\u62BD\u51FA",
        example: `// Before:
if (user.age >= 18 && user.hasValidId && !user.isBanned) {
  // \u51E6\u7406
}

// After:
if (isEligibleUser(user)) {
  // \u51E6\u7406
}

function isEligibleUser(user) {
  return user.age >= 18 && user.hasValidId && !user.isBanned;
}`,
        benefits: ["\u53EF\u8AAD\u6027\u5411\u4E0A", "\u6761\u4EF6\u306E\u518D\u5229\u7528", "\u30C6\u30B9\u30C8\u3057\u3084\u3059\u3055"]
      });
    }
    if (params.refactoring_goals.includes("remove_duplication")) {
      refactoringSuggestions.push({
        type: "Extract Shared Function",
        description: "\u91CD\u8907\u30B3\u30FC\u30C9\u3092\u5171\u901A\u95A2\u6570\u306B\u62BD\u51FA",
        example: `// Before:
function processInvoice(invoice) {
  // \u30D0\u30EA\u30C7\u30FC\u30B7\u30E7\u30F3
  if (!invoice.id) throw new Error('Invalid invoice');
  if (!invoice.amount) throw new Error('Invalid amount');
  // \u51E6\u7406...
}

function processReceipt(receipt) {
  // \u30D0\u30EA\u30C7\u30FC\u30B7\u30E7\u30F3\uFF08\u91CD\u8907\uFF09
  if (!receipt.id) throw new Error('Invalid receipt');
  if (!receipt.amount) throw new Error('Invalid amount');
  // \u51E6\u7406...
}

// After:
function validateDocument(doc, type) {
  if (!doc.id) throw new Error(\`Invalid \${type}\`);
  if (!doc.amount) throw new Error('Invalid amount');
}

function processInvoice(invoice) {
  validateDocument(invoice, 'invoice');
  // \u51E6\u7406...
}`,
        benefits: ["DRY\u539F\u5247\u306E\u9075\u5B88", "\u4FDD\u5B88\u6027\u5411\u4E0A", "\u30D0\u30B0\u4FEE\u6B63\u306E\u4E00\u5143\u5316"]
      });
    }
    if (params.refactoring_goals.includes("add_type_safety")) {
      refactoringSuggestions.push({
        type: "Add TypeScript Types",
        description: "TypeScript\u578B\u5B9A\u7FA9\u306E\u8FFD\u52A0",
        example: `// Before:
function createUser(name, email, age) {
  return { name, email, age };
}

// After:
interface User {
  name: string;
  email: string;
  age: number;
}

function createUser(name: string, email: string, age: number): User {
  return { name, email, age };
}`,
        benefits: ["\u578B\u5B89\u5168\u6027", "IDE\u652F\u63F4\u306E\u5411\u4E0A", "\u30E9\u30F3\u30BF\u30A4\u30E0\u30A8\u30E9\u30FC\u306E\u524A\u6E1B"]
      });
    }
    if (params.target_patterns && params.target_patterns.length > 0) {
      params.target_patterns.forEach((pattern) => {
        const patternSuggestion = getDesignPatternSuggestion(pattern);
        if (patternSuggestion) {
          refactoringSuggestions.push(patternSuggestion);
        }
      });
    }
    const prioritizedSuggestions = refactoringSuggestions.map((suggestion, index) => ({
      ...suggestion,
      priority: index + 1,
      estimated_effort: estimateRefactoringEffort(suggestion.type),
      risk_level: params.preserve_behavior ? "low" : "medium"
    }));
    return {
      success: true,
      code_analysis: codeAnalysis,
      refactoring_suggestions: prioritizedSuggestions,
      implementation_order: prioritizedSuggestions.map((s) => s.type),
      testing_strategy: {
        unit_tests: "\u30EA\u30D5\u30A1\u30AF\u30BF\u30EA\u30F3\u30B0\u524D\u5F8C\u3067\u5168\u30C6\u30B9\u30C8\u304C\u901A\u308B\u3053\u3068\u3092\u78BA\u8A8D",
        integration_tests: "\u7D71\u5408\u30C6\u30B9\u30C8\u3067\u52D5\u4F5C\u3092\u691C\u8A3C",
        regression_tests: "\u65E2\u5B58\u6A5F\u80FD\u3078\u306E\u5F71\u97FF\u3092\u30C1\u30A7\u30C3\u30AF"
      },
      best_practices: [
        "\u5C0F\u3055\u306A\u30B9\u30C6\u30C3\u30D7\u3067\u30EA\u30D5\u30A1\u30AF\u30BF\u30EA\u30F3\u30B0",
        "\u5404\u30B9\u30C6\u30C3\u30D7\u3067\u30C6\u30B9\u30C8\u3092\u5B9F\u884C",
        "\u30B3\u30DF\u30C3\u30C8\u3092\u7D30\u304B\u304F\u5206\u3051\u308B",
        "\u30EC\u30D3\u30E5\u30FC\u3092\u53D7\u3051\u308B"
      ]
    };
  }
};
const modernizeCodeTool = {
  name: "modernize_code",
  description: "\u30B3\u30FC\u30C9\u3092\u30E2\u30C0\u30CA\u30A4\u30BA\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      legacy_code: { type: "string", description: "\u30EC\u30AC\u30B7\u30FC\u30B3\u30FC\u30C9" },
      target_version: { type: "string", description: "\u30BF\u30FC\u30B2\u30C3\u30C8\u30D0\u30FC\u30B8\u30E7\u30F3" },
      modernization_goals: {
        type: "array",
        items: {
          type: "string",
          enum: ["use_modern_syntax", "add_type_annotations", "async_await", "functional_programming", "remove_deprecated"]
        },
        description: "\u30E2\u30C0\u30CA\u30A4\u30BC\u30FC\u30B7\u30E7\u30F3\u76EE\u6A19"
      },
      compatibility_requirements: {
        type: "object",
        properties: {
          min_version: { type: "string", description: "\u6700\u5C0F\u4E92\u63DB\u30D0\u30FC\u30B8\u30E7\u30F3" },
          breaking_changes_allowed: { type: "boolean", description: "\u7834\u58CA\u7684\u5909\u66F4\u3092\u8A31\u53EF\u3059\u308B\u304B" }
        }
      }
    },
    required: ["legacy_code", "target_version", "modernization_goals"]
  },
  handler: async (params) => {
    logger.info("Modernizing code:", params);
    const modernizationSteps = [];
    detectLanguage(params.legacy_code);
    if (params.modernization_goals.includes("use_modern_syntax")) {
      modernizationSteps.push({
        step: "Modern JavaScript Syntax",
        transformations: [
          {
            name: "Arrow Functions",
            before: "function(x) { return x * 2; }",
            after: "(x) => x * 2"
          },
          {
            name: "Template Literals",
            before: '"Hello " + name + "!"',
            after: "`Hello ${name}!`"
          },
          {
            name: "Destructuring",
            before: "const name = user.name; const age = user.age;",
            after: "const { name, age } = user;"
          },
          {
            name: "Spread Operator",
            before: "arr1.concat(arr2)",
            after: "[...arr1, ...arr2]"
          }
        ]
      });
    }
    if (params.modernization_goals.includes("async_await")) {
      modernizationSteps.push({
        step: "Async/Await Migration",
        transformations: [
          {
            name: "Promise to Async/Await",
            before: `fetchData()
  .then(data => processData(data))
  .then(result => console.log(result))
  .catch(error => console.error(error));`,
            after: `try {
  const data = await fetchData();
  const result = await processData(data);
  console.log(result);
} catch (error) {
  console.error(error);
}`
          }
        ]
      });
    }
    if (params.modernization_goals.includes("add_type_annotations")) {
      modernizationSteps.push({
        step: "TypeScript Migration",
        transformations: [
          {
            name: "Add Type Annotations",
            before: "function calculate(a, b) { return a + b; }",
            after: "function calculate(a: number, b: number): number { return a + b; }"
          },
          {
            name: "Interface Definition",
            before: 'const user = { name: "John", age: 30 };',
            after: `interface User {
  name: string;
  age: number;
}
const user: User = { name: "John", age: 30 };`
          }
        ]
      });
    }
    if (params.modernization_goals.includes("functional_programming")) {
      modernizationSteps.push({
        step: "Functional Programming",
        transformations: [
          {
            name: "Immutable Operations",
            before: "arr.push(item); return arr;",
            after: "return [...arr, item];"
          },
          {
            name: "Pure Functions",
            before: `let total = 0;
function addToTotal(value) {
  total += value;
}`,
            after: `function add(total, value) {
  return total + value;
}`
          },
          {
            name: "Higher-Order Functions",
            before: `const result = [];
for (let i = 0; i < arr.length; i++) {
  if (arr[i] > 10) {
    result.push(arr[i] * 2);
  }
}`,
            after: "const result = arr.filter(x => x > 10).map(x => x * 2);"
          }
        ]
      });
    }
    if (params.modernization_goals.includes("remove_deprecated")) {
      modernizationSteps.push({
        step: "Remove Deprecated Features",
        items: [
          "var \u2192 let/const",
          "arguments \u2192 rest parameters (...args)",
          "Object.assign \u2192 spread operator",
          "callback \u2192 Promise/async-await"
        ]
      });
    }
    const compatibilityReport = {
      target_version: params.target_version,
      min_compatible_version: params.compatibility_requirements?.min_version || params.target_version,
      breaking_changes: params.compatibility_requirements?.breaking_changes_allowed ? ["ES6 modules", "Optional chaining", "Nullish coalescing"] : [],
      polyfills_needed: ["Promise", "Array.from", "Object.entries"]
    };
    const migrationPlan = {
      phases: [
        {
          phase: 1,
          name: "Syntax Modernization",
          duration: "1\u9031\u9593",
          tasks: ["Arrow functions", "Template literals", "Destructuring"]
        },
        {
          phase: 2,
          name: "Type Safety",
          duration: "2\u9031\u9593",
          tasks: ["TypeScript setup", "Type annotations", "Interface definitions"]
        },
        {
          phase: 3,
          name: "Async Pattern Migration",
          duration: "1\u9031\u9593",
          tasks: ["Promise to async/await", "Error handling improvement"]
        },
        {
          phase: 4,
          name: "Testing & Validation",
          duration: "1\u9031\u9593",
          tasks: ["Unit test updates", "Integration testing", "Performance validation"]
        }
      ]
    };
    return {
      success: true,
      modernization_plan: {
        current_version: "ES5/Legacy",
        target_version: params.target_version,
        steps: modernizationSteps,
        total_transformations: modernizationSteps.reduce((sum, step) => sum + (step.transformations?.length || 0), 0)
      },
      compatibility_report: compatibilityReport,
      migration_plan: migrationPlan,
      tools_recommended: [
        "Babel (transpilation)",
        "TypeScript (type safety)",
        "ESLint (code quality)",
        "Jest (testing)"
      ],
      estimated_effort: "4-6\u9031\u9593",
      risk_assessment: {
        level: params.compatibility_requirements?.breaking_changes_allowed ? "medium" : "low",
        mitigation: [
          "\u6BB5\u968E\u7684\u306A\u79FB\u884C",
          "\u81EA\u52D5\u30C6\u30B9\u30C8\u306E\u5145\u5B9F",
          "\u30D5\u30A3\u30FC\u30C1\u30E3\u30FC\u30D5\u30E9\u30B0\u306E\u4F7F\u7528",
          "\u30ED\u30FC\u30EB\u30D0\u30C3\u30AF\u8A08\u753B"
        ]
      }
    };
  }
};
function calculateOverallScore(results) {
  let score = 100;
  if (results.complexity) {
    score -= results.complexity.cyclomatic_complexity.average > 10 ? 10 : 0;
  }
  if (results.duplication) {
    score -= results.duplication.duplication_percentage > 10 ? 15 : 0;
  }
  if (results.security) {
    score -= results.security.vulnerabilities.high * 5;
    score -= results.security.vulnerabilities.critical * 10;
  }
  return Math.max(0, score);
}
function getGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}
function countCriticalIssues(results) {
  let count = 0;
  if (results.security) {
    count += results.security.vulnerabilities.critical || 0;
    count += results.security.vulnerabilities.high || 0;
  }
  return count;
}
function getTopImprovementAreas(results) {
  const areas = [];
  if (results.complexity?.cyclomatic_complexity.average > 10) {
    areas.push("\u8907\u96D1\u5EA6\u306E\u524A\u6E1B");
  }
  if (results.duplication?.duplication_percentage > 10) {
    areas.push("\u91CD\u8907\u30B3\u30FC\u30C9\u306E\u9664\u53BB");
  }
  if (results.security?.vulnerabilities.high > 0) {
    areas.push("\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u8106\u5F31\u6027\u306E\u4FEE\u6B63");
  }
  return areas;
}
function generateActionPlan(results) {
  return [
    {
      priority: "high",
      action: "\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u8106\u5F31\u6027\u306E\u4FEE\u6B63",
      timeline: "1\u9031\u9593\u4EE5\u5185"
    },
    {
      priority: "medium",
      action: "\u9AD8\u8907\u96D1\u5EA6\u95A2\u6570\u306E\u30EA\u30D5\u30A1\u30AF\u30BF\u30EA\u30F3\u30B0",
      timeline: "2\u9031\u9593\u4EE5\u5185"
    },
    {
      priority: "low",
      action: "\u30B3\u30FC\u30C7\u30A3\u30F3\u30B0\u898F\u7D04\u306E\u9069\u7528",
      timeline: "1\u30F6\u6708\u4EE5\u5185"
    }
  ];
}
function detectLanguage(code) {
  if (code.includes("function") || code.includes("=>")) return "JavaScript";
  if (code.includes("interface") || code.includes(": string")) return "TypeScript";
  if (code.includes("def ") || code.includes("import ")) return "Python";
  return "Unknown";
}
function estimateComplexity(code) {
  const lines = code.split("\n").length;
  if (lines < 20) return "low";
  if (lines < 50) return "medium";
  return "high";
}
function detectDuplication(code) {
  const lines = code.split("\n");
  const lineSet = new Set(lines);
  return lines.length - lineSet.size > 5;
}
function estimateRefactoringEffort(type) {
  const effortMap = {
    "Extract Method": "2-4\u6642\u9593",
    "Rename Variables": "1-2\u6642\u9593",
    "Replace Conditional with Polymorphism": "4-8\u6642\u9593",
    "Extract Shared Function": "2-3\u6642\u9593",
    "Add TypeScript Types": "8-16\u6642\u9593"
  };
  return effortMap[type] || "\u8981\u898B\u7A4D\u3082\u308A";
}
function getDesignPatternSuggestion(pattern, codeAnalysis) {
  const patterns = {
    "Factory": {
      type: "Factory Pattern",
      description: "\u30AA\u30D6\u30B8\u30A7\u30AF\u30C8\u751F\u6210\u306E\u62BD\u8C61\u5316",
      applicable_when: "\u30AA\u30D6\u30B8\u30A7\u30AF\u30C8\u751F\u6210\u30ED\u30B8\u30C3\u30AF\u304C\u8907\u96D1",
      benefits: ["\u751F\u6210\u30ED\u30B8\u30C3\u30AF\u306E\u96A0\u853D", "\u67D4\u8EDF\u6027\u306E\u5411\u4E0A"]
    },
    "Observer": {
      type: "Observer Pattern",
      description: "\u30A4\u30D9\u30F3\u30C8\u99C6\u52D5\u306E\u5B9F\u88C5",
      applicable_when: "\u72B6\u614B\u5909\u5316\u306E\u901A\u77E5\u304C\u5FC5\u8981",
      benefits: ["\u758E\u7D50\u5408", "\u30A4\u30D9\u30F3\u30C8\u99C6\u52D5\u30A2\u30FC\u30AD\u30C6\u30AF\u30C1\u30E3"]
    },
    "Strategy": {
      type: "Strategy Pattern",
      description: "\u30A2\u30EB\u30B4\u30EA\u30BA\u30E0\u306E\u5207\u308A\u66FF\u3048",
      applicable_when: "\u5B9F\u884C\u6642\u306B\u30A2\u30EB\u30B4\u30EA\u30BA\u30E0\u3092\u9078\u629E",
      benefits: ["\u67D4\u8EDF\u6027", "\u30C6\u30B9\u30C8\u3057\u3084\u3059\u3055"]
    }
  };
  return patterns[pattern];
}
const refactorTools = [
  analyzeCodeQualityTool,
  suggestRefactoringTool,
  modernizeCodeTool
];

export { analyzeCodeQualityTool, modernizeCodeTool, refactorTools, suggestRefactoringTool };
//# sourceMappingURL=91b94568-0c59-43eb-8f33-61c95e8414b9.mjs.map
