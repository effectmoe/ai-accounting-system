// AI会話ID管理のヘルパー関数

/**
 * 会話IDを正規化する（数値形式の場合はconv_プレフィックスを追加）
 */
export function normalizeConversationId(id: string | number | undefined): string | null {
  if (!id) return null;
  
  const idStr = String(id);
  
  // 既にconv_プレフィックスがある場合はそのまま返す
  if (idStr.startsWith('conv_')) {
    return idStr;
  }
  
  // 数値形式の場合はconv_プレフィックスを追加
  if (/^\d+$/.test(idStr)) {
    return `conv_${idStr}`;
  }
  
  // その他の形式はそのまま返す
  return idStr;
}

/**
 * 新しい会話IDを生成する
 */
export function generateConversationId(): string {
  return `conv_${Date.now()}`;
}

/**
 * 会話IDが有効な形式かチェック
 */
export function isValidConversationId(id: string | undefined): boolean {
  if (!id) return false;
  return id.startsWith('conv_') && /^conv_\d+$/.test(id);
}

/**
 * 既存の会話IDを新しい形式に移行
 */
export function migrateConversationId(oldId: string | number | undefined): string | null {
  if (!oldId) return null;
  
  const oldIdStr = String(oldId);
  
  // 既に新しい形式の場合
  if (isValidConversationId(oldIdStr)) {
    return oldIdStr;
  }
  
  // 数値形式の場合は変換
  if (/^\d+$/.test(oldIdStr)) {
    return `conv_${oldIdStr}`;
  }
  
  // その他の場合は新しいIDを生成
  console.warn(`[AI Conversation Helper] Invalid conversation ID format: ${oldIdStr}, generating new ID`);
  return generateConversationId();
}