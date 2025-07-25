"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEnvironmentTools = registerEnvironmentTools;
const zod_1 = require("zod");
const response_js_1 = require("../utils/response.js");
const constants_js_1 = require("../config/constants.js");
const BranchMatcherSchema = zod_1.z.object({
    type: zod_1.z.enum(['equals']),
    pattern: zod_1.z.string()
}).optional();
const CreateEnvironmentSchema = zod_1.z.object({
    slug: zod_1.z.string().max(32),
    description: zod_1.z.string().max(256).optional(),
    branchMatcher: BranchMatcherSchema,
    copyEnvVarsFrom: zod_1.z.string().optional()
});
const UpdateEnvironmentSchema = zod_1.z.object({
    slug: zod_1.z.string().max(32).optional(),
    description: zod_1.z.string().max(256).optional(),
    branchMatcher: BranchMatcherSchema.nullable()
});
const DeleteEnvironmentSchema = zod_1.z.object({
    deleteUnassignedEnvironmentVariables: zod_1.z.boolean().optional()
});
function registerEnvironmentTools(server) {
    server.tool("create_environment", "Create a custom environment for a project", {
        idOrName: zod_1.z.string().describe("Project ID or name"),
        slug: zod_1.z.string().max(32).describe("Environment slug"),
        description: zod_1.z.string().max(256).optional().describe("Environment description"),
        branchMatcher: zod_1.z.object({
            type: zod_1.z.enum(["equals"]),
            pattern: zod_1.z.string()
        }).optional().describe("Branch matching configuration"),
        copyEnvVarsFrom: zod_1.z.string().optional().describe("Copy environment variables from this environment"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        teamSlug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ idOrName, slug, description, branchMatcher, copyEnvVarsFrom, teamId, teamSlug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v9/projects/${idOrName}/custom-environments`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (teamSlug)
            url.searchParams.append("slug", teamSlug);
        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ slug, description, branchMatcher, copyEnvVarsFrom }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Environment created:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("delete_environment", "Remove a custom environment from a project", {
        idOrName: zod_1.z.string().describe("Project ID or name"),
        environmentSlugOrId: zod_1.z.string().describe("Environment slug or ID"),
        deleteUnassignedEnvVars: zod_1.z.boolean().optional().describe("Delete unassigned environment variables"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        teamSlug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ idOrName, environmentSlugOrId, deleteUnassignedEnvVars, teamId, teamSlug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v9/projects/${idOrName}/custom-environments/${environmentSlugOrId}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (teamSlug)
            url.searchParams.append("slug", teamSlug);
        const response = await fetch(url.toString(), {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ deleteUnassignedEnvironmentVariables: deleteUnassignedEnvVars }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Environment deleted:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("get_environment", "Retrieve a custom environment", {
        idOrName: zod_1.z.string().describe("Project ID or name"),
        environmentSlugOrId: zod_1.z.string().describe("Environment slug or ID"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        teamSlug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ idOrName, environmentSlugOrId, teamId, teamSlug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v9/projects/${idOrName}/custom-environments/${environmentSlugOrId}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (teamSlug)
            url.searchParams.append("slug", teamSlug);
        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Environment details:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("list_environments", "List custom environments for a project", {
        idOrName: zod_1.z.string().describe("Project ID or name"),
        gitBranch: zod_1.z.string().optional().describe("Filter by git branch"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        teamSlug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ idOrName, gitBranch, teamId, teamSlug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v9/projects/${idOrName}/custom-environments`);
        if (gitBranch)
            url.searchParams.append("gitBranch", gitBranch);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (teamSlug)
            url.searchParams.append("slug", teamSlug);
        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Environments list:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("update_environment", "Update a custom environment", {
        idOrName: zod_1.z.string().describe("Project ID or name"),
        environmentSlugOrId: zod_1.z.string().describe("Environment slug or ID"),
        slug: zod_1.z.string().max(32).optional().describe("New environment slug"),
        description: zod_1.z.string().max(256).optional().describe("New environment description"),
        branchMatcher: zod_1.z.object({
            type: zod_1.z.enum(["equals"]),
            pattern: zod_1.z.string()
        }).nullable().optional().describe("New branch matching configuration"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        teamSlug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ idOrName, environmentSlugOrId, slug, description, branchMatcher, teamId, teamSlug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v9/projects/${idOrName}/custom-environments/${environmentSlugOrId}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (teamSlug)
            url.searchParams.append("slug", teamSlug);
        const response = await fetch(url.toString(), {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ slug, description, branchMatcher }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Environment updated:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
}
//# sourceMappingURL=environments.js.map