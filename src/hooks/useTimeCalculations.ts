
import { useEffect, useRef } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';

export const useTimeCalculations = (
  items: RundownItem[], 
  updateItem: (id: string, field: string, value: string) => void, 
  rundownStartTime: string
) => {
  const isUpdatingTimesRef = useRef(false);

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

  const calculateElapsedTime = (startTime: string, rundownStartTime: string) => {
    const startSeconds = timeToSeconds(startTime);
    const rundownStartSeconds = timeToSeconds(rundownStartTime);
    const elapsedSeconds = startSeconds - rundownStartSeconds;
    return secondsToTime(Math.max(0, elapsedSeconds));
  };

  const getRowStatus = (item: RundownItem) => {
    const currentTime = new Date();
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

  // Create a wrapper that prevents undo state saves during time calculations
  const updateItemWithoutUndo = (id: string, field: string, value: string) => {
    // Mark that we're updating times automatically
    isUpdatingTimesRef.current = true;
    updateItem(id, field, value);
    // Use setTimeout to ensure the flag is cleared after the update completes
    setTimeout(() => {
      isUpdatingTimesRef.current = false;
    }, 10);
  };

  // Helper function to check if an item is floated
  const isFloated = (item: RundownItem) => {
    return item.isFloating || item.isFloated;
  };

  // Recalculate all start, end, and elapsed times based on rundown start time and durations
  // This now properly handles floated items by excluding them from the time progression
  useEffect(() => {
    console.log('🕒 useTimeCalculations: Recalculating times for', items.length, 'items with start time:', rundownStartTime);
    
    if (!rundownStartTime || items.length === 0) {
      console.log('🕒 useTimeCalculations: Skipping - no start time or no items');
      return;
    }

    // Prevent cascading updates during time calculations
    if (isUpdatingTimesRef.current) {
      return;
    }

    let currentTime = rundownStartTime;
    let needsUpdate = false;

    items.forEach((item, index) => {
      // Store the timeline position before processing any floated items
      const timelinePosition = currentTime;
      
      // Calculate elapsed time for this item based on the current timeline position
      const expectedElapsedTime = calculateElapsedTime(timelinePosition, rundownStartTime);

      // For headers, they don't have duration, so they start at current time and end at current time
      // Headers are never floated, so they always get the current timeline position
      if (isHeaderItem(item)) {
        if (item.startTime !== timelinePosition || item.endTime !== timelinePosition) {
          console.log('🕒 Updating header times:', item.id, 'start/end:', timelinePosition);
          updateItemWithoutUndo(item.id, 'startTime', timelinePosition);
          updateItemWithoutUndo(item.id, 'endTime', timelinePosition);
          needsUpdate = true;
        }
        if (item.elapsedTime !== expectedElapsedTime) {
          updateItemWithoutUndo(item.id, 'elapsedTime', expectedElapsedTime);
          needsUpdate = true;
        }
      } else {
        // For regular items, handle floated vs non-floated differently
        if (isFloated(item)) {
          // Floated items inherit the timeline position (not currentTime which might have been updated by other floated items)
          // They show their calculated end time based on duration but don't advance the timeline
          const expectedEndTime = calculateEndTime(timelinePosition, item.duration || '00:00');
          
          if (item.startTime !== timelinePosition) {
            console.log('🕒 Updating floated item start time:', item.id, 'from:', item.startTime, 'to:', timelinePosition);
            updateItemWithoutUndo(item.id, 'startTime', timelinePosition);
            needsUpdate = true;
          }
          
          // Floated items show their calculated end time for display purposes
          if (item.endTime !== expectedEndTime) {
            console.log('🕒 Updating floated item end time:', item.id, 'from:', item.endTime, 'to:', expectedEndTime);
            updateItemWithoutUndo(item.id, 'endTime', expectedEndTime);
            needsUpdate = true;
          }

          if (item.elapsedTime !== expectedElapsedTime) {
            updateItemWithoutUndo(item.id, 'elapsedTime', expectedElapsedTime);
            needsUpdate = true;
          }
          
          // IMPORTANT: Floated items do NOT advance the timeline
          // currentTime stays the same for the next item
        } else {
          // Non-floated regular items: calculate start and end based on duration and advance timeline
          const expectedEndTime = calculateEndTime(currentTime, item.duration || '00:00');
          
          if (item.startTime !== currentTime) {
            console.log('🕒 Updating item start time:', item.id, 'from:', item.startTime, 'to:', currentTime);
            updateItemWithoutUndo(item.id, 'startTime', currentTime);
            needsUpdate = true;
          }
          
          if (item.endTime !== expectedEndTime) {
            console.log('🕒 Updating item end time:', item.id, 'from:', item.endTime, 'to:', expectedEndTime);
            updateItemWithoutUndo(item.id, 'endTime', expectedEndTime);
            needsUpdate = true;
          }

          if (item.elapsedTime !== expectedElapsedTime) {
            updateItemWithoutUndo(item.id, 'elapsedTime', expectedElapsedTime);
            needsUpdate = true;
          }
          
          // Only non-floated items advance the timeline
          currentTime = expectedEndTime;
        }
      }
    });

    if (needsUpdate) {
      console.log('🕒 useTimeCalculations: Time updates completed');
    }
  }, [items, rundownStartTime]);

  return {
    calculateEndTime,
    getRowStatus,
    isUpdatingTimes: () => isUpdatingTimesRef.current
  };
};
