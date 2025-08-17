'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function QuotePreviewPage() {
  const params = useParams();
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuoteHtml = async () => {
      try {
        const quoteId = params.id as string;
        
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

        // HTMLプレビューを生成
        const previewRes = await fetch('/api/quotes/preview-html', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quote,
            companyInfo,
            useWebLayout: true,
            includeTracking: false,
            // HTML見積書エディタから保存されたツールチップとリンクを取得
            tooltips: quote.htmlSettings?.tooltips || [],
            productLinks: quote.htmlSettings?.productLinks || [],
            suggestedOptions: quote.htmlSettings?.suggestedOptions || [],
            customMessage: quote.htmlSettings?.customMessage || '',
          }),
        });
        
        // デバッグログ: 送信したデータをログ出力
        console.log('📄 Preview data sent:', {
          quoteId: quote._id,
          hasNotes: !!quote.notes,
          notesLength: quote.notes?.length || 0,
          notesPreview: quote.notes?.substring(0, 100) || 'なし',
          tooltipsCount: quote.htmlSettings?.tooltips ? quote.htmlSettings.tooltips.length : 0,
          tooltipsData: quote.htmlSettings?.tooltips || [],
          productLinksCount: quote.htmlSettings?.productLinks ? quote.htmlSettings.productLinks.length : 0,
          productLinksData: quote.htmlSettings?.productLinks || [],
          hasCustomMessage: !!quote.htmlSettings?.customMessage,
          customMessage: quote.htmlSettings?.customMessage || 'なし'
        });

        if (!previewRes.ok) {
          throw new Error('プレビューの生成に失敗しました');
        }

        const previewData = await previewRes.json();
        setHtmlContent(previewData.html);
      } catch (err) {
        console.error('Error loading preview:', err);
        setError(err instanceof Error ? err.message : 'プレビューの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadQuoteHtml();
  }, [params.id]);

  if (loading) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 className="h-8 w-8 animate-spin" style={{ margin: '0 auto' }} />
          <p style={{ marginTop: '16px', color: '#6b7280' }}>見積書を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ 
          textAlign: 'center',
          backgroundColor: 'white',
          padding: '32px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444', marginBottom: '8px' }}>
            エラー
          </h2>
          <p style={{ color: '#6b7280' }}>{error}</p>
        </div>
      </div>
    );
  }

  // HTML見積書をフルサイズで表示（iframe使用 + フォールバック）
  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
      {/* iframe + 直接HTML表示のフォールバック */}
      <iframe
        srcDoc={htmlContent}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          margin: 0,
          padding: 0,
        }}
        title="見積書プレビュー"
        onError={(e) => {
          console.error('iframe loading error:', e);
          // iframeエラー時のフォールバック処理
        }}
      />
      
      {/* デバッグ用: HTMLを直接表示（開発環境でのみ） */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          style={{ 
            position: 'absolute', 
            top: '10px', 
            right: '10px', 
            zIndex: 10000,
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '12px'
          }}
        >
          <button 
            onClick={() => {
              const newWindow = window.open('', '_blank');
              if (newWindow) {
                newWindow.document.write(htmlContent);
                newWindow.document.close();
              }
            }}
            style={{
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            新しいウィンドウで開く
          </button>
        </div>
      )}
    </div>
  );
}