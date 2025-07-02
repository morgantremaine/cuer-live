
import { useRef, useCallback, useMemo } from 'react';

interface OptimizedCellRefsManager {
  getCellRef: (key: string) => React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
  clearUnusedRefs: (activeKeys: string[]) => void;
  getAllRefs: () => { [key: string]: HTMLInputElement | HTMLTextAreaElement };
}

export const useOptimizedCellRefs = (): OptimizedCellRefsManager => {
  const refsMap = useRef(new Map<string, React.RefObject<HTMLInputElement | HTMLTextAreaElement>>());
  const lastCleanup = useRef(Date.now());

  const getCellRef = useCallback((key: string) => {
    if (!refsMap.current.has(key)) {
      refsMap.current.set(key, { current: null });
    }
    return refsMap.current.get(key)!;
  }, []);

  const clearUnusedRefs = useCallback((activeKeys: string[]) => {
    const now = Date.now();
    // Only cleanup every 5 seconds to avoid excessive work
    if (now - lastCleanup.current < 5000) return;
    
    const activeSet = new Set(activeKeys);
    const keysToDelete: string[] = [];
    
    refsMap.current.forEach((ref, key) => {
      if (!activeSet.has(key)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      refsMap.current.delete(key);
    });
    
    lastCleanup.current = now;
  }, []);

  const getAllRefs = useCallback(() => {
    const result: { [key: string]: HTMLInputElement | HTMLTextAreaElement } = {};
    refsMap.current.forEach((ref, key) => {
      if (ref.current) {
        result[key] = ref.current;
      }
    });
    return result;
  }, []);

  return useMemo(() => ({
    getCellRef,
    clearUnusedRefs,
    getAllRefs
  }), [getCellRef, clearUnusedRefs, getAllRefs]);
};
