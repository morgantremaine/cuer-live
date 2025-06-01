
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
    rowNumber: item.rowNumber,
    // Show all keys to understand the structure
    allKeys: Object.keys(item)
  })));
  
  const values = new Set<string>();
  
  // Special handling for headers overview
  if (columnKey === 'headers') {
    console.log('Processing headers column - looking for header items...');
    items.forEach((item, index) => {
      console.log(`Item ${index}: type="${item.type}", isHeader="${item.isHeader}", rowNumber="${item.rowNumber}", segmentName="${item.segmentName}", notes="${item.notes}", name="${item.name}"`);
      
      // Check for both type === 'header' AND isHeader === true (legacy support)
      if (item.type === 'header' || item.isHeader === true) {
        const letter = item.rowNumber || item.segmentName || '';
        const description = item.notes || item.name || '';
        console.log(`Found header item ${index}: letter="${letter}", description="${description}"`);
        
        if (letter && description) {
          values.add(`${letter}: ${description}`);
        } else if (letter) {
          values.add(letter);
        } else if (description) {
          values.add(description);
        }
      }
    });
    
    // If no headers found, let's see if there are items that look like headers based on their content
    if (values.size === 0) {
      console.log('No explicit headers found, checking for header-like items...');
      items.forEach((item, index) => {
        // Check if rowNumber looks like a single letter (A, B, C, etc.)
        const hasLetterRowNumber = item.rowNumber && /^[A-Z]$/.test(item.rowNumber);
        // Check if name or notes contain header-like content
        const hasHeaderContent = (item.name && item.name.length > 0) || (item.notes && item.notes.length > 0);
        
        console.log(`Item ${index} header check: rowNumber="${item.rowNumber}" hasLetterRowNumber=${hasLetterRowNumber}, hasHeaderContent=${hasHeaderContent}`);
        
        if (hasLetterRowNumber && hasHeaderContent) {
          const letter = item.rowNumber;
          const description = item.notes || item.name || '';
          console.log(`Found potential header based on pattern: ${letter}: ${description}`);
          values.add(`${letter}: ${description}`);
        }
      });
    }
    
    const result = Array.from(values).sort();
    console.log('Final header overview values:', result);
    return result;
  }
  
  items.forEach((item, index) => {
    // Skip header items for all columns except the special 'headers' column
    if (item.type === 'header' || item.isHeader) {
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
  console.log('Generating default blueprint with', DEFAULT_BLUEPRINT_LISTS.length, 'default lists');
  console.log('Default blueprint lists:', DEFAULT_BLUEPRINT_LISTS);
  console.log('All items in rundown:', items.map((item, index) => ({
    index,
    id: item.id,
    type: item.type,
    isHeader: item.isHeader,
    rowNumber: item.rowNumber,
    name: item.name,
    notes: item.notes
  })));
  
  return DEFAULT_BLUEPRINT_LISTS.map(listConfig => {
    console.log(`Creating list "${listConfig.name}" from column "${listConfig.sourceColumn}"`);
    const generatedItems = generateListFromColumn(items, listConfig.sourceColumn);
    console.log(`Generated ${generatedItems.length} items for "${listConfig.name}":`, generatedItems);
    
    return {
      id: `${listConfig.sourceColumn}_${Date.now()}`,
      name: listConfig.name,
      sourceColumn: listConfig.sourceColumn,
      items: generatedItems
    };
  });
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
