
import { useCallback, useEffect, useMemo } from 'react';
import { RundownItem } from '@/types/rundown';

export const useTimeCalculations = (
  items: RundownItem[],
  updateItem: (id: string, field: string, value: string) => void,
  startTime: string
) => {
  // Calculate end time based on start time and duration
  const calculateEndTime = useCallback((startTime: string, duration: string): string => {
    if (!startTime || !duration) return '';
    
    try {
      const [startHours, startMinutes, startSeconds = '0'] = startTime.split(':').map(Number);
      const [durationMinutes, durationSeconds] = duration.split(':').map(Number);
      
      const startTotalSeconds = startHours * 3600 + startMinutes * 60 + startSeconds;
      const durationTotalSeconds = durationMinutes * 60 + durationSeconds;
      const endTotalSeconds = startTotalSeconds + durationTotalSeconds;
      
      const endHours = Math.floor(endTotalSeconds / 3600);
      const endMinutes = Math.floor((endTotalSeconds % 3600) / 60);
      const endSecondsRemainder = endTotalSeconds % 60;
      
      return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:${endSecondsRemainder.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error calculating end time:', error);
      return '';
    }
  }, []);

  // Calculate running time for items
  const calculateRunningTimes = useCallback(() => {
    if (!Array.isArray(items) || items.length === 0 || !startTime) {
      return;
    }

    let currentTime = startTime;
    let hasChanges = false;

    items.forEach((item, index) => {
      if (item.type === 'regular' && !item.isFloating) {
        // Update start time if needed
        if (item.startTime !== currentTime) {
          updateItem(item.id, 'startTime', currentTime);
          hasChanges = true;
        }

        // Calculate and update end time if duration exists
        if (item.duration) {
          const endTime = calculateEndTime(currentTime, item.duration);
          if (item.endTime !== endTime) {
            updateItem(item.id, 'endTime', endTime);
            hasChanges = true;
          }
          // Move current time forward for next item
          currentTime = endTime;
        }
      }
    });

    if (hasChanges) {
      // Only log when there are actual changes
      console.log('🕒 useTimeCalculations: Time updates completed');
    }
  }, [items, startTime, updateItem, calculateEndTime]);

  // Get status for a specific item
  const getRowStatus = useCallback((item: RundownItem) => {
    if (item.type === 'header') return 'neutral';
    if (item.isFloating) return 'neutral';
    
    const now = new Date();
    const currentTimeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    if (item.startTime && item.endTime) {
      if (currentTimeString >= item.startTime && currentTimeString <= item.endTime) {
        return 'live';
      } else if (currentTimeString > item.endTime) {
        return 'completed';
      }
    }
    
    return 'upcoming';
  }, []);

  // Run calculations when dependencies change
  useEffect(() => {
    calculateRunningTimes();
  }, [calculateRunningTimes]);

  return {
    calculateEndTime,
    getRowStatus
  };
};
