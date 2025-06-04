
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

  // Recalculate all start, end, and elapsed times and segment names
  useEffect(() => {
    if (!items.length || !rundownStartTime || isProcessingRef.current) return;

    // Create a signature to detect if we need to process
    const currentSignature = JSON.stringify({
      itemsLength: items.length,
      rundownStartTime,
      itemsHash: items.map(item => `${item.id}-${item.duration}`).join(',')
    });

    // Skip if we've already processed this exact state
    if (lastProcessedRef.current === currentSignature) return;

    isProcessingRef.current = true;
    let hasChanges = false;
    let currentTime = rundownStartTime;

    items.forEach((item, index) => {
      // Calculate elapsed time for this item
      const expectedElapsedTime = calculateElapsedTime(currentTime, rundownStartTime);

      // For headers, assign segment letter and update timing
      if (isHeaderItem(item)) {
        const segmentName = calculateSegmentName(index);
        
        if (item.segmentName !== segmentName) {
          updateItem(item.id, 'segmentName', segmentName);
          hasChanges = true;
        }
        
        if (item.startTime !== currentTime || item.endTime !== currentTime) {
          updateItem(item.id, 'startTime', currentTime);
          updateItem(item.id, 'endTime', currentTime);
          hasChanges = true;
        }
        
        if (item.elapsedTime !== expectedElapsedTime) {
          updateItem(item.id, 'elapsedTime', expectedElapsedTime);
          hasChanges = true;
        }
      } else {
        // For regular items, calculate start and end based on duration
        const expectedEndTime = calculateEndTime(currentTime, item.duration || '00:01:00');
        
        if (item.startTime !== currentTime) {
          updateItem(item.id, 'startTime', currentTime);
          hasChanges = true;
        }
        
        if (item.endTime !== expectedEndTime) {
          updateItem(item.id, 'endTime', expectedEndTime);
          hasChanges = true;
        }

        if (item.elapsedTime !== expectedElapsedTime) {
          updateItem(item.id, 'elapsedTime', expectedElapsedTime);
          hasChanges = true;
        }
        
        // Only advance time if the item is not floated
        if (!item.isFloating && !item.isFloated) {
          currentTime = expectedEndTime;
        }
      }
    });

    if (hasChanges) {
      console.log('Time calculations updated items');
    }

    lastProcessedRef.current = currentSignature;
    isProcessingRef.current = false;
  }, [items.length, rundownStartTime, items.map(item => `${item.id}-${item.duration}`).join(',')]); // More specific dependencies

  return {
    calculateEndTime,
    getRowStatus
  };
};
