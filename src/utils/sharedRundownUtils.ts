
import { RundownItem } from '@/types/rundown';

// Helper function to check if an item is floated
const isFloated = (item: RundownItem) => {
  return item.isFloating || item.isFloated;
};

export const getVisibleColumns = (columns: any[]) => {
  if (!columns) return [];
  return columns.filter(col => col.isVisible !== false && col.key !== 'notes');
};

export const getRowNumber = (index: number, items: RundownItem[]) => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let letterIndex = 0;
  let numberIndex = 0;
  
  // Count actual rows (both headers and regular items)
  for (let i = 0; i <= index; i++) {
    if (items[i]?.type === 'header') {
      letterIndex++;
      numberIndex = 0; // Reset number for new section
    } else {
      numberIndex++;
    }
  }
  
  const currentItem = items[index];
  if (currentItem?.type === 'header') {
    // For headers, just return the letter
    return letters[letterIndex - 1] || 'A';
  } else {
    // For regular items, return letter + number
    const letter = letters[letterIndex - 1] || 'A';
    return `${letter}${numberIndex}`;
  }
};

export const getCellValue = (item: RundownItem, column: any) => {
  let value = '';
  
  if (column.isCustom) {
    value = item.customFields?.[column.key] || '';
  } else {
    switch (column.key) {
      case 'segmentName':
        // For headers, show the notes (description) instead of just the letter
        if (item.type === 'header') {
          value = item.notes || item.name || '';
        } else {
          // For regular items, show the name/segmentName
          value = item.segmentName || item.name || '';
        }
        break;
      case 'duration':
        value = item.duration || '';
        break;
      case 'startTime':
        value = item.startTime || '';
        break;
      case 'endTime':
        value = item.endTime || '';
        break;
      case 'notes':
        value = item.notes || '';
        break;
      case 'script':
        value = item.script || '';
        break;
      case 'talent':
        value = item.talent || '';
        break;
      default:
        // Handle any other fields that might exist on the item
        value = (item as any)[column.key] || '';
    }
  }
  
  return value;
};

// Time conversion utilities for shared rundown calculations
const timeToSeconds = (timeStr: string) => {
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

// Calculate header duration excluding floated items
export const calculateHeaderDuration = (headerIndex: number, items: RundownItem[]) => {
  if (headerIndex < 0 || headerIndex >= items.length || items[headerIndex].type !== 'header') {
    return '00:00:00';
  }

  let totalSeconds = 0;
  let i = headerIndex + 1;

  while (i < items.length && items[i].type !== 'header') {
    // Only count non-floated items in header duration
    if (!isFloated(items[i])) {
      totalSeconds += timeToSeconds(items[i].duration || '00:00');
    }
    i++;
  }

  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};
