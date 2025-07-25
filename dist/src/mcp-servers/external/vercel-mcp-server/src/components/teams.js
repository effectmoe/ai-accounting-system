"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTeamTools = registerTeamTools;
const zod_1 = require("zod");
const response_js_1 = require("../utils/response.js");
const constants_js_1 = require("../config/constants.js");
function registerTeamTools(server) {
    server.tool("create_team", "Create a new Team under your account", {
        slug: zod_1.z.string().max(48).describe("The desired slug for the Team"),
        name: zod_1.z.string().max(256).optional().describe("The desired name for the Team"),
        attribution: zod_1.z.object({
            sessionReferrer: zod_1.z.string().optional(),
            landingPage: zod_1.z.string().optional(),
            pageBeforeConversionPage: zod_1.z.string().optional(),
            utm: zod_1.z.object({
                utmSource: zod_1.z.string().optional(),
                utmMedium: zod_1.z.string().optional(),
                utmCampaign: zod_1.z.string().optional(),
                utmTerm: zod_1.z.string().optional()
            }).optional()
        }).optional().describe("Attribution information")
    }, async ({ slug, name, attribution }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/teams`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ slug, name, attribution }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Team created:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("delete_team", "Delete a team under your account", {
        teamId: zod_1.z.string().describe("The Team identifier"),
        newDefaultTeamId: zod_1.z.string().optional().describe("Id of the team to be set as the new default team"),
        reasons: zod_1.z.array(zod_1.z.object({
            slug: zod_1.z.string().describe("Reason identifier"),
            description: zod_1.z.string().describe("Detailed description")
        })).optional().describe("Reasons for team deletion")
    }, async ({ teamId, newDefaultTeamId, reasons }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/teams/${teamId}`);
        if (newDefaultTeamId)
            url.searchParams.append("newDefaultTeamId", newDefaultTeamId);
        const response = await fetch(url.toString(), {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            ...(reasons && { body: JSON.stringify({ reasons }) })
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Team deleted:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("get_team", "Get information for a specific team", {
        teamId: zod_1.z.string().describe("The Team identifier")
    }, async ({ teamId }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v2/teams/${teamId}`, {
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Team information:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("list_teams", "Get a list of all teams the authenticated user is a member of", {
        limit: zod_1.z.number().optional().describe("Maximum number of teams to return"),
        since: zod_1.z.number().optional().describe("Include teams created since timestamp"),
        until: zod_1.z.number().optional().describe("Include teams created until timestamp")
    }, async ({ limit, since, until }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v2/teams`);
        if (limit)
            url.searchParams.append("limit", limit.toString());
        if (since)
            url.searchParams.append("since", since.toString());
        if (until)
            url.searchParams.append("until", until.toString());
        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Teams:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("list_team_members", "Get a list of team members", {
        teamId: zod_1.z.string().describe("The Team identifier"),
        limit: zod_1.z.number().min(1).optional().describe("Maximum number of members to return"),
        since: zod_1.z.number().optional().describe("Include members added since timestamp"),
        until: zod_1.z.number().optional().describe("Include members added until timestamp"),
        search: zod_1.z.string().optional().describe("Search by name, username, or email"),
        role: zod_1.z.enum(["OWNER", "MEMBER", "DEVELOPER", "VIEWER", "BILLING", "CONTRIBUTOR"]).optional().describe("Filter by role"),
        excludeProject: zod_1.z.string().optional().describe("Exclude members from specific project"),
        eligibleMembersForProjectId: zod_1.z.string().optional().describe("Include members eligible for project")
    }, async ({ teamId, limit, since, until, search, role, excludeProject, eligibleMembersForProjectId }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v2/teams/${teamId}/members`);
        if (limit)
            url.searchParams.append("limit", limit.toString());
        if (since)
            url.searchParams.append("since", since.toString());
        if (until)
            url.searchParams.append("until", until.toString());
        if (search)
            url.searchParams.append("search", search);
        if (role)
            url.searchParams.append("role", role);
        if (excludeProject)
            url.searchParams.append("excludeProject", excludeProject);
        if (eligibleMembersForProjectId)
            url.searchParams.append("eligibleMembersForProjectId", eligibleMembersForProjectId);
        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Team members:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("invite_team_member", "Invite a user to join a team", {
        teamId: zod_1.z.string().describe("The Team identifier"),
        role: zod_1.z.enum(["OWNER", "MEMBER", "DEVELOPER", "SECURITY", "BILLING", "VIEWER", "CONTRIBUTOR"]).describe("The role to assign"),
        email: zod_1.z.string().email().optional().describe("The email address to invite"),
        uid: zod_1.z.string().optional().describe("The user ID to invite"),
        projects: zod_1.z.array(zod_1.z.object({
            projectId: zod_1.z.string(),
            role: zod_1.z.enum(["ADMIN", "MEMBER", "VIEWER"])
        })).optional().describe("Project-specific roles")
    }, async ({ teamId, role, email, uid, projects }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/teams/${teamId}/members`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ role, email, uid, projects }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Team member invited:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("remove_team_member", "Remove a member from a team", {
        teamId: zod_1.z.string().describe("The Team identifier"),
        uid: zod_1.z.string().describe("The user ID to remove"),
        newDefaultTeamId: zod_1.z.string().optional().describe("New default team ID for Northstar user")
    }, async ({ teamId, uid, newDefaultTeamId }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/teams/${teamId}/members/${uid}`);
        if (newDefaultTeamId)
            url.searchParams.append("newDefaultTeamId", newDefaultTeamId);
        const response = await fetch(url.toString(), {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Team member removed:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("update_team_member", "Update a team member's role or status", {
        teamId: zod_1.z.string().describe("The Team identifier"),
        uid: zod_1.z.string().describe("The user ID to update"),
        confirmed: zod_1.z.literal(true).optional().describe("Accept user's request to join"),
        role: zod_1.z.enum(["MEMBER", "VIEWER"]).optional().describe("New role for the member"),
        projects: zod_1.z.array(zod_1.z.object({
            projectId: zod_1.z.string(),
            role: zod_1.z.enum(["ADMIN", "MEMBER", "VIEWER"])
        })).optional().describe("Project-specific roles"),
        joinedFrom: zod_1.z.object({
            ssoUserId: zod_1.z.string().nullable()
        }).optional().describe("SSO connection information")
    }, async ({ teamId, uid, confirmed, role, projects, joinedFrom }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/teams/${teamId}/members/${uid}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ confirmed, role, projects, joinedFrom }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Team member updated:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("update_team", "Update team information", {
        teamId: zod_1.z.string().describe("The Team identifier"),
        name: zod_1.z.string().max(256).optional().describe("Team name"),
        slug: zod_1.z.string().optional().describe("New team slug"),
        description: zod_1.z.string().max(140).optional().describe("Team description"),
        avatar: zod_1.z.string().regex(/^[a-f0-9]+$/).optional().describe("Hash of uploaded image"),
        previewDeploymentSuffix: zod_1.z.string().nullable().optional().describe("Preview deployment suffix"),
        emailDomain: zod_1.z.union([zod_1.z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/), zod_1.z.null()]).optional().describe("Team email domain"),
        regenerateInviteCode: zod_1.z.boolean().optional().describe("Create new invite code"),
        saml: zod_1.z.object({
            enforced: zod_1.z.boolean(),
            roles: zod_1.z.record(zod_1.z.enum(["OWNER"]))
        }).optional().describe("SAML configuration"),
        enablePreviewFeedback: zod_1.z.enum(["on", "off", "default"]).optional().describe("Preview toolbar setting"),
        enableProductionFeedback: zod_1.z.enum(["on", "off", "default"]).optional().describe("Production toolbar setting"),
        sensitiveEnvironmentVariablePolicy: zod_1.z.enum(["on", "off", "default"]).optional().describe("Sensitive env var policy"),
        remoteCaching: zod_1.z.object({
            enabled: zod_1.z.boolean()
        }).optional().describe("Remote caching settings"),
        hideIpAddresses: zod_1.z.boolean().optional().describe("Hide IP addresses in monitoring"),
        hideIpAddressesInLogDrains: zod_1.z.boolean().optional().describe("Hide IP addresses in log drains")
    }, async ({ teamId, ...updateFields }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v2/teams/${teamId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(updateFields),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Team updated:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
}
//# sourceMappingURL=teams.js.map