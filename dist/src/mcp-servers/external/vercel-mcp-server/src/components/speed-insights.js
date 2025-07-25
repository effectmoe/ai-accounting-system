"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSpeedInsightsTools = registerSpeedInsightsTools;
const zod_1 = require("zod");
const response_js_1 = require("../utils/response.js");
const constants_js_1 = require("../config/constants.js");
const VitalsSchema = zod_1.z.object({
    dsn: zod_1.z.string().describe("Project's unique identifier (VERCEL_ANALYTICS_ID)"),
    event_name: zod_1.z.string().describe("Name of the vital to track"),
    href: zod_1.z.string().describe("Full URL for the deployed application"),
    id: zod_1.z.string().describe("Unique identifier for the vital"),
    page: zod_1.z.string().describe("Framework's file name path"),
    speed: zod_1.z.string().describe("Connection information from visitor device"),
    value: zod_1.z.string().describe("Value of the vital to track")
});
function registerSpeedInsightsTools(server) {
    server.tool("send_web_vitals", "Send web vitals data to Speed Insights API (Deprecated: Use @vercel/speed-insights package instead)", {
        vitals: VitalsSchema.describe("Web vitals data")
    }, async ({ vitals }) => {
        const response = await fetch(`${constants_js_1.BASE_URL}/v1/vitals`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${constants_js_1.DEFAULT_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(vitals),
        });
        await (0, response_js_1.handleResponse)(response);
        return {
            content: [
                { type: "text", text: "Web vitals data sent successfully" },
                { type: "text", text: "⚠️ Warning: This API is deprecated. Please use @vercel/speed-insights package instead." }
            ],
        };
    });
}
//# sourceMappingURL=speed-insights.js.map