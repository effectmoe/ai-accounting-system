import { NextResponse } from 'next/server';

export async function GET() {
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

  return NextResponse.json(deploymentInfo);
}