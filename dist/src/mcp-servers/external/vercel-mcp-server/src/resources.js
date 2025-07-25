"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerResources = registerResources;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const index_js_1 = require("./index.js");
function registerResources(server) {
    server.resource("project", new mcp_js_1.ResourceTemplate("projects://{projectId}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v9/projects/${variables.projectId}`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("team", new mcp_js_1.ResourceTemplate("teams://{teamId}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v2/teams/${variables.teamId}`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("deployment", new mcp_js_1.ResourceTemplate("deployments://{deploymentId}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v13/deployments/${variables.deploymentId}`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("env-vars", new mcp_js_1.ResourceTemplate("env://{projectId}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v9/projects/${variables.projectId}/env`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("domains", new mcp_js_1.ResourceTemplate("domains://{domain}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v5/domains/${variables.domain}`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("webhook", new mcp_js_1.ResourceTemplate("webhooks://{webhookId}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v1/webhooks/${variables.webhookId}`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("user", new mcp_js_1.ResourceTemplate("users://{userId}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v2/user`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("integration", new mcp_js_1.ResourceTemplate("integrations://{integrationId}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v1/integrations/${variables.integrationId}`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("project-member", new mcp_js_1.ResourceTemplate("project-members://{projectId}/{userId}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v9/projects/${variables.projectId}/members/${variables.userId}`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("access-group", new mcp_js_1.ResourceTemplate("access-groups://{groupId}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v1/access-groups/${variables.groupId}`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("log-drain", new mcp_js_1.ResourceTemplate("log-drains://{drainId}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v1/log-drains/${variables.drainId}`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("secret", new mcp_js_1.ResourceTemplate("secrets://{projectId}/{name}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v9/projects/${variables.projectId}/env/${variables.name}`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("alias", new mcp_js_1.ResourceTemplate("aliases://{aliasId}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v2/aliases/${variables.aliasId}`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("artifact", new mcp_js_1.ResourceTemplate("artifacts://{projectId}/{artifactId}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v8/artifacts/${variables.projectId}/${variables.artifactId}`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("certificate", new mcp_js_1.ResourceTemplate("certs://{certId}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v5/now/certs/${variables.certId}`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("dns", new mcp_js_1.ResourceTemplate("dns://{domain}/{recordId}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v2/domains/${variables.domain}/records/${variables.recordId}`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("marketplace", new mcp_js_1.ResourceTemplate("marketplace://{integration}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v1/marketplace/integrations/${variables.integration}`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("edge-config", new mcp_js_1.ResourceTemplate("edge-config://{configId}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v1/edge-config/${variables.configId}`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("speed-insights", new mcp_js_1.ResourceTemplate("speed-insights://{projectId}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v1/speed-insights/${variables.projectId}`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("security", new mcp_js_1.ResourceTemplate("security://{projectId}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v1/security/projects/${variables.projectId}`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("auth", new mcp_js_1.ResourceTemplate("auth://{token}", { list: undefined }), async (uri, variables) => {
        const response = await fetch(`${index_js_1.BASE_URL}/v2/user/tokens/${variables.token}`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2)
                }]
        };
    });
    server.resource("config", "config://vercel", async (uri) => ({
        contents: [{
                uri: uri.href,
                text: JSON.stringify({
                    apiVersion: "v9",
                    baseUrl: index_js_1.BASE_URL,
                    defaultTeam: null,
                    features: {
                        deployments: true,
                        teams: true,
                        domains: true,
                        envVars: true,
                        analytics: true,
                        webhooks: true,
                        users: true,
                        integrations: true,
                        projectMembers: true,
                        accessGroups: true,
                        logDrains: true,
                        secrets: true,
                        aliases: true,
                        artifacts: true,
                        certificates: true,
                        dns: true,
                        marketplace: true,
                        edgeConfig: true,
                        speedInsights: true,
                        security: true,
                        auth: true
                    }
                }, null, 2)
            }]
    }));
}
//# sourceMappingURL=resources.js.map