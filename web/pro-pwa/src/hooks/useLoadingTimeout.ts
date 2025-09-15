
import { useState, useEffect } from 'react';

interface UseLoadingTimeoutProps {
  timeout?: number;
  initialLoading?: boolean;
}

export const useLoadingTimeout = ({ 
  timeout = 8000, 
  initialLoading = false 
}: UseLoadingTimeoutProps = {}) => {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setHasTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      setHasTimedOut(true);
      setIsLoading(false);
    }, timeout);

    return () => clearTimeout(timer);
  }, [isLoading, timeout]);

  const startLoading = () => {
    setIsLoading(true);
    setHasTimedOut(false);
  };

  const stopLoading = () => {
    setIsLoading(false);
    setHasTimedOut(false);
  };

  return {
    isLoading,
    hasTimedOut,
    startLoading,
    stopLoading,
    setIsLoading
  };
};
