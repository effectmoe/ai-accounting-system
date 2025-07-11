import { addMonths, endOfMonth, setDate } from 'date-fns';

/**
 * 支払い条件に基づいて支払期限を計算する
 * @param invoiceDate 請求日
 * @param paymentTerms 支払い条件（例: "当月末締め翌月末払い"）
 * @returns 支払期限
 */
export function calculateDueDate(invoiceDate: Date, paymentTerms: string): Date {
  // デフォルトは30日後
  let dueDate = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (!paymentTerms) {
    return dueDate;
  }

  // 支払い条件のパターンマッチング
  const normalizedTerms = paymentTerms.toLowerCase().replace(/\s/g, '');

  // 当月末締め翌月末払い
  if (normalizedTerms.includes('当月末締め翌月末払い') || 
      normalizedTerms.includes('当月末締翌月末払') ||
      normalizedTerms.includes('月末締め翌月末')) {
    // 当月末日を締め日とし、翌月末日を支払期限とする
    dueDate = endOfMonth(addMonths(invoiceDate, 1));
  }
  // 当月末締め翌々月末払い
  else if (normalizedTerms.includes('当月末締め翌々月末払い') || 
           normalizedTerms.includes('当月末締翌々月末払') ||
           normalizedTerms.includes('月末締め翌々月末')) {
    // 当月末日を締め日とし、翌々月末日を支払期限とする
    dueDate = endOfMonth(addMonths(invoiceDate, 2));
  }
  // 翌月10日払い、翌月15日払いなど
  else if (normalizedTerms.match(/翌月(\d+)日/)) {
    const match = normalizedTerms.match(/翌月(\d+)日/);
    if (match) {
      const day = parseInt(match[1]);
      // 翌月の指定日を支払期限とする
      dueDate = setDate(addMonths(invoiceDate, 1), day);
    }
  }
  // 翌々月10日払い、翌々月15日払いなど
  else if (normalizedTerms.match(/翌々月(\d+)日/)) {
    const match = normalizedTerms.match(/翌々月(\d+)日/);
    if (match) {
      const day = parseInt(match[1]);
      // 翌々月の指定日を支払期限とする
      dueDate = setDate(addMonths(invoiceDate, 2), day);
    }
  }
  // 即日払い
  else if (normalizedTerms.includes('即日') || normalizedTerms.includes('即時')) {
    dueDate = invoiceDate;
  }
  // 7日以内、10日以内など
  else if (normalizedTerms.match(/(\d+)日以内/)) {
    const match = normalizedTerms.match(/(\d+)日以内/);
    if (match) {
      const days = parseInt(match[1]);
      dueDate = new Date(invoiceDate.getTime() + days * 24 * 60 * 60 * 1000);
    }
  }
  // 月末払い（当月末）
  else if (normalizedTerms.includes('月末払い') && !normalizedTerms.includes('翌')) {
    dueDate = endOfMonth(invoiceDate);
  }

  return dueDate;
}

/**
 * 支払い条件の説明文を生成する
 * @param paymentTerms 支払い条件
 * @returns 説明文
 */
export function getPaymentTermsDescription(paymentTerms: string): string {
  if (!paymentTerms) {
    return '支払期限は請求日から30日後です。';
  }

  const normalizedTerms = paymentTerms.toLowerCase().replace(/\s/g, '');

  if (normalizedTerms.includes('当月末締め翌月末払い')) {
    return '当月末締め、翌月末日までにお支払いください。';
  } else if (normalizedTerms.includes('当月末締め翌々月末払い')) {
    return '当月末締め、翌々月末日までにお支払いください。';
  } else if (normalizedTerms.match(/翌月(\d+)日/)) {
    const match = normalizedTerms.match(/翌月(\d+)日/);
    return `翌月${match![1]}日までにお支払いください。`;
  } else if (normalizedTerms.match(/翌々月(\d+)日/)) {
    const match = normalizedTerms.match(/翌々月(\d+)日/);
    return `翌々月${match![1]}日までにお支払いください。`;
  } else if (normalizedTerms.includes('即日')) {
    return '即日お支払いください。';
  } else if (normalizedTerms.match(/(\d+)日以内/)) {
    const match = normalizedTerms.match(/(\d+)日以内/);
    return `請求日から${match![1]}日以内にお支払いください。`;
  } else if (normalizedTerms.includes('月末払い') && !normalizedTerms.includes('翌')) {
    return '当月末日までにお支払いください。';
  }

  return paymentTerms;
}