/**
 * 銀行取引インポート・自動マッチングサービス
 */

import { ObjectId } from 'mongodb';
import { db } from '@/lib/mongodb-client';
import { Collections } from '@/lib/mongodb-client';
import { BankTransaction, AutoMatchResult } from '@/types/bank-csv';
import { Invoice } from '@/types/collections';
import { PaymentRecordService } from './payment-record.service';
import { 
  normalizeBankString, 
  calculateSimilarity, 
  isMatch,
  findBestMatch 
} from '@/lib/string-normalizer';
import { logger } from '@/lib/logger';

const paymentRecordService = new PaymentRecordService();

export class BankImportService {
  /**
   * 銀行取引と請求書の自動マッチング
   */
  async autoMatchTransactions(
    transactions: BankTransaction[]
  ): Promise<AutoMatchResult[]> {
    const results: AutoMatchResult[] = [];
    
    // 入金取引のみを対象とする
    const deposits = transactions.filter(t => t.type === 'deposit');
    
    // 未払い・一部支払いの請求書を取得
    const unpaidInvoices = await db.find<Invoice>(Collections.INVOICES, {
      status: { $in: ['unpaid', 'partially_paid', 'sent', 'overdue'] }
    });

    for (const transaction of deposits) {
      const matchResult = await this.matchTransactionToInvoice(
        transaction,
        unpaidInvoices
      );
      results.push(matchResult);
    }

    return results;
  }

  /**
   * 個別の取引を請求書とマッチング
   */
  private async matchTransactionToInvoice(
    transaction: BankTransaction,
    invoices: Invoice[]
  ): Promise<AutoMatchResult> {
    let bestMatch: any = null;
    let confidence: 'high' | 'medium' | 'low' | 'none' = 'none';
    let matchReason: string | undefined;

    // 金額が正確に一致する請求書を探す
    const exactAmountMatches = invoices.filter(inv => {
      const remainingAmount = this.calculateRemainingAmount(inv);
      return remainingAmount === transaction.amount;
    });

    if (exactAmountMatches.length === 1) {
      // 金額が完全一致かつ1件のみ
      bestMatch = exactAmountMatches[0];
      confidence = 'high';
      matchReason = '金額が完全一致';
    } else if (exactAmountMatches.length > 1 && transaction.customerName) {
      // 金額が一致する請求書が複数ある場合、顧客名でフィルタリング
      const customerNames = exactAmountMatches.map(inv => 
        inv.customer?.companyName || 
        inv.customer?.name || 
        inv.customerSnapshot?.companyName || ''
      );
      
      // 最も類似度の高い顧客を見つける
      const { match: bestCustomerName, similarity } = findBestMatch(
        transaction.customerName,
        customerNames
      );
      
      if (bestCustomerName && similarity >= 0.8) {
        // 類似度80%以上なら高信頼度
        bestMatch = exactAmountMatches.find(inv => {
          const name = inv.customer?.companyName || 
                      inv.customer?.name || 
                      inv.customerSnapshot?.companyName || '';
          return name === bestCustomerName;
        });
        confidence = 'high';
        matchReason = `金額完全一致、顧客名一致（類似度: ${Math.round(similarity * 100)}%）`;
      } else if (bestCustomerName && similarity >= 0.6) {
        // 類似度60%以上なら中信頼度
        bestMatch = exactAmountMatches.find(inv => {
          const name = inv.customer?.companyName || 
                      inv.customer?.name || 
                      inv.customerSnapshot?.companyName || '';
          return name === bestCustomerName;
        });
        confidence = 'medium';
        matchReason = `金額完全一致、顧客名部分一致（類似度: ${Math.round(similarity * 100)}%）`;
      }
    }

    // 金額の近似一致を試みる（±10%以内）
    if (!bestMatch) {
      const tolerancePercent = 0.1;
      const nearMatches = invoices.filter(inv => {
        const remainingAmount = this.calculateRemainingAmount(inv);
        const diff = Math.abs(remainingAmount - transaction.amount);
        return diff <= remainingAmount * tolerancePercent;
      });

      if (nearMatches.length === 1) {
        bestMatch = nearMatches[0];
        confidence = 'low';
        matchReason = '金額が近似一致（±10%以内）';
      } else if (nearMatches.length > 1 && transaction.customerName) {
        // 顧客名でフィルタリング
        const customerNames = nearMatches.map(inv => 
          inv.customer?.companyName || 
          inv.customer?.name || 
          inv.customerSnapshot?.companyName || ''
        );
        
        // 最も類似度の高い顧客を見つける
        const { match: bestCustomerName, similarity } = findBestMatch(
          transaction.customerName,
          customerNames
        );
        
        if (bestCustomerName && similarity >= 0.7) {
          // 類似度70%以上なら中信頼度
          bestMatch = nearMatches.find(inv => {
            const name = inv.customer?.companyName || 
                        inv.customer?.name || 
                        inv.customerSnapshot?.companyName || '';
            return name === bestCustomerName;
          });
          confidence = 'medium';
          matchReason = `金額近似一致（±10%）、顧客名一致（類似度: ${Math.round(similarity * 100)}%）`;
        } else if (bestCustomerName && similarity >= 0.5) {
          // 類似度50%以上なら低信頼度
          bestMatch = nearMatches.find(inv => {
            const name = inv.customer?.companyName || 
                        inv.customer?.name || 
                        inv.customerSnapshot?.companyName || '';
            return name === bestCustomerName;
          });
          confidence = 'low';
          matchReason = `金額近似一致（±10%）、顧客名部分一致（類似度: ${Math.round(similarity * 100)}%）`;
        }
      }
    }

    // マッチング結果を作成
    const result: AutoMatchResult = {
      transaction,
      confidence,
      matchReason,
    };

    if (bestMatch) {
      const remainingAmount = this.calculateRemainingAmount(bestMatch);
      result.matchedInvoice = {
        _id: bestMatch._id.toString(),
        invoiceNumber: bestMatch.invoiceNumber,
        customerName: bestMatch.customer?.companyName || 
                     bestMatch.customer?.name || 
                     bestMatch.customerSnapshot?.companyName || '',
        totalAmount: bestMatch.totalAmount,
        remainingAmount,
      };
    }

    return result;
  }

  /**
   * 請求書の残額を計算
   */
  private calculateRemainingAmount(invoice: Invoice): number {
    return invoice.totalAmount - (invoice.paidAmount || 0);
  }

  /**
   * あいまい文字列マッチング
   * @deprecated calculateSimilarity を使用してください
   */
  private fuzzyMatch(str1: string, str2: string): boolean {
    return isMatch(str1, str2, 0.5);
  }

  /**
   * マッチング結果から入金記録を作成
   */
  async createPaymentRecordsFromMatches(
    matches: AutoMatchResult[],
    options: {
      onlyHighConfidence?: boolean;
      autoConfirm?: boolean;
    } = {}
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const match of matches) {
      try {
        // 低信頼度のマッチングをスキップするオプション
        if (options.onlyHighConfidence && match.confidence !== 'high') {
          skipped++;
          continue;
        }

        // マッチした請求書がない場合はスキップ
        if (!match.matchedInvoice) {
          skipped++;
          continue;
        }

        // 入金記録を作成
        const paymentRecord = await paymentRecordService.createPaymentRecord({
          invoiceId: new ObjectId(match.matchedInvoice._id),
          amount: match.transaction.amount,
          paymentDate: match.transaction.date,
          paymentMethod: 'bank_transfer',
          bankName: '住信SBIネット銀行',
          accountName: match.transaction.customerName,
          referenceNumber: match.transaction.referenceNumber,
          notes: `自動インポート: ${match.transaction.content} (${match.matchReason})`,
          status: options.autoConfirm ? 'confirmed' : 'pending',
          confirmedBy: options.autoConfirm ? 'auto-import' : undefined,
          confirmedAt: options.autoConfirm ? new Date() : undefined,
        });

        created++;
        logger.info(`Payment record created for invoice ${match.matchedInvoice.invoiceNumber}`, {
          paymentId: paymentRecord._id,
          amount: match.transaction.amount,
          confidence: match.confidence,
        });
      } catch (error) {
        const errorMsg = `入金記録作成エラー (取引日: ${match.transaction.date.toISOString().split('T')[0]}, 金額: ${match.transaction.amount}): ${error}`;
        errors.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    return { created, skipped, errors };
  }
}