
import { RundownItem, isHeaderItem } from '@/types/rundown';

export const createSegmentNameMap = (items: RundownItem[]): Map<number, string> => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const map = new Map<number, string>();
  let headerCount = 0;
  
  items.forEach((item, index) => {
    if (isHeaderItem(item)) {
      map.set(index, letters[headerCount] || 'A');
      headerCount++;
    }
  });
  
  return map;
};

export const calculateRowNumber = (
  index: number, 
  items: RundownItem[], 
  segmentNameMap: Map<number, string>
): string => {
  const item = items[index];
  if (!item) return '1';
  
  // For headers, return their segment name (A, B, C, etc.)
  if (isHeaderItem(item)) {
    return segmentNameMap.get(index) || 'A';
  }
  
  // For regular items, find the current segment and count within that segment
  let currentSegment = 'A';
  let regularCountInSegment = 0;
  
  // Go backwards to find the most recent header
  for (let i = index - 1; i >= 0; i--) {
    if (isHeaderItem(items[i])) {
      currentSegment = segmentNameMap.get(i) || 'A';
      break;
    }
  }
  
  // Count regular items in the current segment up to this index
  let segmentStartIndex = 0;
  // Find where this segment starts
  for (let i = 0; i <= index; i++) {
    if (isHeaderItem(items[i]) && segmentNameMap.get(i) === currentSegment) {
      segmentStartIndex = i + 1;
      break;
    }
  }
  
  // Count regular items from segment start to current index
  for (let i = segmentStartIndex; i < index; i++) {
    if (i < items.length && !isHeaderItem(items[i])) {
      regularCountInSegment++;
    }
  }
  
  return `${currentSegment}${regularCountInSegment + 1}`;
};
