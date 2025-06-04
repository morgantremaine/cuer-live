
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';

export const generateListFromColumn = (items: RundownItem[], sourceColumn: string): any[] => {
  console.log(`Generating list from column "${sourceColumn}" with ${items.length} items`);
  
  if (sourceColumn === 'headers') {
    const headerItems = items.filter(item => item.type === 'header');
    console.log(`Found ${headerItems.length} header items:`, headerItems.map(h => h.name || h.segmentName));
    // Use notes field for header descriptions, fallback to segmentName if notes is empty
    const headerTexts = headerItems.map(item => item.notes || item.segmentName || item.rowNumber);
    // Remove duplicates and filter out empty values
    const result = [...new Set(headerTexts)].filter(value => value && value.trim() !== '');
    console.log(`Generated ${result.length} header list items:`, result);
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
  console.log(`Generated ${result.length} items for column "${sourceColumn}":`, result.slice(0, 5));
  return result;
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
  console.log(`Getting available columns from ${items.length} items`);
  const columns = new Set<string>();
  
  // Always include headers
  if (items.some(item => item.type === 'header')) {
    columns.add('headers');
    console.log('Added headers column');
  }
  
  // Check standard fields
  const standardFields = ['video', 'gfx', 'talent', 'audio', 'script'];
  standardFields.forEach(field => {
    const hasField = items.some(item => item[field as keyof RundownItem] && item[field as keyof RundownItem] !== '');
    if (hasField) {
      columns.add(field);
      console.log(`Added standard field: ${field}`);
    }
  });
  
  // Check custom fields
  items.forEach(item => {
    if (item.customFields) {
      Object.keys(item.customFields).forEach(key => {
        if (item.customFields![key] && item.customFields![key] !== '') {
          columns.add(key);
          console.log(`Added custom field: ${key}`);
        }
      });
    }
  });
  
  // Convert to the expected format with key and name - change Headers to Blocks
  const result = Array.from(columns).map(column => ({
    key: column,
    name: column === 'headers' ? 'Blocks' : column.charAt(0).toUpperCase() + column.slice(1)
  }));
  
  console.log('Available columns:', result);
  return result;
};
