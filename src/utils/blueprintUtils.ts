
import { RundownItem } from '@/types/rundown';
import { BlueprintList, DEFAULT_BLUEPRINT_LISTS } from '@/types/blueprint';

export const generateListFromColumn = (items: RundownItem[], columnKey: string): string[] => {
  console.log('Generating list from column:', columnKey, 'with items:', items.length);
  console.log('First few items structure:', items.slice(0, 3).map(item => ({
    id: item.id,
    type: item.type,
    name: item.name,
    notes: item.notes,
    segmentName: item.segmentName,
    isHeader: item.isHeader,
    // Show all keys to understand the structure
    allKeys: Object.keys(item)
  })));
  
  const values = new Set<string>();
  
  // Special handling for headers overview
  if (columnKey === 'headers') {
    items.forEach((item, index) => {
      if (item.type === 'header') {
        const letter = item.rowNumber || item.segmentName || '';
        const description = item.notes || item.name || '';
        if (letter && description) {
          values.add(`${letter}: ${description}`);
        } else if (letter) {
          values.add(letter);
        }
        console.log(`Header ${index}: ${letter}: ${description}`);
      }
    });
    
    const result = Array.from(values).sort();
    console.log('Final header overview values:', result);
    return result;
  }
  
  items.forEach((item, index) => {
    // Skip header items for all columns except the special 'headers' column
    if (item.type === 'header') {
      return;
    }
    
    let value = '';
    
    // Handle custom fields
    if (columnKey.startsWith('customFields.')) {
      const customFieldKey = columnKey.replace('customFields.', '');
      value = item.customFields?.[customFieldKey] || '';
      console.log(`Item ${index} custom field ${customFieldKey}:`, value);
    } else {
      // Handle regular fields - be more explicit about field access
      switch (columnKey) {
        case 'name':
          value = item.name || '';
          break;
        case 'talent':
          value = item.talent || '';
          break;
        case 'script':
          value = item.script || '';
          break;
        case 'gfx':
          value = item.gfx || '';
          break;
        case 'video':
          value = item.video || '';
          break;
        case 'notes':
          value = item.notes || '';
          break;
        case 'startTime':
          value = item.startTime || '';
          break;
        case 'endTime':
          value = item.endTime || '';
          break;
        case 'duration':
          value = item.duration || '';
          break;
        case 'rowNumber':
          value = item.rowNumber || '';
          break;
        default:
          // Fallback for any other fields
          value = (item as any)[columnKey] || '';
      }
      console.log(`Item ${index} (type: ${item.type}) field ${columnKey}:`, value);
    }
    
    // Clean and add non-empty values
    const cleanValue = value.trim();
    if (cleanValue && cleanValue !== '') {
      values.add(cleanValue);
    }
  });
  
  const result = Array.from(values).sort();
  console.log('Final values for column', columnKey, ':', result);
  return result;
};

export const generateDefaultBlueprint = (rundownId: string, rundownTitle: string, items: RundownItem[]): BlueprintList[] => {
  return DEFAULT_BLUEPRINT_LISTS.map(listConfig => ({
    id: `${listConfig.sourceColumn}_${Date.now()}`,
    name: listConfig.name,
    sourceColumn: listConfig.sourceColumn,
    items: generateListFromColumn(items, listConfig.sourceColumn)
  }));
};

export const getAvailableColumns = (items: RundownItem[]) => {
  const columns = new Set<{ key: string; name: string }>();
  
  // Add the special headers column first
  columns.add({ key: 'headers', name: 'Rundown Overview' });
  
  // Add standard columns that exist on RundownItem
  const standardColumns = [
    { key: 'name', name: 'Segment Name' },
    { key: 'talent', name: 'Talent' },
    { key: 'script', name: 'Script' },
    { key: 'gfx', name: 'GFX' },
    { key: 'video', name: 'Video' },
    { key: 'notes', name: 'Notes' },
    { key: 'startTime', name: 'Start Time' },
    { key: 'endTime', name: 'End Time' },
    { key: 'duration', name: 'Duration' },
    { key: 'rowNumber', name: 'Row Number' }
  ];
  
  standardColumns.forEach(col => columns.add(col));
  
  // Add custom fields by examining the actual data in items
  const customFieldNames = new Set<string>();
  items.forEach(item => {
    if (item.customFields) {
      Object.keys(item.customFields).forEach(fieldName => {
        // Filter out auto-generated field names that look like "custom_12345..."
        if (!fieldName.match(/^custom_\d+/)) {
          customFieldNames.add(fieldName);
        }
      });
    }
  });
  
  // Convert custom field names to column format
  customFieldNames.forEach(fieldName => {
    columns.add({ 
      key: `customFields.${fieldName}`, 
      name: fieldName 
    });
  });
  
  return Array.from(columns);
};
