"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSecretTools = registerSecretTools;
const zod_1 = require("zod");
const response_js_1 = require("../utils/response.js");
const constants_js_1 = require("../config/constants.js");
const teamParams = {
    teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
    slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
};
function registerSecretTools(server) {
    server.tool("create_secret", "Create a new secret", {
        name: zod_1.z.string().max(100).describe("The name of the secret (max 100 characters)"),
        value: zod_1.z.string().describe("The value of the new secret"),
        decryptable: zod_1.z.boolean().optional().describe("Whether the secret value can be decrypted after creation"),
        projectId: zod_1.z.string().optional().describe("Associate a secret to a project"),
        ...teamParams
    }, async ({ name, value, decryptable, projectId, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v2/secrets/${name}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ name, value, decryptable, projectId }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Secret created:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("update_secret_name", "Change the name of a secret", {
        currentName: zod_1.z.string().describe("The current name of the secret"),
        newName: zod_1.z.string().max(100).describe("The new name for the secret"),
        ...teamParams
    }, async ({ currentName, newName, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v2/secrets/${currentName}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ name: newName }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Secret name updated:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("delete_secret", "Delete a secret", {
        idOrName: zod_1.z.string().describe("The name or unique identifier of the secret"),
        ...teamParams
    }, async ({ idOrName, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v2/secrets/${idOrName}`);
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
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Secret deleted:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("get_secret", "Get information for a specific secret", {
        idOrName: zod_1.z.string().describe("The name or unique identifier of the secret"),
        decrypt: zod_1.z.enum(["true", "false"]).optional().describe("Whether to try to decrypt the value of the secret"),
        ...teamParams
    }, async ({ idOrName, decrypt, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v3/secrets/${idOrName}`);
        if (decrypt)
            url.searchParams.append("decrypt", decrypt);
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
                { type: "text", text: `Secret information:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("list_secrets", "List all secrets", {
        id: zod_1.z.string().optional().describe("Filter by comma separated secret ids"),
        projectId: zod_1.z.string().optional().describe("Filter by project ID"),
        ...teamParams
    }, async ({ id, projectId, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v3/secrets`);
        if (id)
            url.searchParams.append("id", id);
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
                { type: "text", text: `Secrets:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
}
//# sourceMappingURL=secrets.js.map