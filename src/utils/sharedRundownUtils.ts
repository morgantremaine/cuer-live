import { RundownItem } from '@/types/rundown';
import { generateHeaderLabel, checkRowsBeforeFirstHeader } from '@/utils/headerUtils';
import { timeToSeconds, secondsToTime, calculateEndTime, secondsToTimeNoWrap } from '@/utils/rundownCalculations';

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
  
  // Use the calculated rowNumber if available (from calculateItemsWithTiming)
  // Otherwise fall back to stored rowNumber for consistency
  return (item as any).calculatedRowNumber || item.rowNumber || '';
};

// Helper function to calculate duration-based elapsed time for shared rundowns
const calculateDurationBasedElapsedTime = (items: RundownItem[], itemIndex: number): string => {
  let cumulativeDurationSeconds = 0;
  
  // Sum up durations of all non-floated items up to AND INCLUDING this one
  for (let i = 0; i <= itemIndex; i++) {
    const item = items[i];
    if (item && item.type !== 'header' && !item.isFloating && !item.isFloated && item.duration) {
      cumulativeDurationSeconds += timeToSeconds(item.duration);
    }
  }
  
  return secondsToTimeNoWrap(cumulativeDurationSeconds);
};

export const getCellValue = (item: RundownItem, column: any, rundownStartTime?: string, calculatedStartTime?: string, allItems?: RundownItem[], itemIndex?: number) => {
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
        // Use duration-based elapsed time calculation (same as main rundown)
        if (allItems && typeof itemIndex === 'number') {
          value = calculateDurationBasedElapsedTime(allItems, itemIndex);
        } else {
          // Fallback to stored value if context not available
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
