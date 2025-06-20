
import { RundownItem } from '@/types/rundown';

export const getVisibleColumns = (columns: any[]) => {
  if (!columns) return [];
  // Filter out notes column and only show visible columns
  return columns.filter(col => col.isVisible !== false && col.key !== 'notes');
};

export const getRowNumber = (index: number, items: RundownItem[]) => {
  if (index < 0 || index >= items.length) return '';
  
  const item = items[index];
  if (!item) return '';
  
  // Calculate row numbers based purely on position and type, not stored values
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  // Check if there are regular rows before the first header
  const firstHeaderIndex = items.findIndex(item => item.type === 'header');
  const hasRowsBeforeFirstHeader = firstHeaderIndex > 0;
  
  // For headers, count how many headers we've seen so far
  if (item.type === 'header') {
    let headerCount = 0;
    for (let i = 0; i <= index; i++) {
      if (items[i] && items[i].type === 'header') {
        headerCount++;
      }
    }
    // Adjust header numbering based on whether there are rows before first header
    const headerIndex = hasRowsBeforeFirstHeader ? headerCount : headerCount - 1;
    return letters[headerIndex] || 'A';
  }
  
  // For regular items, find which segment they belong to and count within that segment
  let currentSegmentLetter = 'A';
  let itemCountInSegment = 0;
  let segmentHeaderCount = hasRowsBeforeFirstHeader ? 1 : 0; // Start from A or B
  
  // Go through items up to current index
  for (let i = 0; i <= index; i++) {
    const currentItem = items[i];
    if (!currentItem) continue;
    
    if (currentItem.type === 'header') {
      // Update which segment we're in
      currentSegmentLetter = letters[segmentHeaderCount] || 'A';
      segmentHeaderCount++;
      itemCountInSegment = 0; // Reset count for new segment
    } else {
      // This is a regular item
      itemCountInSegment++;
    }
  }
  
  return `${currentSegmentLetter}${itemCountInSegment}`;
};

// Helper function to convert time string to seconds
const timeToSeconds = (timeStr: string): number => {
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

// Helper function to convert seconds to time string
const secondsToTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Helper function to calculate end time
const calculateEndTime = (startTime: string, duration: string): string => {
  const startSeconds = timeToSeconds(startTime);
  const durationSeconds = timeToSeconds(duration);
  return secondsToTime(startSeconds + durationSeconds);
};

// Helper function to calculate elapsed time from rundown start
const calculateElapsedTime = (startTime: string, rundownStartTime: string): string => {
  const startSeconds = timeToSeconds(startTime);
  const rundownStartSeconds = timeToSeconds(rundownStartTime);
  const elapsedSeconds = startSeconds - rundownStartSeconds;
  return secondsToTime(Math.max(0, elapsedSeconds));
};

export const getCellValue = (item: RundownItem, column: any, rundownStartTime?: string, calculatedStartTime?: string) => {
  let value = '';
  
  if (column.isCustom) {
    value = item.customFields?.[column.key] || '';
  } else {
    switch (column.key) {
      case 'segmentName':
        // For regular items, show the name/segmentName
        value = item.segmentName || item.name || '';
        break;
      case 'duration':
        value = item.duration || '';
        break;
      case 'startTime':
        // Use calculated start time if provided, otherwise fall back to stored value
        value = calculatedStartTime || item.startTime || '';
        break;
      case 'endTime':
        // Calculate end time if we have start time and duration
        const startForCalc = calculatedStartTime || item.startTime || '';
        const duration = item.duration || '';
        if (startForCalc && duration) {
          value = calculateEndTime(startForCalc, duration);
        } else {
          value = item.endTime || '';
        }
        break;
      case 'elapsedTime':
        // Calculate elapsed time if we have start time and rundown start time
        const startForElapsed = calculatedStartTime || item.startTime || '';
        if (startForElapsed && rundownStartTime) {
          value = calculateElapsedTime(startForElapsed, rundownStartTime);
        } else {
          value = item.elapsedTime || '';
        }
        break;
      case 'script':
        value = item.script || '';
        break;
      case 'talent':
        value = item.talent || '';
        break;
      case 'images':
        // Handle the images column specifically
        value = item.images || '';
        break;
      default:
        // Handle any other fields that might exist on the item
        value = (item as any)[column.key] || '';
    }
  }
  
  return value;
};
