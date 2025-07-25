"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSecurityTools = registerSecurityTools;
const zod_1 = require("zod");
const response_js_1 = require("../utils/response.js");
const constants_js_1 = require("../config/constants.js");
const teamParams = {
    teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
    slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
};
function registerSecurityTools(server) {
    server.tool("create_firewall_bypass", "Create new system bypass rules", {
        projectId: zod_1.z.string().describe("Project ID"),
        ...teamParams,
        domain: zod_1.z.string().max(2544).regex(/([a-z]+[a-z.]+)$/).optional().describe("Domain"),
        projectScope: zod_1.z.boolean().optional().describe("If the specified bypass will apply to all domains for a project"),
        sourceIp: zod_1.z.string().optional().describe("Source IP"),
        allSources: zod_1.z.boolean().optional().describe("All sources"),
        ttl: zod_1.z.number().optional().describe("Time to live in milliseconds"),
        note: zod_1.z.string().max(500).optional().describe("Note")
    }, async ({ projectId, teamId, slug, ...bypassData }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/security/firewall/bypass`);
        url.searchParams.append("projectId", projectId);
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
            body: JSON.stringify(bypassData),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Bypass rule created:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("delete_firewall_bypass", "Remove system bypass rules", {
        projectId: zod_1.z.string().describe("Project ID"),
        ...teamParams,
        domain: zod_1.z.string().max(2544).regex(/([a-z]+[a-z.]+)$/).optional().describe("Domain"),
        projectScope: zod_1.z.boolean().optional().describe("Project scope"),
        sourceIp: zod_1.z.string().optional().describe("Source IP"),
        allSources: zod_1.z.boolean().optional().describe("All sources"),
        note: zod_1.z.string().max(500).optional().describe("Note")
    }, async ({ projectId, teamId, slug, ...bypassData }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/security/firewall/bypass`);
        url.searchParams.append("projectId", projectId);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(bypassData),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Bypass rule deleted:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("get_firewall_bypass", "Retrieve the system bypass rules", {
        projectId: zod_1.z.string().describe("Project ID"),
        limit: zod_1.z.number().max(128).optional().describe("Maximum number of rules to return"),
        sourceIp: zod_1.z.string().max(49).optional().describe("Filter by source IP"),
        domain: zod_1.z.string().max(2544).regex(/([a-z]+[a-z.]+)$/).optional().describe("Filter by domain"),
        projectScope: zod_1.z.boolean().optional().describe("Filter by project scoped rules"),
        offset: zod_1.z.string().max(2560).optional().describe("Used for pagination"),
        ...teamParams
    }, async ({ projectId, teamId, slug, ...queryParams }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/security/firewall/bypass`);
        url.searchParams.append("projectId", projectId);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        Object.entries(queryParams).forEach(([key, value]) => {
            if (value !== undefined)
                url.searchParams.append(key, value.toString());
        });
        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Bypass rules:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("get_attack_status", "Retrieve active attack data within the last 24h window", {
        projectId: zod_1.z.string().describe("Project ID"),
        ...teamParams
    }, async ({ projectId, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/security/firewall/attack-status`);
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
                { type: "text", text: `Attack status:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("update_attack_mode", "Update the Attack Challenge mode settings", {
        projectId: zod_1.z.string().describe("Project ID"),
        attackModeEnabled: zod_1.z.boolean().describe("Enable/disable attack mode"),
        attackModeActiveUntil: zod_1.z.number().nullable().optional().describe("Timestamp until attack mode is active"),
        ...teamParams
    }, async ({ projectId, attackModeEnabled, attackModeActiveUntil, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/security/attack-mode`);
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
            body: JSON.stringify({
                projectId,
                attackModeEnabled,
                attackModeActiveUntil
            }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Attack mode updated:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("get_firewall_config", "Retrieve the firewall configuration", {
        projectId: zod_1.z.string().describe("Project ID"),
        configVersion: zod_1.z.string().optional().describe("Configuration version"),
        ...teamParams
    }, async ({ projectId, configVersion, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/security/firewall/config${configVersion ? `/${configVersion}` : ''}`);
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
                { type: "text", text: `Firewall configuration:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("update_firewall_config", "Update the firewall configuration", {
        projectId: zod_1.z.string().describe("Project ID"),
        ...teamParams,
        action: zod_1.z.string().describe("Action to perform"),
        id: zod_1.z.string().nullable().optional().describe("Rule ID"),
        value: zod_1.z.any().describe("Value for the action")
    }, async ({ projectId, teamId, slug, ...updateData }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/security/firewall/config`);
        url.searchParams.append("projectId", projectId);
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
            body: JSON.stringify(updateData),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Firewall configuration updated:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
    server.tool("put_firewall_config", "Set the complete firewall configuration", {
        projectId: zod_1.z.string().describe("Project ID"),
        ...teamParams,
        firewallEnabled: zod_1.z.boolean().describe("Enable/disable firewall"),
        managedRules: zod_1.z.object({
            owasp: zod_1.z.object({
                active: zod_1.z.boolean()
            }).optional()
        }).optional().describe("Managed rules configuration"),
        crs: zod_1.z.object({
            sd: zod_1.z.object({ active: zod_1.z.boolean(), action: zod_1.z.enum(["deny"]) }).optional(),
            ma: zod_1.z.object({ active: zod_1.z.boolean(), action: zod_1.z.enum(["deny"]) }).optional(),
            lfi: zod_1.z.object({ active: zod_1.z.boolean(), action: zod_1.z.enum(["deny"]) }).optional(),
            rfi: zod_1.z.object({ active: zod_1.z.boolean(), action: zod_1.z.enum(["deny"]) }).optional(),
            rce: zod_1.z.object({ active: zod_1.z.boolean(), action: zod_1.z.enum(["deny"]) }).optional(),
            php: zod_1.z.object({ active: zod_1.z.boolean(), action: zod_1.z.enum(["deny"]) }).optional(),
            gen: zod_1.z.object({ active: zod_1.z.boolean(), action: zod_1.z.enum(["deny"]) }).optional(),
            xss: zod_1.z.object({ active: zod_1.z.boolean(), action: zod_1.z.enum(["deny"]) }).optional(),
            sqli: zod_1.z.object({ active: zod_1.z.boolean(), action: zod_1.z.enum(["deny"]) }).optional(),
            sf: zod_1.z.object({ active: zod_1.z.boolean(), action: zod_1.z.enum(["deny"]) }).optional(),
            java: zod_1.z.object({ active: zod_1.z.boolean(), action: zod_1.z.enum(["deny"]) }).optional()
        }).optional().describe("Custom rule set configuration"),
        rules: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            name: zod_1.z.string(),
            description: zod_1.z.string(),
            active: zod_1.z.boolean(),
            conditionGroup: zod_1.z.array(zod_1.z.object({
                conditions: zod_1.z.array(zod_1.z.object({
                    type: zod_1.z.string(),
                    op: zod_1.z.string(),
                    neg: zod_1.z.boolean(),
                    key: zod_1.z.string(),
                    value: zod_1.z.string()
                }))
            })),
            action: zod_1.z.object({
                mitigate: zod_1.z.object({
                    action: zod_1.z.enum(["log", "deny"]),
                    rateLimit: zod_1.z.object({
                        algo: zod_1.z.enum(["fixed_window"]),
                        window: zod_1.z.number(),
                        limit: zod_1.z.number(),
                        keys: zod_1.z.array(zod_1.z.string()),
                        action: zod_1.z.enum(["log", "deny"])
                    }).optional(),
                    redirect: zod_1.z.object({
                        location: zod_1.z.string(),
                        permanent: zod_1.z.boolean()
                    }).optional(),
                    actionDuration: zod_1.z.any().nullable(),
                    bypassSystem: zod_1.z.any().nullable()
                })
            })
        })).optional().describe("Custom rules"),
        ips: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            hostname: zod_1.z.string(),
            ip: zod_1.z.string(),
            notes: zod_1.z.string(),
            action: zod_1.z.enum(["deny"])
        })).optional().describe("IP rules")
    }, async ({ projectId, teamId, slug, ...config }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/security/firewall/config`);
        url.searchParams.append("projectId", projectId);
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
            body: JSON.stringify(config),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: `Firewall configuration set:\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    });
}
//# sourceMappingURL=security.js.map