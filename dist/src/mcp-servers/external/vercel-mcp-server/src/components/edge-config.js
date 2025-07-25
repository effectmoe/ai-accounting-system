"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEdgeConfigTools = registerEdgeConfigTools;
const zod_1 = require("zod");
const response_js_1 = require("../utils/response.js");
const constants_js_1 = require("../config/constants.js");
const EdgeConfigItemSchema = zod_1.z.object({
    key: zod_1.z.string(),
    value: zod_1.z.any(),
    description: zod_1.z.string().optional()
});
const EdgeConfigTokenSchema = zod_1.z.object({
    token: zod_1.z.string(),
    label: zod_1.z.string(),
    id: zod_1.z.string(),
    edgeConfigId: zod_1.z.string(),
    createdAt: zod_1.z.number()
});
const EdgeConfigSchema = zod_1.z.object({
    createdAt: zod_1.z.number(),
    updatedAt: zod_1.z.number(),
    id: zod_1.z.string(),
    slug: zod_1.z.string(),
    ownerId: zod_1.z.string(),
    digest: zod_1.z.string(),
    transfer: zod_1.z.object({
        fromAccountId: zod_1.z.string(),
        startedAt: zod_1.z.number(),
        doneAt: zod_1.z.null()
    }).optional(),
    schema: zod_1.z.record(zod_1.z.any()),
    purpose: zod_1.z.object({
        type: zod_1.z.literal("flags"),
        projectId: zod_1.z.string()
    }).optional(),
    sizeInBytes: zod_1.z.number(),
    itemCount: zod_1.z.number()
});
function registerEdgeConfigTools(server) {
    server.tool("create_edge_config", "Create a new Edge Config", {
        slug: zod_1.z.string().max(64).regex(/^[\w-]+$/).describe("Edge Config slug"),
        items: zod_1.z.record(zod_1.z.any()).optional().describe("Initial items")
    }, async (body) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/edge-config`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(body),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Edge Config created:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("create_edge_config_token", "Create a new Edge Config Token", {
        edgeConfigId: zod_1.z.string().describe("Edge Config ID"),
        label: zod_1.z.string().max(52).describe("Token label")
    }, async ({ edgeConfigId, label }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/edge-config/${edgeConfigId}/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ label }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Token created:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("list_edge_configs", "List all Edge Configs", {}, async () => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/edge-config`, {
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Edge Configs:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("get_edge_config", "Get an Edge Config", {
        edgeConfigId: zod_1.z.string().describe("Edge Config ID")
    }, async ({ edgeConfigId }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/edge-config/${edgeConfigId}`, {
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Edge Config details:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("update_edge_config", "Update an Edge Config", {
        edgeConfigId: zod_1.z.string().describe("Edge Config ID"),
        slug: zod_1.z.string().max(64).regex(/^[\w-]+$/).describe("New slug")
    }, async ({ edgeConfigId, slug }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/edge-config/${edgeConfigId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ slug }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Edge Config updated:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("delete_edge_config", "Delete an Edge Config", {
        edgeConfigId: zod_1.z.string().describe("Edge Config ID")
    }, async ({ edgeConfigId }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/edge-config/${edgeConfigId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: "Edge Config deleted successfully" }],
        };
    });
    server.tool("list_edge_config_items", "List Edge Config Items", {
        edgeConfigId: zod_1.z.string().describe("Edge Config ID")
    }, async ({ edgeConfigId }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/edge-config/${edgeConfigId}/items`, {
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Edge Config items:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("get_edge_config_item", "Get an Edge Config Item", {
        edgeConfigId: zod_1.z.string().describe("Edge Config ID"),
        itemKey: zod_1.z.string().describe("Item key")
    }, async ({ edgeConfigId, itemKey }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/edge-config/${edgeConfigId}/item/${itemKey}`, {
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Item details:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("update_edge_config_items", "Update Edge Config Items", {
        edgeConfigId: zod_1.z.string().describe("Edge Config ID"),
        items: zod_1.z.array(zod_1.z.object({
            operation: zod_1.z.enum(["upsert", "remove"]),
            key: zod_1.z.string(),
            value: zod_1.z.any().optional(),
            description: zod_1.z.string().optional()
        })).describe("Items to update"),
        definition: zod_1.z.any().optional().describe("Schema definition")
    }, async ({ edgeConfigId, ...body }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/edge-config/${edgeConfigId}/items`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(body),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Items updated:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("get_edge_config_schema", "Get Edge Config Schema", {
        edgeConfigId: zod_1.z.string().describe("Edge Config ID")
    }, async ({ edgeConfigId }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/edge-config/${edgeConfigId}/schema`, {
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Schema:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("update_edge_config_schema", "Update Edge Config Schema", {
        edgeConfigId: zod_1.z.string().describe("Edge Config ID"),
        definition: zod_1.z.any().describe("Schema definition")
    }, async ({ edgeConfigId, definition }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/edge-config/${edgeConfigId}/schema`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ definition }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Schema updated:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("delete_edge_config_schema", "Delete Edge Config Schema", {
        edgeConfigId: zod_1.z.string().describe("Edge Config ID")
    }, async ({ edgeConfigId }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/edge-config/${edgeConfigId}/schema`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: "Schema deleted successfully" }],
        };
    });
    server.tool("list_edge_config_tokens", "List Edge Config Tokens", {
        edgeConfigId: zod_1.z.string().describe("Edge Config ID")
    }, async ({ edgeConfigId }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/edge-config/${edgeConfigId}/tokens`, {
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Tokens:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("get_edge_config_token", "Get Edge Config Token", {
        edgeConfigId: zod_1.z.string().describe("Edge Config ID"),
        token: zod_1.z.string().describe("Token value")
    }, async ({ edgeConfigId, token }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/edge-config/${edgeConfigId}/token/${token}`, {
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Token details:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("delete_edge_config_tokens", "Delete Edge Config Tokens", {
        edgeConfigId: zod_1.z.string().describe("Edge Config ID"),
        tokens: zod_1.z.array(zod_1.z.string()).describe("Tokens to delete")
    }, async ({ edgeConfigId, tokens }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/edge-config/${edgeConfigId}/tokens`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ tokens }),
        });
        await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: "Tokens deleted successfully" }],
        };
    });
    server.tool("list_edge_config_backups", "List Edge Config Backups", {
        edgeConfigId: zod_1.z.string().describe("Edge Config ID"),
        limit: zod_1.z.number().min(0).max(50).optional().describe("Number of backups to return"),
        next: zod_1.z.string().optional().describe("Next page token")
    }, async ({ edgeConfigId, ...params }) => {
        const queryParams = new URLSearchParams();
        if (params.limit)
            queryParams.set("limit", params.limit.toString());
        if (params.next)
            queryParams.set("next", params.next);
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/edge-config/${edgeConfigId}/backups?${queryParams}`, {
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Backups:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("get_edge_config_backup", "Get Edge Config Backup", {
        edgeConfigId: zod_1.z.string().describe("Edge Config ID"),
        backupId: zod_1.z.string().describe("Backup version ID")
    }, async ({ edgeConfigId, backupId }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/edge-config/${edgeConfigId}/backups/${backupId}`, {
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Backup details:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
}
//# sourceMappingURL=edge-config.js.map