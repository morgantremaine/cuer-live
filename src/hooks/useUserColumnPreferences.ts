
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
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

// Default columns configuration - matches useColumnsManager exactly
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

export const useUserColumnPreferences = (rundownId: string | null) => {
  const { user } = useAuth();
  const { team } = useTeam();
  const { teamColumns, addTeamColumn } = useTeamCustomColumns();
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>('');
  const isLoadingRef = useRef(false);

  // Merge team custom columns with user's column layout
  const mergeColumnsWithTeamColumns = useCallback((userColumns: Column[]) => {
    const userColumnKeys = new Set(userColumns.map(col => col.key));
    const mergedColumns = [...userColumns];

    // Add team custom columns that aren't already in user's layout
    teamColumns.forEach(teamCol => {
      if (!userColumnKeys.has(teamCol.column_key)) {
        // Add as hidden column that user can choose to enable
        mergedColumns.push({
          id: teamCol.column_key,
          name: teamCol.column_name,
          key: teamCol.column_key,
          width: '150px',
          isCustom: true,
          isEditable: true,
          isVisible: false, // Hidden by default
          isTeamColumn: true,
          createdBy: teamCol.created_by
        } as Column & { isTeamColumn?: boolean; createdBy?: string });
      }
    });

    return mergedColumns;
  }, [teamColumns]);

  // Load user's column preferences for this rundown
  const loadColumnPreferences = useCallback(async () => {
    if (!user?.id || !rundownId || isLoadingRef.current) {
      const mergedDefaults = mergeColumnsWithTeamColumns(defaultColumns);
      setColumns(mergedDefaults);
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
        const mergedDefaults = mergeColumnsWithTeamColumns(defaultColumns);
        setColumns(mergedDefaults);
      } else if (data?.column_layout) {
        const loadedColumns = Array.isArray(data.column_layout) ? data.column_layout : defaultColumns;
        
        // Ensure images column has correct properties - fix any potential mismatches
        const fixedColumns = loadedColumns.map(col => {
          if (col.key === 'images' || col.id === 'images') {
            return {
              ...col,
              id: 'images',
              key: 'images',
              name: col.name || 'Images',
              isCustom: false,
              isEditable: true
            };
          }
          return col;
        });
        
        // Merge with team columns
        const mergedColumns = mergeColumnsWithTeamColumns(fixedColumns);
        
        console.log('✅ Loaded user column preferences:', mergedColumns.length, 'columns');
        setColumns(mergedColumns);
        lastSavedRef.current = JSON.stringify(fixedColumns); // Only save personal columns
      } else {
        console.log('📋 No saved preferences, using defaults');
        const mergedDefaults = mergeColumnsWithTeamColumns(defaultColumns);
        setColumns(mergedDefaults);
        lastSavedRef.current = JSON.stringify(defaultColumns);
      }
    } catch (error) {
      console.error('Failed to load column preferences:', error);
      const mergedDefaults = mergeColumnsWithTeamColumns(defaultColumns);
      setColumns(mergedDefaults);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [user?.id, rundownId, mergeColumnsWithTeamColumns]);

  // Save column preferences with proper debouncing
  const saveColumnPreferences = useCallback(async (columnsToSave: Column[], isImmediate = false) => {
    if (!user?.id || !rundownId) {
      return;
    }

    // Filter out team columns when saving - only save personal column layout
    const personalColumns = columnsToSave.filter(col => 
      !col.isCustom || 
      (col.isCustom && !(col as any).isTeamColumn)
    );

    const currentSignature = JSON.stringify(personalColumns);
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
            column_layout: personalColumns,
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

  // Enhanced column update function that handles team column creation
  const updateColumns = useCallback(async (newColumns: Column[], isImmediate = false) => {
    // Check if any new custom columns were added
    const existingCustomKeys = new Set(
      columns.filter(col => col.isCustom).map(col => col.key)
    );
    
    const newCustomColumns = newColumns.filter(col => 
      col.isCustom && !existingCustomKeys.has(col.key)
    );

    // Add new custom columns to team_custom_columns table
    for (const newCol of newCustomColumns) {
      if (team?.id && user?.id) {
        console.log('🔄 Adding new team custom column:', newCol.name);
        await addTeamColumn(newCol.key, newCol.name);
      }
    }

    setColumns(newColumns);
    // Only save if we're not currently loading
    if (!isLoadingRef.current) {
      saveColumnPreferences(newColumns, isImmediate);
    }
  }, [columns, saveColumnPreferences, addTeamColumn, team?.id, user?.id]);

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

  // Load preferences when rundown, user, or team columns change
  useEffect(() => {
    loadColumnPreferences();
  }, [loadColumnPreferences]);

  // Update columns when team columns change
  useEffect(() => {
    if (!isLoadingRef.current && teamColumns.length > 0) {
      setColumns(prevColumns => mergeColumnsWithTeamColumns(prevColumns));
    }
  }, [teamColumns, mergeColumnsWithTeamColumns]);

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
