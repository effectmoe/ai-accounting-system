import { NextRequest, NextResponse } from 'next/server';
import { callDeepSeek } from '@/src/mastra/setup-deepseek';
import { InvoiceService } from '@/services/invoice.service';
import { QuoteService } from '@/services/quote.service';
import { CustomerService } from '@/services/customer.service';
import { SupplierService } from '@/services/supplier.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, agent: agentName = 'general', context } = body;
    
    // データベースから実際のデータを取得
    const invoiceService = new InvoiceService();
    const quoteService = new QuoteService();
    const customerService = new CustomerService();
    const supplierService = new SupplierService();
    
    // 現在の月と先月を計算
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    
    // 現在月のデータ取得
    const startOfCurrentMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfCurrentMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
    
    const currentMonthInvoices = await invoiceService.findAll({
      issueDate: {
        $gte: startOfCurrentMonth.toISOString(),
        $lte: endOfCurrentMonth.toISOString()
      }
    });
    
    // 先月のデータ取得
    const startOfLastMonth = new Date(lastMonthYear, lastMonth - 1, 1);
    const endOfLastMonth = new Date(lastMonthYear, lastMonth, 0, 23, 59, 59, 999);
    
    const lastMonthInvoices = await invoiceService.findAll({
      issueDate: {
        $gte: startOfLastMonth.toISOString(),
        $lte: endOfLastMonth.toISOString()
      }
    });
    
    // 見積書データ取得
    const currentMonthQuotes = await quoteService.findAll({
      issueDate: {
        $gte: startOfCurrentMonth.toISOString(),
        $lte: endOfCurrentMonth.toISOString()
      }
    });
    
    // 顧客と仕入先データ取得
    const customers = await customerService.findAll({});
    const suppliers = await supplierService.findAll({});
    
    // 売上計算
    const currentMonthRevenue = currentMonthInvoices.reduce(
      (sum, inv) => sum + (inv.totalAmount || 0), 0
    );
    const lastMonthRevenue = lastMonthInvoices.reduce(
      (sum, inv) => sum + (inv.totalAmount || 0), 0
    );
    
    // 見積金額計算
    const currentMonthQuoteAmount = currentMonthQuotes.reduce(
      (sum, quote) => sum + (quote.totalAmount || 0), 0
    );
    
    // システムプロンプトを生成（請求書生成と同じ形式）
    const systemPrompt = `あなたは日本の会計システムのAIアシスタントです。
現在のシステムデータ:
- 今月（${currentYear}年${currentMonth}月）の売上: ¥${currentMonthRevenue.toLocaleString()}（請求書${currentMonthInvoices.length}件）
- 先月（${lastMonthYear}年${lastMonth}月）の売上: ¥${lastMonthRevenue.toLocaleString()}（請求書${lastMonthInvoices.length}件）
- 今月の見積金額: ¥${currentMonthQuoteAmount.toLocaleString()}（見積書${currentMonthQuotes.length}件）
- 登録顧客数: ${customers.length}社
- 登録仕入先数: ${suppliers.length}社

主要顧客:
${customers.slice(0, 5).map(c => `- ${c.companyName || c.name}: 取引回数${c.transactionCount || 0}回`).join('\n')}

最新の請求書:
${currentMonthInvoices.slice(0, 5).map(inv => 
  `- ${inv.invoiceNumber}: ${inv.customer?.companyName || '顧客未設定'} ¥${(inv.totalAmount || 0).toLocaleString()}`
).join('\n')}

ユーザーの質問に対して、上記の実際のデータを使用して具体的に回答してください。`;

    // DeepSeek APIを直接呼び出し（請求書生成と完全に同じ方法）
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];
    
    const response = await callDeepSeek(messages);
    
    if (!response.choices || !response.choices[0]) {
      throw new Error('AIからの応答が不正です');
    }
    
    return NextResponse.json({
      success: true,
      response: response.choices[0].message.content,
      agentName: agentName,
      timestamp: new Date().toISOString(),
      metadata: {
        dataLoaded: true,
        currentMonthRevenue,
        lastMonthRevenue,
        invoiceCount: currentMonthInvoices.length,
        customerCount: customers.length
      }
    });
    
  } catch (error) {
    console.error('❌ Chat API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Chat API is ready',
    timestamp: new Date().toISOString()
  });
}