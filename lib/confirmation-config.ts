/**
 * 確認フロー設定
 * 勘定科目の推測時にユーザーに確認が必要なケースの定義
 */

// 税金関連キーワード（公的機関からの支払い）
export const TAX_KEYWORDS = [
  // 公的機関名
  '税務署', '市役所', '区役所', '町役場', '村役場',
  '県庁', '都庁', '府庁', '法務局', '福祉事務所',
  '年金事務所', '労働基準監督署', '税関',

  // 税金種類
  '固定資産税', '自動車税', '住民税', '所得税',
  '事業税', '消費税', '印紙税', '登録免許税',
  '不動産取得税', '相続税', '贈与税',

  // キーワード
  '国税', '地方税', '納税', '納付', '課税',
  '収入印紙', '印紙代', '証明書', '手数料',
];

// 事業用/私用の判断が曖昧なキーワード
export const AMBIGUOUS_BUSINESS_KEYWORDS = [
  'コンビニ', 'セブンイレブン', 'ファミリーマート', 'ローソン',
  'ガソリン', '給油', 'エネオス', '出光',
  '駐車場', 'パーキング', 'タイムズ',
  '通信費', '携帯', 'スマホ',
];

// 曖昧な但し書き・明細キーワード（具体的な内容が不明）
export const VAGUE_DESCRIPTION_KEYWORDS = [
  // 一般的すぎる但し書き
  '品代', '品代として', '商品代', '商品代金',
  '購入代金', '代金', 'お品代',
  // 内容不明
  'その他', '雑費', '諸費用', '諸経費',
  // 公的機関での不自然な表現
  '物品', '物品購入',
];

// 公的機関での取引で不自然な組み合わせ
export const PUBLIC_OFFICE_INCONSISTENCY_KEYWORDS = [
  '品代', '商品', '購入', '物品',
];

// 金額閾値（この金額以上は確認を推奨）
export const CONFIRMATION_THRESHOLDS = {
  highAmount: 100000, // 10万円以上
  veryHighAmount: 500000, // 50万円以上
};

// 確認が必要なケースの判定関数
export interface ConfirmationCheckResult {
  needsConfirmation: boolean;
  reasons: string[];
  suggestedQuestions: ConfirmationQuestion[];
  pendingCategory?: string;
}

export interface ConfirmationQuestion {
  id: string;
  type: 'single_choice' | 'yes_no' | 'text_input';
  question: string;
  options?: QuestionOption[];
  required: boolean;
  context?: string;
}

export interface QuestionOption {
  value: string;
  label: string;
  resultCategory?: string;
}

// 確認フロー状態
export type ConfirmationStatus = 'pending' | 'confirmed' | 'skipped';

// 確認回答リクエスト
export interface ConfirmAnswerRequest {
  documentId: string;
  answers: {
    questionId: string;
    answer: string;
    resultCategory?: string;
  }[];
}

// 確認回答レスポンス
export interface ConfirmAnswerResponse {
  success: boolean;
  category: string;
  message?: string;
}

/**
 * 税金関連コンテンツの検出
 */
export function detectTaxRelatedContent(text: string): boolean {
  const lowerText = text.toLowerCase();
  return TAX_KEYWORDS.some(keyword =>
    lowerText.includes(keyword.toLowerCase())
  );
}

/**
 * 事業用/私用が曖昧なコンテンツの検出
 */
export function detectAmbiguousBusinessContent(text: string): boolean {
  const lowerText = text.toLowerCase();
  return AMBIGUOUS_BUSINESS_KEYWORDS.some(keyword =>
    lowerText.includes(keyword.toLowerCase())
  );
}

/**
 * 曖昧な但し書き・明細の検出
 * 「品代として」「購入代金」など具体性がない記述
 */
export function detectVagueDescription(text: string): boolean {
  return VAGUE_DESCRIPTION_KEYWORDS.some(keyword =>
    text.includes(keyword)
  );
}

/**
 * 公的機関と但し書きの矛盾検出
 * 例: 福祉事務所 + 品代として = 不自然（公的機関は通常「品物」を販売しない）
 */
export function detectPublicOfficeInconsistency(
  vendorName: string,
  notes: string,
  itemDescriptions: string[]
): { hasInconsistency: boolean; description: string } {
  const isPublicOffice = detectTaxRelatedContent(vendorName);

  if (!isPublicOffice) {
    return { hasInconsistency: false, description: '' };
  }

  // 但し書きまたは明細に不自然なキーワードがあるか
  const allText = [notes, ...itemDescriptions].join(' ');
  const hasInconsistentKeyword = PUBLIC_OFFICE_INCONSISTENCY_KEYWORDS.some(
    keyword => allText.includes(keyword)
  );

  if (hasInconsistentKeyword) {
    return {
      hasInconsistency: true,
      description: `公的機関「${vendorName}」で「${notes || itemDescriptions[0] || ''}」は不自然な組み合わせです`,
    };
  }

  return { hasInconsistency: false, description: '' };
}

/**
 * 税金関連の確認質問を生成
 */
export function generateTaxConfirmationQuestions(
  vendorName: string,
  amount: number
): ConfirmationQuestion[] {
  return [
    {
      id: 'tax_type',
      type: 'single_choice',
      question: 'この税金・手数料の種類を教えてください',
      options: [
        { value: 'property_tax', label: '固定資産税（事業用）', resultCategory: '租税公課' },
        { value: 'vehicle_tax', label: '自動車税（事業用）', resultCategory: '租税公課' },
        { value: 'business_tax', label: '事業税', resultCategory: '租税公課' },
        { value: 'stamp_duty', label: '収入印紙・印紙税', resultCategory: '租税公課' },
        { value: 'certificate_fee', label: '証明書発行手数料', resultCategory: '租税公課' },
        { value: 'income_tax', label: '所得税（自分の）', resultCategory: '事業主貸' },
        { value: 'resident_tax', label: '住民税（自分の）', resultCategory: '事業主貸' },
        { value: 'health_insurance', label: '国民健康保険料', resultCategory: '事業主貸' },
        { value: 'pension', label: '国民年金', resultCategory: '事業主貸' },
        { value: 'other', label: 'その他' },
      ],
      required: true,
      context: `「${vendorName}」への支払い ¥${amount.toLocaleString()}`
    },
  ];
}

/**
 * 事業用/私用確認の質問を生成
 */
export function generateBusinessUseQuestions(
  vendorName: string,
  amount: number,
  suggestedCategory: string
): ConfirmationQuestion[] {
  return [
    {
      id: 'business_use',
      type: 'yes_no',
      question: 'この支出は事業用ですか？',
      options: [
        { value: 'yes', label: 'はい、事業用です', resultCategory: suggestedCategory },
        { value: 'no', label: 'いいえ、私用です', resultCategory: '事業主貸' },
      ],
      required: true,
      context: `「${vendorName}」¥${amount.toLocaleString()}`
    },
  ];
}

/**
 * 曖昧な但し書きの確認質問を生成
 */
export function generateVagueDescriptionQuestions(
  vendorName: string,
  amount: number,
  notes: string
): ConfirmationQuestion[] {
  return [
    {
      id: 'actual_purpose',
      type: 'single_choice',
      question: 'この支払いの実際の内容を教えてください',
      options: [
        { value: 'certificate', label: '証明書発行手数料', resultCategory: '租税公課' },
        { value: 'welfare_service', label: '福祉サービス利用料', resultCategory: '福利厚生費' },
        { value: 'tax_payment', label: '税金・公的料金', resultCategory: '租税公課' },
        { value: 'personal', label: '個人的な支払い', resultCategory: '事業主貸' },
        { value: 'other_business', label: 'その他事業経費', resultCategory: '雑費' },
      ],
      required: true,
      context: `但し書き「${notes}」では内容が不明確です。「${vendorName}」¥${amount.toLocaleString()}`
    },
  ];
}

/**
 * 矛盾検出時の確認質問を生成
 */
export function generateInconsistencyQuestions(
  vendorName: string,
  amount: number,
  inconsistencyDescription: string
): ConfirmationQuestion[] {
  return [
    {
      id: 'clarify_inconsistency',
      type: 'single_choice',
      question: 'この支払いの実際の内容を教えてください',
      options: [
        { value: 'certificate', label: '証明書・書類の発行手数料', resultCategory: '租税公課' },
        { value: 'tax', label: '税金・公的料金の支払い', resultCategory: '租税公課' },
        { value: 'service', label: 'サービス利用料', resultCategory: '支払手数料' },
        { value: 'personal', label: '個人的な支払い（経費対象外）', resultCategory: '事業主貸' },
        { value: 'other', label: 'その他' },
      ],
      required: true,
      context: inconsistencyDescription
    },
  ];
}

/**
 * 確認が必要かどうかをチェック（拡張版）
 * notes: 但し書き（例: 「品代として」）
 * itemDescriptions: 明細項目の説明（例: 「購入代金」）
 */
export function checkConfirmationNeeded(
  vendorName: string,
  amount: number,
  aiPredictedCategory: string,
  confidence: number,
  notes?: string,
  itemDescriptions?: string[]
): ConfirmationCheckResult {
  const reasons: string[] = [];
  const suggestedQuestions: ConfirmationQuestion[] = [];
  let pendingCategory = aiPredictedCategory;
  const safeNotes = notes || '';
  const safeItemDescriptions = itemDescriptions || [];

  // 1. 税金関連キーワードの検出
  if (detectTaxRelatedContent(vendorName)) {
    reasons.push('税金・公的機関への支払いの可能性があります');
    suggestedQuestions.push(...generateTaxConfirmationQuestions(vendorName, amount));
    pendingCategory = '確認待ち（税金関連）';
  }

  // 2. 公的機関 + 曖昧な但し書きの矛盾検出（優先度高）
  const inconsistency = detectPublicOfficeInconsistency(vendorName, safeNotes, safeItemDescriptions);
  if (inconsistency.hasInconsistency) {
    reasons.push(inconsistency.description);
    // 既存の質問をクリアして矛盾用の質問に置き換え
    suggestedQuestions.length = 0;
    suggestedQuestions.push(...generateInconsistencyQuestions(vendorName, amount, inconsistency.description));
    pendingCategory = '確認待ち（内容不明）';
  }

  // 3. 曖昧な但し書き・明細の検出
  const allDescriptions = [safeNotes, ...safeItemDescriptions].filter(Boolean).join(' ');
  if (detectVagueDescription(allDescriptions) && suggestedQuestions.length === 0) {
    reasons.push(`但し書き「${safeNotes || safeItemDescriptions[0] || ''}」では支払いの具体的な内容が不明確です`);
    suggestedQuestions.push(...generateVagueDescriptionQuestions(vendorName, amount, safeNotes || safeItemDescriptions[0] || ''));
    pendingCategory = '確認待ち（内容不明）';
  }

  // 4. 高額取引の検出
  if (amount >= CONFIRMATION_THRESHOLDS.highAmount) {
    reasons.push(`高額取引（¥${amount.toLocaleString()}）のため確認が必要です`);
    if (suggestedQuestions.length === 0) {
      suggestedQuestions.push(...generateBusinessUseQuestions(vendorName, amount, aiPredictedCategory));
    }
  }

  // 5. AIの確信度が低い場合
  if (confidence < 0.7) {
    reasons.push(`AIの確信度が低い（${Math.round(confidence * 100)}%）ため確認が必要です`);
    if (suggestedQuestions.length === 0) {
      suggestedQuestions.push(...generateBusinessUseQuestions(vendorName, amount, aiPredictedCategory));
    }
  }

  // 6. 事業用/私用が曖昧なケース
  if (detectAmbiguousBusinessContent(vendorName) && suggestedQuestions.length === 0) {
    reasons.push('事業用か私用か判断が難しい支出です');
    suggestedQuestions.push(...generateBusinessUseQuestions(vendorName, amount, aiPredictedCategory));
  }

  return {
    needsConfirmation: reasons.length > 0,
    reasons,
    suggestedQuestions,
    pendingCategory: reasons.length > 0 ? pendingCategory : undefined,
  };
}
