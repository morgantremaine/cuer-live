
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';

export const generateListFromColumn = (items: RundownItem[], sourceColumn: string): any[] => {
  if (sourceColumn === 'headers') {
    const headerItems = items.filter(item => item.type === 'header');
    // Get header names (segment names) and descriptions (notes), prioritizing names
    const headerTexts = headerItems.map(item => {
      // Prioritize the name field (segment name), then fall back to notes if name is empty
      const headerText = item.name && item.name.trim() !== '' ? item.name : item.notes;
      return headerText || `Header ${item.rowNumber || ''}`;
    });
    // Remove duplicates and filter out empty values
    return [...new Set(headerTexts)].filter(value => value && value.trim() !== '');
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
  return [...new Set(values)];
};

// Generate consistent list ID based on rundown ID and source column
const generateConsistentListId = (sourceColumn: string, rundownId: string) => {
  return `${sourceColumn}_${rundownId}`;
};

export const generateDefaultBlueprint = (rundownId: string, rundownTitle: string, items: RundownItem[]): BlueprintList[] => {
  const availableColumns = getAvailableColumns(items);
  
  return availableColumns.slice(0, 3).map((column) => ({
    id: generateConsistentListId(column.key, rundownId),
    name: column.name,
    sourceColumn: column.key,
    items: generateListFromColumn(items, column.key),
    checkedItems: {}
  }));
};

export const getAvailableColumns = (items: RundownItem[]): { key: string; name: string; }[] => {
  const columns = new Set<string>();
  
  // Always include headers if they exist
  if (items.some(item => item.type === 'header')) {
    columns.add('headers');
  }
  
  // Check standard fields that exist in RundownItem
  const standardFields = ['talent', 'script', 'gfx', 'video', 'notes'];
  standardFields.forEach(field => {
    if (items.some(item => {
      const value = item[field as keyof RundownItem];
      return value && value !== '';
    })) {
      columns.add(field);
    }
  });
  
  // Check custom fields from all items
  items.forEach(item => {
    if (item.customFields) {
      Object.keys(item.customFields).forEach(key => {
        if (item.customFields![key] && item.customFields![key] !== '') {
          columns.add(key);
        }
      });
    }
  });
  
  // Convert to the expected format with key and name
  return Array.from(columns).map(column => {
    let displayName: string;
    
    switch (column) {
      case 'headers':
        displayName = 'Blocks';
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
};
