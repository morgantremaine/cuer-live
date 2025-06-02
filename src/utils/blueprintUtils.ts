import { RundownItem } from '@/types/rundown';

export interface BlueprintList {
  id: string;
  name: string;
  items: string[];
}

export const generateBlueprintFromRundown = (
  items: RundownItem[],
  visibleColumns: any[],
  listName: string = 'Generated List'
): BlueprintList[] => {
  const blueprintLists: BlueprintList[] = [];

  const headersColumn = visibleColumns.find(col => col.key === 'headers');
  if (headersColumn) {
    const headerItems = items.filter(item => item.type === 'header');
    const headerValues = headerItems.map(item => {
      if (item.type === 'header' && 'segmentName' in item) {
        return item.segmentName || item.rowNumber || 'Untitled Header';
      }
      return 'Untitled Header';
    });

    blueprintLists.push({
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${listName} - Headers`,
      items: headerValues,
    });
  }

  visibleColumns.forEach(column => {
    if (column.key !== 'headers') {
      const regularItems = items.filter(item => item.type !== 'header');
      const values = new Set<string>();

      regularItems.forEach(item => {
        let value = '';

        if (column.key in item) {
          value = String(item[column.key as keyof RundownItem] || '').trim();
        } else if (item.customFields && column.key in item.customFields) {
          value = String(item.customFields[column.key] || '').trim();
        }

        if (value && value !== '') {
          values.add(value);
        }
      });

      const sortedValues = Array.from(values).sort();

      blueprintLists.push({
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `${listName} - ${column.name}`,
        items: sortedValues,
      });
    }
  });
  
  return blueprintLists;
};

export const processColumnForBlueprint = (items: RundownItem[], column: any) => {
  if (column.key === 'headers') {
    const headerItems = items.filter(item => item.type === 'header');
    return headerItems.map(item => {
      if (item.type === 'header' && 'segmentName' in item) {
        return item.segmentName || item.rowNumber || 'Untitled Header';
      }
      return 'Untitled Header';
    });
  }

  // For regular columns, get unique non-empty values
  const regularItems = items.filter(item => item.type !== 'header');
  const values = new Set<string>();
  
  regularItems.forEach(item => {
    let value = '';
    
    if (column.key in item) {
      value = String(item[column.key as keyof RundownItem] || '').trim();
    } else if (item.customFields && column.key in item.customFields) {
      value = String(item.customFields[column.key] || '').trim();
    }
    
    if (value && value !== '') {
      values.add(value);
    }
  });

  return Array.from(values).sort();
};

export const exportRundownToBlueprint = (
  items: RundownItem[],
  visibleColumns: any[],
  rundownTitle: string
): BlueprintList[] => {
  const blueprintLists: BlueprintList[] = [];

  visibleColumns.forEach(column => {
    const processedValues = processColumnForBlueprint(items, column);
    
    if (processedValues.length > 0) {
      blueprintLists.push({
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `${rundownTitle} - ${column.name}`,
        items: processedValues
      });
    }
  });

  return blueprintLists;
};
