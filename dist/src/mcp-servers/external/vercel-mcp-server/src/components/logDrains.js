"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLogDrainTools = registerLogDrainTools;
const zod_1 = require("zod");
const response_js_1 = require("../utils/response.js");
const constants_js_1 = require("../config/constants.js");
function registerLogDrainTools(server) {
    server.tool("logdrain_create", "Creates a configurable log drain", {
        deliveryFormat: zod_1.z.enum(["json", "ndjson"]).describe("The delivery log format"),
        url: zod_1.z.string().url().regex(/^(http|https)?:\/\//).describe("The log drain url"),
        headers: zod_1.z.record(zod_1.z.string()).optional().describe("Headers to be sent together with the request"),
        projectIds: zod_1.z.array(zod_1.z.string()).min(1).max(50).describe("Project IDs to watch"),
        sources: zod_1.z.array(zod_1.z.enum(["static", "lambda", "build", "edge", "external", "firewall"])).min(1).describe("Sources to watch"),
        environments: zod_1.z.array(zod_1.z.enum(["preview", "production"])).min(1).describe("Environments to watch"),
        secret: zod_1.z.string().optional().describe("Custom secret of log drain"),
        samplingRate: zod_1.z.number().min(0.01).max(1).optional().describe("The sampling rate for this log drain"),
        name: zod_1.z.string().optional().describe("The custom name of this log drain"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ deliveryFormat, url, headers, projectIds, sources, environments, secret, samplingRate, name, teamId, slug }) => {
        const apiUrl = new URL(`${constants_js_1.BASE_URL}/v1/log-drains`);
        if (teamId)
            apiUrl.searchParams.append("teamId", teamId);
        if (slug)
            apiUrl.searchParams.append("slug", slug);
        const response = await fetch(apiUrl.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                deliveryFormat,
                url,
                headers,
                projectIds,
                sources,
                environments,
                secret,
                samplingRate,
                name
            })
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Log drain created:\n${JSON.stringify(data, null, 2)}` }]
        };
    });
    server.tool("logdrain_create_integration", "Creates an integration log drain", {
        name: zod_1.z.string().max(100).regex(/^[A-z0-9_ -]+$/).describe("The name of the log drain"),
        projectIds: zod_1.z.array(zod_1.z.string()).min(1).max(50).optional().describe("Project IDs to watch"),
        secret: zod_1.z.string().max(100).regex(/^[A-z0-9_ -]+$/).optional().describe("Secret to sign log drain notifications"),
        deliveryFormat: zod_1.z.enum(["json", "ndjson", "syslog"]).describe("The delivery log format"),
        url: zod_1.z.string().url().regex(/^(https?|syslog\+tls|syslog):\/\//).describe("The url where you will receive logs"),
        sources: zod_1.z.array(zod_1.z.enum(["static", "lambda", "build", "edge", "external", "firewall"])).optional().describe("Sources to watch"),
        headers: zod_1.z.record(zod_1.z.string()).optional().describe("Headers to be sent together with the request"),
        environments: zod_1.z.array(zod_1.z.enum(["preview", "production"])).optional().describe("Environments to watch"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ name, projectIds, secret, deliveryFormat, url, sources, headers, environments, teamId, slug }) => {
        const apiUrl = new URL(`${constants_js_1.BASE_URL}/v2/integrations/log-drains`);
        if (teamId)
            apiUrl.searchParams.append("teamId", teamId);
        if (slug)
            apiUrl.searchParams.append("slug", slug);
        const response = await fetch(apiUrl.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                name,
                projectIds,
                secret,
                deliveryFormat,
                url,
                sources,
                headers,
                environments
            })
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Integration log drain created:\n${JSON.stringify(data, null, 2)}` }]
        };
    });
    server.tool("logdrain_delete", "Deletes a configurable log drain", {
        id: zod_1.z.string().describe("The log drain ID to delete"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ id, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/log-drains/${id}`);
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
            content: [{ type: "text", text: "Log drain deleted successfully" }]
        };
    });
    server.tool("logdrain_delete_integration", "Deletes an integration log drain", {
        id: zod_1.z.string().describe("ID of the log drain to be deleted"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ id, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/integrations/log-drains/${id}`);
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
            content: [{ type: "text", text: "Integration log drain deleted successfully" }]
        };
    });
    server.tool("logdrain_get", "Retrieves a configurable log drain", {
        id: zod_1.z.string().describe("The log drain ID"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ id, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/log-drains/${id}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Log drain details:\n${JSON.stringify(data, null, 2)}` }]
        };
    });
    server.tool("logdrain_list", "Retrieves a list of all log drains", {
        projectId: zod_1.z.string().regex(/^[a-zA-z0-9_]+$/).optional().describe("Filter by project ID"),
        projectIdOrName: zod_1.z.string().optional().describe("Filter by project ID or name"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ projectId, projectIdOrName, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/log-drains`);
        if (projectId)
            url.searchParams.append("projectId", projectId);
        if (projectIdOrName)
            url.searchParams.append("projectIdOrName", projectIdOrName);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Log drains list:\n${JSON.stringify(data, null, 2)}` }]
        };
    });
    server.tool("logdrain_list_integration", "Retrieves a list of integration log drains", {
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v2/integrations/log-drains`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Integration log drains list:\n${JSON.stringify(data, null, 2)}` }]
        };
    });
}
//# sourceMappingURL=logDrains.js.map