
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownItems } from '@/hooks/useRundownItems';
import { useColumnsManager } from '@/hooks/useColumnsManager';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useRundownStorage } from '@/hooks/useRundownStorage';

export const useRundownStateIntegration = (markAsChanged: () => void, rundownTitle: string, timezone: string) => {
  const { id: rundownId } = useParams<{ id: string }>();
  const { savedRundowns, loading } = useRundownStorage();
  const loadedRef = useRef<string | null>(null);

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

  const { hasUnsavedChanges, isSaving } = useAutoSave(items, rundownTitle, columns, timezone);

  // Load rundown data only once when rundown ID changes
  useEffect(() => {
    if (loading) return;
    
    // Prevent duplicate loading
    if (loadedRef.current === rundownId) return;
    
    if (rundownId && savedRundowns.length > 0) {
      const existingRundown = savedRundowns.find(r => r.id === rundownId);
      if (existingRundown && loadedRef.current !== rundownId) {
        console.log('Loading rundown once:', rundownId);
        loadedRef.current = rundownId;
        
        // Set items first
        if (existingRundown.items) {
          setItems(existingRundown.items);
        }
        
        // Load columns if they exist
        if (existingRundown.columns && Array.isArray(existingRundown.columns)) {
          console.log('Loading saved columns once:', existingRundown.columns.length);
          handleLoadLayout(existingRundown.columns);
        }
      }
    } else if (!rundownId && loadedRef.current !== null) {
      // New rundown - reset state
      console.log('Resetting for new rundown');
      loadedRef.current = null;
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
    markAsChanged
  };
};
