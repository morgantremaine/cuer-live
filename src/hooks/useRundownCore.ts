
import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownItems } from './useRundownItems';
import { useColumnsManager } from './useColumnsManager';
import { useChangeTracking } from './useChangeTracking';
import { useRundownStorage } from './useRundownStorage';
import { useAutoSave } from './useAutoSave';

export const useRundownCore = () => {
  const params = useParams<{ id: string }>();
  const rawId = params.id;
  const rundownId = rawId === ':id' || !rawId || rawId.trim() === '' ? undefined : rawId;
  
  // Basic state
  const [rundownTitle, setRundownTitle] = useState('Live Broadcast Rundown');
  const [timezone, setTimezone] = useState('America/New_York'); 
  const [rundownStartTime, setRundownStartTime] = useState('09:00:00');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time
  useState(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  });

  const markAsChanged = useCallback(() => {
    // Mark that changes have been made
  }, []);

  // Change tracking
  const { hasUnsavedChanges, markAsSaved, setIsLoading } = useChangeTracking(
    [], // Will be updated with actual items
    rundownTitle,
    [], // Will be updated with actual columns
    timezone,
    rundownStartTime
  );

  // Items management
  const {
    items,
    setItems,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    deleteMultipleRows,
    addMultipleRows,
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration
  } = useRundownItems(markAsChanged);

  // Columns management
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

  // Storage
  const { savedRundowns, loading } = useRundownStorage();

  // Auto-save
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

  return {
    // Basic state
    rundownId,
    rundownTitle,
    setRundownTitle,
    timezone,
    setTimezone,
    rundownStartTime,
    setRundownStartTime,
    currentTime,
    
    // Data
    items,
    setItems,
    updateItem,
    columns,
    visibleColumns,
    
    // Operations
    addRow,
    addHeader,
    deleteRow,
    deleteMultipleRows,
    addMultipleRows,
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration,
    
    // Column management
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleRenameColumn,
    handleUpdateColumnWidth,
    
    // Storage
    savedRundowns,
    loading,
    hasUnsavedChanges,
    isSaving,
    markAsChanged,
    markAsSaved
  };
};
