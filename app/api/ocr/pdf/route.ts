import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが提供されていません' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'PDFファイルのみサポートされています' },
        { status: 400 }
      );
    }

    // PDFからテキストを抽出
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(buffer);
      
      // 簡易的なレシート解析
      const text = pdfData.text;
      const result = parseReceiptText(text);
      
      return NextResponse.json({
        text: text,
        confidence: 0.9,
        ...result
      });
    } catch (error) {
      console.error('PDF parsing error:', error);
      return NextResponse.json(
        { error: 'PDFの解析に失敗しました' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

function parseReceiptText(text: string): {
  vendor?: string;
  date?: string;
  amount?: number;
  taxAmount?: number;
  items?: Array<{ name: string; amount: number }>;
} {
  const result: any = {
    items: []
  };
  
  // 日付の抽出
  const datePatterns = [
    /(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/,
    /(\d{2})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const year = match[1].length === 2 ? `20${match[1]}` : match[1];
      result.date = `${year}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      break;
    }
  }
  
  // 金額の抽出
  const amountPattern = /[合計|計|total]\s*[:：]?\s*[¥￥]?\s*(\d{1,3}(?:,\d{3})*)/gi;
  const amountMatches = text.match(amountPattern);
  if (amountMatches && amountMatches.length > 0) {
    const amountStr = amountMatches[amountMatches.length - 1];
    result.amount = parseInt(amountStr.replace(/[^\d]/g, ''));
  }
  
  // 税額の抽出
  const taxPattern = /(?:消費税|税)\s*(?:\(?\d+%\)?)?\s*[:：]?\s*[¥￥]?\s*(\d{1,3}(?:,\d{3})*)/gi;
  const taxMatches = text.match(taxPattern);
  if (taxMatches && taxMatches.length > 0) {
    const taxStr = taxMatches[0];
    result.taxAmount = parseInt(taxStr.replace(/[^\d]/g, ''));
  }
  
  // 店舗名の抽出（最初の行を店舗名と仮定）
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length > 0) {
    result.vendor = lines[0].trim();
  }
  
  return result;
}