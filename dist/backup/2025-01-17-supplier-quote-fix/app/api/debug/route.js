"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
async function GET() {
    const config = {
        mongodbConfigured: !!process.env.MONGODB_URI,
        azureConfigured: !!(process.env.AZURE_FORM_RECOGNIZER_ENDPOINT && process.env.AZURE_FORM_RECOGNIZER_KEY),
        openaiConfigured: !!process.env.OPENAI_API_KEY,
        anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
        mastraConfigured: !!process.env.MASTRA_API_SECRET,
        nodeEnv: process.env.NODE_ENV,
    };
    return server_1.NextResponse.json(config);
}
