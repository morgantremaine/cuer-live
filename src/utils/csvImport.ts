
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
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

  console.log('🔧 CSV Transform - Input data:', { csvRows: csvRows.length, columnMappings, csvHeaders });
  console.log('🔧 CSV Transform - Column mappings detail:', columnMappings.map(m => `"${m.csvColumn}" -> "${m.rundownColumn}"`));

  // Transform CSV rows to rundown items
  csvRows.forEach((row, rowIndex) => {
    console.log(`🔧 Processing row ${rowIndex}:`, row);
    
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
      console.log(`🔧 Looking for CSV column "${mapping.csvColumn}" at index ${csvColumnIndex}`);
      
      if (mapping.rundownColumn && !mapping.isSkipped && csvColumnIndex !== -1 && row[csvColumnIndex] !== undefined) {
        const value = row[csvColumnIndex];
        console.log(`🔧 Mapping CSV column "${mapping.csvColumn}" (index ${csvColumnIndex}, value: "${value}") to rundown column "${mapping.rundownColumn}"`);
        
        // Handle field mappings - ensure all mapped fields go to the correct RundownItem properties
        switch (mapping.rundownColumn) {
          case 'name':
          case 'segmentName': // Legacy support
            const nameValue = String(value || '').trim();
            if (nameValue) {
              item.name = nameValue;
              console.log(`✅ Set item.name to: "${nameValue}"`);
            }
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
            console.log(`✅ Set item.duration to: "${durationValue}"`);
            break;
          case 'script':
            item.script = String(value || '');
            console.log(`✅ Set item.script to: "${item.script}"`);
            break;
          case 'notes':
            item.notes = String(value || '');
            console.log(`✅ Set item.notes to: "${item.notes}"`);
            break;
          case 'talent':
            item.talent = String(value || '');
            console.log(`✅ Set item.talent to: "${item.talent}"`);
            break;
          case 'gfx':
            const gfxValue = String(value || '');
            item.gfx = gfxValue;
            console.log(`✅ [GFX CASE] Set item.gfx to: "${gfxValue}" (from mapping: ${mapping.rundownColumn})`);
            break;
          case 'graphics': // Handle both graphics and gfx mappings - always map to gfx field
            const graphicsValue = String(value || '');
            item.gfx = graphicsValue;
            console.log(`✅ [GRAPHICS CASE] Set item.gfx to: "${graphicsValue}" (from mapping: ${mapping.rundownColumn})`);
            break;
          case 'video':
            item.video = String(value || '');
            console.log(`✅ Set item.video to: "${item.video}"`);
            break;
          case 'startTime':
            item.startTime = String(value || '');
            console.log(`✅ Set item.startTime to: "${item.startTime}"`);
            break;
          case 'endTime':
            item.endTime = String(value || '');
            console.log(`✅ Set item.endTime to: "${item.endTime}"`);
            break;
          case 'color':
            item.color = String(value || '');
            console.log(`✅ Set item.color to: "${item.color}"`);
            break;
          default:
            // Handle custom fields - but check if it might be a legacy graphics mapping
            console.log(`⚠️ [DEFAULT CASE] Handling unmapped field "${mapping.rundownColumn}" with value "${value}"`);
            if (mapping.rundownColumn === 'graphics') {
              // This is a fallback in case the above case doesn't catch it
              const gfxValue = String(value || '');
              item.gfx = gfxValue;
              console.log(`✅ [FALLBACK] Set item.gfx to: "${gfxValue}" (from graphics mapping)`);
            } else {
              // Handle other custom fields
              if (!item.customFields) {
                item.customFields = {};
              }
              item.customFields[mapping.rundownColumn] = String(value || '');
              console.log(`✅ Set custom field "${mapping.rundownColumn}" to: "${item.customFields[mapping.rundownColumn]}"`);
            }
            break;
        }
      } else if (csvColumnIndex === -1) {
        console.warn(`⚠️ CSV column "${mapping.csvColumn}" not found in headers:`, csvHeaders);
      } else if (!mapping.rundownColumn) {
        console.log(`⏭️ Skipping CSV column "${mapping.csvColumn}" - no rundown column mapped`);
      } else if (mapping.isSkipped) {
        console.log(`⏭️ Skipping CSV column "${mapping.csvColumn}" - marked as skipped`);
      }
    });

    // Set defaults only if the fields weren't set from CSV mapping
    if (!item.name) {
      item.name = `Imported Item ${rowIndex + 1}`;
      console.log(`🔧 No name found in CSV mapping, using default: "${item.name}"`);
    } else {
      console.log(`✅ Using CSV mapped name: "${item.name}"`);
    }
    
    item.duration = item.duration || "00:30";
    item.script = item.script || '';
    item.notes = item.notes || '';
    item.talent = item.talent || '';
    item.gfx = item.gfx || '';
    item.video = item.video || '';
    item.color = item.color || '';

    console.log(`✅ Final item ${rowIndex}:`, {
      id: item.id,
      name: item.name,
      gfx: item.gfx,
      script: item.script,
      duration: item.duration,
      talent: item.talent,
      customFields: item.customFields
    });
    
    items.push(item as RundownItem);
  });

  console.log('✅ CSV Transform - Final result:', { 
    itemCount: items.length,
    sampleItems: items.slice(0, 3).map(item => ({ name: item.name, gfx: item.gfx }))
  });
  
  return { items };
};

export const validateCSVData = (csvRows: any[][]): boolean => {
  return csvRows.length > 0 && csvRows.every(row => Array.isArray(row));
};
