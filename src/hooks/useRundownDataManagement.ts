
import { useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownItems } from '@/hooks/useRundownItems';
import { useColumnsManager } from '@/hooks/useColumnsManager';
import { useRundownStorage } from '@/hooks/useRundownStorage';

export const useRundownDataManagement = (markAsChanged: () => void) => {
  const params = useParams<{ id: string }>();
  const rawId = params.id;
  const rundownId = rawId === ':id' || !rawId || rawId.trim() === '' ? undefined : rawId;
  
  const { savedRundowns, loading } = useRundownStorage();
  const initializationRef = useRef<{ [key: string]: boolean }>({});

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
  } = useRundownItems(markAsChanged);

  const {
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleToggleColumnVisibility,
    handleLoadLayout
  } = useColumnsManager(markAsChanged);

  // Initialize once per rundownId to prevent loops
  useEffect(() => {
    const initKey = rundownId || 'new';
    
    if (initializationRef.current[initKey] || loading) {
      return;
    }

    console.log('Initializing rundown data management for:', initKey);
    initializationRef.current[initKey] = true;

    // For existing rundowns, load the data
    if (rundownId && savedRundowns.length > 0) {
      const existingRundown = savedRundowns.find(r => r.id === rundownId);
      if (existingRundown) {
        console.log('Loading existing rundown data:', rundownId);
        if (existingRundown.items) {
          setItems(existingRundown.items);
        }
        if (existingRundown.columns) {
          handleLoadLayout(existingRundown.columns);
        }
      }
    }
  }, [rundownId, savedRundowns.length, loading, setItems, handleLoadLayout]);

  // Clear initialization when rundown ID changes
  useEffect(() => {
    return () => {
      if (rundownId) {
        delete initializationRef.current[rundownId];
      }
    };
  }, [rundownId]);

  return {
    rundownId,
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
    savedRundowns,
    loading,
    markAsChanged,
  };
};
