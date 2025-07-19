import { useEffect, useState } from 'react';

/**
 * 動的インポート用のカスタムフック
 * 大きなライブラリを必要な時にのみロード
 */
export function useDynamicImport<T>(
  importFunction: () => Promise<{ default: T } | T>,
  dependencies: any[] = []
) {
  const [module, setModule] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadModule = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const importedModule = await importFunction();
        
        if (mounted) {
          // デフォルトエクスポートかどうかをチェック
          const moduleValue = 'default' in importedModule 
            ? importedModule.default 
            : importedModule as T;
          
          setModule(moduleValue);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load module'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadModule();

    return () => {
      mounted = false;
    };
  }, dependencies);

  return { module, loading, error };
}

/**
 * 大きなライブラリの動的インポート例
 */
export const dynamicImports = {
  // PDFレンダラー（大きなライブラリ）
  pdfRenderer: () => import('@react-pdf/renderer'),
  
  // Recharts（グラフライブラリ）
  recharts: () => import('recharts'),
  
  // Framer Motion（アニメーションライブラリ）
  framerMotion: () => import('framer-motion'),
  
  // Date-fns の特定の関数のみ
  dateFnsFormat: () => import('date-fns/format'),
  dateFnsParseISO: () => import('date-fns/parseISO'),
  
  // Azure AI Form Recognizer（OCR用）
  azureFormRecognizer: () => import('@azure/ai-form-recognizer'),
};