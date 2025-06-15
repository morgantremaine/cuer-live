
import Papa from 'papaparse';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

export interface CSVExportData {
  items: RundownItem[];
  visibleColumns: Column[];
}

export const exportRundownAsCSV = (data: CSVExportData, filename: string = 'rundown'): void => {
  if (!data.items || data.items.length === 0) {
    throw new Error('No rundown data available to export');
  }

  if (!data.visibleColumns || data.visibleColumns.length === 0) {
    throw new Error('No visible columns available to export');
  }

  // Create headers from visible columns
  const headers = data.visibleColumns.map(column => column.name);

  // Map rundown items to CSV rows based on visible columns
  const csvData = data.items.map(item => {
    const row: any = {};
    data.visibleColumns.forEach(column => {
      // Get the value from the item based on column key
      const value = item[column.key as keyof RundownItem];
      row[column.name] = value || '';
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
