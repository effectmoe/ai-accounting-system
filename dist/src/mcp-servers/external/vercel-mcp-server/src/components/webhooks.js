"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWebhookTools = registerWebhookTools;
const zod_1 = require("zod");
const response_js_1 = require("../utils/response.js");
const constants_js_1 = require("../config/constants.js");
function registerWebhookTools(server) {
    server.tool("create_webhook", "Creates a webhook", {
        url: zod_1.z.string().url().regex(/^https?:\/\//).describe("The webhook URL"),
        events: zod_1.z.array(zod_1.z.enum([
            "budget.reached",
            "budget.reset",
            "domain.created",
            "deployment.created",
            "deployment.error"
        ])).min(1).describe("Events to subscribe to"),
        projectIds: zod_1.z.array(zod_1.z.string()).min(1).max(50).describe("Project IDs to watch"),
        teamId: zod_1.z.string().optional().describe("Team ID to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("Team slug to perform the request on behalf of")
    }, async ({ url, events, projectIds, teamId, slug }) => {
        const urlObj = new URL(`${constants_js_1.BASE_URL}/v1/webhooks`);
        if (teamId)
            urlObj.searchParams.append("teamId", teamId);
        if (slug)
            urlObj.searchParams.append("slug", slug);
        const response = await fetch(urlObj.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
                url,
                events,
                projectIds
            }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Webhook created:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("delete_webhook", "Deletes a webhook", {
        id: zod_1.z.string().describe("Webhook ID to delete"),
        teamId: zod_1.z.string().optional().describe("Team ID to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("Team slug to perform the request on behalf of")
    }, async ({ id, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/webhooks/${id}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        if (response.status === 204) {
            return {
                content: [
                    { type: "text", text: `Webhook ${id} was successfully deleted` },
                ],
            };
        }
        const errorData = await response.text();
        throw new Error(`Failed to delete webhook: ${response.status} - ${errorData}`);
    });
    server.tool("list_webhooks", "Get a list of webhooks", {
        projectId: zod_1.z.string().regex(/^[a-zA-z0-9_]+$/).optional().describe("Filter by project ID"),
        teamId: zod_1.z.string().optional().describe("Team ID to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("Team slug to perform the request on behalf of")
    }, async ({ projectId, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/webhooks`);
        if (projectId)
            url.searchParams.append("projectId", projectId);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Webhooks:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("get_webhook", "Get a webhook", {
        id: zod_1.z.string().describe("Webhook ID"),
        teamId: zod_1.z.string().optional().describe("Team ID to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("Team slug to perform the request on behalf of")
    }, async ({ id, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/webhooks/${id}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Webhook details:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
}
//# sourceMappingURL=webhooks.js.map