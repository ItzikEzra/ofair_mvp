import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTokenManager } from '@/hooks/useTokenManager';

/**
 * Hook that automatically refreshes auth token on app focus/load
 */
export const useAuthRefresh = () => {
  const { isLoggedIn, isLoading } = useAuth();
  const { validateTokenAndRefresh } = useTokenManager();

  useEffect(() => {
    if (isLoggedIn && !isLoading) {
      // Validate and refresh token on mount
      validateTokenAndRefresh();
    }
  }, [isLoggedIn, isLoading, validateTokenAndRefresh]);

  useEffect(() => {
    const handleFocus = () => {
      if (isLoggedIn && !isLoading) {
        validateTokenAndRefresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isLoggedIn, isLoading, validateTokenAndRefresh]);
};