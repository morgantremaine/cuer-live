
import { RundownItem } from '@/types/rundown';

/**
 * Calculates the row number for an item at a given index in the rundown.
 * 
 * Header Lettering Rules:
 * - If there are regular rows before the first header: headers start at "B", "C", "D"...
 * - If the first item is a header: headers start at "A", "B", "C"...
 * 
 * Regular Row Numbering:
 * - Regular rows are numbered within their segment: A1, A2, B1, B2, etc.
 */
export const getRowNumber = (index: number, items: RundownItem[]): string => {
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
    // Start from A if there are rows before first header, otherwise start from A for first header
    const headerIndex = hasRowsBeforeFirstHeader ? headerCount - 1 : headerCount - 1;
    return letters[headerIndex] || 'A';
  }
  
  // For regular items, find which segment they belong to and count within that segment
  let currentSegmentLetter = '';
  let itemCountInSegment = 0;
  let segmentHeaderCount = 0;
  
  // If there are rows before the first header, they belong to an implied "A" segment
  if (hasRowsBeforeFirstHeader && index < firstHeaderIndex) {
    currentSegmentLetter = 'A';
    itemCountInSegment = index + 1;
    return `${currentSegmentLetter}${itemCountInSegment}`;
  }
  
  // Go through items up to current index to find current segment
  for (let i = 0; i <= index; i++) {
    const currentItem = items[i];
    if (!currentItem) continue;
    
    if (currentItem.type === 'header') {
      // Update which segment we're in
      const headerIndex = hasRowsBeforeFirstHeader ? segmentHeaderCount + 1 : segmentHeaderCount;
      currentSegmentLetter = letters[headerIndex] || 'A';
      segmentHeaderCount++;
      itemCountInSegment = 0; // Reset count for new segment
    } else {
      // This is a regular item
      itemCountInSegment++;
    }
  }
  
  return `${currentSegmentLetter}${itemCountInSegment}`;
};
