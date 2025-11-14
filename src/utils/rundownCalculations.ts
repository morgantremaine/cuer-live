
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { generateHeaderLabel, checkRowsBeforeFirstHeader } from '@/utils/headerUtils';

export interface CalculatedRundownItem extends RundownItem {
  calculatedStartTime: string;
  calculatedEndTime: string;
  calculatedElapsedTime: string;
  calculatedRowNumber: string;
  calculatedBackTime?: string;
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
 * Parses a decimal row number string into an array of numeric parts
 * "3" -> [3], "3.1" -> [3, 1], "3.1.2" -> [3, 1, 2]
 */
export const parseDecimalNumber = (numberStr: string): number[] => {
  return numberStr.split('.').map(part => {
    // Handle leading zeros like "01" by parsing as integer
    return parseInt(part, 10);
  });
};

/**
 * Compares two decimal row numbers numerically
 * Returns: negative if a < b, 0 if equal, positive if a > b
 * Examples: "3.01" < "3.1" < "3.2" < "3.10"
 */
export const compareDecimalNumbers = (a: string, b: string): number => {
  const aParts = parseDecimalNumber(a);
  const bParts = parseDecimalNumber(b);
  
  const maxLength = Math.max(aParts.length, bParts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;
    
    if (aVal !== bVal) {
      return aVal - bVal;
    }
  }
  
  return 0;
};

/**
 * Calculates the decimal row number for a new item inserted between two existing items
 * Rules:
 * - Between 3 and 3.1 → 3.01
 * - Between 3.1 and 3.2 → 3.1.1
 * - After 3.1.1 → 3.1.2
 * - Max depth: 3 levels (blocks with error at max depth)
 */
export const calculateDecimalRowNumber = (
  prevNumber: string | null,
  nextNumber: string | null,
  baseNumber: number
): string => {
  console.log('🔢 calculateDecimalRowNumber:', { prevNumber, nextNumber, baseNumber });
  
  // Case 1: No previous number (first in segment or rundown)
  if (!prevNumber) {
    const result = baseNumber.toString();
    console.log('🔢 No prev → returning base:', result);
    return result;
  }
  
  const prevParts = parseDecimalNumber(prevNumber);
  
  // Case 2: No next number (append at end)
  if (!nextNumber) {
    if (prevParts.length === 1) {
      const result = `${prevNumber}.1`;
      console.log('🔢 After integer → .1:', result);
      return result;
    }
    if (prevParts.length === 2) {
      const result = `${prevParts[0]}.${prevParts[1] + 1}`;
      console.log('🔢 After 2-level → increment:', result);
      return result;
    }
    if (prevParts.length === 3) {
      const result = `${prevParts[0]}.${prevParts[1]}.${prevParts[2] + 1}`;
      console.log('🔢 After 3-level → increment:', result);
      return result;
    }
  }
  
  const nextParts = parseDecimalNumber(nextNumber);
  
  // Case 3: Between two numbers
  // Special case: Between integer and .1 (e.g., 3 and 3.1)
  if (prevParts.length === 1 && nextParts.length === 2 && 
      prevParts[0] === nextParts[0] && nextParts[1] === 1) {
    const result = `${prevNumber}.01`;
    console.log('🔢 Between integer and .1 → .01:', result);
    return result;
  }
  
  // Check if we're between same-depth decimals at the same base
  if (prevParts.length === nextParts.length && prevParts[0] === nextParts[0]) {
    // At max depth (3 levels) - cannot nest further
    if (prevParts.length >= 3) {
      const error = `Cannot insert between ${prevNumber} and ${nextNumber} - maximum nesting depth (3 levels) reached. Please unlock numbering, reorganize items, and lock again.`;
      console.error('🚫', error);
      throw new Error(error);
    }
    
    // Nest one level deeper under the previous number
    const result = `${prevNumber}.1`;
    console.log('🔢 Between same-depth → nest:', result);
    return result;
  }
  
  // Different bases or depths - nest under previous if possible
  if (prevParts.length < 3) {
    const result = `${prevNumber}.1`;
    console.log('🔢 Different structure, nest under prev:', result);
    return result;
  }
  
  // At max depth and can't determine position - error
  const error = `Cannot insert at position - maximum nesting depth (3 levels) reached at ${prevNumber}. Please unlock numbering, reorganize items, and lock again.`;
  console.error('🚫', error);
  throw new Error(error);
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
  lockedRowNumbers?: { [itemId: string]: string },
  endTime?: string
): CalculatedRundownItem[] => {
  // Clear header row numbers
  const itemsWithClearedHeaders = clearHeaderNumbers(items);
  
  let currentTime = rundownStartTime;
  let regularRowCount = 0; // Always start from 0 - this is the authoritative calculation
  let cumulativeDurationSeconds = 0;
  
  // Track last base number for decimal generation
  let lastBaseNumber = 0;
  
  // OPTIMIZATION: Build locked number map once (O(n) instead of O(n²))
  const lockedNumberMap = new Map<string, number>();
  if (numberingLocked && lockedRowNumbers) {
    Object.entries(lockedRowNumbers).forEach(([itemId, numberStr]) => {
      const baseNum = parseInt(numberStr);
      if (!isNaN(baseNum)) {
        lockedNumberMap.set(itemId, baseNum);
      }
    });
  }
  
  // Track position after last base number for sequential decimals
  let countSinceLastBase = 0;

  // Calculate back times if endTime is provided
  const calculateBackTime = (index: number): string => {
    if (!endTime) return '';
    
    // Sum all durations BELOW this row (excluding floated items)
    let durationsBelowSeconds = 0;
    for (let i = index + 1; i < itemsWithClearedHeaders.length; i++) {
      const itemBelow = itemsWithClearedHeaders[i];
      if (itemBelow.type === 'regular' && !isFloated(itemBelow)) {
        durationsBelowSeconds += timeToSeconds(itemBelow.duration || '00:00');
      }
    }
    
    // Back time = end time - durations below
    const endTimeSeconds = timeToSeconds(endTime);
    const backTimeSeconds = endTimeSeconds - durationsBelowSeconds;
    return secondsToTime(backTimeSeconds);
  };

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
      const calculatedBackTime = calculateBackTime(index);
      
      return {
        ...item,
        calculatedStartTime,
        calculatedEndTime,
        calculatedElapsedTime,
        calculatedRowNumber,
        calculatedBackTime
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

      // LOCKED NUMBERING MODE - iNews/ENPS style (OPTIMIZED O(n))
      if (numberingLocked && lockedRowNumbers && item.type !== 'header') {
        const lockedBaseNumber = lockedNumberMap.get(item.id);
        
        if (lockedBaseNumber !== undefined) {
          // This item has a BASE LOCKED number, use it
          calculatedRowNumber = lockedBaseNumber.toString();
          lastBaseNumber = lockedBaseNumber;
          countSinceLastBase = 0; // Reset counter when we hit a base number
        } else {
          // NEW ITEM - Calculate sequential decimal incrementally (no backward search!)
          countSinceLastBase++;
          const baseNumber = lastBaseNumber || 1;
          
          // Assign sequential decimal: 3.1, 3.2, 3.3, etc.
          calculatedRowNumber = `${baseNumber}.${countSinceLastBase}`;
        }
      } else {
        // NORMAL SEQUENTIAL NUMBERING MODE
        if (item.type !== 'header') {
          // Skip floating/floated items (they should not get sequential numbers)
          if (!item.isFloating && !item.isFloated) {
            regularRowCount++;
            calculatedRowNumber = regularRowCount.toString();
            lastBaseNumber = regularRowCount;
          } else {
            // Floating items get no row number
            calculatedRowNumber = '';
          }
        }
      }
      
      // Elapsed time INCLUDING this item's duration (where we'll be after this item completes)
      const calculatedElapsedTime = secondsToTimeNoWrap(cumulativeDurationSeconds);
      const calculatedBackTime = calculateBackTime(index);

      return {
        ...item,
        calculatedStartTime,
        calculatedEndTime,
        calculatedElapsedTime,
        calculatedRowNumber,
        calculatedBackTime
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
