import { NextRequest, NextResponse } from 'next/server';
import { FreeeImporter } from '@/lib/freee-import';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as 'partners' | 'accounts' | 'transactions';
    const companyId = formData.get('companyId') as string;
    const dryRun = formData.get('dryRun') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが選択されていません' },
        { status: 400 }
      );
    }

    // ファイルを一時ディレクトリに保存
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = join(tmpdir(), `import-${Date.now()}.csv`);
    
    await writeFile(tempPath, buffer);

    try {
      // インポート実行
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://clqpfmroqcnvyxdzadln.supabase.co';
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      
      const importer = new FreeeImporter(
        supabaseUrl,
        supabaseServiceRoleKey
      );

      const result = await importer.importFile(tempPath, {
        companyId,
        fileType,
        encoding: 'utf8', // アップロードされたファイルはUTF-8として扱う
        dryRun,
      });

      return NextResponse.json(result);
    } finally {
      // 一時ファイルを削除
      try {
        await unlink(tempPath);
      } catch (error) {
        console.error('Failed to delete temp file:', error);
      }
    }
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'インポートに失敗しました' },
      { status: 500 }
    );
  }
}