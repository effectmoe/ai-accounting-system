'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, X, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string | null;
  fileName?: string;
}

type LoadingState = 'loading' | 'loaded' | 'error' | 'not-found';

export default function ImagePreviewModal({
  isOpen,
  onClose,
  fileId,
  fileName = '領収書画像',
}: ImagePreviewModalProps) {
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && fileId) {
      checkAndLoadImage();
    } else if (isOpen && !fileId) {
      setLoadingState('not-found');
    }

    return () => {
      // Clean up blob URL when modal closes
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [isOpen, fileId]);

  const checkAndLoadImage = async () => {
    if (!fileId) {
      setLoadingState('not-found');
      return;
    }

    setLoadingState('loading');

    try {
      // First check if file exists
      const headResponse = await fetch(`/api/files/${fileId}`, { method: 'HEAD' });

      if (!headResponse.ok) {
        setLoadingState('not-found');
        return;
      }

      // File exists, set the URL for display
      setImageUrl(`/api/files/${fileId}`);
      setLoadingState('loaded');
    } catch (error) {
      console.error('Error checking file:', error);
      setLoadingState('error');
    }
  };

  const handleDownload = () => {
    if (fileId) {
      window.open(`/api/files/${fileId}?download=true`, '_blank');
    }
  };

  const handleImageError = () => {
    setLoadingState('error');
  };

  const renderContent = () => {
    switch (loadingState) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">画像を読み込んでいます...</p>
          </div>
        );

      case 'loaded':
        return (
          <div className="flex flex-col items-center">
            <div className="w-full max-h-[60vh] overflow-auto bg-gray-100 rounded-lg p-2">
              <img
                src={imageUrl || ''}
                alt={fileName}
                className="max-w-full h-auto mx-auto"
                onError={handleImageError}
              />
            </div>
          </div>
        );

      case 'not-found':
        return (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <AlertDescription className="ml-2">
              <p className="font-semibold text-orange-800 mb-2">
                元のファイルが見つかりません
              </p>
              <p className="text-orange-700 text-sm">
                この領収書は画像データが保存される前に作成されたため、元の画像データが保存されていません。
                新しくスキャンされた領収書には元画像が保存されます。
              </p>
            </AlertDescription>
          </Alert>
        );

      case 'error':
        return (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertDescription className="ml-2">
              <p className="font-semibold text-red-800 mb-2">
                画像の読み込みに失敗しました
              </p>
              <p className="text-red-700 text-sm">
                ファイルへのアクセス中にエラーが発生しました。
                しばらく待ってから再度お試しください。
              </p>
            </AlertDescription>
          </Alert>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            元の領収書 - {fileName}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {renderContent()}
        </div>

        <DialogFooter className="gap-2">
          {loadingState === 'loaded' && (
            <Button
              variant="outline"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              ダウンロード
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
