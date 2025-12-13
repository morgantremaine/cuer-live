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
  { id: 'name', name: 'Segment Name', key: 'name', width: '200px', isCustom: false, isEditable: true, isVisible: true, isRenamable: true },
  { id: 'talent', name: 'Talent', key: 'talent', width: '150px', isCustom: false, isEditable: true, isVisible: true, isRenamable: true },
  { id: 'script', name: 'Script', key: 'script', width: '300px', isCustom: false, isEditable: true, isVisible: true, isRenamable: true },
  { id: 'gfx', name: 'GFX', key: 'gfx', width: '150px', isCustom: false, isEditable: true, isVisible: true, isRenamable: true },
  { id: 'video', name: 'Video', key: 'video', width: '150px', isCustom: false, isEditable: true, isVisible: true, isRenamable: true },
  { id: 'images', name: 'Images', key: 'images', width: '150px', isCustom: false, isEditable: true, isVisible: false, isRenamable: false },
  { id: 'duration', name: 'Duration', key: 'duration', width: '120px', isCustom: false, isEditable: true, isVisible: true, isRenamable: false },
  { id: 'startTime', name: 'Start', key: 'startTime', width: '120px', isCustom: false, isEditable: true, isVisible: true, isRenamable: false },
  { id: 'endTime', name: 'End', key: 'endTime', width: '120px', isCustom: false, isEditable: false, isVisible: true, isRenamable: false },
  { id: 'elapsedTime', name: 'Elapsed', key: 'elapsedTime', width: '120px', isCustom: false, isEditable: false, isVisible: true, isRenamable: false },
  { id: 'backTime', name: 'Back', key: 'backTime', width: '120px', isCustom: false, isEditable: false, isVisible: true, isRenamable: false },
  { id: 'notes', name: 'Notes', key: 'notes', width: '300px', isCustom: false, isEditable: true, isVisible: true, isRenamable: false }
];

// Derived helpers for normalization
const defaultKeys: Set<string> = new Set(defaultColumns.map((c) => c.key));
const defaultColumnsMap = new Map(defaultColumns.map(c => [c.key, c]));
const normalizeColumns = (cols: any[]): Column[] => {
  return (cols || [])
    .filter((col: any) => col && col.key)
    .map((col: any): Column => {
      const defaultCol = defaultColumnsMap.get(String(col.key));
      return {
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
        isRenamable: typeof col.isRenamable === 'boolean' ? col.isRenamable : defaultCol?.isRenamable,
      };
    });
};

export const useUserColumnPreferences = (rundownId: string | null) => {
  const { user } = useAuth();
  const { team, isLoading: teamLoading } = useTeam();
  const { teamColumns, loading: teamColumnsLoading, addTeamColumn, renameTeamColumn } = useTeamCustomColumns();
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const currentSavePromiseRef = useRef<Promise<void> | null>(null);
  const hasLoadedRef = useRef(false); // Prevent multiple initial loads
  
  // Shared column name overrides from rundowns.columns (for built-in renamable columns)
  const [columnNameOverrides, setColumnNameOverrides] = useState<Record<string, string>>({});
  
  // Strategic timing log
  useEffect(() => {
    console.log('⏱️ [COLUMNS] state changed - isLoading:', isLoading, 'teamColumnsLoading:', teamColumnsLoading, 'teamLoading:', teamLoading, 'team:', team?.id?.slice(0,8));
  }, [isLoading, teamColumnsLoading, teamLoading, team?.id]);

  // Merge columns with team columns and apply shared name overrides
  const mergeColumnsWithTeamColumns = useCallback((userColumns: Column[], overrides: Record<string, string> = {}) => {
    // Build a map of user's existing column preferences - O(n)
    const userColumnMap = new Map<string, Column>();
    userColumns.forEach(col => {
      userColumnMap.set(col.key, col);
    });

    // Build a map of team columns for O(1) lookups
    const teamColumnMap = new Map(teamColumns.map(tc => [tc.column_key, tc]));

    // Start from defaults, but hide any defaults NOT present in the user's layout
    // Also apply shared name overrides for built-in renamable columns
    const allAvailableColumns: Column[] = defaultColumns.map(dc => {
      const userPref = userColumnMap.get(dc.key);
      // Apply shared name override if exists (for built-in renamable columns)
      const sharedName = overrides[dc.key];
      const name = sharedName || dc.name;
      return userPref ? { ...dc, name } : { ...dc, name, isVisible: false };
    });
    
    // Add ALL team columns to the available set - O(n)
    teamColumns.forEach(teamCol => {
      const existingUserPref = userColumnMap.get(teamCol.column_key);
      if (existingUserPref) {
        allAvailableColumns.push({
          ...existingUserPref,
          isTeamColumn: true,
          createdBy: teamCol.created_by,
          name: teamCol.column_name // Team column names come from team_custom_columns
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
        // Use shared name for built-in columns, team name for custom columns
        const finalName = matchingCol.isCustom 
          ? matchingCol.name  // Team custom column names come from team_custom_columns
          : (overrides[userCol.key] || matchingCol.name);  // Built-in use overrides
        orderedColumns.push({
          ...(matchingCol as Column),
          ...(userCol as Column),
          name: finalName
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

  // Refs for stable subscription access (prevents subscription teardown on state changes)
  const columnsRef = useRef(columns);
  const columnNameOverridesRef = useRef(columnNameOverrides);
  const mergeColumnsWithTeamColumnsRef = useRef(mergeColumnsWithTeamColumns);

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
    console.log('⏱️ [COLUMNS] loadColumnPreferences START');
    if (!user?.id || !rundownId) {
      const mergedDefaults = mergeColumnsWithTeamColumns(defaultColumns, columnNameOverrides);
      setColumns(mergedDefaults);
      setIsLoading(false);
      console.log('⏱️ [COLUMNS] loadColumnPreferences COMPLETE (no user/rundown)');
      debugLogger.preferences('No user/rundown - using defaults');
      return;
    }

    setIsLoading(true);

    try {
      // Load both user preferences and shared column name overrides in parallel
      const [userPrefsResult, rundownResult] = await Promise.all([
        supabase
          .from('user_column_preferences')
          .select('*')
          .eq('user_id', user.id)
          .eq('rundown_id', rundownId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('rundowns')
          .select('columns')
          .eq('id', rundownId)
          .single()
      ]);

      const { data, error } = userPrefsResult;
      
      // Extract shared column name overrides from rundown
      let overrides: Record<string, string> = {};
      if (rundownResult.data?.columns && typeof rundownResult.data.columns === 'object') {
        const rundownColumns = rundownResult.data.columns as Record<string, any>;
        overrides = rundownColumns.columnNameOverrides || {};
        setColumnNameOverrides(overrides);
      }

      // Check if we have saved user preferences
      if (!error && data?.column_layout) {
        // User has saved preferences - use them
        const loadedColumns = Array.isArray(data.column_layout) ? data.column_layout : defaultColumns;
        
        // Normalize any missing fields to prevent dropped columns
        const normalized = normalizeColumns(loadedColumns);
        
        // Check if there are new default columns that should be auto-shown
        const savedKeys = new Set(normalized.map(c => c.key));
        const missingDefaults = defaultColumns.filter(dc => !savedKeys.has(dc.key));
        
        if (missingDefaults.length > 0) {
          console.log(`✨ Found ${missingDefaults.length} new default columns, adding them:`, missingDefaults.map(c => c.name));
          debugLogger.preferences('Auto-adding new default columns: ' + missingDefaults.map(c => c.name).join(', '));
          
          // Insert new defaults at their proper position in the default order
          missingDefaults.forEach(newCol => {
            const defaultIndex = defaultColumns.findIndex(dc => dc.key === newCol.key);
            // Find the correct position to insert based on default order
            let insertIndex = 0;
            for (let i = 0; i < normalized.length; i++) {
              const currentColDefaultIndex = defaultColumns.findIndex(dc => dc.key === normalized[i].key);
              if (currentColDefaultIndex !== -1 && currentColDefaultIndex < defaultIndex) {
                insertIndex = i + 1;
              }
            }
            normalized.splice(insertIndex, 0, { ...newCol, isVisible: true });
          });
        }
        
        const mergedColumns = mergeColumnsWithTeamColumns(normalized, overrides);
        setColumns(mergedColumns);
        debugLogger.preferences('Loaded saved preferences - total columns: ' + mergedColumns.length);
      } else {
        // No saved preferences (either no data or error like RLS 406)
        // Log the reason for using defaults
        if (error) {
          if (error.code === 'PGRST116') {
            console.log('ℹ️ No saved preferences found for user');
          } else {
            console.log('ℹ️ Error loading preferences (likely RLS):', error.message);
          }
        }
        
        // Try to load team default layout
        let initialColumns = defaultColumns;
        
        if (team?.id) {
          try {
            const { data: defaultLayoutData } = await supabase
              .rpc('get_team_default_layout', { team_uuid: team.id })
              .maybeSingle();
            
            const layoutData = defaultLayoutData as Record<string, any> | null;
            
            if (layoutData?.columns && Array.isArray(layoutData.columns)) {
              console.log('✅ Using team default layout:', layoutData.name || 'Unknown');
              debugLogger.preferences('Using team default layout: ' + (layoutData.name || 'Unknown'));
              initialColumns = normalizeColumns(layoutData.columns);
              
              // Check if team default is missing new default columns
              const teamLayoutKeys = new Set(initialColumns.map(c => c.key));
              const missingDefaults = defaultColumns.filter(dc => !teamLayoutKeys.has(dc.key));
              
              if (missingDefaults.length > 0) {
                console.log(`✨ Team default layout is missing ${missingDefaults.length} new columns, adding them:`, missingDefaults.map(c => c.name));
                
                // Insert new defaults at their proper position
                missingDefaults.forEach(newCol => {
                  const defaultIndex = defaultColumns.findIndex(dc => dc.key === newCol.key);
                  let insertIndex = 0;
                  for (let i = 0; i < initialColumns.length; i++) {
                    const currentColDefaultIndex = defaultColumns.findIndex(dc => dc.key === initialColumns[i].key);
                    if (currentColDefaultIndex !== -1 && currentColDefaultIndex < defaultIndex) {
                      insertIndex = i + 1;
                    }
                  }
                  initialColumns.splice(insertIndex, 0, { ...newCol, isVisible: true });
                });
              }
            }
          } catch (error) {
            console.log('ℹ️ No team default layout found, using hardcoded defaults');
          }
        }
        
        const mergedDefaults = mergeColumnsWithTeamColumns(initialColumns, overrides);
        setColumns(mergedDefaults);
        debugLogger.preferences('No saved preferences - using defaults/team default');
      }
    } catch (error) {
      console.error('Failed to load column preferences:', error);
      const mergedDefaults = mergeColumnsWithTeamColumns(defaultColumns, columnNameOverrides);
      setColumns(mergedDefaults);
    } finally {
      // CRITICAL: Set flag BEFORE clearing loading to prevent race condition
      setHasInitialLoad(true);
      setIsLoading(false);
      console.log('⏱️ [COLUMNS] loadColumnPreferences COMPLETE');
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

    const merged = mergeColumnsWithTeamColumns(newColumns, columnNameOverrides);
    setColumns(merged);
    console.log('📊 Columns updated via updateColumns - auto-saving');
    saveColumnPreferences(merged);
  }, [columns, saveColumnPreferences, addTeamColumn, team?.id, user?.id, mergeColumnsWithTeamColumns, isLoading, hasInitialLoad, columnNameOverrides]);

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
    
    const mergedLayout = mergeColumnsWithTeamColumns(layoutColumns, columnNameOverrides);
    setColumns(mergedLayout);
    // Don't save - this is just a preview
  }, [isLoading, mergeColumnsWithTeamColumns, columnNameOverrides]);

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
    const newMerged = mergeColumnsWithTeamColumns(columns, columnNameOverrides);
    const newColumnKeys = newMerged.map(c => c.key).sort().join(',');
    
    if (currentColumnKeys !== newColumnKeys) {
      setColumns(newMerged);
    }
  }, [isLoading, teamColumnsLoading, teamColumns.length, hasInitialLoad, columnNameOverrides]);

  // Keep refs updated for stable subscription access
  useEffect(() => {
    columnsRef.current = columns;
    columnNameOverridesRef.current = columnNameOverrides;
    mergeColumnsWithTeamColumnsRef.current = mergeColumnsWithTeamColumns;
  }, [columns, columnNameOverrides, mergeColumnsWithTeamColumns]);

  // Subscribe to rundowns.columns changes for real-time column name updates (built-in columns)
  // Uses refs to access current values without causing subscription teardown
  useEffect(() => {
    if (!rundownId) return;

    const channel = supabase
      .channel(`rundown-columns-${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${rundownId}`
        },
        (payload) => {
          const newColumns = payload.new?.columns as Record<string, any> | undefined;
          if (newColumns?.columnNameOverrides) {
            const newOverrides = newColumns.columnNameOverrides as Record<string, string>;
            // Only update if overrides actually changed (compare against ref for current value)
            if (JSON.stringify(newOverrides) !== JSON.stringify(columnNameOverridesRef.current)) {
              console.log('📊 Received column name update from other user:', newOverrides);
              setColumnNameOverrides(newOverrides);
              // Re-merge columns with new overrides using refs
              const merged = mergeColumnsWithTeamColumnsRef.current(columnsRef.current, newOverrides);
              setColumns(merged);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rundownId]); // Only rundownId - stable dependency!

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
    reloadPreferences: loadColumnPreferences,
    renameTeamColumn // Expose team-wide column rename
  };
};