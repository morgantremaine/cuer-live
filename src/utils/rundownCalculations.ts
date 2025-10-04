
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { generateHeaderLabel, checkRowsBeforeFirstHeader } from '@/utils/headerUtils';

export interface CalculatedRundownItem extends RundownItem {
  calculatedStartTime: string;
  calculatedEndTime: string;
  calculatedElapsedTime: string;
  calculatedRowNumber: string;
}

// Pure function to convert time string to seconds - always returns integers
export const timeToSeconds = (timeStr: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return Math.floor(minutes * 60 + seconds); // Floor to prevent fractional seconds
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return Math.floor(hours * 3600 + minutes * 60 + seconds); // Floor to prevent fractional seconds
  }
  return 0;
};

// Pure function to convert seconds to time string - always works with integers
export const secondsToTime = (seconds: number): string => {
  // Ensure we're working with a positive integer to prevent jumping
  const totalSeconds = Math.max(0, Math.floor(Math.abs(seconds)));
  
  // Wrap around at 24 hours (86400 seconds) for time-of-day values
  const wrappedSeconds = totalSeconds % 86400;
  
  const hours = Math.floor(wrappedSeconds / 3600);
  const minutes = Math.floor((wrappedSeconds % 3600) / 60);
  const secs = Math.floor(wrappedSeconds % 60);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Pure function to convert seconds to time string WITHOUT 24-hour wrap (for elapsed/duration times)
export const secondsToTimeNoWrap = (seconds: number): string => {
  // Ensure we're working with a positive integer to prevent jumping
  const totalSeconds = Math.max(0, Math.floor(Math.abs(seconds)));
  
  // NO wrap-around - let it continue beyond 24 hours
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Pure function to calculate end time
export const calculateEndTime = (startTime: string, duration: string): string => {
  const startSeconds = timeToSeconds(startTime);
  const durationSeconds = timeToSeconds(duration);
  return secondsToTime(startSeconds + durationSeconds);
};

// Pure function to calculate elapsed time
export const calculateElapsedTime = (startTime: string, rundownStartTime: string): string => {
  const startSeconds = timeToSeconds(startTime);
  const rundownStartSeconds = timeToSeconds(rundownStartTime);
  const elapsedSeconds = startSeconds - rundownStartSeconds;
  return secondsToTimeNoWrap(Math.max(0, elapsedSeconds)); // Use no-wrap version for elapsed time
};

// Pure function to check if item is floated
export const isFloated = (item: RundownItem): boolean => {
  return item.isFloating || item.isFloated || false;
};

/**
 * Generates letter suffix for locked row numbering
 * 0 -> A, 1 -> B, ..., 25 -> Z, 26 -> AA, 27 -> AB, etc.
 */
export const generateLetterSuffix = (index: number): string => {
  let suffix = '';
  let num = index;
  
  while (num >= 0) {
    suffix = String.fromCharCode(65 + (num % 26)) + suffix;
    num = Math.floor(num / 26) - 1;
    if (num < 0) break;
  }
  
  return suffix;
};

// Helper function to remove row numbers from headers
const clearHeaderNumbers = (items: RundownItem[]): RundownItem[] => {
  return items.map(item => {
    if (isHeaderItem(item)) {
      return { ...item, rowNumber: '' };
    }
    return item;
  });
};

// Pure function to calculate all items with timing and row numbers
export const calculateItemsWithTiming = (
  items: RundownItem[],
  rundownStartTime: string,
  numberingLocked?: boolean,
  lockedRowNumbers?: { [itemId: string]: string }
): CalculatedRundownItem[] => {
  // Clear header row numbers
  const itemsWithClearedHeaders = clearHeaderNumbers(items);
  
  let currentTime = rundownStartTime;
  let regularRowCount = 0; // Always start from 0 - this is the authoritative calculation
  let cumulativeDurationSeconds = 0;
  
  // Track last base number for suffix generation
  let lastBaseNumber = 0;
  const suffixCounters: { [baseNumber: string]: number } = {};

  return itemsWithClearedHeaders.map((item, index) => {
    let calculatedStartTime = currentTime;
    let calculatedEndTime = currentTime;
    let calculatedRowNumber = '';

    if (isHeaderItem(item)) {
      // Headers get the current timeline position and don't advance time
      calculatedStartTime = currentTime;
      calculatedEndTime = currentTime;
      // Headers don't have row numbers
      calculatedRowNumber = '';
      // Elapsed time for headers is the cumulative duration up to this point
      const calculatedElapsedTime = secondsToTimeNoWrap(cumulativeDurationSeconds);
      
      return {
        ...item,
        calculatedStartTime,
        calculatedEndTime,
        calculatedElapsedTime,
        calculatedRowNumber
      };
    } else {
      // Regular items
      calculatedStartTime = currentTime;
      
      if (item.duration) {
        calculatedEndTime = calculateEndTime(currentTime, item.duration);
        
        // Only advance timeline if item is not floated
        if (!isFloated(item)) {
          currentTime = calculatedEndTime;
          // Add this item's duration to cumulative total
          cumulativeDurationSeconds += timeToSeconds(item.duration);
        }
      } else {
        calculatedEndTime = currentTime;
      }

      // LOCKED NUMBERING MODE
      if (numberingLocked && lockedRowNumbers && item.type !== 'header') {
        if (lockedRowNumbers[item.id]) {
          // This item has a locked number, use it
          calculatedRowNumber = lockedRowNumbers[item.id];
          
          // Extract base number for suffix tracking
          const match = calculatedRowNumber.match(/^(\d+)/);
          if (match) {
            lastBaseNumber = parseInt(match[1]);
          }
        } else {
          // NEW ITEM ADDED AFTER LOCKING - IMPROVED LOGIC
          // Determine base number from previous regular item
          let baseNumber = lastBaseNumber;
          
          // Look backward to find the previous regular item with a number
          if (index > 0) {
            for (let i = index - 1; i >= 0; i--) {
              const prevItem = itemsWithClearedHeaders[i];
              if (prevItem.type === 'regular') {
                // Check if this previous item has a locked number
                if (lockedRowNumbers[prevItem.id]) {
                  const prevNumber = lockedRowNumbers[prevItem.id];
                  // Extract numeric base (handles both "5" and "5A" formats)
                  const match = prevNumber.match(/^(\d+)/);
                  if (match) {
                    baseNumber = parseInt(match[1]);
                  }
                  break;
                } else {
                  // Previous item is also new, continue searching
                  continue;
                }
              }
            }
          }
          
          // If no previous item found, look forward to next locked item
          if (baseNumber === 0 && index < itemsWithClearedHeaders.length - 1) {
            for (let i = index + 1; i < itemsWithClearedHeaders.length; i++) {
              const nextItem = itemsWithClearedHeaders[i];
              if (nextItem.type === 'regular' && lockedRowNumbers[nextItem.id]) {
                const nextNumber = lockedRowNumbers[nextItem.id];
                const match = nextNumber.match(/^(\d+)/);
                if (match) {
                  baseNumber = parseInt(match[1]);
                  break;
                }
              }
            }
          }
          
          // If still no base number, start at 1
          if (baseNumber === 0) {
            baseNumber = 1;
          }
          
          const baseNumberStr = baseNumber.toString();
          
          // Initialize counter by counting existing items with this base number UP TO this position
          if (!suffixCounters[baseNumberStr]) {
            let existingCount = 0;
            for (let i = 0; i < index; i++) {
              const checkItem = itemsWithClearedHeaders[i];
              if (checkItem.type === 'regular' && lockedRowNumbers[checkItem.id]) {
                const checkNumber = lockedRowNumbers[checkItem.id];
                const match = checkNumber.match(/^(\d+)/);
                if (match && parseInt(match[1]) === baseNumber) {
                  existingCount++;
                }
              }
            }
            suffixCounters[baseNumberStr] = existingCount;
          }
          
          const suffix = generateLetterSuffix(suffixCounters[baseNumberStr]);
          calculatedRowNumber = `${baseNumberStr}${suffix}`;
          suffixCounters[baseNumberStr]++;
          
          // Update lastBaseNumber for next iteration
          lastBaseNumber = baseNumber;
        }
      } else {
        // NORMAL SEQUENTIAL NUMBERING MODE
        if (item.type !== 'header') {
          regularRowCount++;
          calculatedRowNumber = regularRowCount.toString();
          lastBaseNumber = regularRowCount;
        }
      }
      
      // Elapsed time INCLUDING this item's duration (where we'll be after this item completes)
      const calculatedElapsedTime = secondsToTimeNoWrap(cumulativeDurationSeconds);

      return {
        ...item,
        calculatedStartTime,
        calculatedEndTime,
        calculatedElapsedTime,
        calculatedRowNumber
      };
    }
  });
};

// Pure function to calculate total runtime
export const calculateTotalRuntime = (items: RundownItem[]): string => {
  const totalSeconds = items.reduce((acc, item) => {
    if (isHeaderItem(item) || isFloated(item)) return acc;
    return acc + timeToSeconds(item.duration || '00:00');
  }, 0);

  return secondsToTimeNoWrap(totalSeconds); // Use no-wrap version for total runtime
};

// Pure function to calculate header duration
export const calculateHeaderDuration = (items: RundownItem[], headerIndex: number): string => {
  if (headerIndex < 0 || headerIndex >= items.length || !isHeaderItem(items[headerIndex])) {
    return '00:00:00';
  }

  let totalSeconds = 0;
  let i = headerIndex + 1;

  // Sum up durations of non-floated items until next header
  while (i < items.length && !isHeaderItem(items[i])) {
    if (!isFloated(items[i])) {
      totalSeconds += timeToSeconds(items[i].duration || '00:00');
    }
    i++;
  }

  return secondsToTimeNoWrap(totalSeconds); // Use no-wrap version for header duration
};

// Enhanced version that works with original items array for proper duration calculation
export const calculateHeaderDurationFromOriginalItems = (allItems: RundownItem[], headerId: string): string => {
  const headerIndex = allItems.findIndex(item => item.id === headerId);
  return calculateHeaderDuration(allItems, headerIndex);
};

// Pure function to get row status
export const getRowStatus = (item: CalculatedRundownItem, currentTime: Date): 'upcoming' | 'current' | 'completed' => {
  if (!item.calculatedStartTime || !item.calculatedEndTime) return 'upcoming';
  
  const currentTimeString = currentTime.toTimeString().slice(0, 8);
  const currentSeconds = timeToSeconds(currentTimeString);
  const startSeconds = timeToSeconds(item.calculatedStartTime);
  const endSeconds = timeToSeconds(item.calculatedEndTime);
  
  if (currentSeconds >= startSeconds && currentSeconds < endSeconds) {
    return 'current';
  } else if (currentSeconds >= endSeconds) {
    return 'completed';
  }
  return 'upcoming';
};
