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
    console.log('Header items found:', headerItems);
    
    const headerValues = headerItems.map(item => {
      if (item.type === 'header') {
        console.log('Processing header item:', {
          id: item.id,
          name: item.name,
          script: item.script,
          rowNumber: item.rowNumber,
          segmentName: item.segmentName
        });
        
        // Try script first, then name, then segmentName, then rowNumber
        const headerText = item.script || item.name || item.segmentName || item.rowNumber || 'Untitled Header';
        console.log('Selected header text:', headerText);
        return headerText;
      }
      return 'Untitled Header';
    });

    console.log('Final header values:', headerValues);

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
    console.log('processColumnForBlueprint - Header items:', headerItems);
    
    return headerItems.map(item => {
      if (item.type === 'header') {
        const headerText = item.script || item.name || item.segmentName || item.rowNumber || 'Untitled Header';
        console.log('processColumnForBlueprint - Selected header text:', headerText);
        return headerText;
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

export const generateListFromColumn = (items: RundownItem[], sourceColumn: string): string[] => {
  console.log('generateListFromColumn called with:', { sourceColumn, itemsCount: items.length });
  
  if (sourceColumn === 'headers') {
    const headerItems = items.filter(item => item.type === 'header');
    console.log('generateListFromColumn - Header items:', headerItems);
    
    return headerItems.map(item => {
      if (item.type === 'header') {
        const headerText = item.script || item.name || item.segmentName || item.rowNumber || 'Untitled Header';
        console.log('generateListFromColumn - Selected header text:', headerText);
        return headerText;
      }
      return 'Untitled Header';
    });
  }

  // For regular columns, get unique non-empty values
  const regularItems = items.filter(item => item.type !== 'header');
  const values = new Set<string>();
  
  regularItems.forEach(item => {
    let value = '';
    
    if (sourceColumn in item) {
      value = String(item[sourceColumn as keyof RundownItem] || '').trim();
    } else if (item.customFields && sourceColumn in item.customFields) {
      value = String(item.customFields[sourceColumn] || '').trim();
    }
    
    if (value && value !== '') {
      values.add(value);
    }
  });

  return Array.from(values).sort();
};

export const getAvailableColumns = (items: RundownItem[]) => {
  const columns = [
    { key: 'headers', name: 'Headers' },
    { key: 'gfx', name: 'GFX' },
    { key: 'video', name: 'Video' },
    { key: 'talent', name: 'Talent' },
    { key: 'script', name: 'Script' },
    { key: 'notes', name: 'Notes' }
  ];

  // Get custom fields from items
  const customFields = new Set<string>();
  items.forEach(item => {
    if (item.customFields) {
      Object.keys(item.customFields).forEach(key => {
        customFields.add(key);
      });
    }
  });

  // Add custom fields as available columns
  customFields.forEach(field => {
    if (!columns.find(col => col.key === field)) {
      columns.push({
        key: field,
        name: field.charAt(0).toUpperCase() + field.slice(1)
      });
    }
  });

  return columns;
};

export const generateDefaultBlueprint = (rundownId: string, rundownTitle: string, items: RundownItem[]) => {
  const defaultLists = [
    { name: `${rundownTitle} - Headers`, sourceColumn: 'headers' },
    { name: `${rundownTitle} - GFX`, sourceColumn: 'gfx' },
    { name: `${rundownTitle} - Video`, sourceColumn: 'video' },
    { name: `${rundownTitle} - Talent`, sourceColumn: 'talent' }
  ];

  return defaultLists.map(listConfig => ({
    id: `${listConfig.sourceColumn}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: listConfig.name,
    sourceColumn: listConfig.sourceColumn,
    items: generateListFromColumn(items, listConfig.sourceColumn)
  }));
};
