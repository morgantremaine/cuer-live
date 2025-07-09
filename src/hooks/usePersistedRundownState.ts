import { useState, useEffect, useRef, useCallback } from 'react';
import { useSimplifiedRundownState } from './useSimplifiedRundownState';
import { getMobileOptimizedDelays } from '@/utils/realtimeUtils';

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

export const usePersistedRundownState = () => {
  const rundownState = useSimplifiedRundownState();
  const { rundownId } = rundownState;
  const cacheKey = getCacheKey(rundownId);
  const isRestoringRef = useRef(false);
  const lastCacheKeyRef = useRef<string | null>(null);
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
  const { processingDelay } = getMobileOptimizedDelays();

  // Add page visibility event listener to handle tab switching
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
      
      if (!document.hidden && rundownId) {
        // Tab became visible, restore from cache if needed
        const cachedState = stateCache.get(cacheKey);
        if (cachedState && !isRestoringRef.current) {
          console.log('🔄 Tab became visible, checking cache for:', cacheKey);
          
          // Only restore UI state, not data
          if (cachedState.selectedRowId && cachedState.selectedRowId !== rundownState.selectedRowId) {
            console.log('🔄 Restoring selected row from cache:', cachedState.selectedRowId);
            isRestoringRef.current = true;
            rundownState.handleRowSelection(cachedState.selectedRowId);
            
            setTimeout(() => {
              isRestoringRef.current = false;
            }, processingDelay);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [rundownId, cacheKey, rundownState.selectedRowId, processingDelay]);

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

  // Cache state periodically and on state changes (enhanced)
  useEffect(() => {
    if (isRestoringRef.current || !rundownId) return;

    const stateToCache = {
      selectedRowId: rundownState.selectedRowId,
      lastActivity: Date.now(),
      isTabVisible,
      timestamp: new Date().toISOString(),
      // Add other critical UI state here as needed
    };

    stateCache.set(cacheKey, stateToCache);
    cleanupCache();
    
    // Also store in sessionStorage as backup for tab switches
    try {
      sessionStorage.setItem(`rundown-state-${cacheKey}`, JSON.stringify(stateToCache));
    } catch (error) {
      console.warn('Failed to save to sessionStorage:', error);
    }
  }, [
    rundownState.selectedRowId,
    cacheKey,
    rundownId,
    isTabVisible
  ]);

  // Enhanced state with cache awareness and tab visibility
  return {
    ...rundownState,
    isRestoringFromCache: isRestoringRef.current,
    isTabVisible,
    // Add cache control methods if needed
    clearCache: useCallback(() => {
      stateCache.delete(cacheKey);
      connectionCache.delete(cacheKey);
      try {
        sessionStorage.removeItem(`rundown-state-${cacheKey}`);
      } catch (error) {
        console.warn('Failed to clear sessionStorage:', error);
      }
    }, [cacheKey])
  };
};
