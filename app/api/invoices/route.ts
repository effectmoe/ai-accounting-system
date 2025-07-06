import { NextResponse } from 'next/server';

export async function GET() {
  // 空のレスポンスを返す
  return NextResponse.json({ invoices: [] });
}