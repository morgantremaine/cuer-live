
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';

export const generateListFromColumn = (items: RundownItem[], sourceColumn: string): any[] => {
  console.log('📋 Generating list from column:', sourceColumn, 'with items:', items.length);
  
  if (sourceColumn === 'headers') {
    const headerItems = items.filter(item => item.type === 'header');
    console.log('📋 Found header items:', headerItems.length);
    
    // Get header names (segment names) and descriptions (notes), prioritizing names
    const headerTexts = headerItems.map(item => {
      // Prioritize the name field (segment name), then fall back to notes if name is empty
      const headerText = item.name && item.name.trim() !== '' ? item.name : item.notes;
      return headerText || `Header ${item.rowNumber || ''}`;
    });
    
    // Remove duplicates and filter out empty values
    const result = [...new Set(headerTexts)].filter(value => value && value.trim() !== '');
    console.log('📋 Generated header list:', result);
    return result;
  }
  
  // For other columns, return the values from that column
  const values = items
    .filter(item => item.type !== 'header')
    .map(item => {
      const value = item.customFields?.[sourceColumn] || item[sourceColumn as keyof RundownItem];
      return value || '';
    })
    .filter(value => value !== '');
  
  // Remove duplicates using Set
  const result = [...new Set(values)];
  console.log('📋 Generated list for column', sourceColumn, ':', result);
  return result;
};

// Generate consistent list ID based on rundown ID and source column
const generateConsistentListId = (sourceColumn: string, rundownId: string) => {
  return `${sourceColumn}_${rundownId}`;
};

export const generateDefaultBlueprint = (rundownId: string, rundownTitle: string, items: RundownItem[]): BlueprintList[] => {
  console.log('📋 generateDefaultBlueprint called with:', { rundownId, rundownTitle, itemsLength: items.length });
  
  const availableColumns = getAvailableColumns(items);
  console.log('📋 Available columns for default blueprint:', availableColumns);
  
  if (availableColumns.length === 0) {
    console.log('📋 No available columns, cannot create default blueprint');
    return [];
  }
  
  // Always start with headers if they exist, then add other meaningful columns
  const defaultColumns = [];
  
  // Add headers first if available
  const headersColumn = availableColumns.find(col => col.key === 'headers');
  if (headersColumn) {
    console.log('📋 Adding headers column to default blueprint');
    defaultColumns.push(headersColumn);
  }
  
  // Add other meaningful columns up to 3 total
  const otherColumns = availableColumns.filter(col => col.key !== 'headers');
  const remainingSlots = 3 - defaultColumns.length;
  defaultColumns.push(...otherColumns.slice(0, remainingSlots));
  
  console.log('📋 Selected default columns:', defaultColumns);
  
  const defaultLists = defaultColumns.filter(Boolean).map((column) => {
    console.log('📋 Generating list for column:', column);
    const listItems = generateListFromColumn(items, column.key);
    console.log('📋 Generated items for', column.key, ':', listItems);
    
    const list = {
      id: generateConsistentListId(column.key, rundownId),
      name: column.name,
      sourceColumn: column.key,
      items: listItems,
      checkedItems: {}
    };
    
    console.log('📋 Created default list:', list);
    return list;
  });
  
  console.log('📋 Final default blueprint lists:', defaultLists);
  return defaultLists;
};

export const getAvailableColumns = (items: RundownItem[]): { key: string; name: string; }[] => {
  console.log('📋 getAvailableColumns called with items:', items.length);
  
  const columns = new Set<string>();
  
  // Always include headers if they exist
  const hasHeaders = items.some(item => item.type === 'header');
  console.log('📋 Has headers:', hasHeaders);
  if (hasHeaders) {
    columns.add('headers');
  }
  
  // Check standard fields that exist in RundownItem
  const standardFields = ['talent', 'script', 'gfx', 'video', 'notes'];
  standardFields.forEach(field => {
    const hasField = items.some(item => {
      const value = item[field as keyof RundownItem];
      return value && value !== '';
    });
    if (hasField) {
      console.log('📋 Found standard field:', field);
      columns.add(field);
    }
  });
  
  // Check custom fields from all items
  items.forEach(item => {
    if (item.customFields) {
      Object.keys(item.customFields).forEach(key => {
        if (item.customFields![key] && item.customFields![key] !== '') {
          console.log('📋 Found custom field:', key);
          columns.add(key);
        }
      });
    }
  });
  
  console.log('📋 All found columns:', Array.from(columns));
  
  // Convert to the expected format with key and name
  const result = Array.from(columns).map(column => {
    let displayName: string;
    
    switch (column) {
      case 'headers':
        displayName = 'Headers';
        break;
      case 'gfx':
        displayName = 'Graphics';
        break;
      case 'video':
        displayName = 'Video';
        break;
      case 'talent':
        displayName = 'Talent';
        break;
      case 'script':
        displayName = 'Script';
        break;
      case 'notes':
        displayName = 'Notes';
        break;
      default:
        // For custom fields, capitalize first letter
        displayName = column.charAt(0).toUpperCase() + column.slice(1);
    }
    
    return {
      key: column,
      name: displayName
    };
  });
  
  console.log('📋 Final available columns:', result);
  return result;
};
