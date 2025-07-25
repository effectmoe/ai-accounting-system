"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMarketplaceTools = registerMarketplaceTools;
const zod_1 = require("zod");
const response_js_1 = require("../utils/response.js");
const constants_js_1 = require("../config/constants.js");
const SecretSchema = zod_1.z.object({
    name: zod_1.z.string(),
    value: zod_1.z.string(),
    prefix: zod_1.z.string().optional()
});
const PeriodSchema = zod_1.z.object({
    start: zod_1.z.string(),
    end: zod_1.z.string()
});
const BillingItemSchema = zod_1.z.object({
    billingPlanId: zod_1.z.string(),
    resourceId: zod_1.z.string(),
    start: zod_1.z.string(),
    end: zod_1.z.string(),
    name: zod_1.z.string(),
    details: zod_1.z.string().optional(),
    price: zod_1.z.string(),
    quantity: zod_1.z.number(),
    units: zod_1.z.string().optional(),
    total: zod_1.z.string()
});
const DiscountSchema = zod_1.z.object({
    billingPlanId: zod_1.z.string(),
    resourceId: zod_1.z.string(),
    start: zod_1.z.string(),
    end: zod_1.z.string(),
    name: zod_1.z.string(),
    details: zod_1.z.string().optional(),
    amount: zod_1.z.string()
});
const UsageSchema = zod_1.z.object({
    resourceId: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.enum(["total"]),
    units: zod_1.z.string(),
    dayValue: zod_1.z.number(),
    periodValue: zod_1.z.number(),
    planValue: zod_1.z.number()
});
const NotificationSchema = zod_1.z.object({
    level: zod_1.z.enum(["info", "warning", "error"]),
    title: zod_1.z.string(),
    message: zod_1.z.string(),
    href: zod_1.z.string().optional()
});
const BalanceSchema = zod_1.z.object({
    resourceId: zod_1.z.string(),
    credit: zod_1.z.string(),
    nameLabel: zod_1.z.string(),
    currencyValueInCents: zod_1.z.number()
});
function registerMarketplaceTools(server) {
    server.tool("create_marketplace_event", "Create a marketplace event", {
        integrationConfigurationId: zod_1.z.string().describe("Integration configuration ID"),
        event: zod_1.z.object({
            type: zod_1.z.enum(["resource.updated", "installation.updated"]),
            billingPlanId: zod_1.z.string().optional()
        }).describe("Event details")
    }, async ({ integrationConfigurationId, event }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/installations/${integrationConfigurationId}/events`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ event }),
        });
        await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: "Event created successfully" }],
        };
    });
    server.tool("get_marketplace_account", "Get marketplace account information", {
        integrationConfigurationId: zod_1.z.string().describe("Integration configuration ID")
    }, async ({ integrationConfigurationId }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/installations/${integrationConfigurationId}/account`, {
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Account information:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("get_marketplace_invoice", "Get marketplace invoice details", {
        integrationConfigurationId: zod_1.z.string().describe("Integration configuration ID"),
        invoiceId: zod_1.z.string().describe("Invoice ID")
    }, async ({ integrationConfigurationId, invoiceId }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/installations/${integrationConfigurationId}/billing/invoices/${invoiceId}`, {
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Invoice details:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("get_marketplace_member", "Get marketplace member information", {
        integrationConfigurationId: zod_1.z.string().describe("Integration configuration ID"),
        memberId: zod_1.z.string().describe("Member ID")
    }, async ({ integrationConfigurationId, memberId }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/installations/${integrationConfigurationId}/member/${memberId}`, {
            headers: {
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Member information:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("import_marketplace_resource", "Import a marketplace resource", {
        integrationConfigurationId: zod_1.z.string().describe("Integration configuration ID"),
        resourceId: zod_1.z.string().describe("Resource ID"),
        productId: zod_1.z.string().describe("Product ID"),
        name: zod_1.z.string().describe("Resource name"),
        status: zod_1.z.enum(["ready", "pending", "suspended", "resumed", "uninstalled", "error"]).describe("Resource status"),
        metadata: zod_1.z.record(zod_1.z.any()).optional().describe("Additional metadata"),
        billingPlan: zod_1.z.object({
            id: zod_1.z.string(),
            type: zod_1.z.enum(["prepayment"]),
            name: zod_1.z.string(),
            paymentMethodRequired: zod_1.z.boolean()
        }).optional(),
        notification: NotificationSchema.optional(),
        secrets: zod_1.z.array(SecretSchema).optional()
    }, async ({ integrationConfigurationId, resourceId, ...body }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/installations/${integrationConfigurationId}/resources/${resourceId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(body),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Resource imported:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("submit_marketplace_billing", "Submit marketplace billing data", {
        integrationConfigurationId: zod_1.z.string().describe("Integration configuration ID"),
        timestamp: zod_1.z.string().describe("Server timestamp"),
        eod: zod_1.z.string().describe("End of day timestamp"),
        period: PeriodSchema.describe("Billing period"),
        billing: zod_1.z.array(BillingItemSchema).describe("Billing items"),
        usage: zod_1.z.array(UsageSchema).describe("Usage data")
    }, async ({ integrationConfigurationId, ...body }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/installations/${integrationConfigurationId}/billing`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(body),
        });
        await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: "Billing data submitted successfully" }],
        };
    });
    server.tool("submit_marketplace_invoice", "Submit a marketplace invoice", {
        integrationConfigurationId: zod_1.z.string().describe("Integration configuration ID"),
        externalId: zod_1.z.string().optional().describe("External invoice ID"),
        invoiceDate: zod_1.z.string().describe("Invoice date"),
        memo: zod_1.z.string().optional().describe("Invoice memo"),
        period: PeriodSchema.describe("Invoice period"),
        items: zod_1.z.array(BillingItemSchema).describe("Invoice items"),
        discounts: zod_1.z.array(DiscountSchema).optional().describe("Discount items"),
        test: zod_1.z.object({
            validate: zod_1.z.boolean().optional(),
            result: zod_1.z.enum(["paid"]).optional()
        }).optional()
    }, async ({ integrationConfigurationId, ...body }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/installations/${integrationConfigurationId}/billing/invoices`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(body),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Invoice submitted:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("update_marketplace_secrets", "Update marketplace resource secrets", {
        integrationConfigurationId: zod_1.z.string().describe("Integration configuration ID"),
        resourceId: zod_1.z.string().describe("Resource ID"),
        secrets: zod_1.z.array(SecretSchema).describe("Resource secrets")
    }, async ({ integrationConfigurationId, resourceId, secrets }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/installations/${integrationConfigurationId}/resources/${resourceId}/secrets`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ secrets }),
        });
        await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: "Resource secrets updated successfully" }],
        };
    });
    server.tool("marketplace_sso_token_exchange", "Exchange OAuth code for OIDC token", {
        code: zod_1.z.string().describe("OAuth code"),
        clientId: zod_1.z.string().describe("Client ID"),
        clientSecret: zod_1.z.string().describe("Client secret"),
        state: zod_1.z.string().optional().describe("OAuth state"),
        redirectUri: zod_1.z.string().optional().describe("Redirect URI")
    }, async (body) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/integrations/sso/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(body),
        });
        const data = await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: `Token exchange completed:\n${JSON.stringify(data, null, 2)}` }],
        };
    });
    server.tool("submit_marketplace_balance", "Submit prepayment balances", {
        integrationConfigurationId: zod_1.z.string().describe("Integration configuration ID"),
        timestamp: zod_1.z.string().describe("Server timestamp"),
        balances: zod_1.z.array(BalanceSchema).describe("Balance data")
    }, async ({ integrationConfigurationId, ...body }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/installations/${integrationConfigurationId}/billing/balance`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(body),
        });
        await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: "Balance data submitted successfully" }],
        };
    });
    server.tool("marketplace_invoice_action", "Perform invoice actions like refund", {
        integrationConfigurationId: zod_1.z.string().describe("Integration configuration ID"),
        invoiceId: zod_1.z.string().describe("Invoice ID"),
        action: zod_1.z.literal("refund").describe("Action type"),
        reason: zod_1.z.string().describe("Refund reason"),
        total: zod_1.z.string().regex(/^[0-9]+(\.[0-9]+)?$/).describe("Refund amount")
    }, async ({ integrationConfigurationId, invoiceId, ...body }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/installations/${integrationConfigurationId}/billing/invoices/${invoiceId}/actions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(body),
        });
        await (0, response_js_1.handleResponse)(response);
        return {
            content: [{ type: "text", text: "Invoice action completed successfully" }],
        };
    });
}
//# sourceMappingURL=marketplace.js.map