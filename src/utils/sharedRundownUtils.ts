import { RundownItem } from '@/types/rundown';
import { getRowNumber as getUnifiedRowNumber } from './rowNumbering';

export const getVisibleColumns = (columns: any[]) => {
  if (!columns) return [];
  // Filter out notes column and only show visible columns
  return columns.filter(col => col.isVisible !== false && col.key !== 'notes');
};

// Use the unified row numbering function
export const getRowNumber = (index: number, items: RundownItem[]) => {
  return getUnifiedRowNumber(index, items);
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
