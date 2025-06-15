
import Papa from 'papaparse';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { isHeaderItem } from '@/types/rundown';

export interface CSVExportData {
  items: RundownItem[];
  visibleColumns: Column[];
}

const getRowNumber = (index: number, items: RundownItem[]): string => {
  if (index < 0 || index >= items.length) return '';
  
  const item = items[index];
  if (!item) return '';
  
  // Calculate row numbers based purely on position and type, matching rundown display
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  // For headers, count how many headers we've seen so far
  if (isHeaderItem(item)) {
    let headerCount = 0;
    for (let i = 0; i <= index; i++) {
      if (items[i] && isHeaderItem(items[i])) {
        headerCount++;
      }
    }
    return letters[headerCount - 1] || 'A';
  }
  
  // For regular items, find which segment they belong to and count within that segment
  let currentSegmentLetter = 'A';
  let itemCountInSegment = 0;
  
  // Go through items up to current index
  for (let i = 0; i <= index; i++) {
    const currentItem = items[i];
    if (!currentItem) continue;
    
    if (isHeaderItem(currentItem)) {
      // Update which segment we're in based on header count
      let headerCount = 0;
      for (let j = 0; j <= i; j++) {
        if (items[j] && isHeaderItem(items[j])) {
          headerCount++;
        }
      }
      currentSegmentLetter = letters[headerCount - 1] || 'A';
      itemCountInSegment = 0; // Reset count for new segment
    } else {
      // This is a regular item
      itemCountInSegment++;
    }
  }
  
  return `${currentSegmentLetter}${itemCountInSegment}`;
};

export const exportRundownAsCSV = (data: CSVExportData, filename: string = 'rundown'): void => {
  if (!data.items || data.items.length === 0) {
    throw new Error('No rundown data available to export');
  }

  if (!data.visibleColumns || data.visibleColumns.length === 0) {
    throw new Error('No visible columns available to export');
  }

  // Create headers - include the # column first, then visible columns
  const headers = ['#', ...data.visibleColumns.map(column => column.name)];

  // Map rundown items to CSV rows based on visible columns
  const csvData = data.items.map((item, index) => {
    const row: any = {};
    
    // Add the row number as the first column using proper numbering logic
    row['#'] = getRowNumber(index, data.items);
    
    // Add data for each visible column
    data.visibleColumns.forEach(column => {
      // For headers, handle special cases
      if (isHeaderItem(item)) {
        if (column.key === 'name' || column.key === 'segmentName') {
          // Show the header name/description instead of just the letter
          row[column.name] = item.name || '';
        } else if (column.key === 'duration') {
          // Headers can show their duration if they have one
          row[column.name] = item.duration || '';
        } else {
          // For other columns, leave empty for headers
          row[column.name] = '';
        }
      } else {
        // For regular items, get the value from the item based on column key
        const value = item[column.key as keyof RundownItem];
        row[column.name] = value || '';
      }
    });
    
    return row;
  });

  // Generate CSV content using PapaParse
  const csv = Papa.unparse(csvData, {
    header: true,
    columns: headers
  });

  // Create and trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};
