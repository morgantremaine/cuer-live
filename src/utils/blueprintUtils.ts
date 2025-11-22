
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
  } else if (sourceColumn.startsWith('color_')) {
    // Extract items by color
    const colorValue = sourceColumn.replace('color_', '');
    return generateListFromColor(items, colorValue);
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

// Color name mapping for common hex values
const COLOR_NAMES: Record<string, string> = {
  '#ef4444': 'Red',
  '#f97316': 'Orange',
  '#f59e0b': 'Amber',
  '#eab308': 'Yellow',
  '#84cc16': 'Lime',
  '#22c55e': 'Green',
  '#10b981': 'Emerald',
  '#14b8a6': 'Teal',
  '#06b6d4': 'Cyan',
  '#0ea5e9': 'Sky',
  '#3b82f6': 'Blue',
  '#6366f1': 'Indigo',
  '#8b5cf6': 'Violet',
  '#a855f7': 'Purple',
  '#d946ef': 'Fuchsia',
  '#ec4899': 'Pink',
  '#f43f5e': 'Rose',
  '#fdba74': 'Orange',
  '#fde047': 'Yellow',
  '#86efac': 'Green',
  '#93c5fd': 'Blue',
  '#c4b5fd': 'Purple',
  '#fca5a5': 'Red',
};

// Convert hex color to human-readable name
export const getColorName = (hex: string): string => {
  // Check direct mapping first
  const upperHex = hex.toUpperCase();
  const lowerHex = hex.toLowerCase();
  
  if (COLOR_NAMES[upperHex]) return COLOR_NAMES[upperHex];
  if (COLOR_NAMES[lowerHex]) return COLOR_NAMES[lowerHex];

  // Try to derive name from HSL
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) {
      return 'Gray';
    }

    const d = max - min;
    let h = 0;

    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6;
    } else {
      h = ((r - g) / d + 4) / 6;
    }

    h *= 360;

    // Determine lightness prefix (disabled for cleaner names)
    const lightness = '';

    // Determine hue name
    let hueName = '';
    if (h < 30 || h >= 330) hueName = 'Red';
    else if (h < 60) hueName = 'Orange';
    else if (h < 90) hueName = 'Yellow';
    else if (h < 150) hueName = 'Green';
    else if (h < 210) hueName = 'Cyan';
    else if (h < 270) hueName = 'Blue';
    else if (h < 330) hueName = 'Purple';

    return `${lightness}${hueName}`;
  } catch {
    return 'Custom Color';
  }
};

// Get all unique colors used in the rundown (excluding white/default)
export const getUsedColors = (items: RundownItem[]): AvailableColumn[] => {
  logger.blueprint('getUsedColors called with items:', { count: items.length });
  
  const colorCounts = new Map<string, number>();
  
  items.forEach(item => {
    const color = item.color;
    // Skip white/default colors and empty values
    if (color && 
        color.toLowerCase() !== '#ffffff' && 
        color.toLowerCase() !== '#fff' &&
        color !== '') {
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }
  });
  
  const colorColumns: AvailableColumn[] = [];
  colorCounts.forEach((count, color) => {
    // Generate a readable name for the color using the color name function
    const colorName = `${getColorName(color)} (${count} ${count === 1 ? 'item' : 'items'})`;
    colorColumns.push({
      name: colorName,
      value: `color_${color}`
    });
  });
  
  logger.blueprint('Found unique colors:', colorColumns.length);
  return colorColumns;
};

// Generate list from items with a specific color
export const generateListFromColor = (items: RundownItem[], colorValue: string): string[] => {
  logger.blueprint('generateListFromColor called', { colorValue, itemCount: items.length });
  
  const list: string[] = [];
  
  items.forEach(item => {
    if (item.color === colorValue) {
      // Use the row name/content as the list item text
      const itemText = item.name || item.notes || item.rowNumber || 'Unnamed Item';
      if (itemText && String(itemText).trim() !== '') {
        list.push(String(itemText).trim());
      }
    }
  });
  
  logger.blueprint('Generated color-based list:', { colorValue, count: list.length });
  return list;
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
  console.log('BLUEPRINT DEBUG - getItemMetadata called:', {
    itemText,
    sourceColumn,
    totalRundownItems: rundownItems.length
  });

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
  } else if (sourceColumn.startsWith('color_')) {
    // Match by color and item text
    const colorValue = sourceColumn.replace('color_', '');
    matchedItem = rundownItems.find(item => {
      if (item.color !== colorValue) return false;
      const itemName = item.name || item.notes || item.rowNumber || 'Unnamed Item';
      return String(itemName).trim() === itemText;
    });
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

  console.log('BLUEPRINT DEBUG - getItemMetadata result:', {
    itemText,
    matched: !!matchedItem,
    rowNumber: matchedItem?.rowNumber,
    startTime: matchedItem?.startTime,
    matchedItemSample: matchedItem ? {
      type: matchedItem.type,
      name: matchedItem.name,
      rowNumber: matchedItem.rowNumber,
      startTime: matchedItem.startTime
    } : null
  });

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
