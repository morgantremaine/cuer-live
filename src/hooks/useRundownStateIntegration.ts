
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownItems } from '@/hooks/useRundownItems';
import { useColumnsManager } from '@/hooks/useColumnsManager';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useRundownDataLoader } from '@/hooks/useRundownDataLoader';

export const useRundownStateIntegration = (markAsChanged: () => void, rundownTitle: string, timezone: string) => {
  const params = useParams<{ id: string }>();
  // Filter out the literal ":id" string that sometimes comes from route patterns
  const rawId = params.id;
  const rundownId = rawId === ':id' || !rawId || rawId.trim() === '' ? undefined : rawId;
  
  const { savedRundowns, loading } = useRundownStorage();
  const loadedRef = useRef<string | null>(null);
  const initRef = useRef(false);

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

  // Use the data loader hook to handle rundown data loading
  useRundownDataLoader({
    rundownId,
    savedRundowns,
    loading,
    setRundownTitle: (title: string) => {
      // This should use the direct setter, not the one with change tracking
      // to avoid triggering auto-save during initial load
    },
    setTimezone: (timezone: string) => {
      // This should use the direct setter, not the one with change tracking
      // to avoid triggering auto-save during initial load
    },
    handleLoadLayout
  });

  // Load rundown data only once when rundown ID changes - with better coordination
  useEffect(() => {
    if (loading || initRef.current) return;
    
    // Prevent duplicate loading
    if (loadedRef.current === rundownId) return;
    
    if (rundownId && savedRundowns.length > 0) {
      const existingRundown = savedRundowns.find(r => r.id === rundownId);
      if (existingRundown && loadedRef.current !== rundownId) {
        console.log('Loading rundown state integration for:', rundownId);
        loadedRef.current = rundownId;
        initRef.current = true;
        
        // Set items first
        if (existingRundown.items) {
          setItems(existingRundown.items);
        }
        
        // Load columns if they exist
        if (existingRundown.columns && Array.isArray(existingRundown.columns)) {
          console.log('Loading saved columns:', existingRundown.columns.length);
          handleLoadLayout(existingRundown.columns);
        }
      }
    } else if (!rundownId && loadedRef.current !== null) {
      // New rundown - reset state only once
      if (!initRef.current) {
        console.log('Resetting for new rundown');
        loadedRef.current = null;
        initRef.current = true;
        setItems([]);
      }
    }
  }, [rundownId, savedRundowns, loading, setItems, handleLoadLayout]);

  // Reset when rundown changes
  useEffect(() => {
    return () => {
      initRef.current = false;
    };
  }, [rundownId]);

  const { hasUnsavedChanges, isSaving } = useAutoSave(items, rundownTitle, columns, timezone);

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
