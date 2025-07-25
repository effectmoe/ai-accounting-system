"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDnsTools = registerDnsTools;
const zod_1 = require("zod");
const response_js_1 = require("../utils/response.js");
const constants_js_1 = require("../config/constants.js");
function registerDnsTools(server) {
    server.tool("create_dns_record", "Creates a DNS record for a domain", {
        domain: zod_1.z.string().describe("The domain used to create the DNS record"),
        type: zod_1.z.enum(["A", "AAAA", "ALIAS", "CAA", "CNAME"]).describe("The type of record"),
        name: zod_1.z.string().describe("The name of the DNS record"),
        value: zod_1.z.string().describe("The value of the DNS record"),
        ttl: zod_1.z.number().min(60).max(2147483647).optional().describe("The Time to live (TTL) value"),
        comment: zod_1.z.string().max(500).optional().describe("A comment to add context"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ domain, type, name, value, ttl, comment, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v2/domains/${domain}/records`);
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
            body: JSON.stringify({ type, name, value, ttl, comment }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `DNS record created:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("delete_dns_record", "Removes an existing DNS record from a domain name", {
        domain: zod_1.z.string().describe("The domain name"),
        recordId: zod_1.z.string().describe("The DNS record ID"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ domain, recordId, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v2/domains/${domain}/records/${recordId}`);
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
            content: [{ type: "text", text: `DNS record deleted:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("list_dns_records", "Retrieves a list of DNS records created for a domain name", {
        domain: zod_1.z.string().describe("The domain name"),
        limit: zod_1.z.string().optional().describe("Maximum number of records to list"),
        since: zod_1.z.string().optional().describe("Get records created after this JavaScript timestamp"),
        until: zod_1.z.string().optional().describe("Get records created before this JavaScript timestamp"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ domain, limit, since, until, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v4/domains/${domain}/records`);
        if (limit)
            url.searchParams.append("limit", limit);
        if (since)
            url.searchParams.append("since", since);
        if (until)
            url.searchParams.append("until", until);
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
            content: [{ type: "text", text: `DNS records:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("update_dns_record", "Updates an existing DNS record for a domain name", {
        recordId: zod_1.z.string().describe("The id of the DNS record"),
        name: zod_1.z.string().nullable().optional().describe("The name of the DNS record"),
        value: zod_1.z.string().nullable().optional().describe("The value of the DNS record"),
        type: zod_1.z.enum(["A", "AAAA", "ALIAS", "CAA", "CNAME"]).nullable().optional().describe("The type of the DNS record"),
        ttl: zod_1.z.number().min(60).max(2147483647).nullable().optional().describe("The Time to live (TTL) value"),
        mxPriority: zod_1.z.number().nullable().optional().describe("The MX priority value"),
        comment: zod_1.z.string().max(500).optional().describe("A comment to add context"),
        teamId: zod_1.z.string().optional().describe("The Team identifier to perform the request on behalf of"),
        slug: zod_1.z.string().optional().describe("The Team slug to perform the request on behalf of")
    }, async ({ recordId, name, value, type, ttl, mxPriority, comment, teamId, slug }) => {
        const url = new URL(`${constants_js_1.BASE_URL}/v1/domains/records/${recordId}`);
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
                name,
                value,
                type,
                ttl,
                mxPriority,
                comment,
            }),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `DNS record updated:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
}
//# sourceMappingURL=dns.js.map