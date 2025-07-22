import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';
import { Project } from '@/types/tenant-collections';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // TODO: 認証処理を実装
    // const { user } = await auth(request);
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const tenantId = searchParams.get('tenantId') || 'default';

    const filter: any = { tenantId };
    if (status) filter.status = status;

    const projects = await db.findMany('projects', filter, {
      limit,
      sort: { updatedAt: -1 }
    });

    return NextResponse.json({ projects });
  } catch (error) {
    logger.error('Projects API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: 認証処理を実装
    // const { user } = await auth(request);
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json();
    const { name, clientName, contractAmount, startDate, endDate, tenantId = 'default' } = body;

    // プロジェクトコード自動生成
    const projectCount = await db.count('projects', { tenantId });
    const projectCode = `P${String(projectCount + 1).padStart(4, '0')}`;

    const project: Partial<Project> = {
      tenantId,
      tenantType: 'individual_contractor',
      projectCode,
      name,
      client: {
        name: clientName,
        contact: '',
        address: ''
      },
      contract: {
        amount: contractAmount,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        retentionRate: 10
      },
      costs: {
        materials: 0,
        labor: 0,
        subcontract: 0,
        other: 0
      },
      status: 'estimate',
      progressPercentage: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const savedProject = await db.create('projects', project);

    return NextResponse.json({ project: savedProject });
  } catch (error) {
    logger.error('Create project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}