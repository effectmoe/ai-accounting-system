'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function ViewQuotePage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuote = async () => {
      try {
        const quoteId = params.id as string;
        const trackingId = new URLSearchParams(window.location.search).get('t');
        
        // 見積書データを取得
        const quoteRes = await fetch(`/api/quotes/${quoteId}`);
        if (!quoteRes.ok) {
          throw new Error('見積書が見つかりません');
        }
        const quote = await quoteRes.json();

        // 会社情報を取得
        const companyRes = await fetch('/api/company-info');
        if (!companyRes.ok) {
          throw new Error('会社情報の取得に失敗しました');
        }
        const companyInfo = await companyRes.json();

        // HTMLプレビューを生成（Web最適化レイアウトを使用）
        const previewRes = await fetch('/api/quotes/preview-html', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote,
            companyInfo,
            includeTracking: !!trackingId,
            useWebLayout: true, // Web最適化レイアウトを使用
          }),
        });

        if (!previewRes.ok) {
          throw new Error('プレビューの生成に失敗しました');
        }

        const { html } = await previewRes.json();
        setHtmlContent(html);
      } catch (err) {
        logger.error('Error loading quote:', err);
        setError(err instanceof Error ? err.message : '見積書の読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadQuote();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">見積書を読み込んでいます...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-600">エラー</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Web最適化レイアウトはフルスクリーン幅で表示 */}
      <div 
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        className="quote-html-content"
      />
      <style jsx global>{`
        .quote-html-content {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        .quote-html-content table {
          width: 100%;
          border-collapse: collapse;
        }
        .quote-html-content img {
          max-width: 100%;
          height: auto;
        }
        
        /* ツールチップのホバー効果 - 念のため追加 */
        .quote-html-content .tooltip-wrapper {
          position: relative;
          display: inline-block;
        }
        
        .quote-html-content .tooltip-wrapper:hover .tooltip-content {
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        .quote-html-content .tooltip-content {
          visibility: hidden;
          opacity: 0;
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background-color: #1f2937;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          white-space: nowrap;
          max-width: 300px;
          z-index: 1000;
          margin-bottom: 8px;
          transition: opacity 0.2s, visibility 0.2s;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .quote-html-content .tooltip-content::after {
          content: "";
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-width: 5px;
          border-style: solid;
          border-color: #1f2937 transparent transparent transparent;
        }
      `}</style>
    </div>
  );
}