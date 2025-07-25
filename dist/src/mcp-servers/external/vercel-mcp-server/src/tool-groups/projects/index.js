"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
const projects_js_1 = require("../../components/projects.js");
const deployments_js_1 = require("../../components/deployments.js");
async function register(server) {
    (0, projects_js_1.registerProjectTools)(server);
    (0, deployments_js_1.registerDeploymentTools)(server);
    return [
        "list_projects",
        "create_project",
        "delete_project",
        "get_project_domain",
        "update_project",
        "mcp_project",
        "add_project_member",
        "list_project_members",
        "remove_project_member",
        "mcp_project_member",
        "request_project_transfer",
        "accept_project_transfer",
        "mcp_project_transfer",
        "list_deployments",
        "promote_deployment",
        "get_promotion_aliases",
        "pause_project",
        "mcp_deployment",
        "create_deployment",
        "cancel_deployment",
        "get_deployment",
        "delete_deployment",
        "get_deployment_events",
        "update_deployment_integration",
        "mcp_deployment_management",
        "list_deployment_files",
        "upload_deployment_files",
        "get_deployment_file",
        "list_deployment",
        "mcp_deployment_files"
    ];
}
//# sourceMappingURL=index.js.map