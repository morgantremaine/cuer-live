
import { useEffect } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';

export const useTimeCalculations = (
  items: RundownItem[], 
  updateItem: (id: string, field: string, value: string) => void, 
  rundownStartTime: string
) => {
  const timeToSeconds = (timeStr: string) => {
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

  // Recalculate all start and end times based on rundown start time and durations
  useEffect(() => {
    let currentTime = rundownStartTime;
    let needsUpdate = false;

    items.forEach((item, index) => {
      // For headers, they don't have duration, so they start at current time and end at current time
      if (isHeaderItem(item)) {
        if (item.startTime !== currentTime || item.endTime !== currentTime) {
          updateItem(item.id, 'startTime', currentTime);
          updateItem(item.id, 'endTime', currentTime);
          needsUpdate = true;
        }
      } else {
        // For regular items, calculate start and end based on duration
        const expectedEndTime = calculateEndTime(currentTime, item.duration);
        
        if (item.startTime !== currentTime) {
          updateItem(item.id, 'startTime', currentTime);
          needsUpdate = true;
        }
        
        if (item.endTime !== expectedEndTime) {
          updateItem(item.id, 'endTime', expectedEndTime);
          needsUpdate = true;
        }
        
        // Next item starts when this one ends
        currentTime = expectedEndTime;
      }
    });
  }, [items, updateItem, rundownStartTime]);

  return {
    calculateEndTime,
    getRowStatus
  };
};
