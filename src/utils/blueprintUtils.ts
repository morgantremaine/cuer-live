
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { BlueprintList } from '@/types/blueprint';

export const generateListFromColumn = (items: RundownItem[], sourceColumn: string): string[] => {
  console.log('📋 generateListFromColumn called with:', { sourceColumn, itemsCount: items.length });
  
  if (!items || items.length === 0) {
    console.log('📋 No items provided to generateListFromColumn');
    return [];
  }

  switch (sourceColumn) {
    case 'headers':
      const headerItems = items
        .filter(item => isHeaderItem(item))
        .map(item => {
          // Try different possible header text sources
          if (item.notes && item.notes.trim()) return item.notes.trim();
          if (item.name && item.name.trim()) return item.name.trim();
          if (item.segmentName && item.segmentName.trim()) return item.segmentName.trim();
          if (item.rowNumber && item.rowNumber.toString().trim()) return item.rowNumber.toString().trim();
          return 'Untitled Header';
        })
        .filter(text => text && text.length > 0);
      
      console.log('📋 Generated header items:', headerItems);
      return headerItems;

    case 'talent':
    case 'gfx':
    case 'video':
    case 'notes':
    case 'script':
      const fieldItems = items
        .map(item => item[sourceColumn as keyof RundownItem])
        .filter(value => value && typeof value === 'string' && value.trim() !== '')
        .map(value => (value as string).trim());
      
      console.log(`📋 Generated ${sourceColumn} items:`, fieldItems);
      return fieldItems;

    default:
      console.log('📋 Unknown source column:', sourceColumn);
      return [];
  }
};

export const getUniqueItems = (items: string[]): string[] => {
  const seen = new Set<string>();
  const uniqueItems: string[] = [];
  
  items.forEach(item => {
    if (!seen.has(item)) {
      seen.add(item);
      uniqueItems.push(item);
    }
  });
  
  return uniqueItems;
};

export const getAvailableColumns = (items: RundownItem[]) => {
  console.log('📋 getAvailableColumns called with items:', items.length);
  
  if (!items || items.length === 0) {
    console.log('📋 No items provided to getAvailableColumns');
    return [];
  }

  const columns = [];
  
  // Check for headers
  const hasHeaders = items.some(item => isHeaderItem(item));
  console.log('📋 Has headers:', hasHeaders);
  if (hasHeaders) {
    columns.push({ name: 'Headers', value: 'headers' });
  }
  
  // Check for other standard fields with proper null checks
  const standardFields = ['talent', 'gfx', 'video', 'notes', 'script'];
  standardFields.forEach(field => {
    const hasField = items.some(item => {
      const value = item[field as keyof RundownItem];
      return value && typeof value === 'string' && value.trim() !== '';
    });
    if (hasField) {
      console.log('📋 Found standard field:', field);
      columns.push({ 
        name: field.charAt(0).toUpperCase() + field.slice(1), 
        value: field 
      });
    }
  });
  
  console.log('📋 All found columns:', columns.map(c => c.value));
  console.log('📋 Final available columns:', columns);
  return columns;
};

export const generateDefaultBlueprint = (rundownId: string, rundownTitle: string, items: RundownItem[]): BlueprintList[] => {
  console.log('📋 generateDefaultBlueprint called with:', { rundownId, rundownTitle, itemsCount: items.length });
  
  if (!items || items.length === 0) {
    console.log('📋 No items provided to generateDefaultBlueprint');
    return [];
  }

  const availableColumns = getAvailableColumns(items);
  const defaultLists: BlueprintList[] = [];

  // Create default lists for available columns (max 2 to start)
  const columnsToCreate = availableColumns.slice(0, 2);
  console.log('📋 Creating default lists for columns:', columnsToCreate.map(c => c.value));

  columnsToCreate.forEach(column => {
    const listItems = generateListFromColumn(items, column.value);
    if (listItems.length > 0) {
      const newList: BlueprintList = {
        id: `${column.value}_${Date.now()}`,
        name: column.name,
        sourceColumn: column.value,
        items: listItems,
        checkedItems: {},
        showUniqueOnly: false
      };
      defaultLists.push(newList);
      console.log('📋 Created default list:', newList.name, 'with', newList.items.length, 'items');
    }
  });

  console.log('📋 Generated', defaultLists.length, 'default lists');
  return defaultLists;
};

export const generateListId = (sourceColumn: string): string => {
  return `${sourceColumn}_${Date.now()}`;
};
