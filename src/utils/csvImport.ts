
import { RundownItem } from '@/hooks/useRundownItems';
import { v4 as uuidv4 } from 'uuid';

interface ColumnMapping {
  csvColumn: string;
  rundownColumn: string;
  isSkipped?: boolean;
}

export interface CSVImportResult {
  items: RundownItem[];
}

export const transformCSVData = (
  csvRows: any[][],
  columnMappings: ColumnMapping[],
  csvHeaders: string[]
): CSVImportResult => {
  const items: RundownItem[] = [];

  console.log('CSV Transform - Input data:', { csvRows, columnMappings, csvHeaders });

  // Transform CSV rows to rundown items
  csvRows.forEach((row, rowIndex) => {
    console.log(`Processing row ${rowIndex}:`, row);
    
    const item: Partial<RundownItem> = {
      id: uuidv4(),
      type: 'regular', // Default to regular
      rowNumber: String(rowIndex + 1),
      startTime: '',
      endTime: '',
      elapsedTime: '00:00',
      isFloating: false,
    };

    // Map each CSV cell to the corresponding rundown field using correct CSV column index
    columnMappings.forEach((mapping) => {
      const csvColumnIndex = csvHeaders.indexOf(mapping.csvColumn);
      console.log(`Looking for CSV column "${mapping.csvColumn}" at index ${csvColumnIndex}`);
      
      if (mapping.rundownColumn && !mapping.isSkipped && csvColumnIndex !== -1 && row[csvColumnIndex] !== undefined) {
        const value = row[csvColumnIndex];
        console.log(`Mapping CSV column "${mapping.csvColumn}" (index ${csvColumnIndex}, value: "${value}") to rundown column "${mapping.rundownColumn}"`);
        
        // Handle special fields
        switch (mapping.rundownColumn) {
          case 'name':
            item.name = String(value || '');
            break;
          case 'duration':
            // Parse duration - handle various formats
            let durationValue = String(value || '');
            if (durationValue && !durationValue.includes(':')) {
              // If it's just a number, treat as minutes
              const minutes = parseInt(durationValue);
              if (!isNaN(minutes)) {
                durationValue = `${String(minutes).padStart(2, '0')}:00`;
              } else {
                durationValue = "00:30"; // Default fallback
              }
            } else if (!durationValue) {
              durationValue = "00:30"; // Default fallback
            }
            item.duration = durationValue;
            break;
          case 'script':
            item.script = String(value || '');
            break;
          case 'notes':
            item.notes = String(value || '');
            break;
          case 'talent':
            item.talent = String(value || '');
            break;
          case 'gfx':
            item.gfx = String(value || '');
            break;
          case 'video':
            item.video = String(value || '');
            break;
          default:
            // Handle custom fields
            if (!item.customFields) {
              item.customFields = {};
            }
            item.customFields[mapping.rundownColumn] = String(value || '');
            break;
        }
      } else if (csvColumnIndex === -1) {
        console.warn(`CSV column "${mapping.csvColumn}" not found in headers:`, csvHeaders);
      }
    });

    // Ensure required fields have defaults
    item.name = item.name || `Imported Item ${rowIndex + 1}`;
    item.duration = item.duration || "00:30";
    item.script = item.script || '';
    item.notes = item.notes || '';
    item.talent = item.talent || '';
    item.gfx = item.gfx || '';
    item.video = item.video || '';
    item.color = item.color || '';

    console.log(`Final item ${rowIndex}:`, item);
    items.push(item as RundownItem);
  });

  console.log('CSV Transform - Final result:', { items });
  return { items };
};

export const validateCSVData = (csvRows: any[][]): boolean => {
  return csvRows.length > 0 && csvRows.every(row => Array.isArray(row));
};
