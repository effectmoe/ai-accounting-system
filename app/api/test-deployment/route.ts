import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Deployment test endpoint',
    timestamp: new Date().toISOString(),
    version: '1.0.3',
    features: {
      considerButton: true,
      tooltipBackground: 'yellow (rgba(254, 240, 138, 0.5))',
      signatureDuplicationFixed: true,
      approvalButtonStateFixed: true
    },
    lastUpdated: '2025-08-11 12:37'
  });
}// Force rebuild: #午後
