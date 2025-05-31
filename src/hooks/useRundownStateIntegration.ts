
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownItems } from '@/hooks/useRundownItems';
import { useColumnsManager } from '@/hooks/useColumnsManager';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useRundownStorage } from '@/hooks/useRundownStorage';

export const useRundownStateIntegration = (markAsChanged: () => void, rundownTitle: string) => {
  const { id: rundownId } = useParams<{ id: string }>();
  const { savedRundowns, loading } = useRundownStorage();

  const {
    items,
    setItems,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    deleteMultipleRows,
    addMultipleRows,
    getRowNumber,
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration
  } = useRundownItems();

  const {
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleToggleColumnVisibility,
    handleLoadLayout
  } = useColumnsManager(markAsChanged);

  const { hasUnsavedChanges, isSaving, markAsChanged: autoSaveMarkAsChanged } = useAutoSave(items, rundownTitle, columns);

  // Load rundown data including columns when rundown ID changes
  useEffect(() => {
    if (loading) return;
    
    if (rundownId && savedRundowns.length > 0) {
      const existingRundown = savedRundowns.find(r => r.id === rundownId);
      if (existingRundown) {
        console.log('Loading rundown with columns:', existingRundown);
        setItems(existingRundown.items || []);
        
        // Load columns if they exist in the saved rundown
        if (existingRundown.columns && Array.isArray(existingRundown.columns)) {
          console.log('Loading saved columns:', existingRundown.columns);
          handleLoadLayout(existingRundown.columns);
        }
      }
    } else if (!rundownId) {
      // New rundown - reset to default items
      setItems([]);
    }
  }, [rundownId, savedRundowns, loading, setItems, handleLoadLayout]);

  return {
    items,
    setItems,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    deleteMultipleRows,
    addMultipleRows,
    getRowNumber,
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration,
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    hasUnsavedChanges,
    isSaving,
    markAsChanged: autoSaveMarkAsChanged
  };
};
