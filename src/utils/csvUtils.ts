
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

// CSV parsing utilities
export const parseCSV = (csvText: string): string[][] => {
  const lines = csvText.split('\n').filter(line => line.trim());
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  });
};

// Standard field mappings
const STANDARD_FIELD_MAPPINGS: Record<string, string> = {
  'row number': 'rowNumber',
  'rownumber': 'rowNumber',
  'name': 'name',
  'title': 'name',
  'start time': 'startTime',
  'starttime': 'startTime',
  'start': 'startTime',
  'duration': 'duration',
  'dur': 'duration',
  'end time': 'endTime',
  'endtime': 'endTime',
  'end': 'endTime',
  'talent': 'talent',
  'presenter': 'talent',
  'host': 'talent',
  'script': 'script',
  'content': 'script',
  'description': 'script',
  'gfx': 'gfx',
  'graphics': 'gfx',
  'video': 'video',
  'clip': 'video',
  'notes': 'notes',
  'note': 'notes',
  'comments': 'notes',
  'type': 'type'
};

export const mapCSVToRundownItems = (csvData: string[][]): { items: RundownItem[], columns: Column[] } => {
  if (csvData.length === 0) {
    return { items: [], columns: [] };
  }

  const headers = csvData[0].map(h => h.toLowerCase().trim());
  const rows = csvData.slice(1);

  // Create column mappings
  const columns: Column[] = [];
  const customFieldMap: Record<number, string> = {};

  headers.forEach((header, index) => {
    const standardField = STANDARD_FIELD_MAPPINGS[header];
    
    if (standardField) {
      // Add standard columns that aren't already included
      const existingColumn = columns.find(col => col.key === standardField);
      if (!existingColumn) {
        columns.push({
          id: `col_${Date.now()}_${index}`,
          name: header.charAt(0).toUpperCase() + header.slice(1),
          key: standardField,
          width: '150px',
          isCustom: false,
          isEditable: true,
          isVisible: true
        });
      }
    } else {
      // Create custom field column
      const customFieldKey = `custom_${header.replace(/[^a-zA-Z0-9]/g, '_')}`;
      customFieldMap[index] = customFieldKey;
      
      columns.push({
        id: `col_${Date.now()}_${index}`,
        name: header.charAt(0).toUpperCase() + header.slice(1),
        key: customFieldKey,
        width: '150px',
        isCustom: true,
        isEditable: true,
        isVisible: true
      });
    }
  });

  // Convert rows to RundownItems
  const items: RundownItem[] = rows.map((row, rowIndex) => {
    const item: RundownItem = {
      id: `item_${Date.now()}_${rowIndex}`,
      type: 'regular',
      rowNumber: '',
      name: '',
      startTime: '00:00:00',
      duration: '00:00',
      endTime: '00:00:00',
      elapsedTime: '00:00:00',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '',
      isFloating: false,
      customFields: {}
    };

    // Map CSV data to item fields
    headers.forEach((header, colIndex) => {
      const cellValue = row[colIndex] || '';
      const standardField = STANDARD_FIELD_MAPPINGS[header];
      
      if (standardField) {
        // Handle type field specially
        if (standardField === 'type') {
          item.type = cellValue.toLowerCase() === 'header' ? 'header' : 'regular';
        } else {
          (item as any)[standardField] = cellValue;
        }
      } else {
        // Add to custom fields
        const customFieldKey = customFieldMap[colIndex];
        if (customFieldKey && !item.customFields) {
          item.customFields = {};
        }
        if (item.customFields && customFieldKey) {
          item.customFields[customFieldKey] = cellValue;
        }
      }
    });

    return item;
  });

  return { items, columns };
};

export const exportRundownToCSV = (items: RundownItem[], columns: Column[]): string => {
  // Create headers from visible columns
  const headers = columns
    .filter(col => col.isVisible)
    .map(col => col.name);

  // Create CSV rows
  const csvRows = [headers];

  items.forEach(item => {
    const row: string[] = [];
    
    columns
      .filter(col => col.isVisible)
      .forEach(col => {
        let value = '';
        
        if (col.isCustom && item.customFields) {
          value = item.customFields[col.key] || '';
        } else {
          value = (item as any)[col.key] || '';
        }
        
        // Escape quotes and wrap in quotes if contains comma
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        row.push(value);
      });
    
    csvRows.push(row);
  });

  return csvRows.map(row => row.join(',')).join('\n');
};

export const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
