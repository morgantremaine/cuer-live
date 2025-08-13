import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useConsolidatedTeam } from '@/hooks/useConsolidatedTeam';
import { useTeamCustomColumns } from '@/hooks/useTeamCustomColumns';
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
  { id: 'name', name: 'Segment Name', key: 'name', width: '200px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'talent', name: 'Talent', key: 'talent', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'script', name: 'Script', key: 'script', width: '300px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'gfx', name: 'GFX', key: 'gfx', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'video', name: 'Video', key: 'video', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'images', name: 'Images', key: 'images', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'duration', name: 'Duration', key: 'duration', width: '120px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'startTime', name: 'Start', key: 'startTime', width: '120px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'endTime', name: 'End', key: 'endTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
  { id: 'elapsedTime', name: 'Elapsed', key: 'elapsedTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
  { id: 'notes', name: 'Notes', key: 'notes', width: '300px', isCustom: false, isEditable: true, isVisible: true }
];

// Global state to prevent multiple loads
const globalColumnState = new Map<string, {
  columns: Column[];
  isLoading: boolean;
  loadedUserId: string | null;
}>();

export const useConsolidatedUserColumnPreferences = (rundownId: string | null) => {
  const { user } = useAuth();
  const { team } = useConsolidatedTeam();
  const { teamColumns, addTeamColumn, deleteTeamColumn } = useTeamCustomColumns();
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>('');

  const cacheKey = rundownId || 'default';

  // Load column preferences without race conditions
  const loadColumnPreferences = useCallback(async () => {
    if (!user?.id || !rundownId) {
      setColumns(defaultColumns);
      setIsLoading(false);
      return;
    }

    // Check if already loading/loaded for this combination
    const cached = globalColumnState.get(cacheKey);
    if (cached?.loadedUserId === user.id && !cached.isLoading) {
      console.log('🔄 useConsolidatedUserColumnPreferences: Using cached columns for:', rundownId);
      setColumns(cached.columns);
      setIsLoading(false);
      return;
    }

    // Prevent multiple simultaneous loads
    if (cached?.isLoading) {
      console.log('🔄 useConsolidatedUserColumnPreferences: Already loading for:', rundownId);
      return;
    }

    console.log('🔄 useConsolidatedUserColumnPreferences: Loading column preferences for rundown:', rundownId);
    
    // Mark as loading
    globalColumnState.set(cacheKey, {
      columns: defaultColumns,
      isLoading: true,
      loadedUserId: user.id
    });

    try {
      const { data, error } = await supabase
        .from('user_column_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('rundown_id', rundownId)
        .order('updated_at', { ascending: false })
        .maybeSingle();

      let loadedColumns = defaultColumns;

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading column preferences:', error);
      } else if (data?.column_layout) {
        loadedColumns = Array.isArray(data.column_layout) ? data.column_layout : defaultColumns;
      }

      // Update cache and local state
      globalColumnState.set(cacheKey, {
        columns: loadedColumns,
        isLoading: false,
        loadedUserId: user.id
      });

      setColumns(loadedColumns);
      lastSavedRef.current = JSON.stringify(loadedColumns);
    } catch (error) {
      console.error('Failed to load column preferences:', error);
      setColumns(defaultColumns);
      
      globalColumnState.set(cacheKey, {
        columns: defaultColumns,
        isLoading: false,
        loadedUserId: user.id
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, rundownId, cacheKey]);

  // Save column preferences with debouncing
  const saveColumnPreferences = useCallback(async (columnsToSave: Column[], isImmediate = false) => {
    if (!user?.id || !rundownId) return;

    const currentSignature = JSON.stringify(columnsToSave);
    if (currentSignature === lastSavedRef.current) return;

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
          
          // Update cache
          globalColumnState.set(cacheKey, {
            columns: columnsToSave,
            isLoading: false,
            loadedUserId: user.id
          });
        }
      } catch (error) {
        console.error('Failed to save column preferences:', error);
      } finally {
        setIsSaving(false);
      }
    }, saveDelay);
  }, [user?.id, rundownId, cacheKey]);

  // Update columns function
  const updateColumns = useCallback(async (newColumns: Column[], isImmediate = false) => {
    setColumns(newColumns);
    saveColumnPreferences(newColumns, isImmediate);
  }, [saveColumnPreferences]);

  // Column width update
  const updateColumnWidth = useCallback((columnId: string, width: string) => {
    setColumns(prevColumns => {
      const updatedColumns = prevColumns.map(col => 
        col.id === columnId ? { ...col, width } : col
      );
      
      saveColumnPreferences(updatedColumns, false);
      return updatedColumns;
    });
  }, [saveColumnPreferences]);

  // Load on mount and when dependencies change
  useEffect(() => {
    if (rundownId) {
      loadColumnPreferences();
    }
  }, [rundownId, user?.id, loadColumnPreferences]);

  // Cleanup
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