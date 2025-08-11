/**
 * 備考欄から重複する敬具や署名を削除するユーティリティ
 */
export function cleanDuplicateSignatures(text: string | undefined | null): string {
  if (!text) return '';
  
  // 改行で分割して各行を処理
  const lines = text.split('\n');
  const uniqueLines: string[] = [];
  const seenSignatures = new Set<string>();
  
  // 署名パターン（敬具、respectfully、sincerely等）
  const signaturePatterns = [
    /^敬具\s*$/,
    /^草々\s*$/,
    /^謹白\s*$/,
    /^以上\s*$/,
    /^respectfully\s*$/i,
    /^sincerely\s*$/i,
    /^best regards\s*$/i,
    /^regards\s*$/i,
  ];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 空行はそのまま保持
    if (trimmedLine === '') {
      uniqueLines.push(line);
      continue;
    }
    
    // 署名パターンにマッチする場合
    let isSignature = false;
    for (const pattern of signaturePatterns) {
      if (pattern.test(trimmedLine)) {
        isSignature = true;
        // 同じ署名が既に存在する場合はスキップ
        if (seenSignatures.has(trimmedLine.toLowerCase())) {
          continue;
        }
        seenSignatures.add(trimmedLine.toLowerCase());
        break;
      }
    }
    
    // 署名でない、または初めて出現する署名の場合は追加
    if (!isSignature || (isSignature && !Array.from(seenSignatures).some(sig => sig === trimmedLine.toLowerCase()))) {
      uniqueLines.push(line);
      if (isSignature) {
        seenSignatures.add(trimmedLine.toLowerCase());
      }
    }
  }
  
  // 連続する空行を1つにまとめる
  const cleanedLines: string[] = [];
  let prevWasEmpty = false;
  
  for (const line of uniqueLines) {
    const isEmpty = line.trim() === '';
    if (isEmpty && prevWasEmpty) {
      continue;
    }
    cleanedLines.push(line);
    prevWasEmpty = isEmpty;
  }
  
  // 最後に不要な空行を削除
  while (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1].trim() === '') {
    cleanedLines.pop();
  }
  
  return cleanedLines.join('\n');
}

/**
 * テキスト内の「敬具」の出現回数をカウント
 */
export function countSignatureOccurrences(text: string | undefined | null, signature: string = '敬具'): number {
  if (!text) return 0;
  
  const regex = new RegExp(signature, 'g');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}