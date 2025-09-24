
import Papa from 'papaparse';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/types/columns';
import { isHeaderItem } from '@/types/rundown';
import { calculateItemsWithTiming, timeToSeconds, secondsToTime } from '@/utils/rundownCalculations';
import { generateHeaderLabel } from '@/utils/headerUtils';

export interface CSVExportData {
  items: RundownItem[];
  visibleColumns: Column[];
}

const getRowNumber = (index: number, items: RundownItem[]): string => {
  if (index < 0 || index >= items.length) return '';
  
  const currentItem = items[index];
  if (!currentItem) return '';
  
  // Headers don't have row numbers, return empty string
  if (isHeaderItem(currentItem)) {
    return '';
  }
  
  // Use the stored rowNumber field instead of recalculating
  // This ensures consistency after drag operations
  return currentItem.rowNumber || '';
};

// Helper function to get cell value for CSV export, similar to SharedRundownTable logic
const getCellValueForExport = (item: RundownItem, column: Column, calculatedItem: any): string => {
  // For time-related columns, use calculated values
  if (column.key === 'startTime') {
    return calculatedItem?.calculatedStartTime || item.startTime || '';
  }
  
  if (column.key === 'endTime') {
    return calculatedItem?.calculatedEndTime || item.endTime || '';
  }
  
  if (column.key === 'elapsedTime') {
    return calculatedItem?.calculatedElapsedTime || item.elapsedTime || '';
  }
  
  // For custom columns, check if it's a custom field
  if (column.isCustom && item.customFields && item.customFields[column.key]) {
    return item.customFields[column.key] || '';
  }
  
  // For standard fields, get the value directly
  const value = item[column.key as keyof RundownItem];
  return typeof value === 'string' ? value : (value ? String(value) : '');
};

export const exportRundownAsCSV = (data: CSVExportData, filename: string = 'rundown'): void => {
  if (!data.items || data.items.length === 0) {
    throw new Error('No rundown data available to export');
  }

  if (!data.visibleColumns || data.visibleColumns.length === 0) {
    throw new Error('No visible columns available to export');
  }

  // Calculate timing for all items using the same logic as the display
  const calculatedItems = calculateItemsWithTiming(data.items, '09:00:00'); // Default start time

  // Create headers - include the # column first, then visible columns
  const headers = ['#', ...data.visibleColumns.map(column => column.name)];

  // Map rundown items to CSV rows based on visible columns
  const csvData = data.items.map((item, index) => {
    const row: any = {};
    const calculatedItem = calculatedItems[index];
    
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
        // For regular items, get the value using the enhanced logic
        row[column.name] = getCellValueForExport(item, column, calculatedItem);
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
