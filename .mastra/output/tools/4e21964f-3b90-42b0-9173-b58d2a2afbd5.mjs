import { l as logger, g as getDatabase } from '../mongodb-client.mjs';
import '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/mongodb/lib/index.js';
import '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/@sentry/nextjs/build/cjs/index.server.js';

const diagnoseErrorTool = {
  name: "diagnose_error",
  description: "\u30A8\u30E9\u30FC\u3092\u8A3A\u65AD\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      error_message: { type: "string", description: "\u30A8\u30E9\u30FC\u30E1\u30C3\u30BB\u30FC\u30B8" },
      stack_trace: { type: "string", description: "\u30B9\u30BF\u30C3\u30AF\u30C8\u30EC\u30FC\u30B9" },
      context: {
        type: "object",
        properties: {
          environment: { type: "string", description: "\u5B9F\u884C\u74B0\u5883" },
          recent_changes: { type: "array", items: { type: "string" }, description: "\u6700\u8FD1\u306E\u5909\u66F4" },
          system_info: { type: "object", description: "\u30B7\u30B9\u30C6\u30E0\u60C5\u5831" }
        }
      },
      severity: {
        type: "string",
        enum: ["critical", "high", "medium", "low"],
        description: "\u6DF1\u523B\u5EA6"
      }
    },
    required: ["error_message"]
  },
  handler: async (params) => {
    logger.info("Diagnosing error:", params);
    const db = await getDatabase();
    const collection = db.collection("error_diagnostics");
    const errorPatterns = [
      {
        pattern: /TypeError.*undefined/i,
        category: "Type Error",
        common_causes: ["Null/undefined\u53C2\u7167", "\u30AA\u30D6\u30B8\u30A7\u30AF\u30C8\u30D7\u30ED\u30D1\u30C6\u30A3\u306E\u8AA4\u308A", "\u975E\u540C\u671F\u51E6\u7406\u306E\u4E0D\u5099"],
        solutions: ["Null \u30C1\u30A7\u30C3\u30AF\u306E\u8FFD\u52A0", "Optional chaining \u306E\u4F7F\u7528", "\u30C7\u30D5\u30A9\u30EB\u30C8\u5024\u306E\u8A2D\u5B9A"]
      },
      {
        pattern: /Cannot connect to database/i,
        category: "Database Connection",
        common_causes: ["\u63A5\u7D9A\u6587\u5B57\u5217\u306E\u8AA4\u308A", "\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u554F\u984C", "\u8A8D\u8A3C\u30A8\u30E9\u30FC", "\u30B5\u30FC\u30D3\u30B9\u505C\u6B62"],
        solutions: ["\u63A5\u7D9A\u6587\u5B57\u5217\u306E\u78BA\u8A8D", "\u30D5\u30A1\u30A4\u30A2\u30A6\u30A9\u30FC\u30EB\u8A2D\u5B9A\u306E\u78BA\u8A8D", "\u8A8D\u8A3C\u60C5\u5831\u306E\u66F4\u65B0"]
      },
      {
        pattern: /Memory limit exceeded/i,
        category: "Memory Issue",
        common_causes: ["\u30E1\u30E2\u30EA\u30EA\u30FC\u30AF", "\u5927\u91CF\u30C7\u30FC\u30BF\u51E6\u7406", "\u7121\u9650\u30EB\u30FC\u30D7"],
        solutions: ["\u30DA\u30FC\u30B8\u30CD\u30FC\u30B7\u30E7\u30F3\u306E\u5B9F\u88C5", "\u30B9\u30C8\u30EA\u30FC\u30DF\u30F3\u30B0\u51E6\u7406", "\u30E1\u30E2\u30EA\u30D7\u30ED\u30D5\u30A1\u30A4\u30EA\u30F3\u30B0"]
      },
      {
        pattern: /Permission denied/i,
        category: "Permission Error",
        common_causes: ["\u30D5\u30A1\u30A4\u30EB\u30A2\u30AF\u30BB\u30B9\u6A29\u9650", "API\u6A29\u9650\u4E0D\u8DB3", "\u30E6\u30FC\u30B6\u30FC\u6A29\u9650"],
        solutions: ["\u9069\u5207\u306A\u6A29\u9650\u306E\u4ED8\u4E0E", "sudo/\u7BA1\u7406\u8005\u6A29\u9650\u3067\u306E\u5B9F\u884C", "\u30A2\u30AF\u30BB\u30B9\u5236\u5FA1\u306E\u898B\u76F4\u3057"]
      }
    ];
    let diagnosis = {
      error_message: params.error_message,
      severity: params.severity || "medium",
      timestamp: /* @__PURE__ */ new Date(),
      diagnosed_issues: [],
      recommended_actions: []
    };
    for (const pattern of errorPatterns) {
      if (pattern.pattern.test(params.error_message)) {
        diagnosis.error_category = pattern.category;
        diagnosis.common_causes = pattern.common_causes;
        diagnosis.solutions = pattern.solutions;
        break;
      }
    }
    if (params.stack_trace) {
      const stackLines = params.stack_trace.split("\n");
      const relevantLines = stackLines.slice(0, 5);
      diagnosis.stack_analysis = {
        error_location: relevantLines[0],
        call_chain: relevantLines.slice(1, 4),
        framework_detected: detectFramework(params.stack_trace)
      };
    }
    if (params.context?.environment) {
      switch (params.context.environment) {
        case "production":
          diagnosis.recommended_actions.push(
            "\u30A8\u30E9\u30FC\u30E2\u30CB\u30BF\u30EA\u30F3\u30B0\u30C4\u30FC\u30EB\u306E\u78BA\u8A8D",
            "\u30ED\u30FC\u30EB\u30D0\u30C3\u30AF\u8A08\u753B\u306E\u6E96\u5099",
            "\u30E6\u30FC\u30B6\u30FC\u5F71\u97FF\u306E\u8A55\u4FA1"
          );
          break;
        case "development":
          diagnosis.recommended_actions.push(
            "\u30C7\u30D0\u30C3\u30AC\u30FC\u306E\u4F7F\u7528",
            "\u30E6\u30CB\u30C3\u30C8\u30C6\u30B9\u30C8\u306E\u8FFD\u52A0",
            "\u30B3\u30FC\u30C9\u30EC\u30D3\u30E5\u30FC\u306E\u5B9F\u65BD"
          );
          break;
      }
    }
    await collection.insertOne(diagnosis);
    const similarErrors = await collection.find({
      error_category: diagnosis.error_category,
      _id: { $ne: diagnosis._id }
    }).limit(3).toArray();
    if (similarErrors.length > 0) {
      diagnosis.similar_cases = similarErrors.map((err) => ({
        error_message: err.error_message,
        resolved: err.resolved || false,
        resolution: err.resolution
      }));
    }
    return {
      success: true,
      diagnosis,
      immediate_actions: diagnosis.solutions || ["\u30A8\u30E9\u30FC\u30ED\u30B0\u306E\u8A73\u7D30\u78BA\u8A8D", "\u30B7\u30B9\u30C6\u30E0\u72B6\u614B\u306E\u78BA\u8A8D"],
      monitoring: {
        should_alert_team: params.severity === "critical" || params.severity === "high",
        should_create_incident: params.severity === "critical",
        recommended_sla: params.severity === "critical" ? "1\u6642\u9593\u4EE5\u5185" : "24\u6642\u9593\u4EE5\u5185"
      }
    };
  }
};
const performRootCauseAnalysisTool = {
  name: "perform_root_cause_analysis",
  description: "\u6839\u672C\u539F\u56E0\u5206\u6790\u3092\u5B9F\u884C\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      incident_description: { type: "string", description: "\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8\u306E\u8AAC\u660E" },
      symptoms: {
        type: "array",
        items: { type: "string" },
        description: "\u75C7\u72B6\u30EA\u30B9\u30C8"
      },
      timeline: {
        type: "array",
        items: {
          type: "object",
          properties: {
            time: { type: "string", description: "\u6642\u523B" },
            event: { type: "string", description: "\u30A4\u30D9\u30F3\u30C8" }
          }
        },
        description: "\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3"
      },
      affected_systems: { type: "array", items: { type: "string" }, description: "\u5F71\u97FF\u3092\u53D7\u3051\u305F\u30B7\u30B9\u30C6\u30E0" }
    },
    required: ["incident_description", "symptoms"]
  },
  handler: async (params) => {
    logger.info("Performing root cause analysis:", params);
    const db = await getDatabase();
    const collection = db.collection("root_cause_analyses");
    const fiveWhysAnalysis = performFiveWhys(params.incident_description, params.symptoms);
    const fishboneAnalysis = {
      main_problem: params.incident_description,
      categories: {
        people: ["\u30B9\u30AD\u30EB\u4E0D\u8DB3", "\u30B3\u30DF\u30E5\u30CB\u30B1\u30FC\u30B7\u30E7\u30F3\u4E0D\u8DB3", "\u30C8\u30EC\u30FC\u30CB\u30F3\u30B0\u4E0D\u8DB3"],
        process: ["\u624B\u9806\u306E\u4E0D\u5099", "\u30EC\u30D3\u30E5\u30FC\u4E0D\u8DB3", "\u30C6\u30B9\u30C8\u4E0D\u8DB3"],
        technology: ["\u30B7\u30B9\u30C6\u30E0\u8A2D\u8A08\u306E\u554F\u984C", "\u30C4\u30FC\u30EB\u306E\u4E0D\u5099", "\u6280\u8853\u7684\u8CA0\u50B5"],
        environment: ["\u30A4\u30F3\u30D5\u30E9\u306E\u554F\u984C", "\u5916\u90E8\u4F9D\u5B58", "\u30EA\u30BD\u30FC\u30B9\u4E0D\u8DB3"]
      }
    };
    let criticalEvents = [];
    if (params.timeline && params.timeline.length > 0) {
      criticalEvents = params.timeline.filter(
        (event) => event.event.toLowerCase().includes("error") || event.event.toLowerCase().includes("failure") || event.event.toLowerCase().includes("down")
      );
    }
    const impactAnalysis = {
      affected_systems: params.affected_systems || [],
      estimated_impact: calculateImpact(params.affected_systems),
      blast_radius: params.affected_systems?.length || 0
    };
    const rootCauses = [
      {
        cause: "\u30B3\u30FC\u30C9\u5909\u66F4\u306B\u3088\u308B\u56DE\u5E30",
        probability: 0.7,
        evidence: ["\u6700\u8FD1\u306E\u30C7\u30D7\u30ED\u30A4\u30E1\u30F3\u30C8", "\u30C6\u30B9\u30C8\u30AB\u30D0\u30EC\u30C3\u30B8\u4E0D\u8DB3"],
        prevention: ["\u56DE\u5E30\u30C6\u30B9\u30C8\u306E\u5F37\u5316", "\u30C7\u30D7\u30ED\u30A4\u30E1\u30F3\u30C8\u524D\u306E\u691C\u8A3C\u5F37\u5316"]
      },
      {
        cause: "\u30A4\u30F3\u30D5\u30E9\u30B9\u30C8\u30E9\u30AF\u30C1\u30E3\u306E\u554F\u984C",
        probability: 0.5,
        evidence: ["\u8907\u6570\u30B7\u30B9\u30C6\u30E0\u3078\u306E\u5F71\u97FF", "\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u95A2\u9023\u306E\u30A8\u30E9\u30FC"],
        prevention: ["\u5197\u9577\u6027\u306E\u78BA\u4FDD", "\u30E2\u30CB\u30BF\u30EA\u30F3\u30B0\u306E\u5F37\u5316"]
      },
      {
        cause: "\u5916\u90E8\u30B5\u30FC\u30D3\u30B9\u306E\u969C\u5BB3",
        probability: 0.3,
        evidence: ["API\u547C\u3073\u51FA\u3057\u30A8\u30E9\u30FC", "\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8"],
        prevention: ["\u30B5\u30FC\u30AD\u30C3\u30C8\u30D6\u30EC\u30FC\u30AB\u30FC\u306E\u5B9F\u88C5", "\u30D5\u30A9\u30FC\u30EB\u30D0\u30C3\u30AF\u6226\u7565"]
      }
    ];
    const analysis = {
      incident_description: params.incident_description,
      symptoms: params.symptoms,
      timeline: params.timeline,
      five_whys: fiveWhysAnalysis,
      fishbone: fishboneAnalysis,
      critical_events: criticalEvents,
      impact_analysis: impactAnalysis,
      root_causes: rootCauses.sort((a, b) => b.probability - a.probability),
      created_at: /* @__PURE__ */ new Date()
    };
    await collection.insertOne(analysis);
    return {
      success: true,
      root_cause_analysis: {
        most_likely_cause: rootCauses[0],
        all_potential_causes: rootCauses,
        five_whys_result: fiveWhysAnalysis,
        critical_timeline_events: criticalEvents
      },
      recommendations: {
        immediate: [
          "\u6700\u3082\u53EF\u80FD\u6027\u306E\u9AD8\u3044\u539F\u56E0\u304B\u3089\u5BFE\u51E6\u3092\u958B\u59CB",
          "\u5F71\u97FF\u3092\u53D7\u3051\u305F\u30B7\u30B9\u30C6\u30E0\u306E\u5065\u5168\u6027\u78BA\u8A8D",
          "\u30B9\u30C6\u30FC\u30AF\u30DB\u30EB\u30C0\u30FC\u3078\u306E\u72B6\u6CC1\u5831\u544A"
        ],
        short_term: [
          "\u66AB\u5B9A\u5BFE\u7B56\u306E\u5B9F\u65BD",
          "\u30E2\u30CB\u30BF\u30EA\u30F3\u30B0\u306E\u5F37\u5316",
          "\u95A2\u9023\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u306E\u66F4\u65B0"
        ],
        long_term: rootCauses[0].prevention
      },
      action_items: generateActionItems(rootCauses[0])
    };
  }
};
const suggestPreventiveMeasuresTool = {
  name: "suggest_preventive_measures",
  description: "\u4E88\u9632\u63AA\u7F6E\u3092\u63D0\u6848\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      problem_type: {
        type: "string",
        enum: ["performance", "security", "reliability", "scalability", "maintenance"],
        description: "\u554F\u984C\u30BF\u30A4\u30D7"
      },
      current_state: { type: "object", description: "\u73FE\u5728\u306E\u72B6\u614B" },
      risk_assessment: {
        type: "object",
        properties: {
          likelihood: { type: "string", enum: ["low", "medium", "high"], description: "\u767A\u751F\u53EF\u80FD\u6027" },
          impact: { type: "string", enum: ["low", "medium", "high"], description: "\u5F71\u97FF\u5EA6" }
        }
      }
    },
    required: ["problem_type", "current_state"]
  },
  handler: async (params) => {
    logger.info("Suggesting preventive measures:", params);
    const measures = {
      problem_type: params.problem_type,
      risk_level: calculateRiskLevel(params.risk_assessment),
      preventive_measures: [],
      implementation_plan: [],
      estimated_effort: ""
    };
    switch (params.problem_type) {
      case "performance":
        measures.preventive_measures = [
          {
            measure: "\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9\u30C6\u30B9\u30C8\u306E\u5B9A\u671F\u5B9F\u884C",
            description: "\u8CA0\u8377\u30C6\u30B9\u30C8\u3068\u30D9\u30F3\u30C1\u30DE\u30FC\u30AF\u306E\u81EA\u52D5\u5316",
            priority: "high",
            tools: ["JMeter", "Gatling", "K6"]
          },
          {
            measure: "APM\u30C4\u30FC\u30EB\u306E\u5C0E\u5165",
            description: "\u30A2\u30D7\u30EA\u30B1\u30FC\u30B7\u30E7\u30F3\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9\u306E\u7D99\u7D9A\u7684\u76E3\u8996",
            priority: "high",
            tools: ["New Relic", "Datadog", "AppDynamics"]
          },
          {
            measure: "\u30B3\u30FC\u30C9\u30D7\u30ED\u30D5\u30A1\u30A4\u30EA\u30F3\u30B0",
            description: "\u30DC\u30C8\u30EB\u30CD\u30C3\u30AF\u306E\u7279\u5B9A\u3068\u6700\u9069\u5316",
            priority: "medium",
            tools: ["Chrome DevTools", "Visual Studio Profiler"]
          }
        ];
        measures.estimated_effort = "2-4\u9031\u9593";
        break;
      case "security":
        measures.preventive_measures = [
          {
            measure: "\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u76E3\u67FB\u306E\u5B9F\u65BD",
            description: "\u5B9A\u671F\u7684\u306A\u8106\u5F31\u6027\u30B9\u30AD\u30E3\u30F3\u3068\u30DA\u30CD\u30C8\u30EC\u30FC\u30B7\u30E7\u30F3\u30C6\u30B9\u30C8",
            priority: "critical",
            frequency: "\u56DB\u534A\u671F\u3054\u3068"
          },
          {
            measure: "SAST/DAST\u30C4\u30FC\u30EB\u306E\u5C0E\u5165",
            description: "CI/CD\u30D1\u30A4\u30D7\u30E9\u30A4\u30F3\u3067\u306E\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u30C1\u30A7\u30C3\u30AF",
            priority: "high",
            tools: ["SonarQube", "OWASP ZAP", "Snyk"]
          },
          {
            measure: "\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u30C8\u30EC\u30FC\u30CB\u30F3\u30B0",
            description: "\u958B\u767A\u30C1\u30FC\u30E0\u3078\u306E\u5B9A\u671F\u7684\u306A\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u6559\u80B2",
            priority: "medium",
            frequency: "\u534A\u5E74\u3054\u3068"
          }
        ];
        measures.estimated_effort = "3-6\u9031\u9593";
        break;
      case "reliability":
        measures.preventive_measures = [
          {
            measure: "\u30AB\u30AA\u30B9\u30A8\u30F3\u30B8\u30CB\u30A2\u30EA\u30F3\u30B0",
            description: "\u30B7\u30B9\u30C6\u30E0\u306E\u8010\u969C\u5BB3\u6027\u30C6\u30B9\u30C8",
            priority: "medium",
            tools: ["Chaos Monkey", "Gremlin"]
          },
          {
            measure: "\u81EA\u52D5\u30D5\u30A7\u30A4\u30EB\u30AA\u30FC\u30D0\u30FC",
            description: "\u969C\u5BB3\u6642\u306E\u81EA\u52D5\u5207\u308A\u66FF\u3048\u6A5F\u69CB",
            priority: "high",
            implementation: ["\u5197\u9577\u69CB\u6210", "\u30D8\u30EB\u30B9\u30C1\u30A7\u30C3\u30AF", "\u81EA\u52D5\u5FA9\u65E7"]
          },
          {
            measure: "SLO/SLA\u306E\u8A2D\u5B9A\u3068\u76E3\u8996",
            description: "\u30B5\u30FC\u30D3\u30B9\u30EC\u30D9\u30EB\u76EE\u6A19\u306E\u5B9A\u7FA9\u3068\u8FFD\u8DE1",
            priority: "high",
            metrics: ["\u53EF\u7528\u6027", "\u30EC\u30B9\u30DD\u30F3\u30B9\u30BF\u30A4\u30E0", "\u30A8\u30E9\u30FC\u7387"]
          }
        ];
        measures.estimated_effort = "4-8\u9031\u9593";
        break;
    }
    measures.implementation_plan = [
      {
        phase: "Assessment",
        duration: "1\u9031\u9593",
        activities: ["\u73FE\u72B6\u5206\u6790", "\u30AE\u30E3\u30C3\u30D7\u5206\u6790", "\u30EA\u30B9\u30AF\u8A55\u4FA1"]
      },
      {
        phase: "Planning",
        duration: "1\u9031\u9593",
        activities: ["\u8A73\u7D30\u8A08\u753B\u7B56\u5B9A", "\u30EA\u30BD\u30FC\u30B9\u78BA\u4FDD", "\u30B9\u30B1\u30B8\u30E5\u30FC\u30EA\u30F3\u30B0"]
      },
      {
        phase: "Implementation",
        duration: "2-4\u9031\u9593",
        activities: ["\u30C4\u30FC\u30EB\u5C0E\u5165", "\u30D7\u30ED\u30BB\u30B9\u69CB\u7BC9", "\u30C1\u30FC\u30E0\u6559\u80B2"]
      },
      {
        phase: "Monitoring",
        duration: "\u7D99\u7D9A\u7684",
        activities: ["\u52B9\u679C\u6E2C\u5B9A", "\u6539\u5584\u6D3B\u52D5", "\u30EC\u30DD\u30FC\u30C6\u30A3\u30F3\u30B0"]
      }
    ];
    measures.expected_benefits = {
      risk_reduction: "60-80%",
      incident_prevention_rate: "70%",
      mttr_improvement: "40%\u524A\u6E1B",
      cost_savings: "\u5E74\u9593\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8\u5BFE\u5FDC\u30B3\u30B9\u30C8\u306E50%\u524A\u6E1B"
    };
    return {
      success: true,
      preventive_measures: measures,
      priority_actions: measures.preventive_measures.filter((m) => m.priority === "high" || m.priority === "critical"),
      quick_wins: measures.preventive_measures.filter((m) => m.priority === "medium"),
      investment_required: {
        time: measures.estimated_effort,
        budget: "\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u898F\u6A21\u306B\u3088\u308B",
        resources: "2-3\u540D\u306E\u5C02\u4EFB\u30A8\u30F3\u30B8\u30CB\u30A2"
      }
    };
  }
};
function detectFramework(stackTrace) {
  if (stackTrace.includes("node_modules/react")) return "React";
  if (stackTrace.includes("node_modules/vue")) return "Vue";
  if (stackTrace.includes("node_modules/angular")) return "Angular";
  if (stackTrace.includes("node_modules/express")) return "Express";
  if (stackTrace.includes("node_modules/next")) return "Next.js";
  return "Unknown";
}
function performFiveWhys(problem, symptoms) {
  return {
    problem,
    why1: "\u75C7\u72B6: " + symptoms[0],
    why2: "\u76F4\u63A5\u7684\u306A\u539F\u56E0\u306E\u53EF\u80FD\u6027",
    why3: "\u30D7\u30ED\u30BB\u30B9\u307E\u305F\u306F\u30B7\u30B9\u30C6\u30E0\u306E\u554F\u984C",
    why4: "\u7D44\u7E54\u7684\u306A\u8AB2\u984C",
    why5: "\u6839\u672C\u7684\u306A\u539F\u56E0"
  };
}
function calculateImpact(affectedSystems) {
  if (!affectedSystems) return "Low";
  if (affectedSystems.length >= 5) return "Critical";
  if (affectedSystems.length >= 3) return "High";
  if (affectedSystems.length >= 1) return "Medium";
  return "Low";
}
function calculateRiskLevel(riskAssessment) {
  if (!riskAssessment) return "Medium";
  const { likelihood, impact } = riskAssessment;
  if (likelihood === "high" && impact === "high") return "Critical";
  if (likelihood === "high" || impact === "high") return "High";
  if (likelihood === "low" && impact === "low") return "Low";
  return "Medium";
}
function generateActionItems(rootCause) {
  return [
    `${rootCause.cause}\u306E\u8A73\u7D30\u8ABF\u67FB`,
    `\u4E88\u9632\u63AA\u7F6E\u306E\u5B9F\u88C5: ${rootCause.prevention[0]}`,
    "\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8\u30EC\u30DD\u30FC\u30C8\u306E\u4F5C\u6210\u3068\u5171\u6709",
    "\u30C1\u30FC\u30E0\u3067\u306E\u632F\u308A\u8FD4\u308A\u30DF\u30FC\u30C6\u30A3\u30F3\u30B0\u306E\u5B9F\u65BD",
    "\u30E9\u30F3\u30D6\u30C3\u30AF\u306E\u66F4\u65B0"
  ];
}
const problemSolvingTools = [
  diagnoseErrorTool,
  performRootCauseAnalysisTool,
  suggestPreventiveMeasuresTool
];

export { diagnoseErrorTool, performRootCauseAnalysisTool, problemSolvingTools, suggestPreventiveMeasuresTool };
//# sourceMappingURL=4e21964f-3b90-42b0-9173-b58d2a2afbd5.mjs.map
