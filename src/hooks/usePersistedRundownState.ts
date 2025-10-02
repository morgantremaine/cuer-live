import { useState, useEffect, useRef, useCallback } from 'react';
import { useSimplifiedRundownState } from './useSimplifiedRundownState';

// State cache to persist rundown state across navigation
const stateCache = new Map<string, any>();
const connectionCache = new Map<string, any>();

// Cache key generation
const getCacheKey = (rundownId: string | null) => rundownId || 'new';

// Cleanup old cache entries (keep only last 5 rundowns)
const cleanupCache = () => {
  if (stateCache.size > 5) {
    const keys = Array.from(stateCache.keys());
    const oldKeys = keys.slice(0, keys.length - 5);
    oldKeys.forEach(key => {
      stateCache.delete(key);
      connectionCache.delete(key);
    });
  }
};

/**
 * CRITICAL FIX: This hook was creating a DUPLICATE operation system via useSimplifiedRundownState
 * which caused competing broadcast subscriptions and historical operation loading.
 * 
 * Pass 'SKIP_OPERATION_SYSTEM' as parameter to prevent operation system creation.
 * The operation system should come from useRundownStateCoordination.
 */
export const usePersistedRundownState = (skipOperationSystem?: string) => {
  const rundownState = useSimplifiedRundownState(skipOperationSystem);
  const { rundownId } = rundownState;
  const cacheKey = getCacheKey(rundownId);
  const isRestoringRef = useRef(false);
  const lastCacheKeyRef = useRef<string | null>(null);

  // Restore state from cache when rundown changes
  useEffect(() => {
    if (lastCacheKeyRef.current === cacheKey || isRestoringRef.current) {
      return;
    }

    const cachedState = stateCache.get(cacheKey);
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

    stateCache.set(cacheKey, stateToCache);
    cleanupCache();
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
      stateCache.delete(cacheKey);
      connectionCache.delete(cacheKey);
    }, [cacheKey])
  };
};
