
import { useCallback } from 'react';
import { useRundownGridState } from '@/hooks/useRundownGridState';
import { RundownItem } from '@/types/rundown';

// Define the type locally
interface RundownModification {
  type: 'add' | 'update' | 'delete';
  itemId?: string;
  data?: any;
}

export const useCuerModifications = () => {
  const {
    items,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    calculateEndTime
  } = useRundownGridState();

  const findItemByReference = useCallback((reference: string): RundownItem | null => {
    console.log(`Looking for item with reference: "${reference}"`);
    console.log('Available items:', items.map(item => ({ id: item.id, rowNumber: item.rowNumber, name: item.name, type: item.type })));
    
    // First try to find by exact ID match
    let item = items.find(item => item.id === reference);
    if (item) {
      console.log('Found by ID:', item);
      return item;
    }

    // Try to find by row number (like "A2", "1", "2", etc.)
    item = items.find(item => item.rowNumber === reference);
    if (item) {
      console.log('Found by rowNumber:', item);
      return item;
    }

    // Try to find by name
    item = items.find(item => item.name.toLowerCase().includes(reference.toLowerCase()));
    if (item) {
      console.log('Found by name:', item);
      return item;
    }

    // Try to find by index (convert A, B, C to indices for headers)
    if (reference.match(/^[A-Z]\d*$/)) {
      // Header reference like "A", "B", etc.
      const headerLetter = reference.charAt(0);
      const headerIndex = headerLetter.charCodeAt(0) - 65; // A=0, B=1, etc.
      const headers = items.filter(item => item.type === 'header');
      console.log(`Looking for header index ${headerIndex} (letter ${headerLetter}), available headers:`, headers);
      if (headers[headerIndex]) {
        console.log('Found header by index:', headers[headerIndex]);
        return headers[headerIndex];
      }
    } else if (reference.match(/^\d+$/)) {
      // Regular row reference like "1", "2", etc.
      const rowIndex = parseInt(reference) - 1;
      const regularItems = items.filter(item => item.type === 'regular');
      console.log(`Looking for regular item index ${rowIndex}, available regular items:`, regularItems);
      if (regularItems[rowIndex]) {
        console.log('Found regular item by index:', regularItems[rowIndex]);
        return regularItems[rowIndex];
      }
    }

    console.warn(`Could not find item with reference: ${reference}`);
    return null;
  }, [items]);

  const mapAIDataToRundownItem = useCallback((aiData: any) => {
    // Map AI data structure to RundownItem structure
    const baseItem = {
      id: aiData.id || String(Date.now()),
      type: aiData.type || 'regular',
      rowNumber: aiData.rowNumber || '',
      name: aiData.segmentTitle || aiData.name || 'New Segment',
      startTime: aiData.startTime || '00:00:00',
      duration: aiData.duration || '00:00:00',
      endTime: aiData.endTime || '00:00:00',
      talent: aiData.talent || '',
      script: aiData.script || aiData.description || '',
      notes: aiData.notes || '',
      color: aiData.color || '#FFFFFF',
      isFloating: aiData.isFloating || false,
      status: aiData.status || 'upcoming',
      customFields: aiData.customFields || {},
    };

    // Handle header-specific fields
    if (aiData.type === 'header') {
      return {
        ...baseItem,
        segmentName: aiData.segmentName || aiData.segmentTitle || baseItem.name,
      };
    }

    return baseItem;
  }, []);

  const applyModifications = useCallback((modifications: RundownModification[]) => {
    console.log('=== APPLYING MODIFICATIONS ===');
    console.log('Modifications received:', modifications);
    console.log('Current items count:', items.length);
    console.log('Current items:', items.map(item => ({ id: item.id, rowNumber: item.rowNumber, name: item.name, type: item.type })));

    modifications.forEach((mod, index) => {
      console.log(`\n--- Processing modification ${index + 1}/${modifications.length} ---`);
      console.log('Modification:', mod);
      
      switch (mod.type) {
        case 'add':
          if (mod.data) {
            const mappedData = mapAIDataToRundownItem(mod.data);
            console.log('Adding new item:', mappedData);
            
            if (mappedData.type === 'header') {
              addHeader();
              // Update the newly added header with the provided data
              setTimeout(() => {
                Object.keys(mappedData).forEach(key => {
                  if (key !== 'id') {
                    updateItem(mappedData.id, key, mappedData[key]);
                  }
                });
              }, 100);
            } else {
              addRow(calculateEndTime);
              // Update the newly added row with the provided data
              setTimeout(() => {
                Object.keys(mappedData).forEach(key => {
                  if (key !== 'id') {
                    updateItem(mappedData.id, key, mappedData[key]);
                  }
                });
              }, 100);
            }
          }
          break;
          
        case 'update':
          if (mod.itemId && mod.data) {
            console.log(`Attempting to update item with reference: "${mod.itemId}"`);
            console.log('Update data:', mod.data);
            
            // Find the actual item by the reference provided
            const targetItem = findItemByReference(mod.itemId);
            if (targetItem) {
              console.log(`✅ Found target item:`, targetItem);
              
              // Apply each field update
              Object.keys(mod.data).forEach(field => {
                const value = mod.data[field];
                console.log(`Updating ${targetItem.id}.${field} = "${value}"`);
                try {
                  updateItem(targetItem.id, field, value);
                  console.log(`✅ Successfully updated ${field}`);
                } catch (error) {
                  console.error(`❌ Failed to update ${field}:`, error);
                }
              });
            } else {
              console.error(`❌ Could not find item with reference: ${mod.itemId}`);
            }
          } else {
            console.error('❌ Update modification missing itemId or data:', mod);
          }
          break;
          
        case 'delete':
          if (mod.itemId) {
            const targetItem = findItemByReference(mod.itemId);
            if (targetItem) {
              console.log(`Deleting item: ${targetItem.id}`);
              deleteRow(targetItem.id);
            } else {
              console.error(`Could not find item to delete with reference: ${mod.itemId}`);
            }
          }
          break;
          
        default:
          console.warn(`Unknown modification type: ${mod.type}`);
      }
    });
    
    console.log('=== MODIFICATIONS COMPLETE ===\n');
  }, [findItemByReference, mapAIDataToRundownItem, addHeader, addRow, updateItem, deleteRow, items, calculateEndTime]);

  return {
    applyModifications
  };
};
