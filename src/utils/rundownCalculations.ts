
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
  return secondsToTime(Math.max(0, elapsedSeconds));
};

// Pure function to check if item is floated
export const isFloated = (item: RundownItem): boolean => {
  return item.isFloating || item.isFloated || false;
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
  numberingSystem: 'sequential' | 'letter_number' = 'sequential'
): CalculatedRundownItem[] => {
  // Clear header row numbers for sequential system
  const itemsWithClearedHeaders = numberingSystem === 'sequential' ? 
    clearHeaderNumbers(items) : 
    items;
  
  let currentTime = rundownStartTime;
  let regularRowCount = 0;

  return itemsWithClearedHeaders.map((item, index) => {
    let calculatedStartTime = currentTime;
    let calculatedEndTime = currentTime;
    let calculatedRowNumber = '';

    if (isHeaderItem(item)) {
      // Headers get the current timeline position and don't advance time
      calculatedStartTime = currentTime;
      calculatedEndTime = currentTime;
      
      if (numberingSystem === 'sequential') {
        // Headers don't have row numbers in sequential system
        calculatedRowNumber = '';
      } else {
        // Headers get letters in letter_number system
        let headerCount = 0;
        for (let i = 0; i <= index; i++) {
          if (isHeaderItem(itemsWithClearedHeaders[i])) {
            headerCount++;
          }
        }
        const headerIndex = headerCount - 1;
        calculatedRowNumber = generateHeaderLabel(headerIndex);
      }
    } else {
      // Regular items
      calculatedStartTime = currentTime;
      
      if (item.duration) {
        calculatedEndTime = calculateEndTime(currentTime, item.duration);
        
        // Only advance timeline if item is not floated
        if (!isFloated(item)) {
          currentTime = calculatedEndTime;
        }
      } else {
        calculatedEndTime = currentTime;
      }

      if (numberingSystem === 'sequential') {
        // Sequential numbering for regular items
        regularRowCount++;
        calculatedRowNumber = regularRowCount.toString();
      } else {
        // Letter-number system for regular items
        let currentSegment = 'A';
        let itemCountInSegment = 0;
        let segmentHeaderCount = 0;
        
        for (let i = 0; i <= index; i++) {
          const currentItem = itemsWithClearedHeaders[i];
          if (isHeaderItem(currentItem)) {
            currentSegment = generateHeaderLabel(segmentHeaderCount);
            segmentHeaderCount++;
            itemCountInSegment = 0;
          } else {
            itemCountInSegment++;
          }
        }

        calculatedRowNumber = `${currentSegment}${itemCountInSegment}`;
      }
    }

    const calculatedElapsedTime = calculateElapsedTime(calculatedStartTime, rundownStartTime);

    return {
      ...item,
      calculatedStartTime,
      calculatedEndTime,
      calculatedElapsedTime,
      calculatedRowNumber
    };
  });
};

// Pure function to calculate total runtime
export const calculateTotalRuntime = (items: RundownItem[]): string => {
  const totalSeconds = items.reduce((acc, item) => {
    if (isHeaderItem(item) || isFloated(item)) return acc;
    return acc + timeToSeconds(item.duration || '00:00');
  }, 0);

  return secondsToTime(totalSeconds);
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

  return secondsToTime(totalSeconds);
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
