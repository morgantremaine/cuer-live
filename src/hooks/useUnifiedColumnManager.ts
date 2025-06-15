
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface Column {
  id: string;
  name: string;
  key: string;
  width: string;
  isCustom: boolean;
  isEditable: boolean;
  isVisible?: boolean;
}

// Default columns configuration - removed talent column
const defaultColumns: Column[] = [
  { id: 'segmentName', name: 'Segment Name', key: 'segmentName', width: '200px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'script', name: 'Script', key: 'script', width: '300px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'gfx', name: 'GFX', key: 'gfx', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'video', name: 'Video', key: 'video', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'duration', name: 'Duration', key: 'duration', width: '120px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'startTime', name: 'Start', key: 'startTime', width: '120px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'endTime', name: 'End', key: 'endTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
  { id: 'elapsedTime', name: 'Elapsed', key: 'elapsedTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
  { id: 'notes', name: 'Notes', key: 'notes', width: '300px', isCustom: false, isEditable: true, isVisible: true }
];

export const useUnifiedColumnManager = (rundownId: string | null) => {
  const { user } = useAuth();
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>('');
  const isLoadingRef = useRef(false);

  // Get visible columns
  const visibleColumns = Array.isArray(columns) ? columns.filter(col => col.isVisible !== false) : [];

  // Load user's column preferences
  const loadColumnPreferences = useCallback(async () => {
    if (!user?.id || !rundownId || isLoadingRef.current) {
      setColumns(defaultColumns);
      setIsLoading(false);
      return;
    }

    isLoadingRef.current = true;
    console.log('🔄 Loading column preferences for rundown:', rundownId);

    try {
      const { data, error } = await supabase
        .from('user_column_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('rundown_id', rundownId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading column preferences:', error);
        setColumns(defaultColumns);
      } else if (data?.column_layout) {
        const loadedColumns = Array.isArray(data.column_layout) ? data.column_layout : defaultColumns;
        console.log('✅ Loaded user column preferences:', loadedColumns.length, 'columns');
        setColumns(loadedColumns);
        lastSavedRef.current = JSON.stringify(loadedColumns);
      } else {
        console.log('📋 No saved preferences, using defaults');
        setColumns(defaultColumns);
        lastSavedRef.current = JSON.stringify(defaultColumns);
      }
    } catch (error) {
      console.error('Failed to load column preferences:', error);
      setColumns(defaultColumns);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [user?.id, rundownId]);

  // Save column preferences with debouncing
  const saveColumnPreferences = useCallback(async (columnsToSave: Column[], isImmediate = false) => {
    if (!user?.id || !rundownId) {
      return;
    }

    const currentSignature = JSON.stringify(columnsToSave);
    if (currentSignature === lastSavedRef.current) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const saveDelay = isImmediate ? 100 : 800;

    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from('user_column_preferences')
          .upsert({
            user_id: user.id,
            rundown_id: rundownId,
            column_layout: columnsToSave,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,rundown_id'
          });

        if (error) {
          console.error('Error saving column preferences:', error);
        } else {
          lastSavedRef.current = currentSignature;
          console.log('✅ Column preferences saved successfully');
        }
      } catch (error) {
        console.error('Failed to save column preferences:', error);
      } finally {
        setIsSaving(false);
      }
    }, saveDelay);
  }, [user?.id, rundownId]);

  // Update columns with automatic save
  const updateColumns = useCallback((newColumns: Column[], isImmediate = false) => {
    setColumns(newColumns);
    if (!isLoadingRef.current) {
      saveColumnPreferences(newColumns, isImmediate);
    }
  }, [saveColumnPreferences]);

  // Column operation handlers
  const addColumn = useCallback((name: string) => {
    const newColumn: Column = {
      id: `custom_${Date.now()}`,
      name,
      key: `custom_${Date.now()}`,
      width: '150px',
      isCustom: true,
      isEditable: true,
      isVisible: true
    };
    
    const newColumns = [...columns];
    newColumns.splice(1, 0, newColumn);
    console.log('🔄 Adding new column:', newColumn.name, 'New total:', newColumns.length);
    updateColumns(newColumns, true);
  }, [columns, updateColumns]);

  const reorderColumns = useCallback((newColumns: Column[]) => {
    if (!Array.isArray(newColumns)) return;
    console.log('🔄 Reordering columns to:', newColumns.length, 'columns');
    updateColumns(newColumns, true);
  }, [updateColumns]);

  const deleteColumn = useCallback((columnId: string) => {
    const filtered = columns.filter(col => col.id !== columnId);
    console.log('🗑️ Deleting column:', columnId, 'Remaining:', filtered.length);
    updateColumns(filtered, true);
  }, [columns, updateColumns]);

  const renameColumn = useCallback((columnId: string, newName: string) => {
    const updated = columns.map(col => {
      if (col.id === columnId) {
        return { ...col, name: newName };
      }
      return col;
    });
    console.log('✏️ Renaming column:', columnId, 'to:', newName);
    updateColumns(updated, true);
  }, [columns, updateColumns]);

  const toggleColumnVisibility = useCallback((columnId: string) => {
    const updated = columns.map(col => {
      if (col.id === columnId) {
        const newVisibility = col.isVisible !== false ? false : true;
        return { ...col, isVisible: newVisibility };
      }
      return col;
    });
    console.log('👁️ Toggling visibility for column:', columnId);
    updateColumns(updated, true);
  }, [columns, updateColumns]);

  const updateColumnWidth = useCallback((columnId: string, width: string) => {
    const updated = columns.map(col => {
      if (col.id === columnId) {
        return { ...col, width };
      }
      return col;
    });
    updateColumns(updated, false); // Use debouncing for width updates
  }, [columns, updateColumns]);

  const loadLayout = useCallback((layoutColumns: Column[]) => {
    if (!Array.isArray(layoutColumns)) {
      console.error('handleLoadLayout: layoutColumns is not an array', layoutColumns);
      return;
    }

    console.log('📥 Loading layout with', layoutColumns.length, 'columns');

    // Filter out deprecated columns and validate
    const filteredLayoutColumns = layoutColumns.filter(col => 
      col && col.id && col.name && col.key &&
      col.id !== 'element' && col.key !== 'element' && 
      col.id !== 'talent' && col.key !== 'talent'
    );

    // Update column names for backward compatibility
    const updatedLayoutColumns = filteredLayoutColumns.map(col => {
      if (col.id === 'startTime' && col.name === 'Start Time') {
        return { ...col, name: 'Start' };
      }
      if (col.id === 'endTime' && col.name === 'End Time') {
        return { ...col, name: 'End' };
      }
      if (col.id === 'elapsedTime' && col.name === 'Elapsed Time') {
        return { ...col, name: 'Elapsed' };
      }
      return col;
    });

    // Ensure essential columns are included
    const mergedColumns: Column[] = [];
    const layoutColumnIds = new Set(updatedLayoutColumns.map(col => col.id));

    // Add layout columns first
    updatedLayoutColumns.forEach(layoutCol => {
      mergedColumns.push(layoutCol);
    });

    // Add missing essential columns
    defaultColumns.forEach(essentialCol => {
      if (!layoutColumnIds.has(essentialCol.id)) {
        mergedColumns.push(essentialCol);
      }
    });

    console.log('✅ Layout loaded with', mergedColumns.length, 'columns');
    updateColumns(mergedColumns, true);
  }, [updateColumns]);

  // Load preferences on mount
  useEffect(() => {
    loadColumnPreferences();
  }, [loadColumnPreferences]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    columns: Array.isArray(columns) ? columns : [],
    visibleColumns,
    isLoading,
    isSaving,
    setColumns: updateColumns,
    addColumn,
    reorderColumns,
    deleteColumn,
    renameColumn,
    toggleColumnVisibility,
    updateColumnWidth,
    loadLayout,
    reloadPreferences: loadColumnPreferences
  };
};
