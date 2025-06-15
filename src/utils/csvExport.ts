
import Papa from 'papaparse';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

export interface CSVExportData {
  items: RundownItem[];
  visibleColumns: Column[];
}

const getRowNumber = (index: number, items: RundownItem[]): string => {
  let regularRowCount = 0;
  let headerCount = 0;
  
  for (let i = 0; i <= index; i++) {
    if (items[i].type === 'header') {
      headerCount++;
    } else {
      regularRowCount++;
    }
  }
  
  if (items[index].type === 'header') {
    return String.fromCharCode(65 + headerCount - 1); // A, B, C, etc.
  } else {
    return String(regularRowCount);
  }
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
    
    // Add the row number as the first column
    row['#'] = getRowNumber(index, data.items);
    
    // Add data for each visible column
    data.visibleColumns.forEach(column => {
      // For headers, handle special cases
      if (item.type === 'header') {
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
