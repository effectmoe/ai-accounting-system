"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
const integrations_js_1 = require("../../components/integrations.js");
const marketplace_js_1 = require("../../components/marketplace.js");
const artifacts_js_1 = require("../../components/artifacts.js");
async function register(server) {
    (0, integrations_js_1.registerIntegrationTools)(server);
    (0, marketplace_js_1.registerMarketplaceTools)(server);
    (0, artifacts_js_1.registerArtifactTools)(server);
    return [
        "int_delete",
        "int_list",
        "int_gitns",
        "int_searchRepo",
        "int_get",
        "int_updateAction",
        "mcp_integration",
        "create_marketplace_event",
        "get_marketplace_account",
        "get_marketplace_invoice",
        "get_marketplace_member",
        "import_marketplace_resource",
        "submit_marketplace_billing",
        "submit_marketplace_invoice",
        "update_marketplace_secrets",
        "marketplace_sso_token_exchange",
        "submit_marketplace_balance",
        "marketplace_invoice_action",
        "mcp_marketplace",
        "check_artifact",
        "download_artifact",
        "get_artifact_status",
        "query_artifacts",
        "record_artifact_events",
        "upload_artifact",
        "mcp_artifact"
    ];
}
//# sourceMappingURL=index.js.map