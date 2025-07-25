"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCertTools = registerCertTools;
const zod_1 = require("zod");
const response_js_1 = require("../utils/response.js");
const constants_js_1 = require("../config/constants.js");
function registerCertTools(server) {
    server.tool("get_cert", "Get certificate by ID", {
        id: zod_1.z.string().describe("The cert id"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ id, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v7/certs/${id}`);
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
            content: [{ type: "text", text: `Certificate details:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("issue_cert", "Issue a new certificate", {
        cns: zod_1.z.array(zod_1.z.string()).describe("The common names the cert should be issued for"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ cns, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v7/certs`);
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
            body: JSON.stringify({ cns }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Certificate issued:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("remove_cert", "Remove a certificate", {
        id: zod_1.z.string().describe("The cert id to remove"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ id, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v7/certs/${id}`);
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
            content: [{ type: "text", text: `Certificate removed:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("upload_cert", "Upload a certificate", {
        ca: zod_1.z.string().describe("The certificate authority"),
        key: zod_1.z.string().describe("The certificate key"),
        cert: zod_1.z.string().describe("The certificate"),
        skipValidation: zod_1.z.boolean().optional().describe("Skip validation of the certificate"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ ca, key, cert, skipValidation, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v7/certs`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ ca, key, cert, skipValidation }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Certificate uploaded:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
}
//# sourceMappingURL=certs.js.map