
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

// Standard field mappings - fixed to match RundownItem structure
const STANDARD_FIELD_MAPPINGS: Record<string, string> = {
  'row number': 'rowNumber',
  'rownumber': 'rowNumber',
  'name': 'name',
  'title': 'name',
  'segment name': 'name',
  'segmentname': 'name',
  'segment': 'name',
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

  console.log('🔄 CSV Import - Headers:', headers);
  console.log('🔄 CSV Import - Sample row:', rows[0]);

  // Create columns - start with essential ones that match our key mapping
  const columns: Column[] = [
    { id: 'segmentName', name: 'Segment Name', key: 'name', width: '200px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'script', name: 'Script', key: 'script', width: '300px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'gfx', name: 'GFX', key: 'gfx', width: '150px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'video', name: 'Video', key: 'video', width: '150px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'duration', name: 'Duration', key: 'duration', width: '120px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'startTime', name: 'Start', key: 'startTime', width: '120px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'endTime', name: 'End', key: 'endTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
    { id: 'elapsedTime', name: 'Elapsed', key: 'elapsedTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
    { id: 'notes', name: 'Notes', key: 'notes', width: '300px', isCustom: false, isEditable: true, isVisible: true }
  ];

  const customFieldMap: Record<number, string> = {};
  const usedStandardFields = new Set<string>();

  // Process headers to identify custom fields and track used standard fields
  headers.forEach((header, index) => {
    const standardField = STANDARD_FIELD_MAPPINGS[header];
    
    if (standardField) {
      usedStandardFields.add(standardField);
      console.log(`✅ Mapped "${header}" to standard field "${standardField}"`);
    } else {
      // Create custom field column
      const customFieldKey = `custom_${header.replace(/[^a-zA-Z0-9]/g, '_')}`;
      customFieldMap[index] = customFieldKey;
      
      console.log(`🆕 Creating custom field column for "${header}" with key "${customFieldKey}"`);
      
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
          // Map to the correct field - ensure we're using the right property names
          (item as any)[standardField] = cellValue;
        }
        console.log(`📝 Set ${standardField} to "${cellValue}" for row ${rowIndex}`);
      } else {
        // Add to custom fields
        const customFieldKey = customFieldMap[colIndex];
        if (customFieldKey) {
          if (!item.customFields) {
            item.customFields = {};
          }
          item.customFields[customFieldKey] = cellValue;
          console.log(`🔧 Set custom field ${customFieldKey} to "${cellValue}" for row ${rowIndex}`);
        }
      }
    });

    return item;
  });

  console.log('✅ CSV Import Complete:', {
    items: items.length,
    columns: columns.length,
    customColumns: columns.filter(c => c.isCustom).length
  });

  return { items, columns };
};

export const exportRundownToCSV = (items: RundownItem[], columns: Column[]): string => {
  console.log('🔄 CSV Export - Starting with:', {
    items: items.length,
    columns: columns.length,
    visibleColumns: columns.filter(col => col.isVisible).length
  });

  // Create headers from visible columns
  const headers = columns
    .filter(col => col.isVisible)
    .map(col => col.name);

  console.log('📋 CSV Export - Headers:', headers);

  // Create CSV rows
  const csvRows = [headers];

  items.forEach((item, itemIndex) => {
    const row: string[] = [];
    
    columns
      .filter(col => col.isVisible)
      .forEach(col => {
        let value = '';
        
        if (col.isCustom && item.customFields) {
          value = item.customFields[col.key] || '';
        } else {
          // Map column key to item property
          value = (item as any)[col.key] || '';
        }
        
        // Escape quotes and wrap in quotes if contains comma
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        row.push(value);
      });
    
    csvRows.push(row);
    console.log(`📝 CSV Export - Row ${itemIndex}:`, row.slice(0, 3), '...');
  });

  const csvContent = csvRows.map(row => row.join(',')).join('\n');
  console.log('✅ CSV Export Complete - Content length:', csvContent.length);
  
  return csvContent;
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
