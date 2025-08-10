import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { logger } from '@/lib/logger';
import { generateQuotePDF } from '@/lib/pdf-generator';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await connectToDatabase();
    const quoteId = params.id;

    // 見積書を取得
    const quote = await db.collection('quotes').findOne({
      _id: new ObjectId(quoteId)
    });

    if (!quote) {
      return NextResponse.json(
        { error: '見積書が見つかりません' },
        { status: 404 }
      );
    }

    // 会社情報を取得
    const companyInfo = await db.collection('company_info').findOne({});

    if (!companyInfo) {
      return NextResponse.json(
        { error: '会社情報が設定されていません' },
        { status: 400 }
      );
    }

    // PDF生成（実装は別途必要）
    // const pdfBuffer = await generateQuotePDF(quote, companyInfo);

    // PDFをGridFSに保存
    const pdfMetadata = {
      quoteId: new ObjectId(quoteId),
      quoteNumber: quote.quoteNumber,
      type: 'accepted_quote',
      generatedAt: new Date(),
      fileName: `${quote.quoteNumber}_承認済み.pdf`
    };

    // GridFSへの保存処理（実装は別途必要）
    // const fileId = await savePDFToGridFS(pdfBuffer, pdfMetadata);

    // 見積書にPDF情報を追加
    await db.collection('quotes').updateOne(
      { _id: new ObjectId(quoteId) },
      {
        $set: {
          acceptedPdf: {
            // fileId,
            generatedAt: new Date(),
            fileName: pdfMetadata.fileName
          },
          updatedAt: new Date()
        }
      }
    );

    logger.info(`PDF generated for accepted quote ${quote.quoteNumber}`);

    return NextResponse.json({
      success: true,
      message: 'PDFを生成しました',
      // fileId,
      fileName: pdfMetadata.fileName
    });

  } catch (error) {
    logger.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'PDF生成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}