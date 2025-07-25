"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDomainTools = registerDomainTools;
const zod_1 = require("zod");
const response_js_1 = require("../utils/response.js");
const constants_js_1 = require("../config/constants.js");
function registerDomainTools(server) {
    server.tool("domain_check", "Check if a domain name is available for purchase", {
        name: zod_1.z.string().describe("The name of the domain to check"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ name, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v4/domains/status`);
        url.searchParams.append("name", name);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Domain availability:\n${JSON.stringify(data, null, 2)}` }]
        };
    });
    server.tool("domain_price", "Check the price to purchase a domain", {
        name: zod_1.z.string().describe("The name of the domain to check price for"),
        type: zod_1.z.enum(["new", "renewal", "transfer", "redemption"]).optional().describe("Domain status type to check price for"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ name, type, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v4/domains/price`);
        url.searchParams.append("name", name);
        if (type)
            url.searchParams.append("type", type);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Domain price:\n${JSON.stringify(data, null, 2)}` }]
        };
    });
    server.tool("domain_config", "Get a Domain's configuration", {
        domain: zod_1.z.string().describe("The name of the domain"),
        strict: zod_1.z.boolean().optional().describe("When true, only include nameservers assigned directly to the domain"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ domain, strict, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v6/domains/${domain}/config`);
        if (strict !== undefined)
            url.searchParams.append("strict", String(strict));
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Domain configuration:\n${JSON.stringify(data, null, 2)}` }]
        };
    });
    server.tool("domain_registry", "Get domain transfer info", {
        domain: zod_1.z.string().describe("The domain name"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ domain, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/domains/${domain}/registry`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Domain registry info:\n${JSON.stringify(data, null, 2)}` }]
        };
    });
    server.tool("domain_get", "Get information for a single domain", {
        domain: zod_1.z.string().describe("The name of the domain"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ domain, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v5/domains/${domain}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Domain information:\n${JSON.stringify(data, null, 2)}` }]
        };
    });
    server.tool("domain_list", "List all domains", {
        limit: zod_1.z.number().optional().describe("Maximum number of domains to list"),
        since: zod_1.z.number().optional().describe("Get domains created after this timestamp"),
        until: zod_1.z.number().optional().describe("Get domains created before this timestamp"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ limit, since, until, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v5/domains`);
        if (limit)
            url.searchParams.append("limit", String(limit));
        if (since)
            url.searchParams.append("since", String(since));
        if (until)
            url.searchParams.append("until", String(until));
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Domains list:\n${JSON.stringify(data, null, 2)}` }]
        };
    });
    server.tool("domain_buy", "Purchase a domain", {
        name: zod_1.z.string().describe("The domain name to purchase"),
        expectedPrice: zod_1.z.number().optional().describe("The expected price for the purchase"),
        renew: zod_1.z.boolean().optional().describe("Whether to auto-renew the domain"),
        country: zod_1.z.string().describe("The country of the domain registrant"),
        orgName: zod_1.z.string().optional().describe("The company name of the domain registrant"),
        firstName: zod_1.z.string().describe("The first name of the domain registrant"),
        lastName: zod_1.z.string().describe("The last name of the domain registrant"),
        address1: zod_1.z.string().describe("The street address of the domain registrant"),
        city: zod_1.z.string().describe("The city of the domain registrant"),
        state: zod_1.z.string().describe("The state of the domain registrant"),
        postalCode: zod_1.z.string().describe("The postal code of the domain registrant"),
        phone: zod_1.z.string().describe("The phone number of the domain registrant"),
        email: zod_1.z.string().email().describe("The email of the domain registrant"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ name, expectedPrice, renew, country, orgName, firstName, lastName, address1, city, state, postalCode, phone, email, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v5/domains/buy`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                name,
                expectedPrice,
                renew,
                country,
                orgName,
                firstName,
                lastName,
                address1,
                city,
                state,
                postalCode,
                phone,
                email
            })
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Domain purchase result:\n${JSON.stringify(data, null, 2)}` }]
        };
    });
    server.tool("domain_register", "Register or transfer-in a domain", {
        method: zod_1.z.enum(["add", "transfer-in"]).describe("The domain operation to perform"),
        name: zod_1.z.string().describe("The domain name"),
        cdnEnabled: zod_1.z.boolean().optional().describe("Whether to enable CDN"),
        zone: zod_1.z.boolean().optional().describe("Whether to create a zone"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ method, name, cdnEnabled, zone, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v5/domains`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                method,
                name,
                cdnEnabled,
                zone
            })
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Domain registration result:\n${JSON.stringify(data, null, 2)}` }]
        };
    });
    server.tool("domain_remove", "Remove a domain", {
        domain: zod_1.z.string().describe("The name of the domain to remove"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ domain, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v6/domains/${domain}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            method: "DELETE",
            headers: { Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}` }
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Domain removal result:\n${JSON.stringify(data, null, 2)}` }]
        };
    });
    server.tool("domain_update", "Update or move apex domain", {
        domain: zod_1.z.string().describe("The domain name"),
        op: zod_1.z.enum(["update", "move-out"]).describe("Operation type"),
        renew: zod_1.z.boolean().optional().describe("Whether to auto-renew"),
        customNameservers: zod_1.z.array(zod_1.z.string()).optional().describe("Custom nameservers"),
        zone: zod_1.z.boolean().optional().describe("Whether to create a zone"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ domain, op, renew, customNameservers, zone, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v3/domains/${domain}`);
        if (teamId)
            url.searchParams.append("teamId", teamId);
        if (slug)
            url.searchParams.append("slug", slug);
        const response = await fetch(url.toString(), {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                op,
                renew,
                customNameservers,
                zone
            })
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Domain update result:\n${JSON.stringify(data, null, 2)}` }]
        };
    });
}
//# sourceMappingURL=domains.js.map