
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { useTeamCustomColumns } from '@/hooks/useTeamCustomColumns';
import { Column } from './useColumnsManager';
import { debugLogger } from '@/utils/debugLogger';

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
  const isFirstTimeViewRef = useRef<boolean>(false);

  // Create comprehensive column merge that ALWAYS includes all available columns
  const mergeColumnsWithTeamColumns = useCallback((userColumns: Column[], isFirstTimeLoad = false) => {
    // Start with a clean foundation - all default columns
    const allAvailableColumns = [...defaultColumns];
    
    // Build a map of user's existing column preferences
    const userColumnMap = new Map<string, Column>();
    userColumns.forEach(col => {
      userColumnMap.set(col.key, col);
    });
    
    // Add ALL team columns to the available set (always present in column manager)
    teamColumns.forEach(teamCol => {
      const existingUserPref = userColumnMap.get(teamCol.column_key);
      if (existingUserPref) {
        // User has preferences for this team column - use their settings
        allAvailableColumns.push({
          ...existingUserPref,
          isTeamColumn: true,
          createdBy: teamCol.created_by,
          name: teamCol.column_name // Always use latest team column name
        } as Column & { isTeamColumn?: boolean; createdBy?: string });
      } else {
        // New team column - add with default visibility based on context
        allAvailableColumns.push({
          id: teamCol.column_key,
          name: teamCol.column_name,
          key: teamCol.column_key,
          width: '150px',
          isCustom: true,
          isEditable: true,
          isVisible: false, // Always start team columns as hidden to prevent layout jumping
          isTeamColumn: true,
          createdBy: teamCol.created_by
        } as Column & { isTeamColumn?: boolean; createdBy?: string });
      }
    });
    
    // Add any user's personal custom columns that aren't team columns
    userColumns.forEach(col => {
      if (col.isCustom && !(col as any).isTeamColumn && !teamColumns.some(tc => tc.column_key === col.key)) {
        // Check if we already have this column (prevent duplicates)
        const exists = allAvailableColumns.some(existingCol => existingCol.key === col.key);
        if (!exists) {
          allAvailableColumns.push(col);
        }
      }
    });
    
    // Now apply user's column order preferences while maintaining all columns
    const orderedColumns = [];
    const usedKeys = new Set<string>();
    
    // First, add columns in user's preferred order (if they have preferences)
    userColumns.forEach(userCol => {
      const matchingCol = allAvailableColumns.find(col => col.key === userCol.key);
      if (matchingCol && !usedKeys.has(userCol.key)) {
        // Apply user's preferences to the comprehensive column
        orderedColumns.push({
          ...matchingCol,
          ...userCol, // User preferences override
          isTeamColumn: (matchingCol as any).isTeamColumn, // Preserve team flag
          createdBy: (matchingCol as any).createdBy // Preserve creator info
        });
        usedKeys.add(userCol.key);
      }
    });
    
    // Then add any remaining columns that user hasn't configured yet
    allAvailableColumns.forEach(col => {
      if (!usedKeys.has(col.key)) {
        orderedColumns.push(col);
        usedKeys.add(col.key);
      }
    });

    return orderedColumns;
  }, [teamColumns]);

  // Load user's column preferences for this rundown
  const loadColumnPreferences = useCallback(async () => {
    if (!user?.id || !rundownId || isLoadingRef.current) {
      const mergedDefaults = mergeColumnsWithTeamColumns(defaultColumns, true);
      setColumns(mergedDefaults);
      setIsLoading(false);
      isFirstTimeViewRef.current = true; // Mark as first time view for new rundowns
      if (!rundownId) {
        loadedRundownRef.current = 'new_rundown_loaded';
      }
      return;
    }

    // Mark loading state
    isLoadingRef.current = true;

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
        const mergedDefaults = mergeColumnsWithTeamColumns(defaultColumns, true);
        setColumns(mergedDefaults);
      } else if (data?.column_layout) {
        const loadedColumns = Array.isArray(data.column_layout) ? data.column_layout : defaultColumns;
        
        // Clean and validate loaded columns
        const cleanColumns = loadedColumns.map(col => {
          // Fix any legacy naming issues
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
        }).filter(col => {
          // Remove any corrupted or invalid columns
          return col && col.id && col.key && col.name;
        });
        
        // Apply comprehensive merge to ensure ALL columns are available
        const mergedColumns = mergeColumnsWithTeamColumns(cleanColumns);
        
        setColumns(mergedColumns);
        lastSavedRef.current = JSON.stringify(cleanColumns);
        debugLogger.preferences('Loaded saved preferences with ' + mergedColumns.length + ' total columns');
      } else {
        // First time loading - create a clean slate with all defaults visible
        const mergedDefaults = mergeColumnsWithTeamColumns(defaultColumns, true);
        setColumns(mergedDefaults);
        lastSavedRef.current = JSON.stringify(defaultColumns);
        isFirstTimeViewRef.current = true;
        debugLogger.preferences('No saved preferences - using defaults with ' + mergedDefaults.length + ' columns');
      }
    } catch (error) {
      console.error('Failed to load column preferences:', error);
      const mergedDefaults = mergeColumnsWithTeamColumns(defaultColumns, true);
      setColumns(mergedDefaults);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
      if (rundownId) {
        loadedRundownRef.current = rundownId;
      }
    }
  }, [user?.id, rundownId, mergeColumnsWithTeamColumns]);

  // Save column preferences with proper debouncing
  const saveColumnPreferences = useCallback(async (columnsToSave: Column[], isImmediate = false) => {
    if (!user?.id || !rundownId) {
      return;
    }

    // Only save columns that have user-specific settings (order, visibility, width)
    // But include ALL columns so we maintain the complete layout state
    const columnsToSaveFiltered = columnsToSave.filter(col => {
      // Keep all columns for complete state preservation
      return true;
    });

    const currentSignature = JSON.stringify(columnsToSaveFiltered);
    if (currentSignature === lastSavedRef.current) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (isImmediate) {
      // Bypass debounce for structural changes (e.g., applying a saved layout)
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from('user_column_preferences')
          .upsert({
            user_id: user.id,
            rundown_id: rundownId,
            column_layout: columnsToSaveFiltered
          }, {
            onConflict: 'user_id,rundown_id'
          });

        if (error) {
          console.error('Error saving column preferences (immediate):', error);
          debugLogger.preferences('Immediate save error: ' + error.message);
        } else {
          lastSavedRef.current = currentSignature;
          debugLogger.preferences('Immediate save of ' + columnsToSaveFiltered.length + ' columns to preferences');
        }
      } catch (error) {
        console.error('Failed to save column preferences (immediate):', error);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Use shorter debounce for resize operations, immediate for structural changes
    const saveDelay = 800;

    // Debounce the save
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from('user_column_preferences')
          .upsert({
            user_id: user.id,
            rundown_id: rundownId,
            column_layout: columnsToSaveFiltered
          }, {
            onConflict: 'user_id,rundown_id'
          });

        if (error) {
          console.error('Error saving column preferences:', error);
          debugLogger.preferences('Save error: ' + error.message);
        } else {
          lastSavedRef.current = currentSignature;
          debugLogger.preferences('Saved ' + columnsToSaveFiltered.length + ' columns to preferences');
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

    // Note: We no longer automatically delete team columns to prevent accidental removal
    // Team columns should only be deleted through explicit team management actions
    console.log('🔧 Prevented automatic deletion of team columns:', deletedTeamColumns.map(c => c.name));

    const merged = mergeColumnsWithTeamColumns(newColumns);
    setColumns(merged);
    // Only save if we're not currently loading
    if (!isLoadingRef.current) {
      saveColumnPreferences(merged, isImmediate);
    }
  }, [columns, saveColumnPreferences, addTeamColumn, deleteTeamColumn, team?.id, user?.id, mergeColumnsWithTeamColumns]);

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
    debugLogger.preferences('useEffect triggered', { 
      rundownId, 
      loadedRundownRefCurrent: loadedRundownRef.current,
      userId: user?.id 
    });
    
    if (rundownId) {
      if (rundownId !== loadedRundownRef.current) {
        setIsLoading(true);
        loadColumnPreferences();
      }
    } else {
      // Handle new rundowns (rundownId is null)
      if (loadedRundownRef.current !== 'new_rundown_loaded') {
        setIsLoading(true);
        loadColumnPreferences();
      }
    }
  }, [rundownId, user?.id, loadColumnPreferences]);

  // Update columns when team columns change - ensuring all team columns are always available
  useEffect(() => {
    if (!isLoadingRef.current && teamColumns.length > 0 && loadedRundownRef.current) {
      setColumns(prevColumns => {
        // Always refresh the complete column set to include new team columns
        const merged = mergeColumnsWithTeamColumns(prevColumns, false);
        
        // Only save if there are actual changes to prevent unnecessary saves
        const prevKeys = new Set(prevColumns.map(c => c.key));
        const newKeys = new Set(merged.map(c => c.key));
        const hasNewColumns = merged.some(c => !prevKeys.has(c.key)) || prevColumns.some(c => !newKeys.has(c.key));
        
        if (hasNewColumns && !isLoadingRef.current) {
          debugLogger.preferences('Team columns updated - refreshing available columns');
          saveColumnPreferences(merged, true);
        }
        
        return merged;
      });
    }
  }, [teamColumns, mergeColumnsWithTeamColumns, saveColumnPreferences]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Apply layout while preserving all available columns (defaults + team customs + user customs)
  const applyLayout = useCallback((layoutColumns: Column[], shouldPersist = true) => {
    debugLogger.preferences('Applying layout with ' + layoutColumns.length + ' columns (persist: ' + shouldPersist + ')');
    
    // Create master list of all available columns (defaults + team + existing user columns)
    const masterColumns = [...defaultColumns];
    
    // Add all team custom columns to master list
    teamColumns.forEach(teamCol => {
      const existsInMaster = masterColumns.some(col => col.key === teamCol.column_key);
      if (!existsInMaster) {
        masterColumns.push({
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
    
    // Add any existing user custom columns not in team columns
    columns.forEach(col => {
      if (col.isCustom && !(col as any).isTeamColumn) {
        const existsInMaster = masterColumns.some(masterCol => masterCol.key === col.key);
        if (!existsInMaster) {
          masterColumns.push(col);
        }
      }
    });
    
    // Create a map of layout column preferences with sort order
    const layoutColumnMap = new Map<string, Column & { sortOrder: number }>();
    layoutColumns.forEach((col, index) => {
      layoutColumnMap.set(col.key, { ...col, sortOrder: index });
    });
    
    // Apply layout preferences to master columns
    const appliedColumns = masterColumns.map(masterCol => {
      const layoutCol = layoutColumnMap.get(masterCol.key);
      if (layoutCol) {
        // Column exists in layout - use layout preferences but preserve master column metadata
        const { sortOrder, ...layoutColWithoutSort } = layoutCol;
        return {
          ...masterCol, // Preserve original metadata (isCustom, isTeamColumn, etc.)
          ...layoutColWithoutSort, // Apply layout preferences (visibility, width, etc.)
          isCustom: masterCol.isCustom, // Ensure we don't lose custom flag
          isTeamColumn: (masterCol as any).isTeamColumn, // Preserve team flag
          createdBy: (masterCol as any).createdBy, // Preserve creator info
          sortOrder // Add sort order for sorting
        };
      } else {
        // Column not in layout - keep it but mark as hidden
        return {
          ...masterCol,
          isVisible: false,
          sortOrder: 9999 // Put non-layout columns at the end
        };
      }
    });
    
    // Sort by layout order first, then by original order for non-layout columns
    appliedColumns.sort((a, b) => {
      const aOrder = (a as any).sortOrder ?? 9999;
      const bOrder = (b as any).sortOrder ?? 9999;
      return aOrder - bOrder;
    });
    
    // Remove sortOrder property and return clean columns
    const finalColumns = appliedColumns.map(col => {
      const { sortOrder, ...cleanCol } = col as any;
      return cleanCol as Column;
    });
    
    debugLogger.preferences('Layout applied - total columns: ' + finalColumns.length + 
      ', visible: ' + finalColumns.filter(c => c.isVisible).length);
    
    setColumns(finalColumns);
    
    // Only save if shouldPersist is true (prevents saved layouts from overwriting user prefs)
    if (shouldPersist && !isLoadingRef.current) {
      saveColumnPreferences(finalColumns, true);
    }
  }, [columns, teamColumns, saveColumnPreferences]);

  // Temporary layout preview (doesn't save to user preferences)
  const previewLayout = useCallback((layoutColumns: Column[]) => {
    applyLayout(layoutColumns, false); // Don't persist - just preview
  }, [applyLayout]);

  return {
    columns,
    setColumns: updateColumns,
    updateColumnWidth,
    applyLayout,
    previewLayout,
    isLoading,
    isSaving,
    reloadPreferences: loadColumnPreferences
  };
};
