'use client';

import { useState, useEffect, useCallback } from 'react';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      console.log('[useAuth] Starting auth check...');
      setIsLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

      const response = await fetch('/api/auth/check', {
        signal: controller.signal,
        cache: 'no-store'
      });

      clearTimeout(timeoutId);
      console.log('[useAuth] Auth check response:', response.status);

      if (!response.ok && response.status !== 401) {
        throw new Error(`Auth check failed with status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[useAuth] Auth data:', data);
      setIsAuthenticated(data.authenticated ?? false);
    } catch (error) {
      console.error('[useAuth] Auth check error:', error);
      // エラーの場合は認証なしとして扱う
      setIsAuthenticated(false);
    } finally {
      console.log('[useAuth] Auth check completed');
      setIsLoading(false);
    }
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    console.log('[useAuth] Component mounted, checking auth...');
    checkAuth();
  }, [checkAuth]);

  return {
    isAuthenticated,
    isLoading,
    checkAuth,
    logout,
  };
}