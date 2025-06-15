
import Papa from 'papaparse';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

export interface CSVExportData {
  headers: string[];
  rows: string[][];
}

export interface CSVImportResult {
  items: RundownItem[];
  newColumns: Column[];
  errors: string[];
}

export const exportToCSV = (items: RundownItem[], columns: Column[]): string => {
  if (items.length === 0) {
    throw new Error('No data to export');
  }

  // Get visible columns in order
  const visibleColumns = columns.filter(col => col.isVisible !== false);
  
  // Create headers
  const headers = visibleColumns.map(col => col.name);
  
  // Create rows
  const rows = items.map(item => {
    return visibleColumns.map(col => {
      const value = item[col.key as keyof RundownItem] || item.customFields?.[col.key] || '';
      // Handle different data types
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
      }
      return String(value);
    });
  });

  // Use Papa Parse to generate CSV
  return Papa.unparse({
    fields: headers,
    data: rows
  });
};

export const importFromCSV = (
  csvContent: string, 
  existingColumns: Column[]
): CSVImportResult => {
  const errors: string[] = [];
  
  // Parse CSV
  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim()
  });

  if (parseResult.errors.length > 0) {
    errors.push(...parseResult.errors.map(err => `Parse error: ${err.message}`));
  }

  const data = parseResult.data as Record<string, string>[];
  
  if (data.length === 0) {
    errors.push('No valid data found in CSV');
    return { items: [], newColumns: [], errors };
  }

  // Get headers from CSV
  const csvHeaders = Object.keys(data[0]);
  
  // Map headers to existing columns and identify new columns needed
  const existingColumnMap = new Map<string, Column>();
  existingColumns.forEach(col => {
    existingColumnMap.set(col.name.toLowerCase(), col);
    existingColumnMap.set(col.key.toLowerCase(), col);
  });

  const newColumns: Column[] = [];
  const columnMapping: { csvHeader: string; column: Column }[] = [];

  csvHeaders.forEach(header => {
    const normalizedHeader = header.toLowerCase();
    let column = existingColumnMap.get(normalizedHeader);
    
    if (!column) {
      // Create new custom column
      const columnKey = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
      column = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: header,
        key: columnKey,
        width: '150px',
        isCustom: true,
        isEditable: true,
        isVisible: true
      };
      newColumns.push(column);
    }
    
    columnMapping.push({ csvHeader: header, column });
  });

  // Convert CSV data to RundownItems
  const items: RundownItem[] = data.map((row, index) => {
    const item: RundownItem = {
      id: `imported_${Date.now()}_${index}`,
      type: 'regular',
      rowNumber: '',
      name: '',
      startTime: '',
      duration: '00:30',
      endTime: '',
      elapsedTime: '00:00:00',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '#ffffff',
      isFloating: false,
      customFields: {}
    };

    // Map CSV data to item fields
    columnMapping.forEach(({ csvHeader, column }) => {
      const value = row[csvHeader] || '';
      
      if (column.isCustom) {
        // Store in customFields
        if (!item.customFields) item.customFields = {};
        item.customFields[column.key] = value;
      } else {
        // Map to standard fields
        const fieldKey = column.key as keyof RundownItem;
        if (fieldKey === 'name') {
          item.name = value || 'Untitled Segment';
        } else if (fieldKey === 'segmentName') {
          item.name = value || 'Untitled Segment';
        } else if (fieldKey in item) {
          (item as any)[fieldKey] = value;
        }
      }
    });

    // Set default name if not provided
    if (!item.name || item.name.trim() === '') {
      item.name = `Imported Segment ${index + 1}`;
    }

    return item;
  });

  return { items, newColumns, errors };
};

export const downloadCSV = (csvContent: string, filename: string = 'rundown.csv') => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};
