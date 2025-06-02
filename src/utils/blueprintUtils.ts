
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';

export const generateListFromColumn = (items: RundownItem[], sourceColumn: string): any[] => {
  if (sourceColumn === 'headers') {
    const headerItems = items.filter(item => item.type === 'header');
    const headerTexts = headerItems.map(item => item.segmentName || item.rowNumber);
    return headerTexts;
  }
  
  // For other columns, return the values from that column
  return items
    .filter(item => item.type !== 'header')
    .map(item => {
      const value = item.customFields?.[sourceColumn] || item[sourceColumn as keyof RundownItem];
      return value || '';
    })
    .filter(value => value !== '');
};

export const generateDefaultBlueprint = (rundownId: string, rundownTitle: string, items: RundownItem[]): BlueprintList[] => {
  const availableColumns = getAvailableColumns(items);
  
  return availableColumns.slice(0, 3).map((column, index) => ({
    id: `${column.key}_${Date.now()}_${index}`,
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
  
  // Convert to the expected format with key and name
  return Array.from(columns).map(column => ({
    key: column,
    name: column === 'headers' ? 'Headers' : column.charAt(0).toUpperCase() + column.slice(1)
  }));
};
