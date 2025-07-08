import { RundownItem } from '@/types/rundown';
import { generateHeaderLabel, checkRowsBeforeFirstHeader } from '@/utils/headerUtils';

export const getVisibleColumns = (columns: any[]) => {
  if (!columns || !Array.isArray(columns)) return [];
  // Filter out notes column and only show visible columns
  // Make sure to handle cases where isVisible might be undefined (should default to true)
  return columns.filter(col => 
    col && 
    col.key !== 'notes' && 
    (col.isVisible === undefined || col.isVisible === true)
  );
};

export const getRowNumber = (index: number, items: RundownItem[]) => {
  if (index < 0 || index >= items.length) return '';
  
  const item = items[index];
  if (!item) return '';
  
  // Headers don't have row numbers
  if (item.type === 'header') {
    return '';
  }
  
  // For regular items, just count sequentially, ignoring headers
  let regularRowCount = 0;
  for (let i = 0; i <= index; i++) {
    if (items[i] && items[i].type !== 'header') {
      regularRowCount++;
    }
  }
  
  return regularRowCount.toString();
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
      case 'name':
      case 'segmentName':
        // For regular items, show the name/segmentName
        value = item.name || item.segmentName || '';
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
