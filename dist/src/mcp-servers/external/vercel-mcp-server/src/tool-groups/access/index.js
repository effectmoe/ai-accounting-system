"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
const teams_js_1 = require("../../components/teams.js");
const users_js_1 = require("../../components/users.js");
const auth_js_1 = require("../../components/auth.js");
const accessgroups_js_1 = require("../../components/accessgroups.js");
const security_js_1 = require("../../components/security.js");
async function register(server) {
    (0, teams_js_1.registerTeamTools)(server);
    (0, users_js_1.registerUserTools)(server);
    (0, auth_js_1.registerAuthTools)(server);
    (0, accessgroups_js_1.registerAccessGroupTools)(server);
    (0, security_js_1.registerSecurityTools)(server);
    return [
        "create_access_group_project",
        "create_access_group",
        "delete_access_group_project",
        "delete_access_group",
        "list_access_groups",
        "list_access_group_members",
        "list_access_group_projects",
        "get_access_group",
        "get_access_group_project",
        "update_access_group",
        "update_access_group_project",
        "mcp_access_group",
        "create_auth_token",
        "delete_auth_token",
        "get_auth_token",
        "list_auth_tokens",
        "sso_token_exchange",
        "mcp_auth",
        "delete_user",
        "get_user",
        "list_user_events",
        "mcp_user",
        "create_team",
        "delete_team",
        "get_team",
        "list_teams",
        "list_team_members",
        "invite_team_member",
        "remove_team_member",
        "update_team_member",
        "update_team",
        "mcp_team",
        "create_firewall_bypass",
        "delete_firewall_bypass",
        "get_firewall_bypass",
        "get_attack_status",
        "update_attack_mode",
        "get_firewall_config",
        "update_firewall_config",
        "put_firewall_config",
        "mcp_security"
    ];
}
//# sourceMappingURL=index.js.map