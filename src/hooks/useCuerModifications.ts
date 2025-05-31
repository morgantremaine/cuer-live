
import { useCallback } from 'react';
import { useRundownGridState } from '@/hooks/useRundownGridState';
import { RundownModification } from '@/services/openaiService';

export const useCuerModifications = () => {
  const {
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    calculateEndTime
  } = useRundownGridState();

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
    modifications.forEach(mod => {
      console.log('Applying modification:', mod);
      
      switch (mod.type) {
        case 'add':
          if (mod.data) {
            const mappedData = mapAIDataToRundownItem(mod.data);
            console.log('Mapped data for add:', mappedData);
            
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
            const mappedData = mapAIDataToRundownItem(mod.data);
            Object.keys(mappedData).forEach(key => {
              updateItem(mod.itemId!, key, mappedData[key]);
            });
          }
          break;
        case 'delete':
          if (mod.itemId) {
            deleteRow(mod.itemId);
          }
          break;
      }
    });
  }, [mapAIDataToRundownItem, addHeader, addRow, updateItem, deleteRow, calculateEndTime]);

  return {
    applyModifications
  };
};
