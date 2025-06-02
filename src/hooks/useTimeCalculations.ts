
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
    // Get current time in HH:MM:SS format
    const now = currentTime.toTimeString().substring(0, 8); // Gets HH:MM:SS
    console.log('🔴 getRowStatus called for item:', item.id, 'current time:', now);
    console.log('🔴 getRowStatus item details:', { 
      id: item.id, 
      name: item.name,
      startTime: item.startTime, 
      endTime: item.endTime,
      type: item.type 
    });
    
    // Skip headers for live status
    if (isHeaderItem(item)) {
      console.log('🔴 getRowStatus: Skipping header item');
      return 'upcoming';
    }
    
    // Ensure we have valid times
    if (!item.startTime || !item.endTime) {
      console.log('🔴 getRowStatus: Missing start or end time, returning upcoming');
      return 'upcoming';
    }
    
    const currentSeconds = timeToSeconds(now);
    const startSeconds = timeToSeconds(item.startTime);
    const endSeconds = timeToSeconds(item.endTime);
    
    console.log('🔴 getRowStatus seconds comparison:', { 
      currentSeconds, 
      startSeconds, 
      endSeconds,
      currentTime: now,
      itemStart: item.startTime,
      itemEnd: item.endTime,
      isInRange: currentSeconds >= startSeconds && currentSeconds < endSeconds
    });
    
    // Handle invalid conversions
    if (isNaN(currentSeconds) || isNaN(startSeconds) || isNaN(endSeconds)) {
      console.log('🔴 getRowStatus: Invalid time conversion, returning upcoming');
      return 'upcoming';
    }
    
    if (currentSeconds >= startSeconds && currentSeconds < endSeconds) {
      console.log('🔴 getRowStatus: Item is CURRENT/LIVE');
      return 'current';
    } else if (currentSeconds >= endSeconds) {
      console.log('🔴 getRowStatus: Item is completed');
      return 'completed';
    }
    console.log('🔴 getRowStatus: Item is upcoming');
    return 'upcoming';
  };

  const findCurrentItem = (currentTime: Date) => {
    const now = currentTime.toTimeString().substring(0, 8);
    console.log('🟢 findCurrentItem called with time:', now);
    console.log('🟢 findCurrentItem checking', items.length, 'items');
    
    // Add summary of all item times for debugging
    const itemSummary = items.map(item => ({
      id: item.id,
      name: item.name,
      start: item.startTime,
      end: item.endTime,
      type: item.type
    }));
    console.log('🟢 findCurrentItem item summary:', itemSummary);
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const status = getRowStatus(item, currentTime);
      
      if (status === 'current' && !isHeaderItem(item)) {
        console.log('🟢 findCurrentItem found live item:', {
          id: item.id,
          name: item.name,
          index: i,
          startTime: item.startTime,
          endTime: item.endTime
        });
        return item;
      }
    }
    
    console.log('🟢 findCurrentItem: No current item found - current time', now, 'does not fall within any item time range');
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
