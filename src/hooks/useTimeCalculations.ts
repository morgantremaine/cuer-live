
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
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Create a stable signature that focuses only on essential data for time calculations
  const timeCalculationSignature = useMemo(() => {
    // Only include data that actually affects time calculations
    const essentialData = items.map((item, index) => {
      return `${item.id}:${item.type}:${item.duration || '00:00:00'}:${item.isFloating ? '1' : '0'}:${index}`;
    }).join('|');
    return `${items.length}-${rundownStartTime}-${essentialData}`;
  }, [items, rundownStartTime]);

  // Debounced time calculation to prevent rapid successive updates
  useEffect(() => {
    // Skip if already processing or no changes
    if (isProcessingRef.current || !items.length || !rundownStartTime) {
      return;
    }

    // Skip if signature hasn't changed
    if (lastProcessedRef.current === timeCalculationSignature) {
      return;
    }

    // Clear any existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Debounce the calculation
    updateTimeoutRef.current = setTimeout(() => {
      isProcessingRef.current = true;
      
      try {
        let currentTime = rundownStartTime || '00:00:00';
        const batchUpdates: Array<{ id: string; field: string; value: string }> = [];

        // Calculate segment names for headers
        let headerCount = 0;
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        
        items.forEach((item, index) => {
          if (isHeaderItem(item)) {
            const expectedSegmentName = letters[headerCount] || 'A';
            if (item.segmentName !== expectedSegmentName) {
              batchUpdates.push({ id: item.id, field: 'segmentName', value: expectedSegmentName });
            }
            headerCount++;
          }
        });

        // Calculate times for all items
        items.forEach((item, index) => {
          if (isHeaderItem(item)) {
            // Headers start and end at the same time
            if (item.startTime !== currentTime) {
              batchUpdates.push({ id: item.id, field: 'startTime', value: currentTime });
            }
            if (item.endTime !== currentTime) {
              batchUpdates.push({ id: item.id, field: 'endTime', value: currentTime });
            }
          } else {
            // Regular items
            const itemDuration = item.duration || '00:00:00';
            const expectedEndTime = calculateEndTime(currentTime, itemDuration);
            
            if (item.startTime !== currentTime) {
              batchUpdates.push({ id: item.id, field: 'startTime', value: currentTime });
            }
            
            if (item.endTime !== expectedEndTime) {
              batchUpdates.push({ id: item.id, field: 'endTime', value: expectedEndTime });
            }
            
            // Advance time only for non-floating items
            if (!item.isFloating && !item.isFloated) {
              currentTime = expectedEndTime;
            }
          }
        });

        // Apply all updates at once if there are changes
        if (batchUpdates.length > 0) {
          batchUpdates.forEach(update => {
            updateItem(update.id, update.field, update.value);
          });
        }

        lastProcessedRef.current = timeCalculationSignature;
      } catch (error) {
        console.error('Error in time calculations:', error);
      } finally {
        isProcessingRef.current = false;
      }
    }, 50); // 50ms debounce

  }, [timeCalculationSignature, calculateEndTime, updateItem, rundownStartTime, items]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return {
    calculateEndTime,
    getRowStatus
  };
};
