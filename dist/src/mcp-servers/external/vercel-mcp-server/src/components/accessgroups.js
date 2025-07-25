"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAccessGroupTools = registerAccessGroupTools;
const zod_1 = require("zod");
const index_js_1 = require("../index.js");
const teamParams = {
    teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
    slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
};
const projectRoleEnum = zod_1.z.enum(["ADMIN", "PROJECT_VIEWER", "PROJECT_DEVELOPER"]);
function registerAccessGroupTools(server) {
    server.tool("create_access_group_project", "Create an access group project", {
        accessGroupIdOrName: zod_1.z.string().describe("The access group ID or name"),
        projectId: zod_1.z.string().max(256).describe("The ID of the project"),
        role: projectRoleEnum.describe("The project role that will be added to this Access Group"),
        ...teamParams
    }, async ({ accessGroupIdOrName, projectId, role, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v1/access-groups/${accessGroupIdOrName}/projects`);
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
            body: JSON.stringify({ projectId, role }),
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Access group project created:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("create_access_group", "Create a new access group", {
        name: zod_1.z.string().max(50).regex(/^[A-z0-9_ -]+$/).describe("The name of the access group"),
        projects: zod_1.z.array(zod_1.z.object({
            projectId: zod_1.z.string(),
            role: projectRoleEnum
        })).optional().describe("List of projects to add to the access group"),
        membersToAdd: zod_1.z.array(zod_1.z.string()).optional().describe("List of members to add to the access group"),
        ...teamParams
    }, async ({ name, projects, membersToAdd, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v1/access-groups`);
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
                name,
                ...(projects && { projects }),
                ...(membersToAdd && { membersToAdd })
            }),
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Access group created:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("delete_access_group_project", "Delete an access group project", {
        accessGroupIdOrName: zod_1.z.string().describe("The access group ID or name"),
        projectId: zod_1.z.string().describe("The project ID"),
        ...teamParams
    }, async ({ accessGroupIdOrName, projectId, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v1/access-groups/${accessGroupIdOrName}/projects/${projectId}`);
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
        await (0, index_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: "Access group project deleted successfully" }],
        };
    });
    server.tool("delete_access_group", "Delete an access group", {
        idOrName: zod_1.z.string().describe("The access group ID or name"),
        ...teamParams
    }, async ({ idOrName, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v1/access-groups/${idOrName}`);
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
        await (0, index_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: "Access group deleted successfully" }],
        };
    });
    server.tool("list_access_groups", "List access groups for a team, project or member", {
        projectId: zod_1.z.string().optional().describe("Filter access groups by project"),
        search: zod_1.z.string().optional().describe("Search for access groups by name"),
        membersLimit: zod_1.z.number().min(1).max(100).optional().describe("Number of members to include in the response"),
        projectsLimit: zod_1.z.number().min(1).max(100).optional().describe("Number of projects to include in the response"),
        limit: zod_1.z.number().min(1).max(100).optional().describe("Limit how many access group should be returned"),
        next: zod_1.z.string().optional().describe("Continuation cursor to retrieve the next page of results"),
        ...teamParams
    }, async ({ projectId, search, membersLimit, projectsLimit, limit, next, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v1/access-groups`);
        const queryParams = new URLSearchParams();
        if (projectId)
            queryParams.append("projectId", projectId);
        if (search)
            queryParams.append("search", search);
        if (membersLimit)
            queryParams.append("membersLimit", membersLimit.toString());
        if (projectsLimit)
            queryParams.append("projectsLimit", projectsLimit.toString());
        if (limit)
            queryParams.append("limit", limit.toString());
        if (next)
            queryParams.append("next", next);
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
            content: [{ type: "text", text: `Access groups:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("list_access_group_members", "List members of an access group", {
        idOrName: zod_1.z.string().describe("The ID or name of the Access Group"),
        limit: zod_1.z.number().min(1).max(100).optional().describe("Limit how many access group members should be returned"),
        next: zod_1.z.string().optional().describe("Continuation cursor to retrieve the next page of results"),
        search: zod_1.z.string().optional().describe("Search project members by their name, username, and email"),
        ...teamParams
    }, async ({ idOrName, limit, next, search, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v1/access-groups/${idOrName}/members`);
        const queryParams = new URLSearchParams();
        if (limit)
            queryParams.append("limit", limit.toString());
        if (next)
            queryParams.append("next", next);
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
            content: [{ type: "text", text: `Access group members:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("list_access_group_projects", "List projects of an access group", {
        idOrName: zod_1.z.string().describe("The ID or name of the Access Group"),
        limit: zod_1.z.number().min(1).max(100).optional().describe("Limit how many access group projects should be returned"),
        next: zod_1.z.string().optional().describe("Continuation cursor to retrieve the next page of results"),
        ...teamParams
    }, async ({ idOrName, limit, next, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v1/access-groups/${idOrName}/projects`);
        const queryParams = new URLSearchParams();
        if (limit)
            queryParams.append("limit", limit.toString());
        if (next)
            queryParams.append("next", next);
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
            content: [{ type: "text", text: `Access group projects:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("get_access_group", "Read an access group", {
        idOrName: zod_1.z.string().describe("The access group ID or name"),
        ...teamParams
    }, async ({ idOrName, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v1/access-groups/${idOrName}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Access group details:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("get_access_group_project", "Read an access group project", {
        accessGroupIdOrName: zod_1.z.string().describe("The access group ID or name"),
        projectId: zod_1.z.string().describe("The project ID"),
        ...teamParams
    }, async ({ accessGroupIdOrName, projectId, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v1/access-groups/${accessGroupIdOrName}/projects/${projectId}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Access group project details:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("update_access_group", "Update an access group", {
        idOrName: zod_1.z.string().describe("The access group ID or name"),
        name: zod_1.z.string().max(50).regex(/^[A-z0-9_ -]+$/).optional().describe("The name of the access group"),
        projects: zod_1.z.array(zod_1.z.object({
            projectId: zod_1.z.string(),
            role: projectRoleEnum
        })).optional().describe("List of projects to update"),
        membersToAdd: zod_1.z.array(zod_1.z.string()).optional().describe("List of members to add to the access group"),
        membersToRemove: zod_1.z.array(zod_1.z.string()).optional().describe("List of members to remove from the access group"),
        ...teamParams
    }, async ({ idOrName, name, projects, membersToAdd, membersToRemove, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v1/access-groups/${idOrName}`);
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
                ...(name && { name }),
                ...(projects && { projects }),
                ...(membersToAdd && { membersToAdd }),
                ...(membersToRemove && { membersToRemove })
            }),
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Access group updated:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("update_access_group_project", "Update an access group project", {
        accessGroupIdOrName: zod_1.z.string().describe("The access group ID or name"),
        projectId: zod_1.z.string().describe("The project ID"),
        role: projectRoleEnum.describe("The project role that will be added to this Access Group"),
        ...teamParams
    }, async ({ accessGroupIdOrName, projectId, role, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v1/access-groups/${accessGroupIdOrName}/projects/${projectId}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ role }),
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Access group project updated:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
}
//# sourceMappingURL=accessgroups.js.map