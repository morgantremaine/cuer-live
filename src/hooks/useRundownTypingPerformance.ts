import { useCallback, useRef, useMemo } from 'react';
import { useTypingOptimization } from './useTypingOptimization';

interface UseRundownTypingPerformanceProps {
  items: any[];
  onUpdateItem: (id: string, field: string, value: string) => void;
  isLargeRundown?: boolean;
}

/**
 * Specialized hook for optimizing rundown typing performance
 * Combines typing optimization with rundown-specific optimizations
 */
export const useRundownTypingPerformance = ({
  items,
  onUpdateItem,
  isLargeRundown = false
}: UseRundownTypingPerformanceProps) => {
  const currentlyEditingRef = useRef<string | null>(null);
  const lastEditTimeRef = useRef<number>(0);
  
  // Use typing optimization for debounced updates
  const typingOptimization = useTypingOptimization({
    itemCount: items.length,
    onUpdateItem,
    isLargeRundown
  });
  
  // Enhanced update function that tracks active editing
  const optimizedUpdateItem = useCallback((itemId: string, field: string, value: string) => {
    const now = Date.now();
    const editKey = `${itemId}-${field}`;
    
    // Track which cell is currently being edited
    currentlyEditingRef.current = editKey;
    lastEditTimeRef.current = now;
    
    // Use typing optimization for the actual update
    typingOptimization.optimizedUpdateItem(itemId, field, value);
    
    // Clear editing state after a delay
    setTimeout(() => {
      if (currentlyEditingRef.current === editKey && 
          now === lastEditTimeRef.current) {
        currentlyEditingRef.current = null;
      }
    }, 1000);
  }, [typingOptimization.optimizedUpdateItem]);
  
  // Memoized function to check if a specific cell is being edited
  const isCellBeingEdited = useCallback((itemId: string, field: string) => {
    return currentlyEditingRef.current === `${itemId}-${field}`;
  }, []);
  
  // Performance metrics
  const performanceMetrics = useMemo(() => ({
    itemCount: items.length,
    isLargeRundown,
    isActivelyTyping: typingOptimization.isActivelyTyping(),
    hasPendingUpdates: typingOptimization.hasPendingUpdates(),
    currentlyEditing: currentlyEditingRef.current
  }), [items.length, isLargeRundown, typingOptimization]);
  
  return {
    optimizedUpdateItem,
    isCellBeingEdited,
    flushPendingUpdates: typingOptimization.flushPendingUpdates,
    performanceMetrics
  };
};