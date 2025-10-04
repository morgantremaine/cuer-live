import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownState } from './useRundownState';
import { normalizeTimestamp } from '@/utils/realtimeUtils';
import { registerRecentSave } from './useRundownResumption';
import { getTabId } from '@/utils/tabUtils';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';
import { saveWithTimeout } from '@/utils/saveTimeout';

// Field delta tracking for granular saves
interface FieldDelta {
  itemId?: string;
  field: string;
  value: any;
  timestamp: number;
}

export const useFieldDeltaSave = (
  rundownId: string | null
) => {
  const pendingDeltasRef = useRef<FieldDelta[]>([]);
  const lastSavedStateRef = useRef<RundownState | null>(null);
  const authFailedSavesRef = useRef<Array<{
    state: RundownState;
    timestamp: string;
  }>>([]);

  // Optimized field change tracking
  const trackFieldChange = useCallback((itemId: string | undefined, field: string, value: any) => {
    pendingDeltasRef.current.push({
      itemId,
      field,
      value,
      timestamp: Date.now()
    });
  }, []);

  // Compare states and extract deltas
  const extractDeltas = useCallback((currentState: RundownState, previousState: RundownState | null): FieldDelta[] => {
    const deltas: FieldDelta[] = [];
    
    if (!previousState) {
      return [{
        field: 'fullState',
        value: currentState,
        timestamp: Date.now()
      }];
    }

    // Check title changes
    if (currentState.title !== previousState.title) {
      deltas.push({
        field: 'title',
        value: currentState.title,
        timestamp: Date.now()
      });
    }

    // Check global fields including lock state
    const globalFields = ['startTime', 'timezone', 'showDate', 'externalNotes', 'numberingLocked', 'lockedRowNumbers'];
    globalFields.forEach(field => {
      const currentValue = (currentState as any)[field];
      const previousValue = (previousState as any)[field];
      
      if (JSON.stringify(currentValue) !== JSON.stringify(previousValue)) {
        deltas.push({
          field,
          value: currentValue,
          timestamp: Date.now()
        });
      }
    });

    // Check item changes
    const currentItems = currentState.items || [];
    const previousItems = previousState.items || [];
    
    // CRITICAL: Check for reordering first - compare item IDs in order
    const currentItemIds = currentItems.map(item => item.id);
    const previousItemIds = previousItems.map(item => item.id);
    
    // If the order of items has changed, this is a reorder operation
    const isReordered = currentItemIds.length === previousItemIds.length && 
                       JSON.stringify(currentItemIds) !== JSON.stringify(previousItemIds);
    
    if (isReordered) {
      deltas.push({
        field: 'fullItemsReorder',
        value: currentItems,
        timestamp: Date.now()
      });
      return deltas;
    }
    
    // Track by item ID for efficient comparison
    const previousItemsMap = new Map(previousItems.map(item => [item.id, item]));
    const currentItemsMap = new Map(currentItems.map(item => [item.id, item]));

    // Check for new, updated, and deleted items
    currentItems.forEach(currentItem => {
      const previousItem = previousItemsMap.get(currentItem.id);
      
      if (!previousItem) {
        // New item - save entire item
        deltas.push({
          itemId: currentItem.id,
          field: 'fullItem',
          value: currentItem,
          timestamp: Date.now()
        });
      } else {
        // PERFORMANCE FIX: More precise field comparison to prevent false positives
        const itemFields = ['name', 'talent', 'script', 'gfx', 'video', 'images', 'notes', 'duration', 'color', 'isFloating', 'customFields'];
        
        itemFields.forEach(field => {
          const currentValue = (currentItem as any)[field];
          const previousValue = (previousItem as any)[field];
          
          // Use more efficient comparison - avoid JSON.stringify for strings and primitives
          let hasChanged = false;
          
          if (typeof currentValue === 'string' && typeof previousValue === 'string') {
            hasChanged = currentValue !== previousValue;
          } else if (typeof currentValue === typeof previousValue && (typeof currentValue === 'number' || typeof currentValue === 'boolean')) {
            hasChanged = currentValue !== previousValue;
          } else if (currentValue === null || currentValue === undefined || previousValue === null || previousValue === undefined) {
            hasChanged = currentValue !== previousValue;
          } else {
            // Only use JSON.stringify for complex objects when necessary
            hasChanged = JSON.stringify(currentValue) !== JSON.stringify(previousValue);
          }
          
          if (hasChanged) {
            deltas.push({
              itemId: currentItem.id,
              field,
              value: currentValue,
              timestamp: Date.now()
            });
          }
        });
      }
    });

    // Check for deleted items
    previousItems.forEach(previousItem => {
      if (!currentItemsMap.has(previousItem.id)) {
        deltas.push({
          itemId: previousItem.id,
          field: 'deleted',
          value: null,
          timestamp: Date.now()
        });
      }
    });

    return deltas;
  }, []);

  // Apply deltas to database using optimized updates - SIMPLIFIED: No OCC, just last write wins
  const saveDeltasToDatabase = useCallback(async (deltas: FieldDelta[], currentState: RundownState, retryCount: number = 0): Promise<{ updatedAt: string }> => {
    if (!rundownId) {
      throw new Error('No rundown ID provided');
    }

    const updateTimestamp = new Date().toISOString();
    
    // Track own update via centralized tracker with realtime context
    {
      const trackContext = rundownId ? `realtime-${rundownId}` : undefined;
      ownUpdateTracker.track(updateTimestamp, trackContext);
    }

    // Group deltas by type for efficient batching
    const globalDeltas = deltas.filter(d => !d.itemId);
    const itemDeltas = deltas.filter(d => d.itemId);
    const hasFullUpdate = deltas.some(d => d.field === 'fullState' || d.field === 'fullItem');
    const hasReorder = deltas.some(d => d.field === 'fullItemsReorder');

    // Only fall back to full updates for actual structural changes
    if (hasFullUpdate || hasReorder) {
      return await performFullUpdate(currentState, updateTimestamp);
    }
    
    const updateData: any = {};
    
    // Apply global field changes
    globalDeltas.forEach(delta => {
      switch (delta.field) {
        case 'title':
          updateData.title = delta.value;
          break;
        case 'startTime':
          updateData.start_time = delta.value;
          break;
        case 'timezone':
          updateData.timezone = delta.value;
          break;
        case 'showDate':
          updateData.show_date = delta.value ? `${delta.value.getFullYear()}-${String(delta.value.getMonth() + 1).padStart(2, '0')}-${String(delta.value.getDate()).padStart(2, '0')}` : null;
          break;
        case 'externalNotes':
          updateData.external_notes = delta.value;
          break;
        case 'numberingLocked':
          updateData.numbering_locked = delta.value;
          break;
        case 'lockedRowNumbers':
          updateData.locked_row_numbers = delta.value;
          break;
      }
    });

    // SIMPLIFIED: Read latest server state only to merge our changes onto it
    // No version checking - just "last write wins" (Google Sheets style)
    const { data: latestRow, error: latestErr } = await supabase
      .from('rundowns')
      .select('*')
      .eq('id', rundownId)
      .single();

    if (latestErr) {
      console.warn('⚠️ Delta save: failed to read latest state, falling back to full update', latestErr);
      return await performFullUpdate(currentState, updateTimestamp);
    }

    console.log('📝 Merging deltas onto latest server state (last write wins)');

    // Start with latest server items
    const baseItems: any[] = Array.isArray(latestRow?.items) ? latestRow.items : [];
    const baseMap = new Map<string, any>(baseItems.map((it: any) => [it.id, it]));

    // Apply our deltas to the server state
    itemDeltas.forEach(delta => {
      if (!delta.itemId) return;
      if (delta.field === 'deleted') {
        baseMap.delete(delta.itemId);
        return;
      }
      if (delta.field === 'fullItem') {
        baseMap.set(delta.itemId, delta.value);
        return;
      }
      const existing = baseMap.get(delta.itemId) || { id: delta.itemId };
      baseMap.set(delta.itemId, { ...existing, [delta.field]: delta.value });
    });

    updateData.items = Array.from(baseMap.values());
    
    // Merge global fields from server, applying only our deltas
    if (globalDeltas.length === 0) {
      // No global changes from us, keep server values
      updateData.title = latestRow.title;
      updateData.start_time = latestRow.start_time;
      updateData.timezone = latestRow.timezone;
      updateData.show_date = latestRow.show_date;
      updateData.external_notes = latestRow.external_notes;
      updateData.numbering_locked = latestRow.numbering_locked;
      updateData.locked_row_numbers = latestRow.locked_row_numbers;
    } else {
      // We have global changes, apply them
      updateData.title = globalDeltas.find(d => d.field === 'title')?.value ?? latestRow.title;
      updateData.start_time = globalDeltas.find(d => d.field === 'startTime')?.value ?? latestRow.start_time;
      updateData.timezone = globalDeltas.find(d => d.field === 'timezone')?.value ?? latestRow.timezone;
      updateData.show_date = globalDeltas.find(d => d.field === 'showDate')?.value ? 
        `${globalDeltas.find(d => d.field === 'showDate')!.value.getFullYear()}-${String(globalDeltas.find(d => d.field === 'showDate')!.value.getMonth() + 1).padStart(2, '0')}-${String(globalDeltas.find(d => d.field === 'showDate')!.value.getDate()).padStart(2, '0')}` : 
        latestRow.show_date;
      updateData.external_notes = globalDeltas.find(d => d.field === 'externalNotes')?.value ?? latestRow.external_notes;
      updateData.numbering_locked = globalDeltas.find(d => d.field === 'numberingLocked')?.value ?? latestRow.numbering_locked;
      updateData.locked_row_numbers = globalDeltas.find(d => d.field === 'lockedRowNumbers')?.value ?? latestRow.locked_row_numbers;
    }

    // Add metadata
    updateData.updated_at = updateTimestamp;
    
    // CRITICAL: Ensure user is authenticated before save
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user?.id) {
      console.warn('⚠️ Auth check failed during save - queuing for retry', {
        userError,
        hasUser: !!userData.user,
        rundownId
      });
      
      // Queue for retry instead of failing immediately
      authFailedSavesRef.current.push({
        state: currentState,
        timestamp: new Date().toISOString()
      });
      
      // Still throw to trigger existing error handling, but we've queued it
      throw new Error('Auth check failed - save queued for retry');
    }
    
    updateData.last_updated_by = userData.user.id;
    console.log('🔐 Field delta save authenticated as user:', userData.user.id);
    
    // Add tab_id only if schema supports it (graceful degradation)
    try {
      updateData.tab_id = getTabId();
    } catch (error) {
      console.warn('tab_id not yet in schema cache, skipping:', error);
    }

    // SIMPLIFIED: No OCC - just write directly (last write wins)
    console.log('💾 Field delta save: executing update for rundown', rundownId, 'with user', userData.user.id);
    
    const { data, error } = await saveWithTimeout(
      async () => {
        return await supabase
          .from('rundowns')
          .update(updateData)
          .eq('id', rundownId)
          .select('updated_at')
          .single();
      },
      'field-delta-save',
      10000
    );

    if (error) {
      console.error('🚨 Field delta save database error:', {
        error,
        errorCode: error.code,
        errorMessage: error.message,
        rundownId,
        userId: userData.user.id,
        updateDataKeys: Object.keys(updateData)
      });
      throw error;
    }

    if (!data) {
      console.warn('🚨 No data returned from save');
      throw new Error('Save failed - no data returned');
    }

    const normalizedTimestamp = normalizeTimestamp(data.updated_at);
    
    // Track own update via centralized tracker with realtime context
    {
      const trackContext = rundownId ? `realtime-${rundownId}` : undefined;
      ownUpdateTracker.track(normalizedTimestamp, trackContext);
    }
    
    registerRecentSave(rundownId, normalizedTimestamp);
    console.log('⚡ Delta update completed successfully with tab_id:', getTabId());

    return {
      updatedAt: normalizedTimestamp
    };
  }, [rundownId]);

  // Fallback for full updates
  const performFullUpdate = useCallback(async (currentState: RundownState, updateTimestamp: string) => {
    if (!rundownId) {
      throw new Error('No rundown ID provided');
    }

    const updateData: any = {
      title: currentState.title,
      items: currentState.items,
      start_time: currentState.startTime,
      timezone: currentState.timezone,
      show_date: currentState.showDate ? `${currentState.showDate.getFullYear()}-${String(currentState.showDate.getMonth() + 1).padStart(2, '0')}-${String(currentState.showDate.getDate()).padStart(2, '0')}` : null,
      external_notes: currentState.externalNotes,
      numbering_locked: currentState.numberingLocked,
      locked_row_numbers: currentState.lockedRowNumbers,
      updated_at: updateTimestamp,
      last_updated_by: (await supabase.auth.getUser()).data.user?.id
    };

    // Add tab_id only if schema supports it (graceful degradation)
    try {
      updateData.tab_id = getTabId();
    } catch (error) {
      console.warn('tab_id not yet in schema cache for full update, skipping:', error);
    }

    const { data, error } = await supabase
      .from('rundowns')
      .update(updateData)
      .eq('id', rundownId)
      .select('updated_at')
      .single();

    if (error) {
      throw error;
    }

    const normalizedTimestamp = normalizeTimestamp(data.updated_at);
    
    // Track own update via centralized tracker with realtime context
    {
      const trackContext = rundownId ? `realtime-${rundownId}` : undefined;
      ownUpdateTracker.track(normalizedTimestamp, trackContext);
    }
    
    registerRecentSave(rundownId, normalizedTimestamp);
    console.log('💾 Full update completed successfully with tab_id:', getTabId());

    return {
      updatedAt: normalizedTimestamp
    };
  }, [rundownId]);

  // Main save function using deltas
  const saveDeltaState = useCallback(async (currentState: RundownState): Promise<{ updatedAt: string }> => {
    console.log('🔍 DEBUG: Field delta save called', {
      rundownId,
      hasCurrentState: !!currentState,
      hasLastSavedState: !!lastSavedStateRef.current
    });
    
    const deltas = extractDeltas(currentState, lastSavedStateRef.current);
    
    if (deltas.length === 0) {
      console.log('ℹ️ No deltas detected - skipping save');
      console.log('🔍 DEBUG: Field delta save - no changes to save');
      throw new Error('No changes to save');
    }
    
    console.log('🔍 DEBUG: Field delta save proceeding with deltas', {
      deltaCount: deltas.length,
      deltaTypes: deltas.map(d => d.field)
    });

    const hasFullState = deltas.some(d => d.field === 'fullState');
    if (hasFullState) {
      console.warn('🧪 TRACE Delta: fullState save path triggered (likely initial). lastSavedStateRef is null:', !lastSavedStateRef.current);
    }

    console.log('📊 Detected deltas:', deltas.map(d => ({ 
      itemId: d.itemId, 
      field: d.field, 
      hasValue: d.value !== null && d.value !== undefined 
    })));

    const result = await saveDeltasToDatabase(deltas, currentState);
    
    // Update saved state reference
    lastSavedStateRef.current = JSON.parse(JSON.stringify(currentState));
    
    return result;
  }, [extractDeltas, saveDeltasToDatabase]);

  // Initialize saved state reference
  const initializeSavedState = useCallback((state: RundownState) => {
    lastSavedStateRef.current = JSON.parse(JSON.stringify(state));
  }, []);

  // Monitor auth state and retry queued saves when auth recovers
  useEffect(() => {
    if (authFailedSavesRef.current.length === 0) return;
    
    const checkAuthAndRetry = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (!userError && userData.user?.id) {
        console.log('✅ Auth recovered - retrying queued saves:', authFailedSavesRef.current.length);
        
        const queuedSaves = [...authFailedSavesRef.current];
        authFailedSavesRef.current = [];
        
        for (const queuedSave of queuedSaves) {
          try {
            await saveDeltasToDatabase(
              extractDeltas(queuedSave.state, lastSavedStateRef.current),
              queuedSave.state
            );
          } catch (error) {
            console.error('Failed to retry auth-failed save:', error);
            // Re-queue if it fails again
            authFailedSavesRef.current.push(queuedSave);
          }
        }
      }
    };
    
    // Check every 5 seconds if there are queued saves
    const retryInterval = setInterval(checkAuthAndRetry, 5000);
    return () => clearInterval(retryInterval);
  }, [saveDeltasToDatabase, extractDeltas]);

  return {
    saveDeltaState,
    initializeSavedState,
    trackFieldChange
  };
};