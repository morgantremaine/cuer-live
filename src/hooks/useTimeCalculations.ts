
import { useEffect } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';

export const useTimeCalculations = (
  items: RundownItem[], 
  updateItem: (id: string, field: string, value: string) => void, 
  rundownStartTime: string
) => {
  const timeToSeconds = (timeStr: string) => {
    console.log('timeToSeconds input:', timeStr);
    if (!timeStr || timeStr === '') {
      console.log('timeToSeconds returning 0 for empty input');
      return 0;
    }
    
    // Handle both MM:SS and HH:MM:SS formats
    const parts = timeStr.split(':').map(str => {
      const num = parseInt(str, 10);
      const result = isNaN(num) ? 0 : num;
      console.log(`Converting "${str}" to ${result}`);
      return result;
    });
    
    console.log('timeToSeconds parts:', parts);
    
    if (parts.length === 2) {
      // MM:SS format (minutes:seconds)
      const [minutes, seconds] = parts;
      const result = minutes * 60 + seconds;
      console.log(`MM:SS calculation: ${minutes}*60 + ${seconds} = ${result}`);
      return result;
    } else if (parts.length === 3) {
      // HH:MM:SS format
      const [hours, minutes, seconds] = parts;
      const result = hours * 3600 + minutes * 60 + seconds;
      console.log(`HH:MM:SS calculation: ${hours}*3600 + ${minutes}*60 + ${seconds} = ${result}`);
      return result;
    }
    console.log('timeToSeconds returning 0 for unrecognized format');
    return 0;
  };

  const secondsToTime = (seconds: number) => {
    console.log('secondsToTime input:', seconds);
    if (isNaN(seconds) || seconds < 0) {
      console.log('secondsToTime returning 00:00:00 for invalid input');
      return '00:00:00';
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const result = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    console.log(`secondsToTime output: ${result}`);
    return result;
  };

  const calculateEndTime = (startTime: string, duration: string) => {
    console.log('calculateEndTime inputs:', { startTime, duration });
    const startSeconds = timeToSeconds(startTime);
    const durationSeconds = timeToSeconds(duration);
    const result = secondsToTime(startSeconds + durationSeconds);
    console.log('calculateEndTime result:', result);
    return result;
  };

  const calculateElapsedTime = (startTime: string, rundownStartTime: string) => {
    console.log('calculateElapsedTime inputs:', { startTime, rundownStartTime });
    const startSeconds = timeToSeconds(startTime);
    const rundownStartSeconds = timeToSeconds(rundownStartTime);
    const elapsedSeconds = startSeconds - rundownStartSeconds;
    const result = secondsToTime(Math.max(0, elapsedSeconds));
    console.log('calculateElapsedTime result:', result);
    return result;
  };

  const getRowStatus = (item: RundownItem, currentTime: Date) => {
    console.log('🔴 getRowStatus called for item:', item.id, 'with rundown-based timing');
    console.log('🔴 getRowStatus item details:', { 
      id: item.id, 
      name: item.name,
      startTime: item.startTime, 
      endTime: item.endTime,
      type: item.type,
      elapsedTime: item.elapsedTime
    });
    
    // Skip headers for live status
    if (isHeaderItem(item)) {
      console.log('🔴 getRowStatus: Skipping header item');
      return 'upcoming';
    }
    
    // Ensure we have valid times
    if (!item.startTime || !item.endTime || !item.elapsedTime) {
      console.log('🔴 getRowStatus: Missing timing data, returning upcoming');
      return 'upcoming';
    }
    
    // Use elapsed time from rundown start (not real clock time)
    const currentElapsedSeconds = timeToSeconds(item.elapsedTime);
    const itemStartSeconds = timeToSeconds(item.startTime);
    const itemEndSeconds = timeToSeconds(item.endTime);
    const rundownStartSeconds = timeToSeconds(rundownStartTime);
    
    // Calculate how far we are into the rundown
    const rundownElapsed = currentElapsedSeconds + rundownStartSeconds;
    
    console.log('🔴 getRowStatus rundown-based comparison:', { 
      rundownElapsed,
      itemStartSeconds,
      itemEndSeconds,
      currentElapsedSeconds,
      rundownStartSeconds,
      isInRange: rundownElapsed >= itemStartSeconds && rundownElapsed < itemEndSeconds
    });
    
    // Handle invalid conversions
    if (isNaN(rundownElapsed) || isNaN(itemStartSeconds) || isNaN(itemEndSeconds)) {
      console.log('🔴 getRowStatus: Invalid time conversion, returning upcoming');
      return 'upcoming';
    }
    
    if (rundownElapsed >= itemStartSeconds && rundownElapsed < itemEndSeconds) {
      console.log('🔴 getRowStatus: Item is CURRENT/LIVE');
      return 'current';
    } else if (rundownElapsed >= itemEndSeconds) {
      console.log('🔴 getRowStatus: Item is completed');
      return 'completed';
    }
    console.log('🔴 getRowStatus: Item is upcoming');
    return 'upcoming';
  };

  const findCurrentItem = (currentTime: Date) => {
    console.log('🟢 findCurrentItem called - using rundown elapsed time');
    console.log('🟢 findCurrentItem checking', items.length, 'items');
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const status = getRowStatus(item, currentTime);
      
      if (status === 'current' && !isHeaderItem(item)) {
        console.log('🟢 findCurrentItem found live item:', {
          id: item.id,
          name: item.name,
          index: i,
          startTime: item.startTime,
          endTime: item.endTime,
          elapsedTime: item.elapsedTime
        });
        return item;
      }
    }
    
    console.log('🟢 findCurrentItem: No current item found');
    return null;
  };

  // Recalculate all start, end, and elapsed times based on rundown start time and durations
  useEffect(() => {
    console.log('useTimeCalculations useEffect triggered');
    console.log('rundownStartTime:', rundownStartTime);
    console.log('items count:', items.length);
    
    let currentTime = rundownStartTime;
    let needsUpdate = false;

    items.forEach((item, index) => {
      console.log(`Processing item ${index}:`, { id: item.id, type: item.type, duration: item.duration });
      
      // Calculate elapsed time for this item
      const expectedElapsedTime = calculateElapsedTime(currentTime, rundownStartTime);

      // For headers, they don't have duration, so they start at current time and end at current time
      if (isHeaderItem(item)) {
        console.log('Processing header item');
        if (item.startTime !== currentTime || item.endTime !== currentTime) {
          updateItem(item.id, 'startTime', currentTime);
          updateItem(item.id, 'endTime', currentTime);
          needsUpdate = true;
        }
        if (item.elapsedTime !== expectedElapsedTime) {
          updateItem(item.id, 'elapsedTime', expectedElapsedTime);
          needsUpdate = true;
        }
      } else {
        console.log('Processing regular item');
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

        if (item.elapsedTime !== expectedElapsedTime) {
          updateItem(item.id, 'elapsedTime', expectedElapsedTime);
          needsUpdate = true;
        }
        
        // Next item starts when this one ends
        currentTime = expectedEndTime;
        console.log('Updated currentTime to:', currentTime);
      }
    });
  }, [items, updateItem, rundownStartTime]);

  // Add logging to track when functions are being exported
  console.log('🔵 useTimeCalculations returning getRowStatus and findCurrentItem functions');

  return {
    calculateEndTime,
    getRowStatus,
    findCurrentItem
  };
};
