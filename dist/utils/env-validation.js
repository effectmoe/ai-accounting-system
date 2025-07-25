"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diagnosticsRoute = void 0;
exports.validateEnvironment = validateEnvironment;
exports.testApiConnections = testApiConnections;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    OPENAI_API_KEY: zod_1.z.string().min(1).optional(),
    ANTHROPIC_API_KEY: zod_1.z.string().min(1).optional(),
    NODE_ENV: zod_1.z.enum(["development", "staging", "production"]).optional(),
    PORT: zod_1.z.string().optional(),
}).refine(data => data.OPENAI_API_KEY || data.ANTHROPIC_API_KEY, {
    message: "At least one LLM API key (OPENAI_API_KEY or ANTHROPIC_API_KEY) is required"
});
function validateEnvironment() {
    try {
        const env = envSchema.parse(process.env);
        console.log("✅ Environment variables validated successfully");
        return env;
    }
    catch (error) {
        console.error("❌ Environment validation failed:", error.errors || error.message);
        throw new Error("Required environment variables are not set");
    }
}
async function testApiConnections() {
    const results = {
        openai: false,
        anthropic: false,
        errors: []
    };
    // Test OpenAI connection if key exists
    if (process.env.OPENAI_API_KEY) {
        try {
            const response = await fetch("https://api.openai.com/v1/models", {
                headers: {
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
            });
            if (response.ok) {
                results.openai = true;
                console.log("✅ OpenAI API connection successful");
            }
            else {
                results.errors.push(`OpenAI API: ${response.status} ${response.statusText}`);
            }
        }
        catch (error) {
            results.errors.push(`OpenAI API connection error: ${error.message}`);
        }
    }
    // Test Anthropic connection if key exists
    if (process.env.ANTHROPIC_API_KEY) {
        try {
            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "x-api-key": process.env.ANTHROPIC_API_KEY,
                    "content-type": "application/json",
                    "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                    model: "claude-3-haiku-20240307",
                    max_tokens: 10,
                    messages: [{ role: "user", content: "test" }],
                }),
            });
            if (response.ok || response.status === 400) {
                results.anthropic = true;
                console.log("✅ Anthropic API connection successful");
            }
            else {
                results.errors.push(`Anthropic API: ${response.status} ${response.statusText}`);
            }
        }
        catch (error) {
            results.errors.push(`Anthropic API connection error: ${error.message}`);
        }
    }
    return results;
}
// Add a diagnostics endpoint for development environments
const diagnosticsRoute = (registerApiRoute) => registerApiRoute("/diagnostics/env", {
    method: "GET",
    handler: async (c) => {
        // Only allow in non-production environments
        if (process.env.NODE_ENV === "production") {
            return c.json({ error: "Diagnostics endpoint is disabled in production" }, 403);
        }
        try {
            const env = validateEnvironment();
            const apiTests = await testApiConnections();
            return c.json({
                status: "success",
                environment: {
                    NODE_ENV: env.NODE_ENV,
                    hasOpenAIKey: !!env.OPENAI_API_KEY,
                    hasAnthropicKey: !!env.ANTHROPIC_API_KEY,
                },
                apiConnections: apiTests,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            return c.json({
                status: "error",
                error: error.message,
                timestamp: new Date().toISOString(),
            }, 500);
        }
    },
});
exports.diagnosticsRoute = diagnosticsRoute;
