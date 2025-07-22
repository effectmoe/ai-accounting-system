'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { TenantProvider } from '@/contexts/TenantContext';

export function AppInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 本番環境でconsoleをloggerに置き換え
    // デバッグのため一時的に無効化
    // if (process.env.NODE_ENV === 'production') {
    //   logger.replaceConsole();
    // }
  }, []);

  return (
    <TenantProvider>
      {children}
    </TenantProvider>
  );
}