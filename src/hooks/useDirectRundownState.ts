import { useSimplifiedRundownState } from './useSimplifiedRundownState';

export const useDirectRundownState = () => {
  const simplifiedState = useSimplifiedRundownState();
  
  // Add debugging to track state changes
  const debugUpdateItem = (id: string, field: string, value: string) => {
    console.log('🔧 Direct state update:', { id, field, value });
    console.log('🔧 Items before update:', simplifiedState.items.length);
    
    const result = simplifiedState.updateItem(id, field, value);
    
    // Log after a brief delay to see the change
    setTimeout(() => {
      console.log('🔧 Items after update:', simplifiedState.items.length);
      const updatedItem = simplifiedState.items.find(item => item.id === id);
      console.log('🔧 Updated item:', updatedItem ? { id: updatedItem.id, [field]: updatedItem[field as keyof typeof updatedItem] } : 'not found');
    }, 10);
    
    return result;
  };

  const debugAddRow = () => {
    console.log('🔧 Direct state add row');
    console.log('🔧 Items before add:', simplifiedState.items.length);
    
    const result = simplifiedState.addRow();
    
    setTimeout(() => {
      console.log('🔧 Items after add:', simplifiedState.items.length);
    }, 10);
    
    return result;
  };

  const debugDeleteRow = (id: string) => {
    console.log('🔧 Direct state delete row:', id);
    console.log('🔧 Items before delete:', simplifiedState.items.length);
    
    const result = simplifiedState.deleteRow(id);
    
    setTimeout(() => {
      console.log('🔧 Items after delete:', simplifiedState.items.length);
    }, 10);
    
    return result;
  };

  return {
    // Raw items from the source of truth (not calculated/optimized)
    items: simplifiedState.items,
    
    // Direct access to modification functions with debugging
    updateItem: debugUpdateItem,
    addRow: debugAddRow,
    addHeader: () => {
      console.log('🔧 Direct state add header');
      return simplifiedState.addHeader();
    },
    addRowAtIndex: (index: number) => {
      console.log('🔧 Direct state add row at index:', index);
      return simplifiedState.addRowAtIndex(index);
    },
    addHeaderAtIndex: (index: number) => {
      console.log('🔧 Direct state add header at index:', index);
      return simplifiedState.addHeaderAtIndex(index);
    },
    deleteRow: debugDeleteRow,
    setItems: simplifiedState.setItems,
    
    // Other necessary functions
    calculateEndTime: (startTime: string, duration: string) => {
      const startParts = startTime.split(':').map(Number);
      const durationParts = duration.split(':').map(Number);
      
      let totalSeconds = 0;
      if (startParts.length >= 2) {
        totalSeconds += startParts[0] * 3600 + startParts[1] * 60 + (startParts[2] || 0);
      }
      if (durationParts.length >= 2) {
        totalSeconds += durationParts[0] * 60 + durationParts[1];
      }
      
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    },
    
    markAsChanged: () => {
      console.log('🔧 Direct state mark as changed');
      // This is handled internally by simplified state
    },

    // Undo functionality
    saveUndoState: simplifiedState.saveUndoState,

    // State info for debugging
    rundownId: simplifiedState.rundownId,
    hasUnsavedChanges: simplifiedState.hasUnsavedChanges,
    isSaving: simplifiedState.isSaving
  };
};
