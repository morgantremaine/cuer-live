
import { useCallback } from 'react';
import { useRundownGridState } from '@/hooks/useRundownGridState';
import { RundownModification } from '@/services/openaiService';
import { RundownItem } from '@/types/rundown';

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
    // First try to find by exact ID match
    let item = items.find(item => item.id === reference);
    if (item) return item;

    // Try to find by row number (like "A2", "1", "2", etc.)
    item = items.find(item => item.rowNumber === reference);
    if (item) return item;

    // Try to find by name
    item = items.find(item => item.name.toLowerCase().includes(reference.toLowerCase()));
    if (item) return item;

    // Try to find by index (convert A, B, C to indices for headers)
    if (reference.match(/^[A-Z]\d*$/)) {
      // Header reference like "A", "B", etc.
      const headerLetter = reference.charAt(0);
      const headerIndex = headerLetter.charCodeAt(0) - 65; // A=0, B=1, etc.
      const headers = items.filter(item => item.type === 'header');
      if (headers[headerIndex]) return headers[headerIndex];
    } else if (reference.match(/^\d+$/)) {
      // Regular row reference like "1", "2", etc.
      const rowIndex = parseInt(reference) - 1;
      const regularItems = items.filter(item => item.type === 'regular');
      if (regularItems[rowIndex]) return regularItems[rowIndex];
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
    console.log('Applying modifications:', modifications);
    console.log('Current items:', items);

    modifications.forEach(mod => {
      console.log('Processing modification:', mod);
      
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
            // Find the actual item by the reference provided
            const targetItem = findItemByReference(mod.itemId);
            if (targetItem) {
              console.log(`Found item for reference "${mod.itemId}":`, targetItem);
              
              // Apply each field update
              Object.keys(mod.data).forEach(field => {
                const value = mod.data[field];
                console.log(`Updating ${targetItem.id}.${field} = ${value}`);
                updateItem(targetItem.id, field, value);
              });
            } else {
              console.error(`Could not find item with reference: ${mod.itemId}`);
            }
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
      }
    });
  }, [findItemByReference, mapAIDataToRundownItem, addHeader, addRow, updateItem, deleteRow, calculateEndTime]);

  return {
    applyModifications
  };
};
