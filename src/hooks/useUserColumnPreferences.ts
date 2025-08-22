
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
        // Add team columns as hidden by default - users must explicitly enable them
        mergedColumns.push({
          id: teamCol.column_key,
          name: teamCol.column_name,
          key: teamCol.column_key,
          width: '150px',
          isCustom: true,
          isEditable: true,
          isVisible: false, // Hidden by default for new team columns
          isTeamColumn: true,
          createdBy: teamCol.created_by
        } as Column & { isTeamColumn?: boolean; createdBy?: string });
      }
    });

    // Ensure existing team columns retain their team metadata
    const finalColumns = mergedColumns.map(col => {
      const teamColumn = teamColumns.find(tc => tc.column_key === col.key);
      if (teamColumn && col.isCustom) {
        return {
          ...col,
          isTeamColumn: true,
          createdBy: teamColumn.created_by
        };
      }
      return col;
    });

    return finalColumns;
  }, [teamColumns]);

  // Load user's column preferences for this rundown
  const loadColumnPreferences = useCallback(async () => {
    if (!user?.id || !rundownId || isLoadingRef.current) {
      const mergedDefaults = mergeColumnsWithTeamColumns(defaultColumns);
      setColumns(mergedDefaults);
      setIsLoading(false);
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
        const mergedDefaults = mergeColumnsWithTeamColumns(defaultColumns);
        setColumns(mergedDefaults);
      } else if (data?.column_layout) {
        const loadedColumns = Array.isArray(data.column_layout) ? data.column_layout : defaultColumns;
        
        // Ensure all default columns are present and fix any potential mismatches
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
        
        // Ensure all default columns are present by merging with defaults
        const userColumnKeys = new Set(fixedColumns.map(col => col.key));
        const missingDefaultColumns = defaultColumns.filter(defaultCol => 
          !userColumnKeys.has(defaultCol.key)
        );
        
        // Add missing default columns at the end
        const columnsWithDefaults = [...fixedColumns, ...missingDefaultColumns];
        
        // Merge with team columns, preserving user's visibility preferences for team columns
        const mergedColumns = mergeColumnsWithTeamColumns(columnsWithDefaults);
        
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

    // Save personal columns + user's preferences for team columns (visibility, width, position)
    // We need to save team columns with their user preferences, including team metadata for restoration
    const personalColumns = columnsToSave.map(col => {
      if (col.isCustom && (col as any).isTeamColumn) {
        // For team columns, save user's preferences AND preserve team metadata
        return col;
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
    console.log('🔄 UserColumnPreferences: useEffect triggered', { 
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

  // Apply layout while preserving all available columns (defaults + team customs + user customs)
  const applyLayout = useCallback((layoutColumns: Column[]) => {
    console.log('🔄 UserColumnPreferences: Applying layout with', layoutColumns.length, 'columns');
    
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
    
    console.log('✅ Layout applied - total columns:', finalColumns.length, 
      'visible:', finalColumns.filter(c => c.isVisible).length);
    
    setColumns(finalColumns);
    
    // Save the layout application
    if (!isLoadingRef.current) {
      saveColumnPreferences(finalColumns, true);
    }
  }, [columns, teamColumns, saveColumnPreferences]);

  return {
    columns,
    setColumns: updateColumns,
    updateColumnWidth,
    applyLayout,
    isLoading,
    isSaving,
    reloadPreferences: loadColumnPreferences
  };
};
