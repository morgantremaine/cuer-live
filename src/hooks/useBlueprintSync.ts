import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkStatus } from './useNetworkStatus';
import { useOfflineQueue } from './useOfflineQueue';
import { logger } from '@/utils/logger';

interface BlueprintState {
  lists: any[];
  showDate: string;
  notes: string;
  cameraPlots: any[];
  componentOrder: string[];
}

interface SyncResult {
  success: boolean;
  hadConflicts: boolean;
  mergedData?: Partial<BlueprintState>;
}

export const useBlueprintSync = (
  rundownId: string | null,
  currentState: BlueprintState,
  onStateUpdate: (newState: Partial<BlueprintState>) => void,
  onConflictResolved?: (mergedData: any) => void
) => {
  const { isConnected, connectionType } = useNetworkStatus();
  const {
    queueOperation,
    processQueue,
    recordOfflineChange,
    getOfflineChanges,
    markChangesApplied,
    hasOfflineChanges
  } = useOfflineQueue(rundownId);

  const lastSyncTimeRef = useRef<string | null>(null);
  const syncInProgressRef = useRef(false);

  // Fetch latest blueprint data from server
  const fetchLatestData = useCallback(async (): Promise<any | null> => {
    if (!rundownId || !isConnected) return null;

    try {
      const { data, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('rundown_id', rundownId)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch latest blueprint data:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching latest blueprint data:', error);
      return null;
    }
  }, [rundownId, isConnected]);

  // Detect conflicts in blueprint data
  const detectConflicts = useCallback((localState: BlueprintState, remoteData: any): string[] => {
    const conflicts: string[] = [];

    // Check for conflicts in lists
    if (remoteData.lists && localState.lists) {
      const remoteListsString = JSON.stringify(remoteData.lists);
      const localListsString = JSON.stringify(localState.lists);
      if (remoteListsString !== localListsString) {
        conflicts.push('lists');
      }
    }

    // Check for conflicts in notes
    if (remoteData.notes !== localState.notes) {
      conflicts.push('notes');
    }

    // Check for conflicts in show date
    if (remoteData.show_date !== localState.showDate) {
      conflicts.push('showDate');
    }

    // Check for conflicts in component order
    if (remoteData.component_order && localState.componentOrder) {
      const remoteOrderString = JSON.stringify(remoteData.component_order);
      const localOrderString = JSON.stringify(localState.componentOrder);
      if (remoteOrderString !== localOrderString) {
        conflicts.push('componentOrder');
      }
    }

    return conflicts;
  }, []);

  // Resolve conflicts using operational transformation
  const resolveConflicts = useCallback((localState: BlueprintState, remoteData: any): SyncResult => {
    const conflicts = detectConflicts(localState, remoteData);
    
    if (conflicts.length === 0) {
      return { success: true, hadConflicts: false };
    }

    console.log('🔄 Resolving blueprint conflicts:', conflicts);
    
    const mergedData: Partial<BlueprintState> = {};
    
    // Get offline changes to determine priority
    const offlineChanges = getOfflineChanges();
    
    conflicts.forEach(field => {
      const hasLocalChanges = offlineChanges.some(change => change.field?.startsWith(field));
      
      switch (field) {
        case 'lists':
          // For lists, prefer local changes if they exist, otherwise use remote
          mergedData.lists = hasLocalChanges ? localState.lists : remoteData.lists;
          break;
          
        case 'notes':
          // For notes, prefer recent local changes
          mergedData.notes = hasLocalChanges ? localState.notes : remoteData.notes;
          break;
          
        case 'showDate':
          // For show date, prefer non-empty values
          mergedData.showDate = localState.showDate || remoteData.show_date || '';
          break;
          
        case 'componentOrder':
          // For component order, prefer local changes
          mergedData.componentOrder = hasLocalChanges ? localState.componentOrder : remoteData.component_order;
          break;
      }
    });

    return {
      success: true,
      hadConflicts: true,
      mergedData
    };
  }, [detectConflicts, getOfflineChanges]);

  // Save blueprint data to server
  const saveToServer = useCallback(async (stateToSave?: BlueprintState): Promise<boolean> => {
    const saveState = stateToSave || currentState;
    
    if (!rundownId) {
      // Queue for offline processing
      queueOperation('create', {
        lists: saveState.lists,
        show_date: saveState.showDate,
        notes: saveState.notes,
        camera_plots: saveState.cameraPlots,
        component_order: saveState.componentOrder
      });
      return true;
    }

    if (!isConnected) {
      // Queue for offline processing
      queueOperation('save', {
        lists: saveState.lists,
        show_date: saveState.showDate,
        notes: saveState.notes,
        camera_plots: saveState.cameraPlots,
        component_order: saveState.componentOrder
      });
      return true;
    }

    try {
      // Get current user and team info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Get rundown team_id
      const { data: rundownData } = await supabase
        .from('rundowns')
        .select('team_id')
        .eq('id', rundownId)
        .single();

      if (!rundownData?.team_id) return false;

      // Check if blueprint exists
      const { data: existingBlueprint } = await supabase
        .from('blueprints')
        .select('id')
        .eq('rundown_id', rundownId)
        .eq('team_id', rundownData.team_id)
        .maybeSingle();

      const blueprintData = {
        rundown_id: rundownId,
        user_id: user.id,
        team_id: rundownData.team_id,
        lists: saveState.lists,
        show_date: saveState.showDate || null,
        notes: saveState.notes || null,
        camera_plots: saveState.cameraPlots,
        component_order: saveState.componentOrder,
        updated_at: new Date().toISOString()
      };

      if (existingBlueprint) {
        const { error } = await supabase
          .from('blueprints')
          .update(blueprintData)
          .eq('id', existingBlueprint.id);

        if (error) {
          console.error('❌ Blueprint save failed:', error);
          return false;
        }
      } else {
        const { error } = await supabase
          .from('blueprints')
          .insert(blueprintData);

        if (error) {
          console.error('❌ Blueprint save failed:', error);
          return false;
        }
      }

      // Mark offline changes as applied
      markChangesApplied([]);
      lastSyncTimeRef.current = new Date().toISOString();
      
      console.log('✅ Blueprint saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Blueprint save error:', error);
      return false;
    }
  }, [rundownId, currentState, isConnected, queueOperation, markChangesApplied]);

  // Sync with server (fetch and resolve conflicts)
  const syncWithServer = useCallback(async (forceSync = false): Promise<SyncResult> => {
    if (syncInProgressRef.current && !forceSync) {
      return { success: false, hadConflicts: false };
    }

    if (!rundownId || !isConnected) {
      return { success: false, hadConflicts: false };
    }

    syncInProgressRef.current = true;

    try {
      const latestData = await fetchLatestData();
      
      if (!latestData) {
        return { success: false, hadConflicts: false };
      }

      // Convert server data format to local state format
      const serverState: BlueprintState = {
        lists: latestData.lists || [],
        showDate: latestData.show_date || '',
        notes: latestData.notes || '',
        cameraPlots: latestData.camera_plots || [],
        componentOrder: latestData.component_order || []
      };

      const result = resolveConflicts(currentState, latestData);
      
      if (result.hadConflicts && result.mergedData) {
        console.log('🔀 Applying merged blueprint data');
        onStateUpdate(result.mergedData);
        onConflictResolved?.(result.mergedData);
      } else if (!result.hadConflicts) {
        // No conflicts, apply server state if different
        const hasChanges = JSON.stringify(serverState) !== JSON.stringify(currentState);
        if (hasChanges) {
          onStateUpdate(serverState);
        }
      }

      lastSyncTimeRef.current = new Date().toISOString();
      return result;
    } catch (error) {
      console.error('❌ Blueprint sync error:', error);
      return { success: false, hadConflicts: false };
    } finally {
      syncInProgressRef.current = false;
    }
  }, [rundownId, isConnected, currentState, fetchLatestData, resolveConflicts, onStateUpdate, onConflictResolved]);

  // Track offline changes for conflict resolution
  const trackOfflineChange = useCallback((field: string, value: any) => {
    recordOfflineChange(field, value);
  }, [recordOfflineChange]);

  // Force focus check for tab visibility changes
  const forceFocusCheck = useCallback(async () => {
    if (isConnected) {
      console.log('👁️ Blueprint focus check - syncing with server');
      await syncWithServer(true);
    }
  }, [isConnected, syncWithServer]);

  // Auto-process queue when connection is restored
  useEffect(() => {
    if (isConnected && hasOfflineChanges) {
      console.log('🔄 Blueprint connection restored - processing offline queue');
      processQueue();
    }
  }, [isConnected, hasOfflineChanges, processQueue]);

  return {
    syncWithServer,
    saveToServer,
    trackOfflineChange,
    forceFocusCheck,
    isConnected,
    connectionType,
    hasOfflineChanges,
    isSyncing: syncInProgressRef.current
  };
};