import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { useTeamCustomColumns } from '@/hooks/useTeamCustomColumns';
import { Column } from '../types/columns';
import { debugLogger } from '@/utils/debugLogger';

interface UserColumnPreferences {
  id: string;
  user_id: string;
  rundown_id: string;
  column_layout: Column[];
  created_at: string;
  updated_at: string;
}

// Default columns configuration - using unified Column type
const defaultColumns: Column[] = [
  { id: 'name', name: 'Segment Name', key: 'name', width: '200px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'talent', name: 'Talent', key: 'talent', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'script', name: 'Script', key: 'script', width: '300px', isCustom: false, isEditable: true, isVisible: true, isCollapsible: true, type: 'textarea' },
  { id: 'gfx', name: 'GFX', key: 'gfx', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'video', name: 'Video', key: 'video', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'images', name: 'Images', key: 'images', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'duration', name: 'Duration', key: 'duration', width: '120px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'startTime', name: 'Start', key: 'startTime', width: '120px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'endTime', name: 'End', key: 'endTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
  { id: 'elapsedTime', name: 'Elapsed', key: 'elapsedTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
  { id: 'notes', name: 'Notes', key: 'notes', width: '300px', isCustom: false, isEditable: true, isVisible: true, isCollapsible: true, type: 'textarea' }
];

// Derived helpers for normalization
const defaultKeys: Set<string> = new Set(defaultColumns.map((c) => c.key));
const normalizeColumns = (cols: any[]): Column[] => {
  return (cols || [])
    .filter((col: any) => col && col.key)
    .map((col: any): Column => ({
      id: col.id || String(col.key),
      name: col.name || String(col.key),
      key: String(col.key),
      width: col.width || '150px',
      isCustom:
        typeof col.isCustom === 'boolean'
          ? col.isCustom
          : !defaultKeys.has(String(col.key)),
      isEditable:
        typeof col.isEditable === 'boolean' ? col.isEditable : true,
      isVisible: typeof col.isVisible === 'boolean' ? col.isVisible : true,
      isCollapsible: typeof col.isCollapsible === 'boolean' ? col.isCollapsible : undefined,
      type: col.type || undefined,
    }));
};

export const useUserColumnPreferences = (rundownId: string | null) => {
  const { user } = useAuth();
  const { team } = useTeam();
  const { teamColumns, loading: teamColumnsLoading, addTeamColumn } = useTeamCustomColumns();
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const currentSavePromiseRef = useRef<Promise<void> | null>(null);
  const hasLoadedRef = useRef(false); // Prevent multiple initial loads

  // Merge columns with team columns to ensure completeness - OPTIMIZED with Maps
  const mergeColumnsWithTeamColumns = useCallback((userColumns: Column[]) => {
    // Build a map of user's existing column preferences - O(n)
    const userColumnMap = new Map<string, Column>();
    userColumns.forEach(col => {
      userColumnMap.set(col.key, col);
    });

    // Build a map of team columns for O(1) lookups
    const teamColumnMap = new Map(teamColumns.map(tc => [tc.column_key, tc]));

    // Start from defaults, but hide any defaults NOT present in the user's layout
    const allAvailableColumns: Column[] = defaultColumns.map(dc => {
      const userPref = userColumnMap.get(dc.key);
      return userPref ? userPref : { ...dc, isVisible: false };
    });
    
    // Add ALL team columns to the available set - O(n)
    teamColumns.forEach(teamCol => {
      const existingUserPref = userColumnMap.get(teamCol.column_key);
      if (existingUserPref) {
        allAvailableColumns.push({
          ...existingUserPref,
          isTeamColumn: true,
          createdBy: teamCol.created_by,
          name: teamCol.column_name
        } as Column & { isTeamColumn?: boolean; createdBy?: string });
      } else {
        allAvailableColumns.push({
          id: teamCol.column_key,
          name: teamCol.column_name,
          key: teamCol.column_key,
          width: '150px',
          isCustom: true,
          isEditable: true,
          isVisible: false,
          isTeamColumn: true,
          createdBy: teamCol.created_by
        } as Column & { isTeamColumn?: boolean; createdBy?: string });
      }
    });
    
    // Add any user's personal custom columns that aren't team columns - O(n)
    userColumns.forEach(col => {
      if (col.isCustom && !(col as any).isTeamColumn && !teamColumnMap.has(col.key)) {
        const exists = allAvailableColumns.some(existingCol => existingCol.key === col.key);
        if (!exists) {
          allAvailableColumns.push(col);
        }
      }
    });
    
    // Create a map of all available columns for O(1) lookup - O(n)
    const availableColumnMap = new Map(allAvailableColumns.map(col => [col.key, col]));
    
    // Apply user's column order preferences - O(n)
    const orderedColumns: Column[] = [];
    const usedKeys = new Set<string>();
    
    // First, add columns in user's preferred order
    userColumns.forEach(userCol => {
      const matchingCol = availableColumnMap.get(userCol.key);
      if (matchingCol && !usedKeys.has(userCol.key)) {
        orderedColumns.push({
          ...(matchingCol as Column),
          ...(userCol as Column)
        } as Column);
        usedKeys.add(userCol.key);
      }
    });
    
    // Then add any remaining columns - O(n)
    allAvailableColumns.forEach(col => {
      if (!usedKeys.has(col.key)) {
        orderedColumns.push(col);
      }
    });

    return orderedColumns;
  }, [teamColumns]);

  // Auto-save any column changes - but NOT during initial load
  const saveColumnPreferences = useCallback(async (columnsToSave: Column[]) => {
    if (!user?.id || !rundownId) {
      return;
    }

    // CRITICAL: Prevent autosave during initial hydration
    if (isLoading || !hasInitialLoad) {
      // Silent return - main autosave is already blocked upstream
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce saves to avoid excessive database calls - with proper cleanup
    saveTimeoutRef.current = setTimeout(async () => {
      // Prevent concurrent saves by checking if there's already a save in progress
      if (currentSavePromiseRef.current) {
        console.log('📊 Save already in progress, will retry after completion');
        return;
      }

      setIsSaving(true);
      
      const savePromise = (async () => {
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
            console.log('📊 Column preferences auto-saved successfully');
            debugLogger.preferences('Auto-saved ' + columnsToSave.length + ' columns');
          }
        } catch (error) {
          console.error('Failed to save column preferences:', error);
        } finally {
          setIsSaving(false);
          currentSavePromiseRef.current = null;
        }
      })();

      currentSavePromiseRef.current = savePromise;
      await savePromise;
    }, 500);
  }, [user?.id, rundownId, isLoading, hasInitialLoad]);

  // Load user's column preferences for this rundown (waits for team columns to be ready)
  const loadColumnPreferences = useCallback(async () => {
    if (!user?.id || !rundownId) {
      const mergedDefaults = mergeColumnsWithTeamColumns(defaultColumns);
      setColumns(mergedDefaults);
      setIsLoading(false);
      debugLogger.preferences('No user/rundown - using defaults');
      return;
    }

    // If team context exists, wait until team columns have loaded to avoid two-phase layout
    if (team?.id && teamColumnsLoading) {
      debugLogger.preferences('Deferring column load until team columns are ready');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('user_column_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('rundown_id', rundownId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading column preferences:', error);
        const mergedDefaults = mergeColumnsWithTeamColumns(defaultColumns);
        setColumns(mergedDefaults);
        } else if (data?.column_layout) {
          const loadedColumns = Array.isArray(data.column_layout) ? data.column_layout : defaultColumns;
          
          // Normalize any missing fields to prevent dropped columns
          const normalized = normalizeColumns(loadedColumns);
          const mergedColumns = mergeColumnsWithTeamColumns(normalized);
          setColumns(mergedColumns);
          console.log('✅ Column preferences hydrated:', mergedColumns.length);
          debugLogger.preferences('Loaded saved preferences - total columns: ' + mergedColumns.length);
      } else {
        const mergedDefaults = mergeColumnsWithTeamColumns(defaultColumns);
        setColumns(mergedDefaults);
        console.log('✅ Column preferences hydrated (defaults):', mergedDefaults.length);
        debugLogger.preferences('No saved preferences - using defaults');
      }
    } catch (error) {
      console.error('Failed to load column preferences:', error);
      const mergedDefaults = mergeColumnsWithTeamColumns(defaultColumns);
      setColumns(mergedDefaults);
    } finally {
      setIsLoading(false);
      // CRITICAL FIX: Set hasInitialLoad immediately after load completes
      // This ensures the flag is always set correctly, preventing autosave blockage
      setHasInitialLoad(true);
      console.log('✅ hasInitialLoad flag set - autosaves now enabled');
    }
  }, [user?.id, rundownId, team?.id, teamColumnsLoading]); // Removed mergeColumnsWithTeamColumns to prevent recreation

  // Update columns and auto-save
  const updateColumns = useCallback(async (newColumns: Column[]) => {
    // CRITICAL: Don't auto-save during initial load
    if (isLoading || !hasInitialLoad) {
      console.log('📊 Column update blocked - initial load not complete');
      return;
    }
    
    // Check if any new custom columns were added that need to be saved to team
    const existingCustomKeys = new Set(
      columns.filter(col => col.isCustom).map(col => col.key)
    );
    
    const newCustomColumns = newColumns.filter(col => 
      col.isCustom && !existingCustomKeys.has(col.key)
    );

    // Add new custom columns to team_custom_columns table
    for (const newCol of newCustomColumns) {
      if (team?.id && user?.id) {
        await addTeamColumn(newCol.key, newCol.name);
      }
    }

    const merged = mergeColumnsWithTeamColumns(newColumns);
    setColumns(merged);
    console.log('📊 Columns updated via updateColumns - auto-saving');
    saveColumnPreferences(merged);
  }, [columns, saveColumnPreferences, addTeamColumn, team?.id, user?.id, mergeColumnsWithTeamColumns, isLoading, hasInitialLoad]);

  // Update column width and auto-save
  const updateColumnWidth = useCallback((columnId: string, width: string) => {
    setColumns(prevColumns => {
      const updatedColumns = prevColumns.map(col => 
        col.id === columnId ? { ...col, width } : col
      );
      saveColumnPreferences(updatedColumns);
      return updatedColumns;
    });
  }, [saveColumnPreferences]);

  // Apply a saved layout (this becomes the new current layout)
  const applyLayout = useCallback((layoutColumns: Column[]) => {
    debugLogger.preferences('Applying saved layout with ' + layoutColumns.length + ' columns');
    
    if (isLoading) {
      debugLogger.preferences('Skipping layout application - still loading');
      return;
    }

    // When applying a saved layout, we need to:
    // 1. Show only columns that were explicitly saved in the layout
    // 2. Hide all other columns (including defaults) that weren't in the saved layout
    // 3. Include team columns as options but keep them hidden unless they were in the saved layout
    
    const normalizedLayout = normalizeColumns(layoutColumns);
    const layoutColumnMap = new Map<string, Column>();
    normalizedLayout.forEach(col => {
      layoutColumnMap.set(col.key, col);
    });
    
    // Start with the saved layout columns exactly as they were (normalized)
    const appliedColumns: Column[] = [...normalizedLayout];
    
    // Add any team columns that aren't in the saved layout (but keep them hidden)
    teamColumns.forEach(teamCol => {
      if (!layoutColumnMap.has(teamCol.column_key)) {
        appliedColumns.push({
          id: teamCol.column_key,
          name: teamCol.column_name,
          key: teamCol.column_key,
          width: '150px',
          isCustom: true,
          isEditable: true,
          isVisible: false, // Hidden since they weren't in the saved layout
          isTeamColumn: true,
          createdBy: teamCol.created_by
        } as Column & { isTeamColumn?: boolean; createdBy?: string });
      }
    });
    
    // Add any default columns that aren't in the saved layout (but keep them hidden)
    defaultColumns.forEach(defaultCol => {
      if (!layoutColumnMap.has(defaultCol.key)) {
        appliedColumns.push({
          ...defaultCol,
          isVisible: false // Hidden since they weren't in the saved layout
        });
      }
    });
    
    // CRITICAL FIX: Set columns directly without triggering updateColumns merging logic
    // Use the direct state setter to avoid re-merging and showing hidden columns
    setColumns(appliedColumns);
    // Save directly without going through updateColumns to avoid re-merging
    saveColumnPreferences(appliedColumns);
    debugLogger.preferences('Applied saved layout exactly - hidden ' + (appliedColumns.length - layoutColumns.length) + ' columns not in layout');
  }, [isLoading, teamColumns, saveColumnPreferences]);

  // Temporary layout preview (doesn't save to user preferences)
  const previewLayout = useCallback((layoutColumns: Column[]) => {
    if (isLoading) return;
    
    const mergedLayout = mergeColumnsWithTeamColumns(layoutColumns);
    setColumns(mergedLayout);
    // Don't save - this is just a preview
  }, [isLoading, mergeColumnsWithTeamColumns]);

  // Load preferences when rundown changes - but only once per rundown
  useEffect(() => {
    // Reset the loaded flag when rundown changes
    hasLoadedRef.current = false;
    
    if (rundownId && user?.id) {
      hasLoadedRef.current = true;
      loadColumnPreferences();
    }
  }, [rundownId, user?.id]);

  // Update columns when team columns change - wait until all loading is done
  useEffect(() => {
    // Block while either preferences or team columns are loading
    if (isLoading || teamColumnsLoading) {
      return;
    }

    // FIXED: Block during initial hydration to prevent overwriting loaded preferences
    if (!hasInitialLoad) {
      return;
    }

    // If no team columns, nothing to merge
    if (teamColumns.length === 0) {
      return;
    }
    
    // Merge and update only if the result actually changes
    const currentColumnKeys = columns.map(c => c.key).sort().join(',');
    const newMerged = mergeColumnsWithTeamColumns(columns);
    const newColumnKeys = newMerged.map(c => c.key).sort().join(',');
    
    if (currentColumnKeys !== newColumnKeys) {
      setColumns(newMerged);
    }
  }, [isLoading, teamColumnsLoading, teamColumns.length, hasInitialLoad]);

  // Cleanup timeouts and pending saves on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Wait for any pending save to complete before unmounting
      if (currentSavePromiseRef.current) {
        currentSavePromiseRef.current.catch(err => {
          console.error('Save failed during cleanup:', err);
        });
      }
    };
  }, []);
  return {
    columns,
    setColumns, // Direct setter for internal use (like applyLayout)
    updateColumns, // Merging setter for external use
    updateColumnWidth,
    applyLayout,
    previewLayout,
    isLoading,
    isSaving,
    hasInitialLoad,
    reloadPreferences: loadColumnPreferences
  };
};