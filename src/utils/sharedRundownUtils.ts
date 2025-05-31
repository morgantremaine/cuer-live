
import { RundownItem } from '@/types/rundown';

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
