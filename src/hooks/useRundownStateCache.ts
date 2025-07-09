import { useEffect, useRef } from 'react';

// Global state cache that persists across component unmounts
const stateCache = new Map<string, any>();
const loadingStates = new Map<string, boolean>();

export const useRundownStateCache = (rundownId: string | null) => {
  const cacheKey = rundownId || 'new';
  const mountTimeRef = useRef(Date.now());

  // Check if we have cached state for this rundown
  const hasCachedState = stateCache.has(cacheKey);
  const isCachedLoading = loadingStates.get(cacheKey) || false;

  // Cache state on unmount
  useEffect(() => {
    return () => {
      // Mark that this rundown should not show loading on remount
      if (rundownId) {
        loadingStates.set(cacheKey, false);
        console.log('📋 Cached state for rundown:', cacheKey);
      }
    };
  }, [rundownId, cacheKey]);

  // Clear cache entry after 5 minutes of inactivity
  useEffect(() => {
    const cleanup = setTimeout(() => {
      stateCache.delete(cacheKey);
      loadingStates.delete(cacheKey);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearTimeout(cleanup);
  }, [cacheKey]);

  return {
    shouldSkipLoading: hasCachedState && !isCachedLoading,
    setCacheLoading: (loading: boolean) => {
      loadingStates.set(cacheKey, loading);
    },
    clearCache: () => {
      stateCache.delete(cacheKey);
      loadingStates.delete(cacheKey);
    }
  };
};