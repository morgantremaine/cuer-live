
import { useEffect, useRef } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { useRundownCalculations } from './useRundownCalculations';

export const useTimeCalculations = (
  items: RundownItem[], 
  updateItem: (id: string, field: string, value: string) => void, 
  rundownStartTime: string
) => {
  const { calculateSegmentName, timeToSeconds } = useRundownCalculations(items);
  const lastProcessedRef = useRef<string>('');
  const isProcessingRef = useRef(false);

  const secondsToTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateEndTime = (startTime: string, duration: string) => {
    const startSeconds = timeToSeconds(startTime);
    const durationSeconds = timeToSeconds(duration);
    return secondsToTime(startSeconds + durationSeconds);
  };

  const calculateElapsedTime = (startTime: string, rundownStartTime: string) => {
    const startSeconds = timeToSeconds(startTime);
    const rundownStartSeconds = timeToSeconds(rundownStartTime);
    const elapsedSeconds = startSeconds - rundownStartSeconds;
    return secondsToTime(Math.max(0, elapsedSeconds));
  };

  const getRowStatus = (item: RundownItem, currentTime: Date) => {
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
  };

  // Optimized recalculation with better dependency tracking
  useEffect(() => {
    if (!items.length || !rundownStartTime || isProcessingRef.current) return;

    // Create a more efficient signature
    const currentSignature = `${items.length}-${rundownStartTime}-${items.map(item => `${item.id}:${item.duration}`).join(',')}`;

    // Skip if we've already processed this exact state
    if (lastProcessedRef.current === currentSignature) return;

    isProcessingRef.current = true;
    let currentTime = rundownStartTime;
    const updates: Array<{ id: string; field: string; value: string }> = [];

    items.forEach((item, index) => {
      const expectedElapsedTime = calculateElapsedTime(currentTime, rundownStartTime);

      if (isHeaderItem(item)) {
        const segmentName = calculateSegmentName(index);
        
        if (item.segmentName !== segmentName) {
          updates.push({ id: item.id, field: 'segmentName', value: segmentName });
        }
        
        if (item.startTime !== currentTime || item.endTime !== currentTime) {
          updates.push({ id: item.id, field: 'startTime', value: currentTime });
          updates.push({ id: item.id, field: 'endTime', value: currentTime });
        }
        
        if (item.elapsedTime !== expectedElapsedTime) {
          updates.push({ id: item.id, field: 'elapsedTime', value: expectedElapsedTime });
        }
      } else {
        const expectedEndTime = calculateEndTime(currentTime, item.duration || '00:01:00');
        
        if (item.startTime !== currentTime) {
          updates.push({ id: item.id, field: 'startTime', value: currentTime });
        }
        
        if (item.endTime !== expectedEndTime) {
          updates.push({ id: item.id, field: 'endTime', value: expectedEndTime });
        }

        if (item.elapsedTime !== expectedElapsedTime) {
          updates.push({ id: item.id, field: 'elapsedTime', value: expectedElapsedTime });
        }
        
        if (!item.isFloating && !item.isFloated) {
          currentTime = expectedEndTime;
        }
      }
    });

    // Batch updates for better performance
    if (updates.length > 0) {
      updates.forEach(update => {
        updateItem(update.id, update.field, update.value);
      });
    }

    lastProcessedRef.current = currentSignature;
    isProcessingRef.current = false;
  }, [items.length, rundownStartTime, items.map(item => `${item.id}-${item.duration}`).join(',')]);

  return {
    calculateEndTime,
    getRowStatus
  };
};
