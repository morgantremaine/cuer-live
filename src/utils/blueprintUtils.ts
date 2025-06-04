
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';

export const generateListFromColumn = (items: RundownItem[], sourceColumn: string): any[] => {
  if (sourceColumn === 'headers') {
    const headerItems = items.filter(item => item.type === 'header');
    // Use notes field for header descriptions, fallback to segmentName if notes is empty
    const headerTexts = headerItems.map(item => item.notes || item.segmentName || item.rowNumber);
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
  
  // Always include headers
  if (items.some(item => item.type === 'header')) {
    columns.add('headers');
  }
  
  // Check standard fields
  const standardFields = ['video', 'gfx', 'talent', 'audio', 'script'];
  standardFields.forEach(field => {
    if (items.some(item => item[field as keyof RundownItem] && item[field as keyof RundownItem] !== '')) {
      columns.add(field);
    }
  });
  
  // Check custom fields
  items.forEach(item => {
    if (item.customFields) {
      Object.keys(item.customFields).forEach(key => {
        if (item.customFields![key] && item.customFields![key] !== '') {
          columns.add(key);
        }
      });
    }
  });
  
  // Convert to the expected format with key and name - change Headers to Blocks
  return Array.from(columns).map(column => ({
    key: column,
    name: column === 'headers' ? 'Blocks' : column.charAt(0).toUpperCase() + column.slice(1)
  }));
};
