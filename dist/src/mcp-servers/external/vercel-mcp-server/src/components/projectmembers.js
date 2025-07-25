"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProjectMemberTools = registerProjectMemberTools;
const zod_1 = require("zod");
const index_js_1 = require("../index.js");
const teamParams = {
    teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
    slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
};
function registerProjectMemberTools(server) {
    server.tool("add_project_member", "Adds a new member to a project", {
        idOrName: zod_1.z.string().describe("The ID or name of the Project"),
        uid: zod_1.z.string().max(256).optional().describe("The ID of the team member that should be added to this project"),
        username: zod_1.z.string().max(256).optional().describe("The username of the team member that should be added to this project"),
        email: zod_1.z.string().email().optional().describe("The email of the team member that should be added to this project"),
        role: zod_1.z.enum(["ADMIN", "PROJECT_DEVELOPER", "PROJECT_VIEWER"]).describe("The project role of the member that will be added"),
        ...teamParams
    }, async ({ idOrName, uid, username, email, role, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v1/projects/${idOrName}/members`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
                ...(uid && { uid }),
                ...(username && { username }),
                ...(email && { email }),
                role,
            }),
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Project member added:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("list_project_members", "Lists all members of a project", {
        idOrName: zod_1.z.string().describe("The ID or name of the Project"),
        limit: zod_1.z.number().min(1).max(100).optional().describe("Limit how many project members should be returned"),
        since: zod_1.z.number().optional().describe("Timestamp in milliseconds to only include members added since then"),
        until: zod_1.z.number().optional().describe("Timestamp in milliseconds to only include members added until then"),
        search: zod_1.z.string().optional().describe("Search project members by their name, username, and email"),
        ...teamParams
    }, async ({ idOrName, limit, since, until, search, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v1/projects/${idOrName}/members`);
        const queryParams = new URLSearchParams();
        if (limit)
            queryParams.append("limit", limit.toString());
        if (since)
            queryParams.append("since", since.toString());
        if (until)
            queryParams.append("until", until.toString());
        if (search)
            queryParams.append("search", search);
        if (teamId)
            queryParams.append("teamId", teamId);
        if (slug)
            queryParams.append("slug", slug);
        const response = await fetch(`${url.toString()}?${queryParams.toString()}`, {
            headers: {
                Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Project members:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("remove_project_member", "Remove a member from a specific project", {
        idOrName: zod_1.z.string().describe("The ID or name of the Project"),
        uid: zod_1.z.string().describe("The user ID of the member"),
        ...teamParams
    }, async ({ idOrName, uid, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v1/projects/${idOrName}/members/${uid}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Project member removed:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
}
//# sourceMappingURL=projectmembers.js.map