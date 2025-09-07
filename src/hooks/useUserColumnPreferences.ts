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
  const { teamColumns, loading: teamColumnsLoading, addTeamColumn } = useTeamCustomColumns();
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Merge columns with team columns to ensure completeness
  const mergeColumnsWithTeamColumns = useCallback((userColumns: Column[]) => {
    const allAvailableColumns = [...defaultColumns];
    
    // Build a map of user's existing column preferences
    const userColumnMap = new Map<string, Column>();
    userColumns.forEach(col => {
      userColumnMap.set(col.key, col);
    });
    
    // Add ALL team columns to the available set
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
        // New team column - add with default visibility
        allAvailableColumns.push({
          id: teamCol.column_key,
          name: teamCol.column_name,
          key: teamCol.column_key,
          width: '150px',
          isCustom: true,
          isEditable: true,
          isVisible: false, // Start team columns as hidden
          isTeamColumn: true,
          createdBy: teamCol.created_by
        } as Column & { isTeamColumn?: boolean; createdBy?: string });
      }
    });
    
    // Add any user's personal custom columns that aren't team columns
    userColumns.forEach(col => {
      if (col.isCustom && !(col as any).isTeamColumn && !teamColumns.some(tc => tc.column_key === col.key)) {
        const exists = allAvailableColumns.some(existingCol => existingCol.key === col.key);
        if (!exists) {
          allAvailableColumns.push(col);
        }
      }
    });
    
    // Apply user's column order preferences while maintaining all columns
    const orderedColumns = [];
    const usedKeys = new Set<string>();
    
    // First, add columns in user's preferred order
    userColumns.forEach(userCol => {
      const matchingCol = allAvailableColumns.find(col => col.key === userCol.key);
      if (matchingCol && !usedKeys.has(userCol.key)) {
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

  // Auto-save any column changes
  const saveColumnPreferences = useCallback(async (columnsToSave: Column[]) => {
    if (!user?.id || !rundownId || isLoading) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce saves slightly to avoid excessive database calls during rapid changes
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
          debugLogger.preferences('Auto-saved ' + columnsToSave.length + ' columns');
        }
      } catch (error) {
        console.error('Failed to save column preferences:', error);
      } finally {
        setIsSaving(false);
      }
    }, 500);
  }, [user?.id, rundownId, isLoading]);

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
        
        // Clean and validate loaded columns
        const cleanColumns = loadedColumns.filter(col => col && col.id && col.key && col.name);
        const mergedColumns = mergeColumnsWithTeamColumns(cleanColumns);
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
    }
  }, [user?.id, rundownId, team?.id, teamColumnsLoading, mergeColumnsWithTeamColumns]);

  // Update columns and auto-save
  const updateColumns = useCallback(async (newColumns: Column[]) => {
    // CRITICAL: Don't auto-save during initial load
    if (isLoading) {
      console.log('📊 Column update blocked - still loading');
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
  }, [columns, saveColumnPreferences, addTeamColumn, team?.id, user?.id, mergeColumnsWithTeamColumns, isLoading]);

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
    
    const layoutColumnMap = new Map<string, Column>();
    layoutColumns.forEach(col => {
      layoutColumnMap.set(col.key, col);
    });
    
    // Start with the saved layout columns exactly as they were
    const appliedColumns: Column[] = [...layoutColumns];
    
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
    
    setColumns(appliedColumns);
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

  // Load preferences when rundown changes
  useEffect(() => {
    loadColumnPreferences();
  }, [rundownId, user?.id, loadColumnPreferences]);

  // Update columns when team columns change - but not during initial load
  useEffect(() => {
    // CRITICAL: Skip team column merging during initial load to prevent autosave triggers
    if (isLoading || teamColumns.length === 0) {
      console.log('📊 Skipping team column merge - still loading or no team columns');
      return;
    }
    
    setColumns(prevColumns => {
      const merged = mergeColumnsWithTeamColumns(prevColumns);
      
      // Check if there are actually new team columns
      const prevTeamColumnKeys = new Set(
        prevColumns.filter(c => (c as any).isTeamColumn).map(c => c.key)
      );
      const newTeamColumnKeys = new Set(
        merged.filter(c => (c as any).isTeamColumn).map(c => c.key)
      );
      
      const hasNewTeamColumns = Array.from(newTeamColumnKeys).some(key => !prevTeamColumnKeys.has(key));
      
      if (hasNewTeamColumns) {
        // Auto-save when new team columns are added - but only after initial load
        console.log('📊 New team columns detected post-load - auto-saving');
        saveColumnPreferences(merged);
        debugLogger.preferences('New team columns detected - auto-saving');
        return merged;
      }
      
      // Avoid unnecessary re-renders if nothing actually changed
      return prevColumns;
    });
  }, [teamColumns, isLoading, mergeColumnsWithTeamColumns, saveColumnPreferences]);

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
    applyLayout,
    previewLayout,
    isLoading,
    isSaving,
    reloadPreferences: loadColumnPreferences
  };
};