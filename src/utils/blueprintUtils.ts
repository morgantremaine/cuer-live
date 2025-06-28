
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { logger } from '@/utils/logger';

export interface AvailableColumn {
  name: string;
  value: string;
}

export const getAvailableColumns = (items: RundownItem[]): AvailableColumn[] => {
  logger.blueprint('getAvailableColumns called with items:', { count: items.length });
  
  const columns: AvailableColumn[] = [];
  
  // Check for headers (segments)
  const hasHeaders = items.some(item => isHeaderItem(item));
  logger.blueprint('Has headers:', hasHeaders);
  
  if (hasHeaders) {
    columns.push({ name: 'Headers/Segments', value: 'headers' });
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
  
  // Check for custom fields
  const customFields = new Set<string>();
  items.forEach(item => {
    if (!isHeaderItem(item) && item.customFields) {
      Object.keys(item.customFields).forEach(key => {
        if (item.customFields![key] && String(item.customFields![key]).trim() !== '') {
          customFields.add(key);
        }
      });
    }
  });
  
  customFields.forEach(field => {
    logger.blueprint('Found custom field:', field);
    columns.push({ name: field, value: `custom_${field}` });
  });
  
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
      if (!isHeaderItem(item) && item.customFields && item.customFields[customFieldKey]) {
        const value = String(item.customFields[customFieldKey]).trim();
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
