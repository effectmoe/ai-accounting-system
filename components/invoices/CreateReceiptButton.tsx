'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Receipt, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface CreateReceiptButtonProps {
  invoiceId: string;
  invoiceNumber?: string;
  invoiceStatus?: string;
  disabled?: boolean;
}

export function CreateReceiptButton({ 
  invoiceId, 
  invoiceNumber,
  invoiceStatus,
  disabled = false 
}: CreateReceiptButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateReceipt = async () => {
    // 請求書が支払済みでない場合は警告
    if (invoiceStatus && !['paid', 'partially_paid'].includes(invoiceStatus)) {
      if (!confirm('この請求書はまだ支払済みではありませんが、領収書を作成しますか？')) {
        return;
      }
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId,
          issueDate: new Date().toISOString(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: '成功',
          description: `領収書 ${data.receiptNumber} を作成しました`,
        });
        // 作成した領収書の詳細ページへ遷移
        router.push(`/receipts/${data._id}`);
      } else {
        toast({
          title: 'エラー',
          description: data.error || '領収書の作成に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('領収書作成エラー:', error);
      toast({
        title: 'エラー',
        description: '領収書の作成中にエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button 
      onClick={handleCreateReceipt}
      disabled={disabled || isCreating}
      variant="outline"
      size="sm"
    >
      {isCreating ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Receipt className="mr-2 h-4 w-4" />
      )}
      領収書作成
    </Button>
  );
}