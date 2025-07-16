import { NextResponse } from 'next/server';

export async function GET() {
  const mongodbUri = process.env.MONGODB_URI;
  const gasWebhookUrl = process.env.GAS_WEBHOOK_URL;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: {
      type: 'mongodb',
      configured: !!mongodbUri,
      hasUri: !!mongodbUri,
      uriPrefix: mongodbUri ? mongodbUri.substring(0, 30) + '...' : 'not set'
    },
    integrations: {
      azure: !!process.env.AZURE_FORM_RECOGNIZER_ENDPOINT,
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      mastra: !!process.env.MASTRA_API_SECRET
    },
    gas: {
      hasWebhookUrl: !!gasWebhookUrl,
      webhookUrlPrefix: gasWebhookUrl ? gasWebhookUrl.substring(0, 50) + '...' : 'not set'
    }
  });
}