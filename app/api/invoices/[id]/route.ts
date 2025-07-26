import { NextRequest, NextResponse } from 'next/server';
import { InvoiceService } from '@/services/invoice.service';
import { CompanyInfoService } from '@/services/company-info.service';
import { ActivityLogService } from '@/services/activity-log.service';
import { InvoiceStatus } from '@/types/collections';

import { logger } from '@/lib/logger';
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.debug('[GET /api/invoices/[id]] Request for ID:', params.id);
    const invoiceService = new InvoiceService();
    const invoice = await invoiceService.getInvoice(params.id);
    
    if (!invoice) {
      logger.debug('[GET /api/invoices/[id]] Invoice not found for ID:', params.id);
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    logger.debug('[GET /api/invoices/[id]] Invoice found:', {
      id: invoice._id,
      status: invoice.status,
      convertedToDeliveryNoteId: invoice.convertedToDeliveryNoteId,
      hasAiConversationId: !!invoice.aiConversationId,
      aiConversationId: invoice.aiConversationId
    });
    
    // 会社情報を取得
    const companyInfoService = new CompanyInfoService();
    const companyInfo = await companyInfoService.getCompanyInfo();
    
    // 顧客情報とデータ構造を整形
    const formattedInvoice = {
      ...invoice,
      status: invoice.status, // ステータスを明示的に含める
      convertedToDeliveryNoteId: invoice.convertedToDeliveryNoteId, // 納品書変換IDを明示的に含める
      convertedToDeliveryNoteDate: invoice.convertedToDeliveryNoteDate, // 納品書変換日を明示的に含める
      invoiceDate: invoice.issueDate, // フロントエンドの期待する形式に合わせる
      customerSnapshot: invoice.customer ? {
        companyName: invoice.customer.companyName || invoice.customer.name || '',
        address: [
          invoice.customer.postalCode ? `〒${invoice.customer.postalCode}` : '',
          invoice.customer.prefecture || '',
          invoice.customer.city || '',
          invoice.customer.address1 || '',
          invoice.customer.address2 || ''
        ].filter(Boolean).join(' '),
        phone: invoice.customer.phone,
        email: invoice.customer.email,
        contactName: invoice.customer.contacts?.[0]?.name
      } : {
        companyName: '顧客情報なし',
        address: '',
      },
      companySnapshot: {
        companyName: companyInfo?.companyName || '会社名未設定',
        address: companyInfo ? [
          companyInfo.postalCode ? `〒${companyInfo.postalCode}` : '',
          companyInfo.prefecture || '',
          companyInfo.city || '',
          companyInfo.address1 || '',
          companyInfo.address2 || ''
        ].filter(Boolean).join(' ') : '',
        phone: companyInfo?.phone,
        email: companyInfo?.email,
        invoiceRegistrationNumber: companyInfo?.registrationNumber || '',
        bankAccount: invoice.bankAccount ? {
          bankName: invoice.bankAccount.bankName,
          branchName: invoice.bankAccount.branchName,
          accountType: invoice.bankAccount.accountType,
          accountNumber: invoice.bankAccount.accountNumber,
          accountHolder: invoice.bankAccount.accountName
        } : undefined
      }
    };
    
    logger.debug('[GET /api/invoices/[id]] Formatted invoice status:', formattedInvoice.status);
    logger.debug('[GET /api/invoices/[id]] Formatted invoice convertedToDeliveryNoteId:', formattedInvoice.convertedToDeliveryNoteId);
    
    return NextResponse.json(formattedInvoice);
  } catch (error) {
    logger.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.debug('[PUT /api/invoices/[id]] Request for ID:', params.id);
    const body = await request.json();
    logger.debug('[PUT /api/invoices/[id]] Request body:', body);
    
    const invoiceService = new InvoiceService();
    
    // ステータス更新の場合
    if (body.status && Object.keys(body).length === 1) {
      logger.debug('Updating invoice status:', params.id, body.status);
      const invoice = await invoiceService.updateInvoiceStatus(params.id, body.status as InvoiceStatus);
      if (!invoice) {
        logger.debug('Invoice not found for status update:', params.id);
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }
      
      // ステータス変更時のアクティビティログを記録
      try {
        const customerName = invoice.customer?.companyName || invoice.customer?.name || '不明な顧客';
        const previousStatus = (invoice as any).previousStatus || invoice.status;
        const statusLabels: Record<string, string> = {
          draft: '下書き',
          sent: '送信済み',
          paid: '支払済み',
          partially_paid: '一部支払済み',
          overdue: '期限超過',
          cancelled: 'キャンセル',
        };
        
        // ステータスが実際に変更された場合のみログを記録
        if (previousStatus !== body.status) {
          await ActivityLogService.log({
            type: 'invoice_status_updated',
            targetType: 'invoice',
            targetId: invoice._id.toString(),
            description: `請求書 ${invoice.invoiceNumber} のステータスを「${statusLabels[previousStatus] || previousStatus}」から「${statusLabels[body.status] || body.status}」に変更しました`,
            metadata: {
              invoiceNumber: invoice.invoiceNumber,
              customerName,
              oldStatus: previousStatus,
              newStatus: body.status,
              totalAmount: invoice.totalAmount,
            },
          });
          
          // 「送信済み」に変更した場合は売上として計上
          if (body.status === 'sent' && previousStatus !== 'sent') {
            await ActivityLogService.log({
              type: 'revenue_recorded',
              targetType: 'invoice',
              targetId: invoice._id.toString(),
              description: `請求書 ${invoice.invoiceNumber} を送信し、売上 ¥${invoice.totalAmount.toLocaleString()} を計上しました`,
              metadata: {
                invoiceNumber: invoice.invoiceNumber,
                customerName,
                amount: invoice.totalAmount,
              },
            });
          }
          
          // 「支払済み」に変更した場合は入金として記録
          if (body.status === 'paid' && previousStatus !== 'paid') {
            await ActivityLogService.log({
              type: 'payment_received',
              targetType: 'invoice',
              targetId: invoice._id.toString(),
              description: `請求書 ${invoice.invoiceNumber} の支払い ¥${invoice.totalAmount.toLocaleString()} を受領しました`,
              metadata: {
                invoiceNumber: invoice.invoiceNumber,
                customerName,
                amount: invoice.totalAmount,
                paidAmount: invoice.paidAmount || invoice.totalAmount,
                paymentDate: invoice.paidDate || new Date().toISOString(),
              },
            });
          }
        }
      } catch (logError) {
        logger.error('Failed to log activity for invoice status update:', logError);
      }
      
      logger.debug('Invoice status updated successfully');
      return NextResponse.json(invoice);
    }
    
    // 支払い記録の場合
    if (body.paidAmount !== undefined && body.paymentDate) {
      const invoice = await invoiceService.recordPayment(
        params.id, 
        body.paidAmount,
        new Date(body.paymentDate)
      );
      if (!invoice) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(invoice);
    }
    
    // 通常の更新
    logger.debug('Updating invoice with data:', body);
    
    // 請求書データの整形
    const updateData: any = {};
    
    if (body.customerId) updateData.customerId = body.customerId;
    if (body.invoiceDate) updateData.issueDate = new Date(body.invoiceDate);
    if (body.dueDate) updateData.dueDate = new Date(body.dueDate);
    if (body.items) {
      // itemsの処理：descriptionをitemNameにマッピング
      updateData.items = body.items.map((item: any) => ({
        ...item,
        itemName: item.description || item.itemName,
        totalAmount: item.amount + item.taxAmount
      }));
    }
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.paymentMethod) updateData.paymentMethod = body.paymentMethod;
    if (body.aiConversationId) updateData.aiConversationId = body.aiConversationId;
    
    // 合計金額を再計算
    if (updateData.items) {
      let subtotal = 0;
      let taxAmount = 0;
      
      updateData.items.forEach((item: any) => {
        subtotal += item.amount || 0;
        taxAmount += item.taxAmount || 0;
      });
      
      updateData.subtotal = subtotal;
      updateData.taxAmount = taxAmount;
      updateData.totalAmount = subtotal + taxAmount;
    }
    
    logger.debug('[PUT /api/invoices/[id]] Calling updateInvoice with ID:', params.id);
    logger.debug('[PUT /api/invoices/[id]] Update data:', JSON.stringify(updateData, null, 2));
    
    const invoice = await invoiceService.updateInvoice(params.id, updateData);
    if (!invoice) {
      logger.error('[PUT /api/invoices/[id]] Invoice not found. ID:', params.id);
      logger.error('[PUT /api/invoices/[id]] Attempted update data:', updateData);
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    logger.debug('[PUT /api/invoices/[id]] Invoice updated successfully');
    return NextResponse.json(invoice);
  } catch (error) {
    logger.error('Error updating invoice:', error);
    logger.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to update invoice',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceService = new InvoiceService();
    
    // キャンセル（論理削除）
    const invoice = await invoiceService.cancelInvoice(params.id);
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    logger.error('Error cancelling invoice:', error);
    return NextResponse.json(
      { error: 'Failed to cancel invoice' },
      { status: 500 }
    );
  }
}