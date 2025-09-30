import { useCallback, useRef, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownState } from './useRundownState';
import { useOfflineQueue } from './useOfflineQueue';
import { useNetworkStatus } from './useNetworkStatus';
import { detectDataConflict } from '@/utils/conflictDetection';
import { createContentSignature } from '@/utils/contentSignature';
import { useUnifiedSignatureValidation } from './useUnifiedSignatureValidation';

interface SyncState {
  lastSyncTimestamp: string | null;
  lastKnownDocVersion: number;
  isSyncing: boolean;
  hasUnresolvedConflicts: boolean;
  staleness: 'fresh' | 'stale' | 'unknown';
}

interface SyncResult {
  success: boolean;
  hadConflicts: boolean;
  mergedData?: any;
  conflictFields?: string[];
}

export const useEnhancedDataSync = (
  rundownId: string | null,
  currentState: RundownState,
  onStateUpdate: (newState: Partial<RundownState>) => void,
  onConflictResolved?: (mergedData: any) => void
) => {
  const { validateSignature, validateSignatureConsistency } = useUnifiedSignatureValidation();
  const [syncState, setSyncState] = useState<SyncState>({
    lastSyncTimestamp: null,
    lastKnownDocVersion: 0,
    isSyncing: false,
    hasUnresolvedConflicts: false,
    staleness: 'unknown'
  });

  const { isConnected, connectionType } = useNetworkStatus();
  const {
    queueOperation,
    processQueue,
    recordOfflineChange,
    getOfflineChanges,
    markChangesApplied,
    hasOfflineChanges
  } = useOfflineQueue(rundownId);

  const lastFocusCheckRef = useRef<number>(0);
  const syncInProgressRef = useRef(false);
  const conflictResolutionRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch latest data from server
  const fetchLatestData = useCallback(async (): Promise<any | null> => {
    if (!rundownId || !isConnected) return null;

    try {
      const { data, error } = await supabase
        .from('rundowns')
        .select('*')
        .eq('id', rundownId)
        .single();

      if (error) {
        console.error('Failed to fetch latest data:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching latest data:', error);
      return null;
    }
  }, [rundownId, isConnected]);

  // Detect if local state is stale
  const checkStaleness = useCallback(async (): Promise<'fresh' | 'stale' | 'unknown'> => {
    if (!rundownId || !isConnected) return 'unknown';

    const latestData = await fetchLatestData();
    if (!latestData) return 'unknown';

    // Compare timestamps
    if (syncState.lastSyncTimestamp && latestData.updated_at) {
      const localTime = new Date(syncState.lastSyncTimestamp).getTime();
      const serverTime = new Date(latestData.updated_at).getTime();
      
      if (serverTime > localTime) {
        return 'stale';
      }
    }

    // Compare doc versions
    if (latestData.doc_version > syncState.lastKnownDocVersion) {
      return 'stale';
    }

    return 'fresh';
  }, [rundownId, isConnected, fetchLatestData, syncState.lastSyncTimestamp, syncState.lastKnownDocVersion]);

  // Enhanced conflict resolution with operational transformation
  const resolveConflicts = useCallback((localState: RundownState, remoteData: any): SyncResult => {
    const conflictDetected = detectDataConflict(localState, remoteData);
    
    if (!conflictDetected) {
      return {
        success: true,
        hadConflicts: false,
        mergedData: remoteData
      };
    }

    console.log('🔀 Resolving data conflicts...');
    
    // Create signatures for validation
    const localSignature = createContentSignature({
      items: localState.items || [],
      title: localState.title || '',
      columns: [],
      timezone: localState.timezone || '',
      startTime: localState.startTime || '',
      showDate: localState.showDate || null,
      externalNotes: localState.externalNotes || ''
    });
    
    const remoteSignature = createContentSignature({
      items: remoteData.items || [],
      title: remoteData.title || '',
      columns: [],
      timezone: remoteData.timezone || '',
      startTime: remoteData.start_time || '',
      showDate: remoteData.show_date ? new Date(remoteData.show_date) : null,
      externalNotes: remoteData.external_notes || ''
    });

    // Get offline changes to preserve user edits
    const offlineChanges = getOfflineChanges();
    const conflictFields: string[] = [];

    // Merge strategy: Local changes take precedence for actively edited fields
    const mergedData = { ...remoteData };

    // Apply offline changes on top of remote data
    Object.entries(offlineChanges).forEach(([fieldKey, value]) => {
      const [itemId, fieldName] = fieldKey.split('-');
      
      if (fieldName && itemId) {
        // Find the item in merged data
        const itemIndex = mergedData.items?.findIndex((item: any) => item.id === itemId);
        if (itemIndex !== -1 && mergedData.items) {
          // Handle nested field access (e.g., customFields.fieldName)
          if (fieldName.includes('.')) {
            const [parentField, subField] = fieldName.split('.');
            if (!mergedData.items[itemIndex][parentField]) {
              mergedData.items[itemIndex][parentField] = {};
            }
            mergedData.items[itemIndex][parentField][subField] = value;
          } else {
            mergedData.items[itemIndex][fieldName] = value;
          }
          conflictFields.push(fieldKey);
        }
      } else {
        // Global field (title, startTime, etc.)
        if (fieldKey in localState) {
          (mergedData as any)[fieldKey] = value;
          conflictFields.push(fieldKey);
        }
      }
    });

    // Merge items that exist locally but not remotely (new items created offline)
    if (localState.items && remoteData.items) {
      const remoteItemIds = new Set(remoteData.items.map((item: any) => item.id));
      const newLocalItems = localState.items.filter(item => !remoteItemIds.has(item.id));
      
      if (newLocalItems.length > 0) {
        mergedData.items = [...mergedData.items, ...newLocalItems];
        console.log(`📝 Added ${newLocalItems.length} new local items to merged data`);
      }
    }

    // Validate merged data signature consistency
    const mergedSignature = createContentSignature({
      items: mergedData.items || [],
      title: mergedData.title || '',
      columns: [],
      timezone: mergedData.timezone || '',
      startTime: mergedData.start_time || '',
      showDate: mergedData.show_date ? new Date(mergedData.show_date) : null,
      externalNotes: mergedData.external_notes || ''
    });
    
    console.log('✅ Conflict resolution complete');

    return {
      success: true,
      hadConflicts: true,
      mergedData,
      conflictFields
    };
  }, [getOfflineChanges]);

  // Sync data with server
  const syncWithServer = useCallback(async (forceCheck = false): Promise<SyncResult> => {
    if (!rundownId || !isConnected || syncInProgressRef.current) {
      return { success: false, hadConflicts: false };
    }

    syncInProgressRef.current = true;
    setSyncState(prev => ({ ...prev, isSyncing: true }));

    try {
      console.log('🔄 Syncing with server...');

      // Check if we need to sync based on staleness
      if (!forceCheck) {
        const staleness = await checkStaleness();
        if (staleness === 'fresh') {
          console.log('✅ Data is fresh, no sync needed');
          return { success: true, hadConflicts: false };
        }
      }

      // Fetch latest server data
      const latestData = await fetchLatestData();
      if (!latestData) {
        return { success: false, hadConflicts: false };
      }

      // Resolve conflicts and merge data
      const syncResult = resolveConflicts(currentState, latestData);

      if (syncResult.success && syncResult.mergedData) {
        // Apply merged data to local state
        onStateUpdate({
          items: syncResult.mergedData.items || [],
          title: syncResult.mergedData.title || '',
          startTime: syncResult.mergedData.start_time || '',
          timezone: syncResult.mergedData.timezone || '',
          showDate: syncResult.mergedData.show_date ? new Date(syncResult.mergedData.show_date + 'T00:00:00') : null,
          externalNotes: syncResult.mergedData.external_notes || {}
        });

        // Update sync state
        setSyncState(prev => ({
          ...prev,
          lastSyncTimestamp: latestData.updated_at,
          lastKnownDocVersion: latestData.doc_version || 0,
          hasUnresolvedConflicts: false,
          staleness: 'fresh'
        }));

        // Mark offline changes as applied if conflicts were resolved
        if (syncResult.hadConflicts && syncResult.conflictFields) {
          markChangesApplied(syncResult.conflictFields);
        }

        // Notify parent component about conflict resolution
        if (syncResult.hadConflicts && onConflictResolved) {
          onConflictResolved(syncResult.mergedData);
        }

        console.log('✅ Sync completed successfully');
      }

      return syncResult;
    } catch (error) {
      console.error('❌ Sync failed:', error);
      return { success: false, hadConflicts: false };
    } finally {
      syncInProgressRef.current = false;
      setSyncState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [rundownId, isConnected, checkStaleness, fetchLatestData, resolveConflicts, currentState, onStateUpdate, markChangesApplied, onConflictResolved]);

  // Save current state to server
  const saveToServer = useCallback(async (stateToSave?: RundownState): Promise<boolean> => {
    const saveState = stateToSave || currentState;
    
    if (!rundownId) {
      // Queue for offline processing if creating new rundown
      queueOperation('create', {
        title: saveState.title,
        items: saveState.items,
        start_time: saveState.startTime,
        timezone: saveState.timezone,
        show_date: saveState.showDate ? `${saveState.showDate.getFullYear()}-${String(saveState.showDate.getMonth() + 1).padStart(2, '0')}-${String(saveState.showDate.getDate()).padStart(2, '0')}` : null,
        external_notes: saveState.externalNotes
      });
      return true;
    }

    if (!isConnected) {
      // Queue for offline processing
      queueOperation('save', {
        title: saveState.title,
        items: saveState.items,
        start_time: saveState.startTime,
        timezone: saveState.timezone,
        show_date: saveState.showDate ? `${saveState.showDate.getFullYear()}-${String(saveState.showDate.getMonth() + 1).padStart(2, '0')}-${String(saveState.showDate.getDate()).padStart(2, '0')}` : null,
        external_notes: saveState.externalNotes
      });
      return true;
    }

    try {
      // Skip sync-before-save to prevent infinite loops - just save current state
      const dataToSave = saveState;

      const { data, error } = await supabase
        .from('rundowns')
        .update({
          title: dataToSave.title,
          items: dataToSave.items,
          start_time: dataToSave.startTime,
          timezone: dataToSave.timezone,
          show_date: dataToSave.showDate ? `${dataToSave.showDate.getFullYear()}-${String(dataToSave.showDate.getMonth() + 1).padStart(2, '0')}-${String(dataToSave.showDate.getDate()).padStart(2, '0')}` : null,
          external_notes: dataToSave.externalNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', rundownId)
        .select()
        .single();

      if (error) {
        console.error('❌ Save failed:', error);
        return false;
      }

      // Update sync state
      setSyncState(prev => ({
        ...prev,
        lastSyncTimestamp: data.updated_at,
        lastKnownDocVersion: data.doc_version || prev.lastKnownDocVersion + 1,
        staleness: 'fresh'
      }));

      console.log('✅ Save completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Save error:', error);
      return false;
    }
  }, [rundownId, isConnected, currentState, queueOperation, syncWithServer]);

  // Handle focus events to check for stale data
  const handleFocusCheck = useCallback(async () => {
    const now = Date.now();
    
    // Throttle focus checks to avoid excessive calls
    if (now - lastFocusCheckRef.current < 2000) return;
    lastFocusCheckRef.current = now;

    console.log('👁️ Tab focused - checking for updates...');
    
    if (isConnected) {
      // Check for stale data and sync if needed
      const staleness = await checkStaleness();
      
      setSyncState(prev => ({ ...prev, staleness }));
      
      if (staleness === 'stale') {
        console.log('📡 Stale data detected - syncing...');
        await syncWithServer(true);
      }

      // Process any queued offline operations
      processQueue();
    }
  }, [isConnected, checkStaleness, syncWithServer, processQueue]);

  // Persistent connection - no focus-based checks needed

  // Record offline changes when not connected
  const trackOfflineChange = useCallback((fieldKey: string, value: any) => {
    if (!isConnected) {
      recordOfflineChange(fieldKey, value);
    }
  }, [isConnected, recordOfflineChange]);

  // Auto-sync when connection is restored (with throttle to prevent infinite loops)
  useEffect(() => {
    if (isConnected && connectionType === 'online') {
      // Add delay to prevent rapid re-syncing
      const timeoutId = setTimeout(() => {
        console.log('🔌 Connection restored - checking for updates...');
        syncWithServer(true);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, connectionType, syncWithServer]);

  return {
    // Sync operations
    syncWithServer,
    saveToServer,
    checkStaleness,
    
    // Offline support
    trackOfflineChange,
    hasOfflineChanges,
    
    // State
    ...syncState,
    isConnected,
    connectionType,
    
    // Manual controls
    forceFocusCheck: handleFocusCheck
  };
};