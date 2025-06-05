
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { useRundownCalculations } from './useRundownCalculations';

export const useTimeCalculations = (
  items: RundownItem[], 
  updateItem: (id: string, field: string, value: string) => void, 
  rundownStartTime: string
) => {
  const { timeToSeconds } = useRundownCalculations(items);
  const lastProcessedRef = useRef<string>('');
  const isProcessingRef = useRef(false);
  const batchUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stable functions with useCallback
  const secondsToTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const calculateEndTime = useCallback((startTime: string, duration: string) => {
    const safeStartTime = startTime || '00:00:00';
    const safeDuration = duration || '00:00:00';
    
    const startSeconds = timeToSeconds(safeStartTime);
    const durationSeconds = timeToSeconds(safeDuration);
    return secondsToTime(startSeconds + durationSeconds);
  }, [timeToSeconds, secondsToTime]);

  const calculateElapsedTime = useCallback((startTime: string, rundownStartTime: string) => {
    const safeStartTime = startTime || '00:00:00';
    const safeRundownStartTime = rundownStartTime || '00:00:00';
    
    const startSeconds = timeToSeconds(safeStartTime);
    const rundownStartSeconds = timeToSeconds(safeRundownStartTime);
    const elapsedSeconds = startSeconds - rundownStartSeconds;
    return secondsToTime(Math.max(0, elapsedSeconds));
  }, [timeToSeconds, secondsToTime]);

  const getRowStatus = useCallback((item: RundownItem, currentTime: Date) => {
    const formatTime = (time: Date) => {
      return time.toLocaleTimeString('en-US', { hour12: false });
    };
    
    const now = formatTime(currentTime);
    const currentSeconds = timeToSeconds(now);
    const startSeconds = timeToSeconds(item.startTime);
    const endSeconds = timeToSeconds(item.endTime);
    
    if (currentSeconds >= startSeconds && currentSeconds < endSeconds) {
      return 'current';
    } else if (currentSeconds >= endSeconds) {
      return 'completed';
    }
    return 'upcoming';
  }, [timeToSeconds]);

  // Create a more stable signature that ignores frequently changing fields
  const currentSignature = useMemo(() => {
    const essentialData = items.map(item => {
      // Only include fields that affect time calculations
      const key = `${item.id}:${item.type}:${item.duration || '00:00:00'}:${item.isFloating ? '1' : '0'}`;
      return key;
    }).join('|');
    return `${items.length}-${rundownStartTime}-${essentialData}`;
  }, [items, rundownStartTime]);

  // Batched update function to prevent rapid successive updates
  const performBatchedUpdate = useCallback((updates: Array<{ id: string; field: string; value: string }>) => {
    if (batchUpdateTimeoutRef.current) {
      clearTimeout(batchUpdateTimeoutRef.current);
    }

    batchUpdateTimeoutRef.current = setTimeout(() => {
      // Group updates by item ID to minimize calls
      const updatesByItem = new Map<string, Array<{ field: string; value: string }>>();
      
      updates.forEach(update => {
        if (!updatesByItem.has(update.id)) {
          updatesByItem.set(update.id, []);
        }
        updatesByItem.get(update.id)!.push({ field: update.field, value: update.value });
      });

      // Apply updates
      updatesByItem.forEach((itemUpdates, itemId) => {
        itemUpdates.forEach(update => {
          updateItem(itemId, update.field, update.value);
        });
      });

      isProcessingRef.current = false;
    }, 10); // Small delay to batch updates
  }, [updateItem]);

  // Optimized recalculation with reduced frequency
  useEffect(() => {
    if (!items.length || !rundownStartTime || isProcessingRef.current) return;

    // Skip if we've already processed this exact state
    if (lastProcessedRef.current === currentSignature) return;

    isProcessingRef.current = true;
    let currentTime = rundownStartTime || '00:00:00';
    const updates: Array<{ id: string; field: string; value: string }> = [];

    try {
      // First pass: assign segment names to headers that don't have them
      let headerCount = 0;
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      
      items.forEach((item, index) => {
        if (isHeaderItem(item)) {
          const expectedSegmentName = letters[headerCount] || 'A';
          if (!item.segmentName || item.segmentName !== expectedSegmentName) {
            updates.push({ id: item.id, field: 'segmentName', value: expectedSegmentName });
          }
          headerCount++;
        }
      });

      // Second pass: calculate times only for items that actually need updates
      items.forEach((item, index) => {
        const expectedElapsedTime = calculateElapsedTime(currentTime, rundownStartTime);

        if (isHeaderItem(item)) {
          // Headers start and end at the same time
          if (item.startTime !== currentTime) {
            updates.push({ id: item.id, field: 'startTime', value: currentTime });
          }
          if (item.endTime !== currentTime) {
            updates.push({ id: item.id, field: 'endTime', value: currentTime });
          }
          if (item.elapsedTime !== expectedElapsedTime) {
            updates.push({ id: item.id, field: 'elapsedTime', value: expectedElapsedTime });
          }
        } else {
          // Regular items
          const itemDuration = item.duration || '00:00:00';
          const expectedEndTime = calculateEndTime(currentTime, itemDuration);
          
          if (item.startTime !== currentTime) {
            updates.push({ id: item.id, field: 'startTime', value: currentTime });
          }
          
          if (item.endTime !== expectedEndTime) {
            updates.push({ id: item.id, field: 'endTime', value: expectedEndTime });
          }

          if (item.elapsedTime !== expectedElapsedTime) {
            updates.push({ id: item.id, field: 'elapsedTime', value: expectedElapsedTime });
          }
          
          // Advance time only for non-floating items
          if (!item.isFloating && !item.isFloated) {
            currentTime = expectedEndTime;
          }
        }
      });

      // Apply batched updates only if there are actual changes
      if (updates.length > 0) {
        performBatchedUpdate(updates);
      } else {
        isProcessingRef.current = false;
      }

      lastProcessedRef.current = currentSignature;
    } catch (error) {
      console.error('Error in time calculations:', error);
      isProcessingRef.current = false;
    }
  }, [currentSignature, calculateElapsedTime, calculateEndTime, performBatchedUpdate, rundownStartTime]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (batchUpdateTimeoutRef.current) {
        clearTimeout(batchUpdateTimeoutRef.current);
      }
    };
  }, []);

  return {
    calculateEndTime,
    getRowStatus
  };
};
