"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerArtifactTools = registerArtifactTools;
const zod_1 = require("zod");
const response_js_1 = require("../utils/response.js");
const constants_js_1 = require("../config/constants.js");
function registerArtifactTools(server) {
    server.tool("check_artifact", "Check that a cache artifact with the given hash exists", {
        hash: zod_1.z.string().describe("The artifact hash"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ hash, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v8/artifacts/${hash}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            method: "HEAD",
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: "Artifact exists" }],
        };
    });
    server.tool("download_artifact", "Downloads a cache artifact identified by its hash", {
        hash: zod_1.z.string().describe("The artifact hash"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of"),
        ci: zod_1.z.string().optional().describe("The CI environment where this artifact is downloaded"),
        interactive: zod_1.z.boolean().optional().describe("Whether the client is an interactive shell")
    }, async ({ hash, teamId, slug, ci, interactive }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v8/artifacts/${hash}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const headers = {
            Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
        };
        if (ci)
            headers["x-artifact-client-ci"] = ci;
        if (interactive !== undefined)
            headers["x-artifact-client-interactive"] = interactive ? "1" : "0";
        const response = await fetch(url.toString(), { headers });
        const data = await response.blob();
        return {
            content: [{ type: "text", text: `Artifact downloaded: ${data.size} bytes` }],
        };
    });
    server.tool("get_artifact_status", "Check the status of Remote Caching for this principal", {
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v8/artifacts/status`);
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
            content: [{ type: "text", text: `Remote Caching status:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("query_artifacts", "Query information about an array of artifacts", {
        hashes: zod_1.z.array(zod_1.z.string()).describe("Array of artifact hashes"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ hashes, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v8/artifacts`);
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
            body: JSON.stringify({ hashes }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Artifacts information:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("record_artifact_events", "Records artifacts cache usage events", {
        events: zod_1.z.array(zod_1.z.object({
            sessionId: zod_1.z.string(),
            source: zod_1.z.enum(["LOCAL", "REMOTE"]),
            event: zod_1.z.enum(["HIT", "MISS"]),
            hash: zod_1.z.string(),
            duration: zod_1.z.number().optional()
        })).describe("Array of cache usage events"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of"),
        ci: zod_1.z.string().optional().describe("The CI environment where events occurred"),
        interactive: zod_1.z.boolean().optional().describe("Whether the client is an interactive shell")
    }, async ({ events, teamId, slug, ci, interactive }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v8/artifacts/events`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
        };
        if (ci)
            headers["x-artifact-client-ci"] = ci;
        if (interactive !== undefined)
            headers["x-artifact-client-interactive"] = interactive ? "1" : "0";
        const response = await fetch(url.toString(), {
            method: "POST",
            headers,
            body: JSON.stringify(events),
        });
        await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: "Cache events recorded successfully" }],
        };
    });
    server.tool("upload_artifact", "Uploads a cache artifact identified by its hash", {
        hash: zod_1.z.string().describe("The artifact hash"),
        content: zod_1.z.string().describe("Base64 encoded content of the artifact"),
        contentLength: zod_1.z.number().describe("The artifact size in bytes"),
        duration: zod_1.z.number().optional().describe("Time taken to generate the artifact in milliseconds"),
        ci: zod_1.z.string().optional().describe("The CI environment where this artifact was generated"),
        interactive: zod_1.z.boolean().optional().describe("Whether the client is an interactive shell"),
        tag: zod_1.z.string().optional().describe("Base64 encoded tag for this artifact"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ hash, content, contentLength, duration, ci, interactive, tag, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v8/artifacts/${hash}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const headers = {
            "Content-Type": "application/octet-stream",
            "Content-Length": contentLength.toString(),
            Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
        };
        if (duration)
            headers["x-artifact-duration"] = duration.toString();
        if (ci)
            headers["x-artifact-client-ci"] = ci;
        if (interactive !== undefined)
            headers["x-artifact-client-interactive"] = interactive ? "1" : "0";
        if (tag)
            headers["x-artifact-tag"] = tag;
        const response = await fetch(url.toString(), {
            method: "PUT",
            headers,
            body: Buffer.from(content, "base64"),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Artifact uploaded:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
}
//# sourceMappingURL=artifacts.js.map