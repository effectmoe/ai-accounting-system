'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export function AppInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 本番環境でconsoleをloggerに置き換え
    if (process.env.NODE_ENV === 'production') {
      logger.replaceConsole();
    }
  }, []);

  return <>{children}</>;
}