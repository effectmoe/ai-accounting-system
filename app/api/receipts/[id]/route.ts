import { NextRequest, NextResponse } from 'next/server';
import { ReceiptService } from '@/services/receipt.service';
import { CompanyInfoService } from '@/services/company-info.service';
import { ActivityLogService } from '@/services/activity-log.service';
import { ReceiptStatus } from '@/types/receipt';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.debug('[GET /api/receipts/[id]] Request for ID:', params.id);
    const receiptService = new ReceiptService();
    const receipt = await receiptService.getReceipt(params.id);

    if (!receipt) {
      logger.debug('[GET /api/receipts/[id]] Receipt not found for ID:', params.id);
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    logger.debug('[GET /api/receipts/[id]] Receipt found:', {
      id: receipt._id,
      receiptNumber: receipt.receiptNumber,
      status: receipt.status,
    });

    // 会社情報を取得
    const companyInfoService = new CompanyInfoService();
    const companyInfo = await companyInfoService.getCompanyInfo();

    // 顧客情報とデータ構造を整形
    const formattedReceipt = {
      ...receipt,
      customerSnapshot: (receipt as any).customer ? {
        companyName: (receipt as any).customer.companyName || (receipt as any).customer.name || '',
        address: [
          (receipt as any).customer.postalCode ? `〒${(receipt as any).customer.postalCode}` : '',
          (receipt as any).customer.prefecture || '',
          (receipt as any).customer.city || '',
          (receipt as any).customer.address1 || '',
          (receipt as any).customer.address2 || ''
        ].filter(Boolean).join(' '),
        phone: (receipt as any).customer.phone,
        email: (receipt as any).customer.email,
        contactName: (receipt as any).customer.contacts?.[0]?.name
      } : {
        companyName: receipt.customerName || '顧客情報なし',
        address: receipt.customerAddress || '',
      },
      companySnapshot: {
        companyName: companyInfo?.companyName || '会社名未設定',
        address: companyInfo ? (() => {
          const postalCode = companyInfo.postalCode ? `〒${companyInfo.postalCode}` : '';
          const mainAddress = `${companyInfo.prefecture || ''}${companyInfo.city || ''}${companyInfo.address1 || ''}`;
          const buildingName = companyInfo.address2 || '';
          // 郵便番号+住所を1行目、ビル名を2行目に（改行区切り）
          if (buildingName) {
            return `${postalCode} ${mainAddress}\n${buildingName}`;
          }
          return `${postalCode} ${mainAddress}`;
        })() : '',
        phone: companyInfo?.phone,
        email: companyInfo?.email,
        registrationNumber: companyInfo?.registrationNumber || '',
      },
      invoice: (receipt as any).invoice ? {
        _id: (receipt as any).invoice._id,
        invoiceNumber: (receipt as any).invoice.invoiceNumber,
        totalAmount: (receipt as any).invoice.totalAmount,
        status: (receipt as any).invoice.status
      } : null
    };

    return NextResponse.json(formattedReceipt);
  } catch (error) {
    logger.error('Error fetching receipt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipt' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.debug('[PUT /api/receipts/[id]] Request for ID:', params.id);
    const body = await request.json();
    logger.debug('[PUT /api/receipts/[id]] Request body:', body);

    const receiptService = new ReceiptService();

    // ステータス更新の場合
    if (body.status && Object.keys(body).length === 1) {
      logger.debug('Updating receipt status:', params.id, body.status);
      const receipt = await receiptService.updateReceiptStatus(params.id, body.status as ReceiptStatus);
      if (!receipt) {
        logger.debug('Receipt not found for status update:', params.id);
        return NextResponse.json(
          { error: 'Receipt not found' },
          { status: 404 }
        );
      }

      // ステータス変更時のアクティビティログを記録
      try {
        const customerName = (receipt as any).customer?.companyName || receipt.customerName || '不明な顧客';

        await ActivityLogService.log({
          type: 'receipt_status_updated',
          targetType: 'receipt',
          targetId: receipt._id!.toString(),
          description: `領収書 ${receipt.receiptNumber} のステータスを「${body.status}」に変更しました`,
          metadata: {
            receiptNumber: receipt.receiptNumber,
            customerName,
            newStatus: body.status,
            totalAmount: receipt.totalAmount,
          },
        });

        // 「送信済み」に変更した場合
        if (body.status === 'sent') {
          await ActivityLogService.log({
            type: 'receipt_sent',
            targetType: 'receipt',
            targetId: receipt._id!.toString(),
            description: `領収書 ${receipt.receiptNumber} を送信しました`,
            metadata: {
              receiptNumber: receipt.receiptNumber,
              customerName,
              totalAmount: receipt.totalAmount,
              emailSentAt: receipt.emailSentAt,
            },
          });
        }
      } catch (logError) {
        logger.error('Failed to log activity for receipt status update:', logError);
      }

      logger.debug('Receipt status updated successfully');
      return NextResponse.json(receipt);
    }

    // 通常の更新
    logger.debug('Updating receipt with data:', body);

    const updateData: any = {};

    if (body.customerName !== undefined) updateData.customerName = body.customerName;
    if (body.customerAddress !== undefined) updateData.customerAddress = body.customerAddress;
    if (body.issueDate) updateData.issueDate = new Date(body.issueDate);
    if (body.paidDate) updateData.paidDate = new Date(body.paidDate);
    if (body.subject !== undefined) updateData.subject = body.subject;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.items) updateData.items = body.items;
    if (body.issuerStamp !== undefined) updateData.issuerStamp = body.issuerStamp;

    // 金額の再計算
    if (body.items) {
      let subtotal = 0;
      let taxAmount = 0;

      body.items.forEach((item: any) => {
        subtotal += item.amount || 0;
        // 税額はamountに含まれていると仮定し、税率から計算
        const itemTaxAmount = Math.round((item.amount || 0) * 0.1 / 1.1);
        taxAmount += itemTaxAmount;
      });

      updateData.subtotal = subtotal - taxAmount;
      updateData.taxAmount = taxAmount;
      updateData.totalAmount = subtotal;
    }

    logger.debug('[PUT /api/receipts/[id]] Calling updateReceipt with ID:', params.id);
    logger.debug('[PUT /api/receipts/[id]] Update data:', JSON.stringify(updateData, null, 2));

    const receipt = await receiptService.updateReceipt(params.id, updateData);
    if (!receipt) {
      logger.error('[PUT /api/receipts/[id]] Receipt not found. ID:', params.id);
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // 更新のアクティビティログを記録
    try {
      const customerName = (receipt as any).customer?.companyName || receipt.customerName || '不明な顧客';
      await ActivityLogService.log({
        type: 'receipt_updated',
        targetType: 'receipt',
        targetId: receipt._id!.toString(),
        description: `領収書 ${receipt.receiptNumber} を更新しました`,
        metadata: {
          receiptNumber: receipt.receiptNumber,
          customerName,
          totalAmount: receipt.totalAmount,
        },
      });
    } catch (logError) {
      logger.error('Failed to log activity for receipt update:', logError);
    }

    logger.debug('[PUT /api/receipts/[id]] Receipt updated successfully');
    return NextResponse.json(receipt);
  } catch (error) {
    logger.error('Error updating receipt:', error);
    logger.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      {
        error: 'Failed to update receipt',
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
    logger.debug('[DELETE /api/receipts/[id]] Receipt ID:', params.id);

    const receiptService = new ReceiptService();

    // 削除前に領収書情報を取得（アクティビティログ用）
    const receipt = await receiptService.getReceipt(params.id);
    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // 物理削除
    const deleted = await receiptService.deleteReceipt(params.id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete receipt' },
        { status: 500 }
      );
    }

    // 削除のアクティビティログを記録
    try {
      const customerName = (receipt as any).customer?.companyName || receipt.customerName || '不明な顧客';
      await ActivityLogService.log({
        type: 'receipt_deleted',
        targetType: 'receipt',
        targetId: params.id,
        description: `領収書 ${receipt.receiptNumber} を削除しました`,
        metadata: {
          receiptNumber: receipt.receiptNumber,
          customerName,
          totalAmount: receipt.totalAmount,
        },
      });
    } catch (logError) {
      logger.error('Failed to log activity for receipt deletion:', logError);
    }

    logger.info(`Receipt deleted successfully: ${receipt.receiptNumber}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting receipt:', error);
    return NextResponse.json(
      { error: 'Failed to delete receipt' },
      { status: 500 }
    );
  }
}