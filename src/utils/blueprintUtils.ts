
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { BlueprintList } from '@/types/blueprint';
import { logger } from '@/utils/logger';

export interface AvailableColumn {
  name: string;
  value: string;
}

export const getAvailableColumns = (items: RundownItem[], availableCustomColumns?: { key: string; name: string }[]): AvailableColumn[] => {
  logger.blueprint('getAvailableColumns called with items:', { count: items.length });
  logger.blueprint('Available custom columns passed:', availableCustomColumns);
  
  const columns: AvailableColumn[] = [];
  
  // Check for headers (segments)
  const hasHeaders = items.some(item => isHeaderItem(item));
  logger.blueprint('Has headers:', hasHeaders);
  
  if (hasHeaders) {
    columns.push({ name: 'Headers', value: 'headers' });
  }
  
  // Standard fields to check
  const standardFields = [
    { key: 'talent', name: 'Talent' },
    { key: 'gfx', name: 'Graphics' },
    { key: 'video', name: 'Video' },
    { key: 'script', name: 'Script' }
  ];
  
  standardFields.forEach(field => {
    const hasField = items.some(item => 
      !isHeaderItem(item) && item[field.key as keyof RundownItem] && 
      String(item[field.key as keyof RundownItem]).trim() !== ''
    );
    
    if (hasField) {
      logger.blueprint('Found standard field:', field.key);
      columns.push({ name: field.name, value: field.key });
    }
  });
  
  // Check for custom fields in the data
  const customFieldsFromData = new Set<string>();
  items.forEach(item => {
    if (!isHeaderItem(item) && item.customFields) {
      Object.keys(item.customFields).forEach(key => {
        if (item.customFields![key] && String(item.customFields![key]).trim() !== '') {
          customFieldsFromData.add(key);
        }
      });
    }
  });
  
  customFieldsFromData.forEach(field => {
    logger.blueprint('Found custom field from data:', field);
    // Try to find the proper name from availableCustomColumns first
    const columnConfig = availableCustomColumns?.find(col => col.key === field);
    const displayName = columnConfig ? columnConfig.name : field;
    columns.push({ name: displayName, value: `custom_${field}` });
  });
  
  // Add available custom columns from column configuration (even if they have no data yet)
  if (availableCustomColumns) {
    availableCustomColumns.forEach(column => {
      // Only add if not already added from data
      const alreadyExists = columns.some(col => col.value === `custom_${column.key}`);
      if (!alreadyExists) {
        logger.blueprint('Found custom column from config:', column.key);
        columns.push({ name: column.name, value: `custom_${column.key}` });
      }
    });
  }
  
  logger.blueprint('All found columns:', columns.map(col => col.value));
  logger.blueprint('Final available columns:', columns);
  
  return columns;
};

export const generateListFromColumn = (items: RundownItem[], sourceColumn: string): string[] => {
  logger.blueprint('generateListFromColumn called', { sourceColumn, itemCount: items.length });
  
  const list: string[] = [];
  
  if (sourceColumn === 'headers') {
    // Extract header/segment names
    items.forEach(item => {
      if (isHeaderItem(item)) {
        // Try different fields for the header text
        const headerText = item.notes || item.name || item.segmentName || item.rowNumber || 'Unnamed Segment';
        if (headerText && String(headerText).trim() !== '') {
          list.push(String(headerText).trim());
        }
      }
    });
  } else if (sourceColumn.startsWith('custom_')) {
    // Extract custom field data
    const customFieldKey = sourceColumn.replace('custom_', '');
    items.forEach(item => {
      if (!isHeaderItem(item)) {
        // First try customFields
        let value = '';
        if (item.customFields && item.customFields[customFieldKey]) {
          value = String(item.customFields[customFieldKey]).trim();
        } else {
          // If not in customFields, try direct property access (for newer data structure)
          const directValue = (item as any)[customFieldKey];
          if (directValue) {
            value = String(directValue).trim();
          }
        }
        
        if (value !== '') {
          list.push(value);
        }
      }
    });
  } else {
    // Extract standard field data
    items.forEach(item => {
      if (!isHeaderItem(item)) {
        const value = item[sourceColumn as keyof RundownItem];
        if (value && String(value).trim() !== '') {
          list.push(String(value).trim());
        }
      }
    });
  }
  
  logger.blueprint('Generated list:', { sourceColumn, count: list.length });
  return list;
};

export const getUniqueItems = (items: string[]): string[] => {
  logger.blueprint('getUniqueItems called with', { count: items.length });
  const unique = [...new Set(items)];
  logger.blueprint('Unique items:', { originalCount: items.length, uniqueCount: unique.length });
  return unique;
};

export interface ItemMetadata {
  rowNumber: string | null;
  startTime: string | null;
}

export const getItemMetadata = (
  itemText: string, 
  sourceColumn: string, 
  rundownItems: RundownItem[]
): ItemMetadata => {
  let matchedItem: RundownItem | undefined;

  if (sourceColumn === 'headers') {
    // Match header items
    matchedItem = rundownItems.find(item => 
      isHeaderItem(item) && (
        item.notes === itemText ||
        item.name === itemText ||
        item.segmentName === itemText ||
        item.rowNumber === itemText
      )
    );
  } else if (sourceColumn.startsWith('custom_')) {
    // Match custom field in regular items
    const customFieldKey = sourceColumn.replace('custom_', '');
    matchedItem = rundownItems.find(item => {
      if (isHeaderItem(item)) return false;
      const customValue = item.customFields?.[customFieldKey] || (item as any)[customFieldKey];
      return customValue && String(customValue).trim() === itemText;
    });
  } else {
    // Match standard field in regular items
    matchedItem = rundownItems.find(item => {
      if (isHeaderItem(item)) return false;
      const fieldValue = item[sourceColumn as keyof RundownItem];
      return fieldValue && String(fieldValue).trim() === itemText;
    });
  }

  return {
    rowNumber: matchedItem?.rowNumber || null,
    startTime: matchedItem?.startTime || null
  };
};

export const generateDefaultBlueprint = (rundownId: string, rundownTitle: string, items: RundownItem[], customColumns?: { key: string; name: string }[]): BlueprintList[] => {
  logger.blueprint('generateDefaultBlueprint called', { rundownId, rundownTitle, itemCount: items.length });
  
  const availableColumns = getAvailableColumns(items, customColumns);
  const defaultLists: BlueprintList[] = [];
  
  // Generate a default list for each available column (up to 3 to avoid overwhelming)
  const columnsToUse = availableColumns.slice(0, 3);
  
  columnsToUse.forEach((column, index) => {
    const listItems = generateListFromColumn(items, column.value);
    
    if (listItems.length > 0) {
      const list: BlueprintList = {
        id: `${column.value}_${Date.now() + index}`,
        name: column.name,
        sourceColumn: column.value,
        items: listItems,
        checkedItems: {}
      };
      
      defaultLists.push(list);
      logger.blueprint('Created default list:', { name: list.name, itemCount: list.items.length });
    }
  });
  
  logger.blueprint('Generated default blueprint with lists:', defaultLists.length);
  return defaultLists;
};
