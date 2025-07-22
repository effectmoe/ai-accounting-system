'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTenant } from '@/contexts/TenantContext';
import { TenantType, UIMode, DEFAULT_ENTERPRISE_FEATURES, DEFAULT_INDIVIDUAL_CONTRACTOR_FEATURES } from '@/types/tenant';
import { Building2, Hammer, Check } from 'lucide-react';

export default function TenantSwitchPage() {
  const router = useRouter();
  const { tenant, updateTenant } = useTenant();
  const [selectedType, setSelectedType] = useState<TenantType>(tenant?.tenantType || TenantType.ENTERPRISE);

  const handleSwitch = async () => {
    const newTenantType = selectedType;
    const newFeatures = newTenantType === TenantType.INDIVIDUAL_CONTRACTOR 
      ? DEFAULT_INDIVIDUAL_CONTRACTOR_FEATURES 
      : DEFAULT_ENTERPRISE_FEATURES;
    
    const newUIMode = newTenantType === TenantType.INDIVIDUAL_CONTRACTOR 
      ? UIMode.SIMPLIFIED 
      : UIMode.ENTERPRISE;

    await updateTenant({
      tenantType: newTenantType,
      features: newFeatures,
      uiMode: newUIMode,
      companyInfo: {
        ...tenant?.companyInfo,
        industry: newTenantType === TenantType.INDIVIDUAL_CONTRACTOR ? 'construction' : 'general',
        scale: newTenantType === TenantType.INDIVIDUAL_CONTRACTOR ? 'individual' : 'medium'
      }
    });

    // リダイレクト
    if (newTenantType === TenantType.INDIVIDUAL_CONTRACTOR) {
      router.push('/dashboard/individual-contractor');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">テナントモード切り替え</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card 
          className={`cursor-pointer transition-all ${
            selectedType === TenantType.ENTERPRISE 
              ? 'border-blue-500 shadow-lg' 
              : 'hover:shadow-md'
          }`}
          onClick={() => setSelectedType(TenantType.ENTERPRISE)}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Building2 className="h-6 w-6" />
                エンタープライズモード
              </span>
              {selectedType === TenantType.ENTERPRISE && (
                <Check className="h-5 w-5 text-blue-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              中小企業向けの高機能な会計システム
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                承認ワークフロー
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                高度な分析機能
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                マルチユーザー対応
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                API アクセス
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${
            selectedType === TenantType.INDIVIDUAL_CONTRACTOR 
              ? 'border-orange-500 shadow-lg' 
              : 'hover:shadow-md'
          }`}
          onClick={() => setSelectedType(TenantType.INDIVIDUAL_CONTRACTOR)}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Hammer className="h-6 w-6" />
                1人親方モード
              </span>
              {selectedType === TenantType.INDIVIDUAL_CONTRACTOR && (
                <Check className="h-5 w-5 text-orange-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              建設業の個人事業主向けシンプル版
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                タイムライン表示
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                プロジェクト原価管理
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                モバイル現場入力
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                青色申告65万円控除対応
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                建設業向け勘定科目
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="text-center mt-8">
        <Button 
          size="lg" 
          onClick={handleSwitch}
          className={
            selectedType === TenantType.INDIVIDUAL_CONTRACTOR
              ? 'bg-orange-500 hover:bg-orange-600'
              : ''
          }
        >
          {selectedType === TenantType.INDIVIDUAL_CONTRACTOR 
            ? '1人親方モードに切り替える' 
            : 'エンタープライズモードに切り替える'}
        </Button>
      </div>

      <div className="text-center mt-4 text-sm text-gray-500">
        現在のモード: {tenant?.tenantType === TenantType.INDIVIDUAL_CONTRACTOR ? '1人親方' : 'エンタープライズ'}
      </div>
    </div>
  );
}