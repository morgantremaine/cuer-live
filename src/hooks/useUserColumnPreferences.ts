
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Column } from './useColumnsManager';

interface UserColumnPreferences {
  id: string;
  user_id: string;
  rundown_id: string;
  column_layout: Column[];
  created_at: string;
  updated_at: string;
}

// Default columns configuration
const defaultColumns: Column[] = [
  { id: 'segmentName', name: 'Segment', key: 'name', isVisible: true, width: '200px', isCustom: false, isEditable: true },
  { id: 'script', name: 'Script', key: 'script', isVisible: true, width: '300px', isCustom: false, isEditable: true },
  { id: 'gfx', name: 'GFX', key: 'gfx', isVisible: true, width: '150px', isCustom: false, isEditable: true },
  { id: 'video', name: 'Video', key: 'video', isVisible: true, width: '150px', isCustom: false, isEditable: true },
  { id: 'duration', name: 'Duration', key: 'duration', isVisible: true, width: '100px', isCustom: false, isEditable: true },
  { id: 'startTime', name: 'Start', key: 'startTime', isVisible: true, width: '100px', isCustom: false, isEditable: false },
  { id: 'endTime', name: 'End', key: 'endTime', isVisible: true, width: '100px', isCustom: false, isEditable: false },
  { id: 'elapsedTime', name: 'Elapsed', key: 'elapsedTime', isVisible: true, width: '100px', isCustom: false, isEditable: false },
  { id: 'notes', name: 'Notes', key: 'notes', isVisible: true, width: '300px', isCustom: false, isEditable: true }
];

export const useUserColumnPreferences = (rundownId: string | null, rundownColumns?: Column[]) => {
  const { user } = useAuth();
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>('');
  const isLoadingRef = useRef(false);

  // Load user's column preferences for this rundown
  const loadColumnPreferences = useCallback(async () => {
    if (!user?.id || !rundownId || isLoadingRef.current) {
      // If we have rundown columns, use those, otherwise use defaults
      const initialColumns = rundownColumns && rundownColumns.length > 0 ? rundownColumns : defaultColumns;
      setColumns(initialColumns);
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
        // Use rundown columns if available, otherwise defaults
        const fallbackColumns = rundownColumns && rundownColumns.length > 0 ? rundownColumns : defaultColumns;
        setColumns(fallbackColumns);
      } else if (data?.column_layout) {
        const loadedColumns = Array.isArray(data.column_layout) ? data.column_layout : defaultColumns;
        console.log('✅ Loaded user column preferences:', loadedColumns.length, 'columns');
        setColumns(loadedColumns);
        lastSavedRef.current = JSON.stringify(loadedColumns);
      } else {
        // No saved preferences - use rundown columns if available, otherwise defaults
        const initialColumns = rundownColumns && rundownColumns.length > 0 ? rundownColumns : defaultColumns;
        console.log('📋 No saved preferences, using', rundownColumns ? 'rundown' : 'default', 'columns');
        setColumns(initialColumns);
        lastSavedRef.current = JSON.stringify(initialColumns);
        
        // If we have rundown columns, save them as user preferences
        if (rundownColumns && rundownColumns.length > 0) {
          await saveColumnPreferences(rundownColumns, true);
        }
      }
    } catch (error) {
      console.error('Failed to load column preferences:', error);
      const fallbackColumns = rundownColumns && rundownColumns.length > 0 ? rundownColumns : defaultColumns;
      setColumns(fallbackColumns);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [user?.id, rundownId, rundownColumns]);

  // Save column preferences with proper debouncing
  const saveColumnPreferences = useCallback(async (columnsToSave: Column[], isImmediate = false) => {
    if (!user?.id || !rundownId) {
      return;
    }

    const currentSignature = JSON.stringify(columnsToSave);
    if (currentSignature === lastSavedRef.current) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Use shorter debounce for resize operations, immediate for structural changes
    const saveDelay = isImmediate ? 100 : 800;

    // Debounce the save
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

  // Update columns and trigger save - with immediate state update
  const updateColumns = useCallback((newColumns: Column[], isImmediate = false) => {
    setColumns(newColumns);
    // Only save if we're not currently loading
    if (!isLoadingRef.current) {
      saveColumnPreferences(newColumns, isImmediate);
    }
  }, [saveColumnPreferences]);

  // Special handler for column width updates during resize
  const updateColumnWidth = useCallback((columnId: string, width: string) => {
    setColumns(prevColumns => {
      const updatedColumns = prevColumns.map(col => 
        col.id === columnId ? { ...col, width } : col
      );
      
      // Save with debounce for resize operations
      if (!isLoadingRef.current) {
        saveColumnPreferences(updatedColumns, false);
      }
      
      return updatedColumns;
    });
  }, [saveColumnPreferences]);

  // Load preferences when rundown or user changes
  useEffect(() => {
    loadColumnPreferences();
  }, [loadColumnPreferences]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    columns,
    setColumns: updateColumns,
    updateColumnWidth,
    isLoading,
    isSaving,
    reloadPreferences: loadColumnPreferences
  };
};
