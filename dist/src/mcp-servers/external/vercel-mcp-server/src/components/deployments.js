"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDeploymentTools = registerDeploymentTools;
const zod_1 = require("zod");
const response_js_1 = require("../utils/response.js");
const constants_js_1 = require("../config/constants.js");
function registerDeploymentTools(server) {
    server.tool("create_deployment", "Create a new deployment with all required data", {
        name: zod_1.z.string().describe("Project name used in the deployment URL"),
        project: zod_1.z.string().optional().describe("Target project identifier (overrides name)"),
        files: zod_1.z.array(zod_1.z.object({
            data: zod_1.z.string(),
            encoding: zod_1.z.string().optional(),
            file: zod_1.z.string()
        })).optional().describe("Files to be deployed"),
        gitMetadata: zod_1.z.object({
            remoteUrl: zod_1.z.string().optional(),
            commitAuthorName: zod_1.z.string().optional(),
            commitMessage: zod_1.z.string().optional(),
            commitRef: zod_1.z.string().optional(),
            commitSha: zod_1.z.string().optional(),
            dirty: zod_1.z.boolean().optional()
        }).optional().describe("Git metadata for the deployment"),
        gitSource: zod_1.z.object({
            type: zod_1.z.string(),
            repoId: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
            ref: zod_1.z.string().optional(),
            sha: zod_1.z.string().optional()
        }).optional().describe("Git repository source"),
        target: zod_1.z.string().optional().describe("Deployment target (production, preview, staging)"),
        deploymentId: zod_1.z.string().optional().describe("Existing deployment ID to redeploy"),
        meta: zod_1.z.record(zod_1.z.any()).optional().describe("Deployment metadata"),
        projectSettings: zod_1.z.object({
            buildCommand: zod_1.z.string().nullable().optional(),
            devCommand: zod_1.z.string().nullable().optional(),
            framework: zod_1.z.string().nullable().optional(),
            installCommand: zod_1.z.string().nullable().optional(),
            nodeVersion: zod_1.z.string().optional(),
            outputDirectory: zod_1.z.string().nullable().optional(),
            rootDirectory: zod_1.z.string().nullable().optional(),
            serverlessFunctionRegion: zod_1.z.string().nullable().optional(),
            skipGitConnectDuringLink: zod_1.z.boolean().optional(),
            sourceFilesOutsideRootDirectory: zod_1.z.boolean().optional()
        }).optional().describe("Project settings for the deployment"),
        forceNew: zod_1.z.boolean().optional().describe("Force new deployment even if similar exists"),
        skipAutoDetectionConfirmation: zod_1.z.boolean().optional().describe("Skip framework detection confirmation"),
        customEnvironmentSlugOrId: zod_1.z.string().optional().describe("Custom environment to deploy to"),
        monorepoManager: zod_1.z.string().nullable().optional().describe("Monorepo manager being used"),
        withLatestCommit: zod_1.z.boolean().optional().describe("Force latest commit when redeploying"),
        teamId: zod_1.z.string().optional().describe("Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("Team slug to perform the request on behalf of")
    }, async ({ name, project, files, gitMetadata, gitSource, target, deploymentId, meta, projectSettings, forceNew, skipAutoDetectionConfirmation, customEnvironmentSlugOrId, monorepoManager, withLatestCommit, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v13/deployments`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        if (forceNew)
            url.searchParams.append("forceNew", "1");
        if (skipAutoDetectionConfirmation)
            url.searchParams.append("skipAutoDetectionConfirmation", "1");
        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
                name,
                project,
                files,
                gitMetadata,
                gitSource,
                target,
                deploymentId,
                meta,
                projectSettings,
                customEnvironmentSlugOrId,
                monorepoManager,
                withLatestCommit
            }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Deployment created:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("cancel_deployment", "Cancel a deployment which is currently building", {
        id: zod_1.z.string().describe("The unique identifier of the deployment"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ id, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v12/deployments/${id}/cancel`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Deployment canceled:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("get_deployment", "Get deployment by ID or URL", {
        idOrUrl: zod_1.z.string().describe("The unique identifier or hostname of the deployment"),
        withGitRepoInfo: zod_1.z.string().optional().describe("Whether to add gitRepo information"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ idOrUrl, withGitRepoInfo, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v13/deployments/${idOrUrl}`);
        if (withGitRepoInfo)
            url.searchParams.append("withGitRepoInfo", withGitRepoInfo);
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
            content: [{ type: "text", text: `Deployment details:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("delete_deployment", "Delete a deployment by ID or URL", {
        id: zod_1.z.string().describe("The unique identifier of the deployment"),
        url: zod_1.z.string().optional().describe("A Deployment or Alias URL (overrides ID if provided)"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ id, url, teamId, slug }) => {
        const baseUrl = new URL(`${constants_js_1.BASE_URL}/v13/deployments/${id}`);
        if (url)
            baseUrl.searchParams.append("url", url);
        if (teamId)
            baseUrl.searchParams.append("teamId", teamId);
        if (slug)
            baseUrl.searchParams.append("slug", slug);
        const response = await fetch(baseUrl.toString(), {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Deployment deleted:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("get_deployment_events", "Get build logs and events for a deployment", {
        idOrUrl: zod_1.z.string().describe("The unique identifier or hostname of the deployment"),
        direction: zod_1.z.enum(["forward", "backward"]).optional().describe("Order of the returned events based on timestamp"),
        follow: zod_1.z.number().optional().describe("Return live events as they happen (1 to enable)"),
        limit: zod_1.z.number().optional().describe("Maximum number of events to return (-1 for all)"),
        name: zod_1.z.string().optional().describe("Deployment build ID"),
        since: zod_1.z.number().optional().describe("Timestamp to start pulling logs from"),
        until: zod_1.z.number().optional().describe("Timestamp to pull logs until"),
        statusCode: zod_1.z.string().optional().describe("HTTP status code range to filter events by (e.g. '5xx')"),
        delimiter: zod_1.z.number().optional().describe("Delimiter option"),
        builds: zod_1.z.number().optional().describe("Builds option"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ idOrUrl, direction, follow, limit, name, since, until, statusCode, delimiter, builds, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v3/deployments/${idOrUrl}/events`);
        if (direction)
            url.searchParams.append("direction", direction);
        if (follow !== undefined)
            url.searchParams.append("follow", follow.toString());
        if (limit !== undefined)
            url.searchParams.append("limit", limit.toString());
        if (name)
            url.searchParams.append("name", name);
        if (since !== undefined)
            url.searchParams.append("since", since.toString());
        if (until !== undefined)
            url.searchParams.append("until", until.toString());
        if (statusCode)
            url.searchParams.append("statusCode", statusCode);
        if (delimiter !== undefined)
            url.searchParams.append("delimiter", delimiter.toString());
        if (builds !== undefined)
            url.searchParams.append("builds", builds.toString());
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
            content: [{ type: "text", text: `Deployment events:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("update_deployment_integration", "Update deployment integration action status", {
        deploymentId: zod_1.z.string().describe("The deployment ID"),
        integrationConfigurationId: zod_1.z.string().describe("The integration configuration ID"),
        resourceId: zod_1.z.string().describe("The resource ID"),
        action: zod_1.z.string().describe("The action to update"),
        status: zod_1.z.enum(["running", "succeeded", "failed"]).describe("The status of the action"),
        statusText: zod_1.z.string().optional().describe("Additional status text"),
        outcomes: zod_1.z.array(zod_1.z.object({
            kind: zod_1.z.string(),
            secrets: zod_1.z.array(zod_1.z.object({
                name: zod_1.z.string(),
                value: zod_1.z.string()
            })).optional()
        })).optional().describe("Action outcomes"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ deploymentId, integrationConfigurationId, resourceId, action, status, statusText, outcomes, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/deployments/${deploymentId}/integrations/${integrationConfigurationId}/resources/${resourceId}/actions/${action}`);
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
            body: JSON.stringify({
                status,
                statusText,
                outcomes
            }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Integration action updated:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("list_deployment_files", "Get file structure of a deployment's source code", {
        id: zod_1.z.string().describe("The unique deployment identifier"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ id, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v6/deployments/${id}/files`);
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
            content: [{ type: "text", text: `Deployment files:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("upload_deployment_files", "Upload files required for deployment", {
        content: zod_1.z.string().describe("The file content to upload"),
        size: zod_1.z.number().describe("The file size in bytes"),
        digest: zod_1.z.string().max(40).describe("The file SHA1 for integrity check"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ content, size, digest, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v2/files`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Length": size.toString(),
                "x-vercel-digest": digest,
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: content,
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `File upload result:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("get_deployment_file", "Get contents of a specific deployment file", {
        id: zod_1.z.string().describe("The unique deployment identifier"),
        fileId: zod_1.z.string().describe("The unique file identifier"),
        path: zod_1.z.string().optional().describe("Path to the file (only for Git deployments)"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ id, fileId, path, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v7/deployments/${id}/files/${fileId}`);
        if (path)
            url.searchParams.append("path", path);
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
            content: [{ type: "text", text: `File contents:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("list_deployment", "List deployments under the authenticated user or team", {
        app: zod_1.z.string().optional().describe("Name of the deployment"),
        from: zod_1.z.number().optional().describe("Get deployments created after this timestamp (deprecated)"),
        limit: zod_1.z.number().optional().describe("Maximum number of deployments to list"),
        projectId: zod_1.z.string().optional().describe("Filter deployments from the given ID or name"),
        target: zod_1.z.string().optional().describe("Filter deployments based on the environment"),
        to: zod_1.z.number().optional().describe("Get deployments created before this timestamp (deprecated)"),
        users: zod_1.z.string().optional().describe("Filter deployments based on users who created them"),
        since: zod_1.z.number().optional().describe("Get deployments created after this timestamp"),
        until: zod_1.z.number().optional().describe("Get deployments created before this timestamp"),
        state: zod_1.z.string().optional().describe("Filter by state (BUILDING, ERROR, INITIALIZING, QUEUED, READY, CANCELED)"),
        rollbackCandidate: zod_1.z.boolean().optional().describe("Filter deployments based on rollback candidacy"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ app, from, limit, projectId, target, to, users, since, until, state, rollbackCandidate, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v6/deployments`);
        if (app)
            url.searchParams.append("app", app);
        if (from !== undefined)
            url.searchParams.append("from", from.toString());
        if (limit !== undefined)
            url.searchParams.append("limit", limit.toString());
        if (projectId)
            url.searchParams.append("projectId", projectId);
        if (target)
            url.searchParams.append("target", target);
        if (to !== undefined)
            url.searchParams.append("to", to.toString());
        if (users)
            url.searchParams.append("users", users);
        if (since !== undefined)
            url.searchParams.append("since", since.toString());
        if (until !== undefined)
            url.searchParams.append("until", until.toString());
        if (state)
            url.searchParams.append("state", state);
        if (rollbackCandidate !== undefined)
            url.searchParams.append("rollbackCandidate", rollbackCandidate.toString());
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
            content: [{ type: "text", text: `Deployments list:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
}
//# sourceMappingURL=deployments.js.map