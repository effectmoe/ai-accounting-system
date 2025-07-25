"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIntegrationTools = registerIntegrationTools;
const zod_1 = require("zod");
const response_js_1 = require("../utils/response.js");
const constants_js_1 = require("../config/constants.js");
function registerIntegrationTools(server) {
    server.tool("int_delete", "Delete an integration configuration", {
        id: zod_1.z.string().describe("ID of the configuration to delete"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ id, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/integrations/configuration/${id}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            method: "DELETE",
            headers: { Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: "Integration configuration deleted successfully" }]
        };
    });
    server.tool("int_list", "Get configurations for the authenticated user or team", {
        view: zod_1.z.enum(["account", "project"]).describe("View type for configurations"),
        installationType: zod_1.z.enum(["marketplace", "external"]).optional().describe("Type of installation"),
        integrationIdOrSlug: zod_1.z.string().optional().describe("ID of the integration"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ view, installationType, integrationIdOrSlug, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/integrations/configurations`);
        url.searchParams.append("view", view);
        if (installationType)
            url.searchParams.append("installationType", installationType);
        if (integrationIdOrSlug)
            url.searchParams.append("integrationIdOrSlug", integrationIdOrSlug);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Integration configurations:\n${JSON.stringify(data, null, 2)}` }]
        };
    });
    server.tool("int_gitns", "List git namespaces by provider", {
        host: zod_1.z.string().optional().describe("The custom Git host if using a custom Git provider"),
        provider: zod_1.z.enum(["github", "github-custom-host", "gitlab", "bitbucket"]).optional().describe("Git provider")
    }, async ({ host, provider }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/integrations/git-namespaces`);
        if (host)
            url.searchParams.append("host", host);
        if (provider)
            url.searchParams.append("provider", provider);
        const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Git namespaces:\n${JSON.stringify(data, null, 2)}` }]
        };
    });
    server.tool("int_search_repo", "List git repositories linked to namespace", {
        query: zod_1.z.string().optional().describe("Search query"),
        namespaceId: zod_1.z.string().optional().describe("Namespace ID"),
        provider: zod_1.z.enum(["github", "github-custom-host", "gitlab", "bitbucket"]).optional().describe("Git provider"),
        installationId: zod_1.z.string().optional().describe("Installation ID"),
        host: zod_1.z.string().optional().describe("Custom Git host"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ query, namespaceId, provider, installationId, host, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/integrations/search-repo`);
        if (query)
            url.searchParams.append("query", query);
        if (namespaceId)
            url.searchParams.append("namespaceId", namespaceId);
        if (provider)
            url.searchParams.append("provider", provider);
        if (installationId)
            url.searchParams.append("installationId", installationId);
        if (host)
            url.searchParams.append("host", host);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Git repositories:\n${JSON.stringify(data, null, 2)}` }]
        };
    });
    server.tool("int_get", "Retrieve an integration configuration", {
        id: zod_1.z.string().describe("ID of the configuration to check"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ id, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/integrations/configuration/${id}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Integration configuration:\n${JSON.stringify(data, null, 2)}` }]
        };
    });
    server.tool("int_update_action", "Update deployment integration action", {
        deploymentId: zod_1.z.string().describe("Deployment ID"),
        integrationConfigurationId: zod_1.z.string().describe("Integration configuration ID"),
        resourceId: zod_1.z.string().describe("Resource ID"),
        action: zod_1.z.string().describe("Action to update"),
        status: zod_1.z.enum(["running", "succeeded", "failed"]).describe("Status of the action"),
        statusText: zod_1.z.string().optional().describe("Status text"),
        outcomes: zod_1.z.array(zod_1.z.object({
            kind: zod_1.z.string(),
            secrets: zod_1.z.array(zod_1.z.object({
                name: zod_1.z.string(),
                value: zod_1.z.string()
            })).optional()
        })).optional().describe("Action outcomes")
    }, async ({ deploymentId, integrationConfigurationId, resourceId, action, status, statusText, outcomes }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/deployments/${deploymentId}/integrations/${integrationConfigurationId}/resources/${resourceId}/actions/${action}`);
        const response = await fetch(url.toString(), {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                status,
                statusText,
                outcomes
            })
        });
        await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: "Integration action updated successfully" }]
        };
    });
}
//# sourceMappingURL=integrations.js.map