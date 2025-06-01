
import { RundownItem } from '@/types/rundown';
import { BlueprintList, DEFAULT_BLUEPRINT_LISTS } from '@/types/blueprint';

export const generateListFromColumn = (items: RundownItem[], columnKey: string): string[] => {
  const values = new Set<string>();
  
  items.forEach(item => {
    let value = '';
    
    // Handle custom fields
    if (columnKey.startsWith('customFields.')) {
      const customFieldKey = columnKey.replace('customFields.', '');
      value = item.customFields?.[customFieldKey] || '';
    } else {
      // Handle regular fields
      value = (item as any)[columnKey] || '';
    }
    
    // Clean and add non-empty values
    const cleanValue = value.trim();
    if (cleanValue && cleanValue !== '') {
      values.add(cleanValue);
    }
  });
  
  return Array.from(values).sort();
};

export const generateDefaultBlueprint = (rundownId: string, rundownTitle: string, items: RundownItem[]): BlueprintList[] => {
  return DEFAULT_BLUEPRINT_LISTS.map(listConfig => ({
    id: `${listConfig.sourceColumn}_${Date.now()}`,
    name: listConfig.name,
    sourceColumn: listConfig.sourceColumn,
    items: generateListFromColumn(items, listConfig.sourceColumn)
  }));
};

export const getAvailableColumns = (items: RundownItem[]) => {
  const columns = new Set<{ key: string; name: string }>();
  
  // Add standard columns
  const standardColumns = [
    { key: 'name', name: 'Segment Name' },
    { key: 'talent', name: 'Talent' },
    { key: 'script', name: 'Script' },
    { key: 'gfx', name: 'GFX' },
    { key: 'video', name: 'Video' },
    { key: 'notes', name: 'Notes' }
  ];
  
  standardColumns.forEach(col => columns.add(col));
  
  // Add custom fields
  items.forEach(item => {
    if (item.customFields) {
      Object.keys(item.customFields).forEach(key => {
        columns.add({ key: `customFields.${key}`, name: key });
      });
    }
  });
  
  return Array.from(columns);
};
