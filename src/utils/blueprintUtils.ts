
import { RundownItem } from '@/types/rundown';
import { BlueprintList, DEFAULT_BLUEPRINT_LISTS } from '@/types/blueprint';

export const generateListFromColumn = (items: RundownItem[], columnKey: string): string[] => {
  console.log('=== PROCESSING COLUMN:', columnKey, '===');
  console.log('Total items:', items.length);
  console.log('Items by type:', items.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>));
  
  // Special handling for headers overview - extract descriptions from header ROWS
  if (columnKey === 'headers') {
    console.log('*** PROCESSING HEADERS OVERVIEW ***');
    const headerItems = items.filter(item => item.type === 'header');
    console.log('Found', headerItems.length, 'header items');
    
    const orderedValues: string[] = [];
    const seenValues = new Set<string>();
    
    headerItems.forEach((item, index) => {
      console.log(`Processing header row ${index + 1}:`, {
        id: item.id,
        name: item.name,
        notes: item.notes,
        rowNumber: item.rowNumber
      });
      
      // Extract meaningful description from header row
      const description = item.notes || item.name || item.rowNumber || '';
      const cleanDescription = description.trim();
      
      if (cleanDescription && cleanDescription !== '' && !seenValues.has(cleanDescription)) {
        console.log('Adding header description:', cleanDescription);
        orderedValues.push(cleanDescription);
        seenValues.add(cleanDescription);
      } else {
        console.log('Skipping duplicate or empty description:', cleanDescription);
      }
    });
    
    console.log('*** HEADERS OVERVIEW RESULT:', orderedValues);
    return orderedValues;
  }
  
  // For all other columns, explicitly exclude header items and maintain order
  console.log('Processing regular column:', columnKey);
  const regularItems = items.filter(item => item.type !== 'header');
  console.log(`Processing ${regularItems.length} regular items for column: ${columnKey}`);
  
  const orderedValues: string[] = [];
  const seenValues = new Set<string>();
  
  regularItems.forEach((item, index) => {
    let value = '';
    
    // Handle custom fields
    if (columnKey.startsWith('customFields.')) {
      const customFieldKey = columnKey.replace('customFields.', '');
      value = item.customFields?.[customFieldKey] || '';
    } else {
      // Handle regular fields
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
          value = (item as any)[columnKey] || '';
      }
    }
    
    // Clean and add non-empty values in order, only first instance
    const cleanValue = value.trim();
    if (cleanValue && cleanValue !== '' && !seenValues.has(cleanValue)) {
      orderedValues.push(cleanValue);
      seenValues.add(cleanValue);
    }
  });
  
  console.log('Final ordered values for column', columnKey, ':', orderedValues);
  return orderedValues;
};

export const generateDefaultBlueprint = (rundownId: string, rundownTitle: string, items: RundownItem[]): BlueprintList[] => {
  console.log('=== GENERATING DEFAULT BLUEPRINT ===');
  console.log('generateDefaultBlueprint called with:', { rundownId, rundownTitle, itemsCount: items.length });
  console.log('DEFAULT_BLUEPRINT_LISTS to process:', DEFAULT_BLUEPRINT_LISTS);
  console.log('All items in rundown:', items.map((item, index) => ({
    index,
    id: item.id,
    type: item.type,
    rowNumber: item.rowNumber,
    name: item.name,
    notes: item.notes
  })));
  
  // Ensure we process ALL lists from DEFAULT_BLUEPRINT_LISTS
  console.log('About to process', DEFAULT_BLUEPRINT_LISTS.length, 'blueprint lists');
  
  const result = DEFAULT_BLUEPRINT_LISTS.map((listConfig, configIndex) => {
    console.log(`=== PROCESSING LIST ${configIndex + 1}/${DEFAULT_BLUEPRINT_LISTS.length}: "${listConfig.name}" ===`);
    console.log(`Creating list "${listConfig.name}" from source "${listConfig.sourceColumn}"`);
    
    const generatedItems = generateListFromColumn(items, listConfig.sourceColumn);
    console.log(`Generated ${generatedItems.length} items for "${listConfig.name}":`, generatedItems);
    
    const list: BlueprintList = {
      id: `${listConfig.sourceColumn}_${Date.now()}_${configIndex}`,
      name: listConfig.name,
      sourceColumn: listConfig.sourceColumn,
      items: generatedItems
    };
    
    console.log(`Created list object:`, list);
    return list;
  });
  
  console.log('=== FINAL BLUEPRINT RESULT ===');
  console.log('Generated blueprint lists:', result);
  console.log('Number of lists created:', result.length);
  
  return result;
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
