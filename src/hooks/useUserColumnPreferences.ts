
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
  const { teamColumns, addTeamColumn, deleteTeamColumn } = useTeamCustomColumns();
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>('');
  const isLoadingRef = useRef(false);
  const loadedRundownRef = useRef<string | null>(null);

  // Merge team custom columns with user's column layout
  const mergeColumnsWithTeamColumns = useCallback((userColumns: Column[]) => {
    const userColumnKeys = new Set(userColumns.map(col => col.key));
    const mergedColumns = [...userColumns];

    // Add team custom columns that aren't already in user's layout
    teamColumns.forEach(teamCol => {
      if (!userColumnKeys.has(teamCol.column_key)) {
        // Add team columns as visible by default since they're part of the team's workflow
        // Users can hide them if they don't want to see them
        mergedColumns.push({
          id: teamCol.column_key,
          name: teamCol.column_name,
          key: teamCol.column_key,
          width: '150px',
          isCustom: true,
          isEditable: true,
          isVisible: true, // Visible by default for new team columns
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

    // Prevent duplicate loading for the same rundown
    if (loadedRundownRef.current === rundownId) {
      setIsLoading(false);
      return;
    }

    isLoadingRef.current = true;
    loadedRundownRef.current = rundownId;

    try {
      const { data, error } = await supabase
        .from('user_column_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('rundown_id', rundownId)
        .order('updated_at', { ascending: false })
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
        
        setColumns(mergedColumns);
        lastSavedRef.current = JSON.stringify(fixedColumns); // Only save personal columns
      } else {
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

    // Save personal columns + user's preferences for team columns (visibility, width, position)
    // We need to save team columns with their user preferences, but without the team metadata
    const personalColumns = columnsToSave.map(col => {
      if (col.isCustom && (col as any).isTeamColumn) {
        // For team columns, save user's preferences but strip team metadata
        const { isTeamColumn, createdBy, ...userPrefs } = col as any;
        return userPrefs;
      }
      return col;
    });

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
        }
      } catch (error) {
        console.error('Failed to save column preferences:', error);
      } finally {
        setIsSaving(false);
      }
    }, saveDelay);
  }, [user?.id, rundownId]);

  // Enhanced column update function that handles team column creation and deletion
  const updateColumns = useCallback(async (newColumns: Column[], isImmediate = false) => {
    // Check if any new custom columns were added
    const existingCustomKeys = new Set(
      columns.filter(col => col.isCustom).map(col => col.key)
    );
    
    const newCustomColumns = newColumns.filter(col => 
      col.isCustom && !existingCustomKeys.has(col.key)
    );

    // Check if any team custom columns were deleted
    const newColumnKeys = new Set(newColumns.map(col => col.key));
    const deletedTeamColumns = columns.filter(col => 
      col.isCustom && 
      (col as any).isTeamColumn && 
      !newColumnKeys.has(col.key)
    );

    // Add new custom columns to team_custom_columns table
    for (const newCol of newCustomColumns) {
      if (team?.id && user?.id) {
        await addTeamColumn(newCol.key, newCol.name);
      }
    }

    // Delete team custom columns from team_custom_columns table
    for (const deletedCol of deletedTeamColumns) {
      if (team?.id && user?.id) {
        const deleteSuccess = await deleteTeamColumn(deletedCol.key);
        if (deleteSuccess) {
          // Also remove from local columns immediately to prevent it from reappearing
          setColumns(prevColumns => prevColumns.filter(col => col.key !== deletedCol.key));
        }
      }
    }

    setColumns(newColumns);
    // Only save if we're not currently loading
    if (!isLoadingRef.current) {
      saveColumnPreferences(newColumns, isImmediate);
    }
  }, [columns, saveColumnPreferences, addTeamColumn, deleteTeamColumn, team?.id, user?.id]);

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

  // Load preferences when rundown changes, but prevent duplicate loads
  useEffect(() => {
    if (rundownId && rundownId !== loadedRundownRef.current) {
      console.log('🔄 UserColumnPreferences: Loading column preferences for rundown:', rundownId);
      loadedRundownRef.current = null; // Reset to allow new load
      setIsLoading(true); // Set loading immediately
      loadColumnPreferences();
    }
  }, [rundownId, user?.id, loadColumnPreferences]);

  // Update columns when team columns change, but only if not currently loading
  useEffect(() => {
    if (!isLoadingRef.current && teamColumns.length > 0 && loadedRundownRef.current) {
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
