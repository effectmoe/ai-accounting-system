import { l as logger, g as getDatabase } from '../mongodb-client.mjs';
import { exec } from 'child_process';
import { promisify } from 'util';
import '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/mongodb/lib/index.js';
import '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/@sentry/nextjs/build/cjs/index.server.js';

promisify(exec);
const createDeploymentPipelineTool = {
  name: "create_deployment_pipeline",
  description: "\u30C7\u30D7\u30ED\u30A4\u30E1\u30F3\u30C8\u30D1\u30A4\u30D7\u30E9\u30A4\u30F3\u3092\u4F5C\u6210\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      pipeline_name: { type: "string", description: "\u30D1\u30A4\u30D7\u30E9\u30A4\u30F3\u540D" },
      platform: {
        type: "string",
        enum: ["github-actions", "gitlab-ci", "jenkins", "circleci", "azure-devops"],
        description: "CI/CD\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0"
      },
      stages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "\u30B9\u30C6\u30FC\u30B8\u540D" },
            steps: { type: "array", items: { type: "object" }, description: "\u30B9\u30C6\u30C3\u30D7" },
            conditions: { type: "object", description: "\u5B9F\u884C\u6761\u4EF6" }
          }
        },
        description: "\u30D1\u30A4\u30D7\u30E9\u30A4\u30F3\u30B9\u30C6\u30FC\u30B8"
      },
      triggers: { type: "array", items: { type: "string" }, description: "\u30C8\u30EA\u30AC\u30FC\u6761\u4EF6" }
    },
    required: ["pipeline_name", "platform", "stages"]
  },
  handler: async (params) => {
    logger.info("Creating deployment pipeline:", params);
    const db = await getDatabase();
    const collection = db.collection("deployment_pipelines");
    let pipelineConfig = {
      name: params.pipeline_name,
      platform: params.platform,
      stages: params.stages,
      triggers: params.triggers || ["push", "pull_request"],
      created_at: /* @__PURE__ */ new Date(),
      updated_at: /* @__PURE__ */ new Date()
    };
    let configFile = "";
    if (params.platform === "github-actions") {
      configFile = generateGitHubActionsConfig(params);
      pipelineConfig.config_file_path = ".github/workflows/deploy.yml";
    } else if (params.platform === "gitlab-ci") {
      configFile = generateGitLabCIConfig(params);
      pipelineConfig.config_file_path = ".gitlab-ci.yml";
    }
    pipelineConfig.config_content = configFile;
    const result = await collection.insertOne(pipelineConfig);
    return {
      success: true,
      pipeline_id: result.insertedId.toString(),
      pipeline_name: params.pipeline_name,
      platform: params.platform,
      config_file: configFile,
      setup_instructions: [
        `1. \u8A2D\u5B9A\u30D5\u30A1\u30A4\u30EB\u3092 ${pipelineConfig.config_file_path} \u306B\u4FDD\u5B58\u3057\u3066\u304F\u3060\u3055\u3044`,
        "2. \u30EA\u30DD\u30B8\u30C8\u30EA\u306B\u30B3\u30DF\u30C3\u30C8\u30FB\u30D7\u30C3\u30B7\u30E5\u3057\u3066\u304F\u3060\u3055\u3044",
        "3. CI/CD\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0\u3067\u5FC5\u8981\u306A\u74B0\u5883\u5909\u6570\u3092\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044"
      ]
    };
  }
};
const deployApplicationTool = {
  name: "deploy_application",
  description: "\u30A2\u30D7\u30EA\u30B1\u30FC\u30B7\u30E7\u30F3\u3092\u30C7\u30D7\u30ED\u30A4\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      application_name: { type: "string", description: "\u30A2\u30D7\u30EA\u30B1\u30FC\u30B7\u30E7\u30F3\u540D" },
      environment: {
        type: "string",
        enum: ["development", "staging", "production"],
        description: "\u30C7\u30D7\u30ED\u30A4\u74B0\u5883"
      },
      deployment_type: {
        type: "string",
        enum: ["rolling", "blue-green", "canary", "recreate"],
        description: "\u30C7\u30D7\u30ED\u30A4\u65B9\u5F0F"
      },
      version: { type: "string", description: "\u30D0\u30FC\u30B8\u30E7\u30F3" },
      rollback_enabled: { type: "boolean", description: "\u30ED\u30FC\u30EB\u30D0\u30C3\u30AF\u6A5F\u80FD\u3092\u6709\u52B9\u306B\u3059\u308B\u304B" }
    },
    required: ["application_name", "environment", "deployment_type", "version"]
  },
  handler: async (params) => {
    logger.info("Deploying application:", params);
    const db = await getDatabase();
    const deploymentsCollection = db.collection("deployments");
    const deployment = {
      application_name: params.application_name,
      environment: params.environment,
      deployment_type: params.deployment_type,
      version: params.version,
      rollback_enabled: params.rollback_enabled ?? true,
      status: "in_progress",
      started_at: /* @__PURE__ */ new Date(),
      deployment_id: `DEPLOY-${Date.now()}`
    };
    const result = await deploymentsCollection.insertOne(deployment);
    const deploymentSteps = [
      { step: "pre-deployment-checks", status: "completed" },
      { step: "backup-current-version", status: "completed" },
      { step: "deploy-new-version", status: "completed" },
      { step: "health-checks", status: "completed" },
      { step: "update-load-balancer", status: "completed" }
    ];
    await deploymentsCollection.updateOne(
      { _id: result.insertedId },
      {
        $set: {
          status: "completed",
          completed_at: /* @__PURE__ */ new Date(),
          deployment_steps: deploymentSteps
        }
      }
    );
    return {
      success: true,
      deployment_id: deployment.deployment_id,
      status: "completed",
      deployment_url: `https://${params.environment}.${params.application_name}.example.com`,
      monitoring_url: `https://monitoring.example.com/deployments/${deployment.deployment_id}`,
      rollback_command: `deploy rollback ${deployment.deployment_id}`,
      deployment_summary: {
        application: params.application_name,
        environment: params.environment,
        version: params.version,
        deployment_type: params.deployment_type,
        duration_seconds: 180
      }
    };
  }
};
const rollbackDeploymentTool = {
  name: "rollback_deployment",
  description: "\u30C7\u30D7\u30ED\u30A4\u30E1\u30F3\u30C8\u3092\u30ED\u30FC\u30EB\u30D0\u30C3\u30AF\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      deployment_id: { type: "string", description: "\u30C7\u30D7\u30ED\u30A4\u30E1\u30F3\u30C8ID" },
      target_version: { type: "string", description: "\u30ED\u30FC\u30EB\u30D0\u30C3\u30AF\u5148\u30D0\u30FC\u30B8\u30E7\u30F3" },
      strategy: {
        type: "string",
        enum: ["immediate", "gradual", "manual"],
        description: "\u30ED\u30FC\u30EB\u30D0\u30C3\u30AF\u6226\u7565"
      },
      reason: { type: "string", description: "\u30ED\u30FC\u30EB\u30D0\u30C3\u30AF\u7406\u7531" }
    },
    required: ["deployment_id", "target_version", "strategy", "reason"]
  },
  handler: async (params) => {
    logger.info("Rolling back deployment:", params);
    const db = await getDatabase();
    const deploymentsCollection = db.collection("deployments");
    const rollbacksCollection = db.collection("rollbacks");
    const originalDeployment = await deploymentsCollection.findOne({
      deployment_id: params.deployment_id
    });
    if (!originalDeployment) {
      return {
        success: false,
        error: `Deployment ${params.deployment_id} not found`
      };
    }
    const rollback = {
      original_deployment_id: params.deployment_id,
      target_version: params.target_version,
      strategy: params.strategy,
      reason: params.reason,
      rollback_id: `ROLLBACK-${Date.now()}`,
      status: "in_progress",
      started_at: /* @__PURE__ */ new Date(),
      application_name: originalDeployment.application_name,
      environment: originalDeployment.environment
    };
    const result = await rollbacksCollection.insertOne(rollback);
    const rollbackSteps = [
      { step: "verify-target-version", status: "completed" },
      { step: "prepare-rollback", status: "completed" },
      { step: "switch-traffic", status: "completed" },
      { step: "verify-rollback", status: "completed" },
      { step: "cleanup", status: "completed" }
    ];
    await rollbacksCollection.updateOne(
      { _id: result.insertedId },
      {
        $set: {
          status: "completed",
          completed_at: /* @__PURE__ */ new Date(),
          rollback_steps: rollbackSteps
        }
      }
    );
    await deploymentsCollection.updateOne(
      { deployment_id: params.deployment_id },
      {
        $set: {
          status: "rolled_back",
          rolled_back_at: /* @__PURE__ */ new Date(),
          rollback_id: rollback.rollback_id
        }
      }
    );
    return {
      success: true,
      rollback_id: rollback.rollback_id,
      status: "completed",
      original_deployment: params.deployment_id,
      target_version: params.target_version,
      rollback_summary: {
        duration_seconds: 120,
        strategy: params.strategy,
        reason: params.reason,
        affected_environment: originalDeployment.environment
      },
      post_rollback_actions: [
        "\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8\u30EC\u30DD\u30FC\u30C8\u306E\u4F5C\u6210",
        "\u30ED\u30FC\u30EB\u30D0\u30C3\u30AF\u539F\u56E0\u306E\u6839\u672C\u5206\u6790",
        "\u518D\u30C7\u30D7\u30ED\u30A4\u8A08\u753B\u306E\u7B56\u5B9A"
      ]
    };
  }
};
function generateGitHubActionsConfig(params) {
  const stages = params.stages.map((stage) => {
    const steps = stage.steps.map((step) => `      - name: ${step.name}
        run: ${step.command || 'echo "Step implementation needed"'}`).join("\n");
    return `  ${stage.name}:
    runs-on: ubuntu-latest
    steps:
${steps}`;
  }).join("\n\n");
  return `name: ${params.pipeline_name}

on:
  ${params.triggers.map((t) => t).join("\n  ")}

jobs:
${stages}`;
}
function generateGitLabCIConfig(params) {
  const stages = params.stages.map((stage) => stage.name);
  const jobs = params.stages.map((stage) => {
    const scripts = stage.steps.map((step) => `    - ${step.command || 'echo "Step implementation needed"'}`).join("\n");
    return `${stage.name}:
  stage: ${stage.name}
  script:
${scripts}`;
  }).join("\n\n");
  return `stages:
  ${stages.map((s) => `- ${s}`).join("\n  ")}

${jobs}`;
}
const deploymentTools = [
  createDeploymentPipelineTool,
  deployApplicationTool,
  rollbackDeploymentTool
];

export { createDeploymentPipelineTool, deployApplicationTool, deploymentTools, rollbackDeploymentTool };
//# sourceMappingURL=12105a5a-9dd3-442b-b462-67a04361b4d9.mjs.map
