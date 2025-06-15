
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { v4 as uuidv4 } from 'uuid';

interface ColumnMapping {
  csvColumn: string;
  rundownColumn: string;
  isNewColumn: boolean;
  newColumnName?: string;
}

export interface CSVImportResult {
  items: RundownItem[];
  newColumns: Column[];
}

export const transformCSVData = (
  csvRows: any[][],
  columnMappings: ColumnMapping[],
  csvHeaders: string[]
): CSVImportResult => {
  const newColumns: Column[] = [];
  const items: RundownItem[] = [];

  // Create new columns from mappings
  columnMappings.forEach((mapping, index) => {
    if (mapping.isNewColumn && mapping.newColumnName) {
      newColumns.push({
        key: mapping.rundownColumn,
        name: mapping.newColumnName,
        visible: true,
        order: String(index), // Fix: Use index and convert to string
        width: 150,
      });
    }
  });

  // Transform CSV rows to rundown items
  csvRows.forEach((row, index) => {
    const item: Partial<RundownItem> = {
      id: uuidv4(),
      type: 'regular', // Default to regular
      rowNumber: String(index + 1), // Fix: Convert to string
      startTime: '',
      endTime: '',
      elapsedTime: '00:00',
      isFloating: false,
    };

    // Map each CSV cell to the corresponding rundown field
    columnMappings.forEach((mapping, mappingIndex) => {
      if (mapping.rundownColumn && row[mappingIndex] !== undefined) {
        const value = row[mappingIndex];
        
        // Handle special fields
        switch (mapping.rundownColumn) {
          case 'name':
            item.name = String(value || '');
            break;
          case 'duration':
            // Try to parse duration, default to "00:30" if invalid
            const parsedDuration = parseInt(String(value));
            item.duration = isNaN(parsedDuration) ? "00:30" : String(parsedDuration).padStart(2, '0') + ':00';
            break;
          case 'script':
            item.script = String(value || '');
            break;
          case 'notes':
            item.notes = String(value || '');
            break;
          case 'type':
            // Validate type, default to 'regular'
            const typeValue = String(value).toLowerCase();
            item.type = (typeValue === 'header' || typeValue === 'regular') ? typeValue as 'header' | 'regular' : 'regular';
            break;
          default:
            // Handle custom fields
            if (!item.customFields) {
              item.customFields = {};
            }
            item.customFields[mapping.rundownColumn] = String(value || '');
            break;
        }
      }
    });

    // Ensure required fields have defaults
    item.name = item.name || `Imported Item ${index + 1}`;
    item.duration = item.duration || "00:30";
    item.script = item.script || '';
    item.notes = item.notes || '';
    item.talent = item.talent || '';
    item.gfx = item.gfx || '';
    item.video = item.video || '';
    item.color = item.color || '';

    items.push(item as RundownItem);
  });

  return { items, newColumns };
};

export const validateCSVData = (csvRows: any[][]): boolean => {
  return csvRows.length > 0 && csvRows.every(row => Array.isArray(row));
};
