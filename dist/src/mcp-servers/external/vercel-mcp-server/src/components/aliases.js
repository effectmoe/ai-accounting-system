"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAliasTools = registerAliasTools;
const zod_1 = require("zod");
const response_js_1 = require("../utils/response.js");
const constants_js_1 = require("../config/constants.js");
function registerAliasTools(server) {
    server.tool("assign_alias", "Creates a new alias for the deployment with the given deployment ID", {
        id: zod_1.z.string().describe("The ID of the deployment to assign the alias to"),
        alias: zod_1.z.string().describe("The alias to assign (e.g. my-alias.vercel.app)"),
        redirect: zod_1.z.string().nullable().optional().describe("Optional hostname to redirect to using 307"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ id, alias, redirect, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v2/deployments/${id}/aliases`);
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
            body: JSON.stringify({ alias, redirect }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Alias assigned:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("delete_alias", "Delete an Alias with the specified ID", {
        aliasId: zod_1.z.string().describe("The ID or alias that will be removed"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ aliasId, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v2/aliases/${aliasId}`);
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
            content: [{ type: "text", text: `Alias deleted:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("get_alias", "Retrieves an Alias for the given host name or alias ID", {
        idOrAlias: zod_1.z.string().describe("The alias or alias ID to be retrieved"),
        projectId: zod_1.z.string().optional().describe("Get the alias only if it is assigned to the provided project ID"),
        since: zod_1.z.number().optional().describe("Get the alias only if it was created after this JavaScript timestamp"),
        until: zod_1.z.number().optional().describe("Get the alias only if it was created before this JavaScript timestamp"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ idOrAlias, projectId, since, until, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v4/aliases/${idOrAlias}`);
        if (projectId)
            url.searchParams.append("projectId", projectId);
        if (since)
            url.searchParams.append("since", since.toString());
        if (until)
            url.searchParams.append("until", until.toString());
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
            content: [{ type: "text", text: `Alias information:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("list_aliases", "Retrieves a list of aliases for the authenticated User or Team", {
        domain: zod_1.z.string().optional().describe("Get only aliases of the given domain name"),
        limit: zod_1.z.number().optional().describe("Maximum number of aliases to list from a request"),
        projectId: zod_1.z.string().optional().describe("Filter aliases from the given projectId"),
        since: zod_1.z.number().optional().describe("Get aliases created after this JavaScript timestamp"),
        until: zod_1.z.number().optional().describe("Get aliases created before this JavaScript timestamp"),
        rollbackDeploymentId: zod_1.z.string().optional().describe("Get aliases that would be rolled back for the given deployment"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ domain, limit, projectId, since, until, rollbackDeploymentId, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v4/aliases`);
        if (domain)
            url.searchParams.append("domain", domain);
        if (limit)
            url.searchParams.append("limit", limit.toString());
        if (projectId)
            url.searchParams.append("projectId", projectId);
        if (since)
            url.searchParams.append("since", since.toString());
        if (until)
            url.searchParams.append("until", until.toString());
        if (rollbackDeploymentId)
            url.searchParams.append("rollbackDeploymentId", rollbackDeploymentId);
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
            content: [{ type: "text", text: `Aliases list:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("list_deployment_aliases", "Retrieves all Aliases for the Deployment with the given ID", {
        id: zod_1.z.string().describe("The ID of the deployment the aliases should be listed for"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ id, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v2/deployments/${id}/aliases`);
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
            content: [{ type: "text", text: `Deployment aliases:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
}
//# sourceMappingURL=aliases.js.map