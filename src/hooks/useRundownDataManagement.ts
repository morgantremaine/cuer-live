
import { useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownItems } from '@/hooks/useRundownItems';
import { useColumnsManager } from '@/hooks/useColumnsManager';
import { useRundownStorage } from '@/hooks/useRundownStorage';

export const useRundownDataManagement = (rundownTitle: string, timezone: string) => {
  const params = useParams<{ id: string }>();
  const rawId = params.id;
  const rundownId = rawId === ':id' || !rawId || rawId.trim() === '' ? undefined : rawId;
  
  const { savedRundowns, loading } = useRundownStorage();
  const initializationRef = useRef<{ [key: string]: boolean }>({});
  const dataLoaderActiveRef = useRef(false);

  const markAsChanged = useCallback(() => {
    console.log('Changes marked - triggering auto-save');
  }, []);

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

  // Check if the data loader is handling this rundown
  useEffect(() => {
    if (rundownId && savedRundowns.length > 0) {
      const existingRundown = savedRundowns.find(r => r.id === rundownId);
      if (existingRundown) {
        dataLoaderActiveRef.current = true;
        console.log('Data management: Data loader is active for rundown:', rundownId);
        return;
      }
    }
    dataLoaderActiveRef.current = false;
  }, [rundownId, savedRundowns.length]);

  // Only initialize for new rundowns or when data loader is not active
  useEffect(() => {
    const initKey = rundownId || 'new';
    
    if (initializationRef.current[initKey] || loading || dataLoaderActiveRef.current) {
      return;
    }

    console.log('Data management: Initializing for new rundown:', initKey);
    initializationRef.current[initKey] = true;

    // Only handle new rundowns when data loader isn't active
    if (!rundownId) {
      console.log('Data management: Setting up new rundown');
      // For new rundowns, the default data is already set by useRundownItems
    }
  }, [rundownId, savedRundowns.length, loading]);

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
