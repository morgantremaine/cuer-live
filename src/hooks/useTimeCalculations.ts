
import { useEffect } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';

export const useTimeCalculations = (
  items: RundownItem[], 
  updateItem: (id: string, field: string, value: string) => void, 
  rundownStartTime: string
) => {
  const timeToSeconds = (timeStr: string) => {
    if (!timeStr) return 0;
    // Handle both MM:SS and HH:MM:SS formats
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      // MM:SS format (minutes:seconds)
      const [minutes, seconds] = parts;
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      // HH:MM:SS format
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  };

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
    let currentTime = rundownStartTime;
    let currentSegmentLetter = 'A';
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    items.forEach((item, index) => {
      // Calculate elapsed time for this item
      const expectedElapsedTime = calculateElapsedTime(currentTime, rundownStartTime);

      // For headers, assign segment letter and update timing
      if (isHeaderItem(item)) {
        const segmentName = letters[Math.max(0, Math.floor(index / 10))] || currentSegmentLetter;
        
        if (item.segmentName !== segmentName) {
          updateItem(item.id, 'segmentName', segmentName);
        }
        
        if (item.startTime !== currentTime || item.endTime !== currentTime) {
          updateItem(item.id, 'startTime', currentTime);
          updateItem(item.id, 'endTime', currentTime);
        }
        
        if (item.elapsedTime !== expectedElapsedTime) {
          updateItem(item.id, 'elapsedTime', expectedElapsedTime);
        }
        
        currentSegmentLetter = segmentName;
      } else {
        // For regular items, calculate start and end based on duration
        const expectedEndTime = calculateEndTime(currentTime, item.duration || '00:01:00');
        
        if (item.startTime !== currentTime) {
          updateItem(item.id, 'startTime', currentTime);
        }
        
        if (item.endTime !== expectedEndTime) {
          updateItem(item.id, 'endTime', expectedEndTime);
        }

        if (item.elapsedTime !== expectedElapsedTime) {
          updateItem(item.id, 'elapsedTime', expectedElapsedTime);
        }
        
        // Only advance time if the item is not floated
        if (!item.isFloating && !item.isFloated) {
          currentTime = expectedEndTime;
        }
      }
    });
  }, [items, updateItem, rundownStartTime]);

  return {
    calculateEndTime,
    getRowStatus
  };
};
