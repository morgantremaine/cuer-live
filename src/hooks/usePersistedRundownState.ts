import { useState, useEffect, useRef, useCallback } from 'react';
import { useSimplifiedRundownState } from './useSimplifiedRundownState';
import { rundownStateCache } from '@/services/RundownStateCache';

// Cache key generation
const getCacheKey = (rundownId: string | null) => rundownId || 'new';

export const usePersistedRundownState = () => {
  const rundownState = useSimplifiedRundownState();
  const { rundownId } = rundownState;
  const cacheKey = getCacheKey(rundownId);
  const isRestoringRef = useRef(false);
  const lastCacheKeyRef = useRef<string | null>(null);

  // Restore state from cache when rundown changes
  useEffect(() => {
    if (lastCacheKeyRef.current === cacheKey || isRestoringRef.current) {
      return;
    }

    const cachedState = rundownStateCache.get(cacheKey);
    if (cachedState && !rundownState.isLoading) {
      console.log('🔄 Restoring rundown state from cache for:', cacheKey);
      isRestoringRef.current = true;
      
      // Restore critical UI state
      if (cachedState.selectedRowId) {
        rundownState.handleRowSelection(cachedState.selectedRowId);
      }
      
      // Mark as restored
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 100);
    }
    
    lastCacheKeyRef.current = cacheKey;
  }, [cacheKey, rundownState.isLoading]);

  // Cache state periodically and on state changes
  useEffect(() => {
    if (isRestoringRef.current || !rundownId) return;

    const stateToCache = {
      selectedRowId: rundownState.selectedRowId,
      lastActivity: Date.now(),
      // Add other critical UI state here as needed
    };

    rundownStateCache.set(cacheKey, stateToCache);
  }, [
    rundownState.selectedRowId,
    cacheKey,
    rundownId
  ]);

  // Enhanced state with cache awareness
  return {
    ...rundownState,
    isRestoringFromCache: isRestoringRef.current,
    // Add cache control methods if needed
    clearCache: useCallback(() => {
      rundownStateCache.delete(cacheKey);
    }, [cacheKey])
  };
};
