'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Sparkles } from 'lucide-react';

export interface QuickOption {
  title: string;
  description: string;
  price: string;
  features: string[];
  ctaText: string;
  ctaUrl: string;
}

interface OptionQuickCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (option: QuickOption) => void;
  baseUrl?: string;
}

export default function OptionQuickCreator({
  isOpen,
  onClose,
  onAdd,
  baseUrl = ''
}: OptionQuickCreatorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [features, setFeatures] = useState<string[]>(['']);
  const [ctaText, setCtaText] = useState('詳細を見る');

  const addFeature = () => {
    setFeatures([...features, '']);
  };

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const updateFeature = (index: number, value: string) => {
    setFeatures(features.map((f, i) => i === index ? value : f));
  };

  const handleSubmit = () => {
    const option: QuickOption = {
      title,
      description,
      price,
      features: features.filter(f => f.trim() !== ''),
      ctaText,
      ctaUrl: `${baseUrl}/options/${Date.now()}`, // 自動生成されるURL
    };
    
    onAdd(option);
    
    // フォームをリセット
    setTitle('');
    setDescription('');
    setPrice('');
    setFeatures(['']);
    setCtaText('詳細を見る');
    
    onClose();
  };

  const loadTemplate = (templateType: 'premium' | 'maintenance' | 'training') => {
    switch (templateType) {
      case 'premium':
        setTitle('🚀 プレミアムサポートプラン');
        setDescription('優先サポートと拡張保証でビジネスを加速');
        setPrice('月額 ¥30,000');
        setFeatures([
          '24時間以内の優先対応',
          '専任サポート担当者',
          '月次レポート作成',
          '無償アップデート'
        ]);
        setCtaText('プレミアムプランを申し込む');
        break;
      case 'maintenance':
        setTitle('🛡️ 年間保守契約');
        setDescription('安心の年間サポートで継続的な運用をサポート');
        setPrice('年額 ¥200,000');
        setFeatures([
          '定期メンテナンス（月1回）',
          'バグ修正・改善対応',
          'セキュリティアップデート',
          'データバックアップ管理'
        ]);
        setCtaText('保守契約を申し込む');
        break;
      case 'training':
        setTitle('📚 導入トレーニング');
        setDescription('システムを最大限活用するための研修プログラム');
        setPrice('¥100,000（3回セット）');
        setFeatures([
          '操作方法の実地研修',
          'カスタマイズ設定支援',
          'マニュアル作成',
          'Q&Aセッション'
        ]);
        setCtaText('トレーニングを申し込む';
        break;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            オプション簡単作成
          </DialogTitle>
          <DialogDescription>
            提案オプションを簡単に作成できます。テンプレートから選ぶか、カスタムで作成してください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          {/* テンプレート選択 */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadTemplate('premium')}
            >
              プレミアムテンプレート
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadTemplate('maintenance')}
            >
              保守契約テンプレート
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadTemplate('training')}
            >
              トレーニングテンプレート
            </Button>
          </div>

          {/* タイトル */}
          <div>
            <Label htmlFor="title">タイトル（絵文字も使えます）</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 🚀 プレミアムサポートプラン"
              className="mt-1"
            />
          </div>

          {/* 説明 */}
          <div>
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="このオプションの概要を入力してください"
              className="mt-1"
              rows={2}
            />
          </div>

          {/* 価格 */}
          <div>
            <Label htmlFor="price">価格</Label>
            <Input
              id="price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="例: 月額 ¥20,000 または ¥100,000"
              className="mt-1"
            />
          </div>

          {/* 特徴 */}
          <div>
            <Label>特徴・機能</Label>
            <div className="space-y-2 mt-1">
              {features.map((feature, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    placeholder="特徴を入力"
                  />
                  {features.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFeature(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addFeature}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                特徴を追加
              </Button>
            </div>
          </div>

          {/* CTAテキスト */}
          <div>
            <Label htmlFor="ctaText">ボタンテキスト</Label>
            <Input
              id="ctaText"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="例: 詳細を見る、申し込む"
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title || !price || features.filter(f => f.trim()).length === 0}
          >
            オプションを追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}