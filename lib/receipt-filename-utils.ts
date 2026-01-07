/**
 * 領収書ファイル名生成ユーティリティ
 * フォーマット: 日付_金額_店舗名.webp
 */

/**
 * ファイル名に使用できない文字をサニタイズ
 */
function sanitizeFilename(str: string): string {
  return str
    .replace(/[<>:"\/\\|?*\x00-\x1F]/g, '_') // Windows禁止文字を_に変換
    .replace(/[\s\u3000]+/g, '_') // スペース（全角含む）を_に変換
    .replace(/_{2,}/g, '_') // 連続するアンダースコアを1つに
    .replace(/^_+|_+$/g, ''); // 先頭・末尾のアンダースコアを削除
}

/**
 * 日付をYYYY-MM-DD形式に変換
 */
function formatDateForFilename(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    // 無効な日付の場合は現在日付を使用
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * 領収書ファイル名を生成
 * @param issueDate - 発行日
 * @param totalAmount - 合計金額
 * @param issuerName - 発行者名（店舗名）
 * @returns ファイル名（例: 2025-01-07_5000_スターバックス.webp）
 */
export function generateReceiptFileName(
  issueDate: Date | string,
  totalAmount: number,
  issuerName: string
): string {
  // 日付部分
  const datePart = formatDateForFilename(issueDate);

  // 金額部分（カンマなし）
  const amountPart = Math.floor(totalAmount).toString();

  // 店舗名部分（サニタイズ、最大30文字）
  const sanitizedIssuerName = sanitizeFilename(issuerName);
  const issuerNamePart = sanitizedIssuerName.slice(0, 30);

  // ファイル名組み立て
  return `${datePart}_${amountPart}_${issuerNamePart}.webp`;
}

/**
 * 領収書ファイル名の生成（PDFの場合）
 */
export function generateReceiptFileNamePdf(
  issueDate: Date | string,
  totalAmount: number,
  issuerName: string
): string {
  // 同じロジックで拡張子だけ変更
  const webpName = generateReceiptFileName(issueDate, totalAmount, issuerName);
  return webpName.replace(/\.webp$/, '.pdf');
}

/**
 * サンプル使用例
 */
export const exampleUsage = () => {
  const filename = generateReceiptFileName(
    new Date('2025-01-07'),
    5000,
    'スターバックス コーヒー 渋谷店'
  );
  console.log(filename); // => 2025-01-07_5000_スターバックス_コーヒー_渋谷店.webp
};
