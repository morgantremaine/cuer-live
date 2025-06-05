
import { useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownItems } from '@/hooks/useRundownItems';
import { useColumnsManager } from '@/hooks/useColumnsManager';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useChangeTracking } from '@/hooks/useChangeTracking';
import { useAutoSave } from '@/hooks/useAutoSave';

export const useRundownDataManagement = (rundownTitle: string, timezone: string, rundownStartTime: string, setRundownTitle: (title: string) => void, setTimezone: (timezone: string) => void, setRundownStartTime: (startTime: string) => void) => {
  const params = useParams<{ id: string }>();
  const rawId = params.id;
  const rundownId = rawId === ':id' || !rawId || rawId.trim() === '' ? undefined : rawId;
  
  const { savedRundowns, loading } = useRundownStorage();
  const initializationRef = useRef<{ [key: string]: boolean }>({});
  const preventDuplicateInit = useRef(false);

  // Change tracking with proper integration
  const { hasUnsavedChanges, markAsSaved, markAsChanged, isInitialized, setIsLoading } = useChangeTracking(
    [], // Will be updated with actual items below
    rundownTitle,
    [], // Will be updated with actual columns below
    timezone,
    rundownStartTime
  );

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
    handleLoadLayout,
    handleRenameColumn,
    handleUpdateColumnWidth
  } = useColumnsManager(markAsChanged);

  // Auto-save functionality with debounce to prevent duplicate saves
  const { isSaving } = useAutoSave({
    rundownId,
    rundownTitle,
    items,
    columns,
    timezone,
    rundownStartTime,
    hasUnsavedChanges,
    markAsSaved,
    setIsLoading
  });

  // Initialize once per rundownId to prevent loops
  const initializeRundown = useCallback(() => {
    const initKey = rundownId || 'new';
    
    if (initializationRef.current[initKey] || loading || preventDuplicateInit.current) {
      return;
    }

    console.log('Initializing rundown data management for:', initKey);
    preventDuplicateInit.current = true;
    initializationRef.current[initKey] = true;

    // For existing rundowns, load the data
    if (rundownId && savedRundowns.length > 0) {
      const existingRundown = savedRundowns.find(r => r.id === rundownId);
      if (existingRundown) {
        console.log('Loading existing rundown data:', rundownId);
        
        // Set rundown metadata
        setRundownTitle(existingRundown.title);
        if (existingRundown.timezone) {
          setTimezone(existingRundown.timezone);
        }
        if (existingRundown.startTime || existingRundown.start_time) {
          setRundownStartTime(existingRundown.startTime || existingRundown.start_time || '09:00:00');
        }
        
        // Load items and columns
        if (existingRundown.items) {
          setItems(existingRundown.items);
        }
        if (existingRundown.columns) {
          handleLoadLayout(existingRundown.columns);
        }
      }
    } else if (!rundownId && items.length === 0) {
      // Initialize new rundown with default data only if no items exist
      console.log('Initializing new rundown with defaults');
      setRundownTitle('Live Broadcast Rundown');
      setTimezone('America/New_York');
      setRundownStartTime('09:00:00');
      
      // Load default items
      import('@/data/defaultRundownItems').then(({ defaultRundownItems }) => {
        setItems(defaultRundownItems);
      });
    }

    // Reset prevention flag after a delay
    setTimeout(() => {
      preventDuplicateInit.current = false;
    }, 1000);
  }, [rundownId, savedRundowns.length, loading, setItems, handleLoadLayout, setRundownTitle, setTimezone, setRundownStartTime, items.length]);

  useEffect(() => {
    initializeRundown();
  }, [initializeRundown]);

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
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleUpdateColumnWidth,
    savedRundowns,
    loading,
    markAsChanged,
    hasUnsavedChanges,
    isSaving,
    markAsSaved
  };
};
