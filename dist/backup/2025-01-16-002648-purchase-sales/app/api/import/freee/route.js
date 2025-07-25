"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const freee_import_1 = require("@/lib/freee-import");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const os_1 = require("os");
async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const fileType = formData.get('fileType');
        const companyId = formData.get('companyId');
        const dryRun = formData.get('dryRun') === 'true';
        if (!file) {
            return server_1.NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 });
        }
        // ファイルを一時ディレクトリに保存
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const tempPath = (0, path_1.join)((0, os_1.tmpdir)(), `import-${Date.now()}.csv`);
        await (0, promises_1.writeFile)(tempPath, buffer);
        try {
            // インポート実行
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://clqpfmroqcnvyxdzadln.supabase.co';
            const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
            const importer = new freee_import_1.FreeeImporter(supabaseUrl, supabaseServiceRoleKey);
            const result = await importer.importFile(tempPath, {
                companyId,
                fileType,
                encoding: 'utf8', // アップロードされたファイルはUTF-8として扱う
                dryRun,
            });
            return server_1.NextResponse.json(result);
        }
        finally {
            // 一時ファイルを削除
            try {
                await (0, promises_1.unlink)(tempPath);
            }
            catch (error) {
                console.error('Failed to delete temp file:', error);
            }
        }
    }
    catch (error) {
        console.error('Import error:', error);
        return server_1.NextResponse.json({ error: error instanceof Error ? error.message : 'インポートに失敗しました' }, { status: 500 });
    }
}
