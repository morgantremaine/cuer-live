import { useState, useEffect, useCallback } from 'react';

const getStorageKey = (rundownId: string) => `rundown-collapsed-headers-${rundownId}`;

interface UseLocalCollapsedHeadersReturn {
  collapsedHeaders: Set<string>;
  updateCollapsedHeaders: (newSet: Set<string>) => void;
}

export const useLocalCollapsedHeaders = (rundownId: string): UseLocalCollapsedHeadersReturn => {
  const [collapsedHeaders, setCollapsedHeaders] = useState<Set<string>>(new Set());

  // Load from localStorage on mount
  useEffect(() => {
    if (!rundownId) return;
    
    try {
      const storageKey = getStorageKey(rundownId);
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const headerIds: string[] = JSON.parse(saved);
        setCollapsedHeaders(new Set(headerIds));
      }
    } catch (error) {
      console.error('Failed to load collapsed headers from localStorage:', error);
      setCollapsedHeaders(new Set());
    }
  }, [rundownId]);

  // Save to localStorage whenever state changes
  const updateCollapsedHeaders = useCallback((newSet: Set<string>) => {
    setCollapsedHeaders(newSet);
    
    if (rundownId) {
      try {
        const storageKey = getStorageKey(rundownId);
        localStorage.setItem(storageKey, JSON.stringify(Array.from(newSet)));
      } catch (error) {
        console.error('Failed to save collapsed headers to localStorage:', error);
      }
    }
  }, [rundownId]);

  return { collapsedHeaders, updateCollapsedHeaders };
};
