import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * ScanSnap Homeを最前面に表示するAPIエンドポイント
 *
 * スキャン前に呼び出すことで、許可ダイアログがブラウザの後ろに
 * 隠れる問題を解決します。
 *
 * 注意: このAPIはmacOSでのみ動作します（osascriptを使用）
 */
export async function POST() {
  // Vercel等のクラウド環境では実行しない
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      success: true,
      message: 'Skipped in production environment',
      skipped: true,
    });
  }

  try {
    // AppleScriptを実行してScanSnap Homeを最前面に
    const appleScript = `
      tell application "System Events"
        set scanSnapProcesses to every process whose name contains "ScanSnap"
        repeat with proc in scanSnapProcesses
          set frontmost of proc to true
        end repeat
      end tell

      tell application "ScanSnap Home"
        activate
      end tell
    `;

    await execAsync(`osascript -e '${appleScript}'`);

    return NextResponse.json({
      success: true,
      message: 'ScanSnap Home brought to front',
    });
  } catch (error) {
    console.error('[ScanSnap BringToFront] Error:', error);

    // エラーでも処理を継続（スキャンは止めない）
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to bring ScanSnap to front',
      // エラーでもスキャンは続行可能
      continueAnyway: true,
    });
  }
}
