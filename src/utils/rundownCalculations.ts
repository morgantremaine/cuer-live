
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { generateHeaderLabel, checkRowsBeforeFirstHeader } from '@/utils/headerUtils';

export interface CalculatedRundownItem extends RundownItem {
  calculatedStartTime: string;
  calculatedEndTime: string;
  calculatedElapsedTime: string;
  calculatedRowNumber: string;
}

// Pure function to convert time string to seconds
export const timeToSeconds = (timeStr: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
};

// Pure function to convert seconds to time string
export const secondsToTime = (seconds: number): string => {
  // Ensure we're working with a positive integer to prevent jumping
  const totalSeconds = Math.max(0, Math.floor(seconds));
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60); // Fixed: Added Math.floor to prevent jumping
  
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

// Helper function to renumber headers sequentially
const renumberHeaders = (items: RundownItem[]): RundownItem[] => {
  let headerIndex = 0;
  
  return items.map(item => {
    if (isHeaderItem(item)) {
      const letter = generateHeaderLabel(headerIndex);
      headerIndex++;
      return { ...item, rowNumber: letter, segmentName: letter };
    }
    return item;
  });
};

// Pure function to calculate all items with timing and row numbers
export const calculateItemsWithTiming = (
  items: RundownItem[],
  rundownStartTime: string
): CalculatedRundownItem[] => {
  // First, ensure all headers have correct row numbers
  const itemsWithCorrectHeaders = renumberHeaders(items);
  
  let currentTime = rundownStartTime;
  
  // Check if there are regular rows before the first header
  const hasRowsBeforeFirstHeader = checkRowsBeforeFirstHeader(itemsWithCorrectHeaders);
  
  let headerIndex = hasRowsBeforeFirstHeader ? 1 : 0; // Start at B (1) if there are rows before first header

  return itemsWithCorrectHeaders.map((item, index) => {
    let calculatedStartTime = currentTime;
    let calculatedEndTime = currentTime;
    let calculatedRowNumber = '';

    if (isHeaderItem(item)) {
      // Headers get the current timeline position and don't advance time
      calculatedStartTime = currentTime;
      calculatedEndTime = currentTime;
      // Use the corrected rowNumber from renumberHeaders
      calculatedRowNumber = item.rowNumber || generateHeaderLabel(headerIndex);
      headerIndex++;
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

      // Calculate row number for regular items
      let currentSegment = 'A';
      let itemCountInSegment = 0;

      // Find current segment - adjusted for optional first header
      let segmentHeaderCount = hasRowsBeforeFirstHeader ? 1 : 0; // Start counting from A or B
      
      for (let i = 0; i <= index; i++) {
        const currentItem = itemsWithCorrectHeaders[i];
        if (isHeaderItem(currentItem)) {
          currentSegment = currentItem.rowNumber || generateHeaderLabel(segmentHeaderCount);
          segmentHeaderCount++;
          itemCountInSegment = 0;
        } else {
          itemCountInSegment++;
        }
      }

      calculatedRowNumber = `${currentSegment}${itemCountInSegment}`;
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
