"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
async function GET() {
    const deploymentInfo = {
        version: '1.0.1', // Increment this with each deployment
        deployedAt: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        features: {
            supplierFields: {
                address1: true,
                address2: true,
                postalCode: true,
                fax: true,
                website: true,
                phoneWithoutPrefix: true
            }
        },
        buildTime: process.env.VERCEL_GIT_COMMIT_SHA || 'local-development',
        gitCommit: process.env.VERCEL_GIT_COMMIT_MESSAGE || 'local-development'
    };
    return server_1.NextResponse.json(deploymentInfo);
}
