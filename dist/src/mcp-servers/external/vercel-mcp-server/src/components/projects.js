"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProjectTools = registerProjectTools;
const zod_1 = require("zod");
const index_js_1 = require("../index.js");
const logger_1 = require("@/lib/logger");
const teamParams = {
    teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
    slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
};
function registerProjectTools(server) {
    server.tool("list_projects", "List all projects from Vercel. Commands: 'list projects', 'show projects', 'get projects', 'list all projects', 'show all projects', 'get all projects', 'list vercel projects', 'show my projects', 'list my projects', 'get my projects', 'retrieve projects', 'fetch projects', 'display projects', 'view projects'", {
        ...teamParams
    }, async ({ teamId, slug }) => {
        try {
            const url = new URL(`${index_js_1.BASE_URL}/v10/projects`);
            if (teamId)
                url.searchParams.append("teamId", teamId);
            if (slug)
                url.searchParams.append("slug", slug);
            const response = await fetch(url.toString(), {
                headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` },
            });
            if (!response.ok) {
                const errorText = await response.text();
                logger_1.logger.error('API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            if (!data.projects) {
                logger_1.logger.error('Unexpected response format:', data);
                throw new Error('Invalid response format from Vercel API');
            }
            const simplifiedProjects = data.projects.map((project) => ({
                id: project.id,
                name: project.name,
                framework: project.framework || 'unknown',
                latestDeployment: project.latestDeployments?.[0]?.url || 'none'
            }));
            return {
                content: [
                    {
                        type: "text",
                        text: `Found ${simplifiedProjects.length} projects:\n${JSON.stringify(simplifiedProjects, null, 2)}`
                    },
                ],
            };
        }
        catch (error) {
            logger_1.logger.error('Error in list_projects:', error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Error listing projects: ${error.message}`
                    },
                ],
            };
        }
    });
    server.tool("create_project", "Create a new project with the provided configuration", {
        name: zod_1.z.string().max(100).regex(/^(?!.*---)[a-z0-9-_.]+$/).describe("The desired name for the project"),
        framework: zod_1.z.enum(["blitzjs", "nextjs", "gatsby", "remix"]).nullable().optional().describe("The framework being used for this project"),
        buildCommand: zod_1.z.string().max(256).nullable().optional().describe("The build command for this project"),
        devCommand: zod_1.z.string().max(256).nullable().optional().describe("The dev command for this project"),
        installCommand: zod_1.z.string().max(256).nullable().optional().describe("The install command for this project"),
        outputDirectory: zod_1.z.string().max(256).nullable().optional().describe("The output directory of the project"),
        publicSource: zod_1.z.boolean().nullable().optional().describe("Whether source code and logs should be public"),
        rootDirectory: zod_1.z.string().max(256).nullable().optional().describe("The directory or relative path to the source code"),
        serverlessFunctionRegion: zod_1.z.string().max(4).nullable().optional().describe("The region to deploy Serverless Functions"),
        gitRepository: zod_1.z.object({
            type: zod_1.z.enum(["github", "gitlab", "bitbucket"]),
            repo: zod_1.z.string(),
        }).optional().describe("The Git Repository to connect"),
        environmentVariables: zod_1.z.array(zod_1.z.object({
            key: zod_1.z.string(),
            value: zod_1.z.string(),
            target: zod_1.z.array(zod_1.z.string()).optional(),
            type: zod_1.z.enum(["system", "secret", "encrypted", "plain"]).optional(),
            gitBranch: zod_1.z.string().optional(),
        })).optional().describe("Collection of ENV Variables"),
        serverlessFunctionZeroConfigFailover: zod_1.z.boolean().optional().describe("Enable Zero Config Failover"),
        enableAffectedProjectsDeployments: zod_1.z.boolean().optional().describe("Skip deployments when no changes to root directory"),
        ...teamParams
    }, async ({ name, framework, buildCommand, devCommand, installCommand, outputDirectory, publicSource, rootDirectory, serverlessFunctionRegion, gitRepository, environmentVariables, serverlessFunctionZeroConfigFailover, enableAffectedProjectsDeployments, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v10/projects`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const payload = {
            name,
            ...(framework && { framework }),
            ...(buildCommand !== undefined && { buildCommand }),
            ...(devCommand !== undefined && { devCommand }),
            ...(installCommand !== undefined && { installCommand }),
            ...(outputDirectory !== undefined && { outputDirectory }),
            ...(publicSource !== undefined && { publicSource }),
            ...(rootDirectory !== undefined && { rootDirectory }),
            ...(serverlessFunctionRegion !== undefined && { serverlessFunctionRegion }),
            ...(gitRepository && { gitRepository }),
            ...(environmentVariables && { environmentVariables }),
            ...(serverlessFunctionZeroConfigFailover !== undefined && { serverlessFunctionZeroConfigFailover }),
            ...(enableAffectedProjectsDeployments !== undefined && { enableAffectedProjectsDeployments }),
        };
        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(payload),
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Project created:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("delete_project", "Delete a specific project", {
        idOrName: zod_1.z.string().describe("The unique project identifier or project name"),
        ...teamParams
    }, async ({ idOrName, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v9/projects/${idOrName}`);
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
        if (response.status === 204) {
            return {
                content: [
                    { type: "text", text: `Project ${idOrName} was successfully deleted` },
                ],
            };
        }
        const errorData = await response.text();
        throw new Error(`Failed to delete project: ${response.status} - ${errorData}`);
    });
    server.tool("get_project_domain", "Get project domain by project id/name and domain name", {
        idOrName: zod_1.z.string().describe("The unique project identifier or project name"),
        domain: zod_1.z.string().describe("The project domain name"),
        ...teamParams
    }, async ({ idOrName, domain, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v9/projects/${idOrName}/domains/${domain}`);
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
            content: [
                { type: "text", text: `Domain information:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("update_project", "Update an existing project", {
        idOrName: zod_1.z.string().describe("The unique project identifier or project name"),
        name: zod_1.z.string().max(100).regex(/^(?!.*---)[a-z0-9-_.]+$/).optional().describe("The desired name for the project"),
        framework: zod_1.z.enum(["blitzjs", "nextjs", "gatsby", "remix"]).nullable().optional().describe("The framework being used for this project"),
        buildCommand: zod_1.z.string().max(256).nullable().optional().describe("The build command for this project"),
        devCommand: zod_1.z.string().max(256).nullable().optional().describe("The dev command for this project"),
        installCommand: zod_1.z.string().max(256).nullable().optional().describe("The install command for this project"),
        outputDirectory: zod_1.z.string().max(256).nullable().optional().describe("The output directory of the project"),
        rootDirectory: zod_1.z.string().max(256).nullable().optional().describe("The directory or relative path to the source code"),
        nodeVersion: zod_1.z.enum(["22.x", "20.x", "18.x", "16.x", "14.x", "12.x", "10.x"]).optional().describe("Node.js version"),
        serverlessFunctionRegion: zod_1.z.string().max(4).nullable().optional().describe("The region to deploy Serverless Functions"),
        publicSource: zod_1.z.boolean().nullable().optional().describe("Whether source code and logs should be public"),
        serverlessFunctionZeroConfigFailover: zod_1.z.boolean().optional().describe("Enable Zero Config Failover"),
        enableAffectedProjectsDeployments: zod_1.z.boolean().optional().describe("Skip deployments when no changes to root directory"),
        autoExposeSystemEnvs: zod_1.z.boolean().optional().describe("Auto expose system environment variables"),
        autoAssignCustomDomains: zod_1.z.boolean().optional().describe("Auto assign custom domains"),
        customerSupportCodeVisibility: zod_1.z.boolean().optional().describe("Allow customer support to see git source"),
        directoryListing: zod_1.z.boolean().optional().describe("Enable directory listing"),
        gitForkProtection: zod_1.z.boolean().optional().describe("Require authorization for Git fork PRs"),
        gitLFS: zod_1.z.boolean().optional().describe("Enable Git LFS"),
        previewDeploymentsDisabled: zod_1.z.boolean().nullable().optional().describe("Disable preview deployments"),
        sourceFilesOutsideRootDirectory: zod_1.z.boolean().optional().describe("Allow source files outside root directory"),
        enablePreviewFeedback: zod_1.z.boolean().nullable().optional().describe("Enable preview toolbar"),
        enableProductionFeedback: zod_1.z.boolean().nullable().optional().describe("Enable production toolbar"),
        skewProtectionBoundaryAt: zod_1.z.number().min(0).optional().describe("Skew Protection boundary timestamp"),
        skewProtectionMaxAge: zod_1.z.number().min(0).optional().describe("Skew Protection max age in seconds"),
        oidcTokenConfig: zod_1.z.object({
            enabled: zod_1.z.boolean(),
            issuerMode: zod_1.z.enum(["global"])
        }).optional().describe("OpenID Connect token configuration"),
        passwordProtection: zod_1.z.object({
            deploymentType: zod_1.z.enum(["all"]),
            password: zod_1.z.string().nullable()
        }).nullable().optional().describe("Password protection settings"),
        ssoProtection: zod_1.z.object({
            deploymentType: zod_1.z.enum(["preview"])
        }).nullable().optional().describe("SSO protection settings"),
        trustedIps: zod_1.z.object({
            deploymentType: zod_1.z.enum(["all"]),
            addresses: zod_1.z.array(zod_1.z.object({
                value: zod_1.z.string(),
                note: zod_1.z.string()
            })),
            protectionMode: zod_1.z.enum(["exclusive"])
        }).nullable().optional().describe("Trusted IPs configuration"),
        optionsAllowlist: zod_1.z.object({
            paths: zod_1.z.array(zod_1.z.object({
                value: zod_1.z.string()
            }))
        }).nullable().optional().describe("Options allowlist configuration"),
        ...teamParams
    }, async ({ idOrName, name, framework, buildCommand, devCommand, installCommand, outputDirectory, rootDirectory, nodeVersion, serverlessFunctionRegion, publicSource, serverlessFunctionZeroConfigFailover, enableAffectedProjectsDeployments, autoExposeSystemEnvs, autoAssignCustomDomains, customerSupportCodeVisibility, directoryListing, gitForkProtection, gitLFS, previewDeploymentsDisabled, sourceFilesOutsideRootDirectory, enablePreviewFeedback, enableProductionFeedback, skewProtectionBoundaryAt, skewProtectionMaxAge, oidcTokenConfig, passwordProtection, ssoProtection, trustedIps, optionsAllowlist, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v9/projects/${idOrName}`);
        if (slug)
            url.searchParams.append("slug", slug);
        const payload = {
            name,
            ...(framework && { framework }),
            ...(buildCommand !== undefined && { buildCommand }),
            ...(devCommand !== undefined && { devCommand }),
            ...(installCommand !== undefined && { installCommand }),
            ...(outputDirectory !== undefined && { outputDirectory }),
            ...(rootDirectory !== undefined && { rootDirectory }),
            ...(nodeVersion && { nodeVersion }),
            ...(serverlessFunctionRegion !== undefined && { serverlessFunctionRegion }),
            ...(publicSource !== undefined && { publicSource }),
            ...(serverlessFunctionZeroConfigFailover !== undefined && { serverlessFunctionZeroConfigFailover }),
            ...(enableAffectedProjectsDeployments !== undefined && { enableAffectedProjectsDeployments }),
            ...(autoExposeSystemEnvs !== undefined && { autoExposeSystemEnvs }),
            ...(autoAssignCustomDomains !== undefined && { autoAssignCustomDomains }),
            ...(customerSupportCodeVisibility !== undefined && { customerSupportCodeVisibility }),
            ...(directoryListing !== undefined && { directoryListing }),
            ...(gitForkProtection !== undefined && { gitForkProtection }),
            ...(gitLFS !== undefined && { gitLFS }),
            ...(previewDeploymentsDisabled !== undefined && { previewDeploymentsDisabled }),
            ...(sourceFilesOutsideRootDirectory !== undefined && { sourceFilesOutsideRootDirectory }),
            ...(enablePreviewFeedback !== undefined && { enablePreviewFeedback }),
            ...(enableProductionFeedback !== undefined && { enableProductionFeedback }),
            ...(skewProtectionBoundaryAt !== undefined && { skewProtectionBoundaryAt }),
            ...(skewProtectionMaxAge !== undefined && { skewProtectionMaxAge }),
            ...(oidcTokenConfig && { oidcTokenConfig }),
            ...(passwordProtection && { passwordProtection }),
            ...(ssoProtection && { ssoProtection }),
            ...(trustedIps && { trustedIps }),
            ...(optionsAllowlist && { optionsAllowlist }),
        };
        const response = await fetch(url.toString(), {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(payload),
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Project updated:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("list_deployments", "List deployments for a project", {
        projectId: zod_1.z.string().optional().describe("Filter deployments from the given project ID"),
        app: zod_1.z.string().optional().describe("Name of the deployment"),
        limit: zod_1.z.number().optional().describe("Maximum number of deployments to list"),
        since: zod_1.z.number().optional().describe("Get deployments created after this timestamp"),
        until: zod_1.z.number().optional().describe("Get deployments created before this timestamp"),
        state: zod_1.z.string().optional().describe("Filter by deployment state (BUILDING, ERROR, INITIALIZING, QUEUED, READY, CANCELED)"),
        target: zod_1.z.string().optional().describe("Filter deployments based on environment"),
        users: zod_1.z.string().optional().describe("Filter deployments by user IDs (comma-separated)"),
        rollbackCandidate: zod_1.z.boolean().optional().describe("Filter deployments based on rollback candidacy"),
        ...teamParams
    }, async ({ projectId, app, limit, since, until, state, target, users, rollbackCandidate, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v6/deployments`);
        const queryParams = new URLSearchParams();
        if (projectId)
            queryParams.append("projectId", projectId);
        if (app)
            queryParams.append("app", app);
        if (limit)
            queryParams.append("limit", limit.toString());
        if (since)
            queryParams.append("since", since.toString());
        if (until)
            queryParams.append("until", until.toString());
        if (state)
            queryParams.append("state", state);
        if (target)
            queryParams.append("target", target);
        if (users)
            queryParams.append("users", users);
        if (rollbackCandidate !== undefined)
            queryParams.append("rollbackCandidate", rollbackCandidate.toString());
        if (slug)
            queryParams.append("slug", slug);
        const response = await fetch(`${url.toString()}?${queryParams.toString()}`, {
            headers: { Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}` },
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Deployments:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("add_domain", "Add a domain to a project", {
        idOrName: zod_1.z.string().describe("Project ID or name"),
        domain: zod_1.z.string().describe("Domain name to add"),
        ...teamParams
    }, async ({ idOrName, domain, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v10/projects/${idOrName}/domains`);
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
            body: JSON.stringify({ name: domain }),
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Domain added:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("remove_domain", "Remove a domain from a project", {
        idOrName: zod_1.z.string().describe("Project ID or name"),
        domain: zod_1.z.string().describe("Domain name to remove"),
        ...teamParams
    }, async ({ idOrName, domain, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v9/projects/${idOrName}/domains/${domain}`);
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
            content: [{ type: "text", text: `Domain removed:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("get_domain", "Get domain information", {
        idOrName: zod_1.z.string().describe("Project ID or name"),
        domain: zod_1.z.string().describe("Domain name"),
        ...teamParams
    }, async ({ idOrName, domain, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v9/projects/${idOrName}/domains/${domain}`);
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
            content: [{ type: "text", text: `Domain information:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("list_domains", "List all domains for a project", {
        idOrName: zod_1.z.string().describe("Project ID or name"),
        ...teamParams
    }, async ({ idOrName, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v9/projects/${idOrName}/domains`);
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
            content: [{ type: "text", text: `Project domains:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("add_env", "Add environment variables to a project", {
        idOrName: zod_1.z.string().describe("Project ID or name"),
        env: zod_1.z.array(zod_1.z.object({
            key: zod_1.z.string(),
            value: zod_1.z.string(),
            type: zod_1.z.string().optional(),
            target: zod_1.z.array(zod_1.z.string()).optional()
        })).describe("Environment variables to add"),
        ...teamParams
    }, async ({ idOrName, env, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v10/projects/${idOrName}/env`);
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
            body: JSON.stringify({ env }),
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Environment variables added:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("update_env", "Update an environment variable", {
        idOrName: zod_1.z.string().describe("Project ID or name"),
        envId: zod_1.z.string().describe("Environment variable ID"),
        value: zod_1.z.string().describe("New value"),
        type: zod_1.z.string().optional().describe("Environment type"),
        target: zod_1.z.array(zod_1.z.string()).optional().describe("Deployment targets"),
        ...teamParams
    }, async ({ idOrName, envId, value, type, target, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v9/projects/${idOrName}/env/${envId}`);
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
            body: JSON.stringify({ value, type, target }),
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Environment variable updated:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("delete_env", "Delete an environment variable", {
        idOrName: zod_1.z.string().describe("Project ID or name"),
        envId: zod_1.z.string().describe("Environment variable ID"),
        ...teamParams
    }, async ({ idOrName, envId, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v9/projects/${idOrName}/env/${envId}`);
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
            content: [{ type: "text", text: `Environment variable deleted:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("get_env", "Get an environment variable", {
        idOrName: zod_1.z.string().describe("Project ID or name"),
        envId: zod_1.z.string().describe("Environment variable ID"),
        ...teamParams
    }, async ({ idOrName, envId, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v1/projects/${idOrName}/env/${envId}`);
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
            content: [{ type: "text", text: `Environment variable details:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("list_env", "List all environment variables", {
        idOrName: zod_1.z.string().describe("Project ID or name"),
        ...teamParams
    }, async ({ idOrName, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v9/projects/${idOrName}/env`);
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
            content: [{ type: "text", text: `Environment variables:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("promote_deployment", "Promote a deployment", {
        projectId: zod_1.z.string().describe("Project ID"),
        deploymentId: zod_1.z.string().describe("Deployment ID to promote"),
        ...teamParams
    }, async ({ projectId, deploymentId, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v10/projects/${projectId}/promote/${deploymentId}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Deployment promoted:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("get_promotion_aliases", "Get promotion aliases", {
        projectId: zod_1.z.string().describe("Project ID"),
        ...teamParams
    }, async ({ projectId, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v1/projects/${projectId}/promote/aliases`);
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
            content: [{ type: "text", text: `Promotion aliases:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("pause_project", "Pause a project", {
        projectId: zod_1.z.string().describe("Project ID"),
        ...teamParams
    }, async ({ projectId, teamId, slug }) => {
        const url = new URL(`${index_js_1.BASE_URL}/v1/projects/${projectId}/pause`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Project paused:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("request_project_transfer", "Request project transfer", {
        idOrName: zod_1.z.string().describe("Project ID or name"),
        teamId: zod_1.z.string().describe("Team ID to transfer to"),
    }, async ({ idOrName, teamId }) => {
        const response = await fetch(`${index_js_1.BASE_URL}/projects/${idOrName}/transfer-request`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ teamId }),
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Transfer requested:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("accept_project_transfer", "Accept project transfer request", {
        code: zod_1.z.string().describe("Transfer request code"),
    }, async ({ code }) => {
        const response = await fetch(`${index_js_1.BASE_URL}/projects/transfer-request/${code}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${index_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, index_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Transfer accepted:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
}
//# sourceMappingURL=projects.js.map