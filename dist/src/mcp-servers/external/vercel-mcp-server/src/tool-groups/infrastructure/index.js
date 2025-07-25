"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
const edge_config_js_1 = require("../../components/edge-config.js");
const secrets_js_1 = require("../../components/secrets.js");
const environments_js_1 = require("../../components/environments.js");
const webhooks_js_1 = require("../../components/webhooks.js");
const logDrains_js_1 = require("../../components/logDrains.js");
const speed_insights_js_1 = require("../../components/speed-insights.js");
async function register(server) {
    (0, edge_config_js_1.registerEdgeConfigTools)(server);
    (0, secrets_js_1.registerSecretTools)(server);
    (0, environments_js_1.registerEnvironmentTools)(server);
    (0, webhooks_js_1.registerWebhookTools)(server);
    (0, logDrains_js_1.registerLogDrainTools)(server);
    (0, speed_insights_js_1.registerSpeedInsightsTools)(server);
    return [
        "create_edge_config",
        "create_edge_config_token",
        "list_edge_configs",
        "get_edge_config",
        "update_edge_config",
        "delete_edge_config",
        "list_edge_config_items",
        "get_edge_config_item",
        "update_edge_config_items",
        "get_edge_config_schema",
        "update_edge_config_schema",
        "delete_edge_config_schema",
        "list_edge_config_tokens",
        "get_edge_config_token",
        "delete_edge_config_tokens",
        "list_edge_config_backups",
        "get_edge_config_backup",
        "mcp_edge_config",
        "create_secret",
        "update_secret_name",
        "delete_secret",
        "get_secret",
        "list_secrets",
        "mcp_secret",
        "add_env",
        "update_env",
        "delete_env",
        "get_env",
        "list_env",
        "mcp_env",
        "create_environment",
        "delete_environment",
        "get_environment",
        "list_environments",
        "update_environment",
        "mcp_environment",
        "create_webhook",
        "delete_webhook",
        "list_webhooks",
        "get_webhook",
        "mcp_webhook",
        "logdrain_create",
        "logdrain_createIntegration",
        "logdrain_delete",
        "logdrain_deleteIntegration",
        "logdrain_get",
        "logdrain_list",
        "logdrain_listIntegration",
        "mcp_logdrain",
        "send_web_vitals",
        "mcp_speed_insights"
    ];
}
//# sourceMappingURL=index.js.map