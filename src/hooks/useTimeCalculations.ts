
import { useEffect } from 'react';
import { RundownItem } from './useRundownItems';

export const useTimeCalculations = (items: RundownItem[], updateItem: (id: string, field: string, value: string) => void) => {
  const timeToSeconds = (timeStr: string) => {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
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

  // Update end times when start time or duration changes
  useEffect(() => {
    items.forEach(item => {
      if (!item.isHeader && item.startTime && item.duration) {
        const expectedEndTime = calculateEndTime(item.startTime, item.duration);
        if (item.endTime !== expectedEndTime) {
          updateItem(item.id, 'endTime', expectedEndTime);
        }
      }
    });
  }, [items, updateItem]);

  return {
    calculateEndTime,
    getRowStatus
  };
};
