'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { TenantConfig, TenantType, UIMode, DEFAULT_ENTERPRISE_FEATURES, DEFAULT_INDIVIDUAL_CONTRACTOR_FEATURES } from '@/types/tenant';

interface TenantContextType {
  tenant: TenantConfig | null;
  loading: boolean;
  error: Error | null;
  updateTenant: (config: Partial<TenantConfig>) => Promise<void>;
  switchUIMode: (mode: UIMode) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchTenantConfig();
  }, []);

  const fetchTenantConfig = async () => {
    try {
      setLoading(true);
      // TODO: 実際のAPIエンドポイントから取得
      // const response = await fetch('/api/tenant/config');
      // const data = await response.json();
      
      // 暫定的にローカルストレージまたはデフォルト値を使用
      const savedConfig = localStorage.getItem('tenantConfig');
      if (savedConfig) {
        setTenant(JSON.parse(savedConfig));
      } else {
        // デフォルトでエンタープライズモード
        const defaultConfig: TenantConfig = {
          tenantId: 'default',
          tenantType: TenantType.ENTERPRISE,
          companyInfo: {
            name: 'デフォルト企業',
            scale: 'medium'
          },
          features: DEFAULT_ENTERPRISE_FEATURES,
          uiMode: UIMode.ENTERPRISE,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        setTenant(defaultConfig);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const updateTenant = async (config: Partial<TenantConfig>) => {
    try {
      if (!tenant) return;
      
      const updatedTenant = {
        ...tenant,
        ...config,
        updatedAt: new Date()
      };
      
      // TODO: APIで更新
      // await fetch('/api/tenant/config', {
      //   method: 'PUT',
      //   body: JSON.stringify(updatedTenant)
      // });
      
      // ローカルストレージに保存
      localStorage.setItem('tenantConfig', JSON.stringify(updatedTenant));
      setTenant(updatedTenant);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const switchUIMode = (mode: UIMode) => {
    if (!tenant) return;
    
    updateTenant({ uiMode: mode });
  };

  return (
    <TenantContext.Provider
      value={{
        tenant,
        loading,
        error,
        updateTenant,
        switchUIMode
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

// ヘルパーフック
export function useIsIndividualContractor() {
  const { tenant } = useTenant();
  return tenant?.tenantType === TenantType.INDIVIDUAL_CONTRACTOR;
}

export function useIsSimplifiedUI() {
  const { tenant } = useTenant();
  return tenant?.uiMode === UIMode.SIMPLIFIED;
}

export function useFeatureFlag(feature: keyof TenantConfig['features']) {
  const { tenant } = useTenant();
  return tenant?.features[feature] ?? false;
}