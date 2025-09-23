import { RundownItem } from '@/types/rundown';
import { generateHeaderLabel, checkRowsBeforeFirstHeader } from '@/utils/headerUtils';
import { timeToSeconds, secondsToTime, calculateEndTime, calculateElapsedTime } from '@/utils/rundownCalculations';

export const getVisibleColumns = (columns: any[]) => {
  if (!columns || !Array.isArray(columns)) return [];
  // Only show visible columns (notes is allowed in shared rundown if specifically included)
  // Make sure to handle cases where isVisible might be undefined (should default to true)
  return columns.filter(col => 
    col && 
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
      case 'notes':
        value = item.notes || '';
        break;
      default:
        // Handle any other fields that might exist on the item
        value = (item as any)[column.key] || '';
    }
  }
  
  return value;
};
