import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownState } from './useRundownState';
import { normalizeTimestamp } from '@/utils/realtimeUtils';
import { registerRecentSave } from './useRundownResumption';
import { getTabId } from '@/utils/tabUtils';

// Field delta tracking for granular saves
interface FieldDelta {
  itemId?: string;
  field: string;
  value: any;
  timestamp: number;
}

export const useFieldDeltaSave = (
  rundownId: string | null,
  trackOwnUpdate: (timestamp: string) => void
) => {
  const pendingDeltasRef = useRef<FieldDelta[]>([]);
  const lastSavedStateRef = useRef<RundownState | null>(null);

  // Optimized field change tracking with reduced logging
  const trackFieldChange = useCallback((itemId: string | undefined, field: string, value: any) => {
    const delta: FieldDelta = {
      itemId,
      field,
      value,
      timestamp: Date.now()
    };
    
    pendingDeltasRef.current.push(delta);
    // Reduced logging frequency for performance
    if (pendingDeltasRef.current.length % 10 === 0) {
      console.log('📝 Field delta batch tracked:', { 
        batchSize: pendingDeltasRef.current.length,
        latestField: field,
        itemId: itemId?.substring(0, 8)
      });
    }
  }, []);

  // Compare states and extract deltas
  const extractDeltas = useCallback((currentState: RundownState, previousState: RundownState | null): FieldDelta[] => {
    const deltas: FieldDelta[] = [];
    
    if (!previousState) {
      // Initial save - save everything
      console.warn('🧪 TRACE Delta: previousState missing - initial fullState delta would be created');
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

    // Check global fields
    const globalFields = ['startTime', 'timezone', 'showDate', 'externalNotes'];
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
      console.log('🔄 Delta: detected item reordering - triggering full items update');
      deltas.push({
        field: 'fullItemsReorder',
        value: currentItems,
        timestamp: Date.now()
      });
      return deltas; // Return early for reorder - no need to check individual items
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

  // Apply deltas to database using optimized updates with LocalShadow protection
  const saveDeltasToDatabase = useCallback(async (deltas: FieldDelta[], currentState: RundownState, retryCount: number = 0): Promise<{ updatedAt: string; docVersion: number }> => {
    if (!rundownId) {
      throw new Error('No rundown ID provided');
    }

    const updateTimestamp = new Date().toISOString();
    trackOwnUpdate(updateTimestamp);

    // Import LocalShadow for bulletproof field protection
    const { localShadowStore } = await import('@/state/localShadows');

    // Group deltas by type for efficient batching
    const globalDeltas = deltas.filter(d => !d.itemId);
    const itemDeltas = deltas.filter(d => d.itemId);
    const hasFullUpdate = deltas.some(d => d.field === 'fullState' || d.field === 'fullItem');
    const hasReorder = deltas.some(d => d.field === 'fullItemsReorder');

    // Only fall back to full updates for actual structural changes, not arbitrary size limits
    if (hasFullUpdate || hasReorder) {
      // Fall back to full update only for structural operations that require it
      console.log('💾 Performing full rundown update (structural changes detected)');
      return await performFullUpdate(currentState, updateTimestamp);
    }

    // Perform optimized delta update with OCC
    console.log('⚡ Performing delta update with OCC:', { globalDeltas: globalDeltas.length, itemDeltas: itemDeltas.length });
    
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
      }
    });

    // CRITICAL: Read latest server state for OCC conflict detection
    const { data: latestRow, error: latestErr } = await supabase
      .from('rundowns')
      .select('*')
      .eq('id', rundownId)
      .single();

    if (latestErr) {
      console.warn('⚠️ Delta save: failed to read latest state, falling back to full update', latestErr);
      return await performFullUpdate(currentState, updateTimestamp);
    }

    // OCC: Check for concurrent changes that would conflict with our edits
    const serverDocVersion = latestRow?.doc_version || 0;
    const expectedDocVersion = (currentState as any)?.docVersion || 0;
    
    if (serverDocVersion > expectedDocVersion) {
      console.warn('🚨 OCC Conflict detected:', { 
        serverVersion: serverDocVersion, 
        expectedVersion: expectedDocVersion,
        delta: 'Refreshing local state with LocalShadow protection'
      });
      
      // BULLETPROOF: Use LocalShadow store for comprehensive protection
      const activeShadows = localShadowStore.getActiveShadows();
      const recentFields = localShadowStore.getRecentlyTypedFields(3000);
      
      console.log('🛡️ OCC Conflict: LocalShadow protection active', {
        activeItems: activeShadows.items.size,
        activeGlobals: activeShadows.globals.size,
        recentFields: recentFields.length
      });
      
      // Create refreshed state starting from server data
      let refreshedItems = Array.isArray(latestRow?.items) ? [...latestRow.items] : currentState.items;
      
      // Apply active shadows to preserve typing
      if (Array.isArray(refreshedItems) && Array.isArray(currentState.items)) {
        refreshedItems = refreshedItems.map((serverItem: any) => {
          const itemShadows = activeShadows.items.get(serverItem.id);
          if (!itemShadows) return serverItem;
          
          let protectedItem = { ...serverItem };
          
          // Apply all active shadows for this item
          Object.entries(itemShadows).forEach(([fieldName, shadow]) => {
            console.log('🛡️ OCC Conflict: LocalShadow preserving field', { 
              itemId: serverItem.id, 
              fieldName, 
              shadowValue: shadow.value,
              serverValue: serverItem[fieldName]
            });
            protectedItem[fieldName] = shadow.value;
          });
          
          return protectedItem;
        });
      }
      
      // Apply global shadows
      let refreshedTitle = latestRow?.title || currentState.title;
      let refreshedStartTime = latestRow?.start_time || currentState.startTime;
      let refreshedTimezone = latestRow?.timezone || currentState.timezone;
      let refreshedShowDate = latestRow?.show_date ? new Date(latestRow.show_date) : currentState.showDate;
      let refreshedExternalNotes = latestRow?.external_notes || currentState.externalNotes;
      
      // Apply global field shadows
      if (activeShadows.globals.has('title')) {
        refreshedTitle = activeShadows.globals.get('title')!.value;
        console.log('🛡️ OCC Conflict: LocalShadow preserving title');
      }
      if (activeShadows.globals.has('startTime')) {
        refreshedStartTime = activeShadows.globals.get('startTime')!.value;
        console.log('🛡️ OCC Conflict: LocalShadow preserving startTime');
      }
      if (activeShadows.globals.has('timezone')) {
        refreshedTimezone = activeShadows.globals.get('timezone')!.value;
        console.log('🛡️ OCC Conflict: LocalShadow preserving timezone');
      }
      if (activeShadows.globals.has('showDate')) {
        refreshedShowDate = activeShadows.globals.get('showDate')!.value;
        console.log('🛡️ OCC Conflict: LocalShadow preserving showDate');
      }
      if (activeShadows.globals.has('externalNotes')) {
        refreshedExternalNotes = activeShadows.globals.get('externalNotes')!.value;
        console.log('🛡️ OCC Conflict: LocalShadow preserving externalNotes');
      }
      
      // Create updated state with server's version but LocalShadows preserved
      const refreshedState = {
        ...currentState,
        docVersion: serverDocVersion,
        items: refreshedItems,
        title: refreshedTitle,
        startTime: refreshedStartTime,
        timezone: refreshedTimezone,
        showDate: refreshedShowDate,
        externalNotes: refreshedExternalNotes
      };
      
      // Update the saved state reference to the refreshed server state
      initializeSavedState(refreshedState);
      
      // Re-extract deltas based on refreshed state
      const recomputedDeltas = extractDeltas(currentState, refreshedState);
      
      // CRITICAL FIX: Don't assume no changes when recomputedDeltas is empty
      // Some rapid changes (like deletions) might have been lost during state refresh
      // Always attempt to save the original deltas to prevent data loss
      const finalDeltas = recomputedDeltas.length > 0 ? recomputedDeltas : deltas;
      
      if (finalDeltas.length === 0) {
        console.log('✅ No conflicts after LocalShadow state refresh - changes already applied');
        return { updatedAt: latestRow.updated_at, docVersion: serverDocVersion };
      }
      
      console.log('🔄 Using', finalDeltas === deltas ? 'original deltas' : 'recomputed deltas', 'to prevent data loss');
      
      // Prevent infinite recursion 
      if (retryCount >= 2) {
        console.warn('⚠️ Max OCC retry attempts reached, falling back to full update');
        return await performFullUpdate(currentState, updateTimestamp);
      }
      
      console.log('🔄 Retrying save with LocalShadow-protected state and recomputed deltas');
      // Recursively call with refreshed state - but limit recursion
      return await saveDeltasToDatabase(finalDeltas, refreshedState, retryCount + 1);
    }

    console.log('✅ OCC Check passed, merging deltas onto latest server state');

    // Start with latest server items
    const baseItems: any[] = Array.isArray(latestRow?.items) ? latestRow.items : [];
    const baseMap = new Map<string, any>(baseItems.map((it: any) => [it.id, it]));

    // Apply only our deltas to the server state - CONFLICT PROTECTION
    // Skip deltas for items that might be actively edited by others via realtime
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
    // CONFLICT PROTECTION: Preserve any concurrent changes from other users
    if (globalDeltas.length === 0) {
      // No global changes from us, keep server values
      updateData.title = latestRow.title;
      updateData.start_time = latestRow.start_time;
      updateData.timezone = latestRow.timezone;
      updateData.show_date = latestRow.show_date;
      updateData.external_notes = latestRow.external_notes;
    } else {
      // We have global changes, but preserve server values for fields we didn't change
      updateData.title = globalDeltas.find(d => d.field === 'title')?.value ?? latestRow.title;
      updateData.start_time = globalDeltas.find(d => d.field === 'startTime')?.value ?? latestRow.start_time;
      updateData.timezone = globalDeltas.find(d => d.field === 'timezone')?.value ?? latestRow.timezone;
      updateData.show_date = globalDeltas.find(d => d.field === 'showDate')?.value ? 
        `${globalDeltas.find(d => d.field === 'showDate')!.value.getFullYear()}-${String(globalDeltas.find(d => d.field === 'showDate')!.value.getMonth() + 1).padStart(2, '0')}-${String(globalDeltas.find(d => d.field === 'showDate')!.value.getDate()).padStart(2, '0')}` : 
        latestRow.show_date;
      updateData.external_notes = globalDeltas.find(d => d.field === 'externalNotes')?.value ?? latestRow.external_notes;
    }
    
    updateData.doc_version = serverDocVersion + 1;

    // Add metadata
    updateData.updated_at = updateTimestamp;
    updateData.last_updated_by = (await supabase.auth.getUser()).data.user?.id;
    
    // Add tab_id only if schema supports it (graceful degradation)
    try {
      updateData.tab_id = getTabId();
    } catch (error) {
      console.warn('tab_id not yet in schema cache, skipping:', error);
    }

    // OCC: Use expected doc_version in WHERE clause to ensure atomic update
    const { data, error } = await supabase
      .from('rundowns')
      .update(updateData)
      .eq('id', rundownId)
      .eq('doc_version', serverDocVersion) // OCC: Only update if doc_version hasn't changed
      .select('updated_at, doc_version')
      .single();

    if (error) {
      // Check if OCC conflict occurred (no rows updated)
      if (error.code === 'PGRST116' || (error.message && error.message.includes('No rows found'))) {
        console.warn('🚨 OCC Conflict: Document was modified by another user during save');
        throw new Error('Document was modified by another user. Please refresh and try again.');
      }
      throw error;
    }

    if (!data) {
      console.warn('🚨 OCC Conflict: No data returned (likely version mismatch)');
      throw new Error('Document was modified by another user. Please refresh and try again.');
    }

    const normalizedTimestamp = normalizeTimestamp(data.updated_at);
    trackOwnUpdate(normalizedTimestamp);
    registerRecentSave(rundownId, normalizedTimestamp);
    console.log('⚡ Delta update completed successfully with tab_id:', getTabId());

    return {
      updatedAt: normalizedTimestamp,
      docVersion: data.doc_version
    };
  }, [rundownId, trackOwnUpdate]);

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
      .select('updated_at, doc_version')
      .single();

    if (error) {
      throw error;
    }

    const normalizedTimestamp = normalizeTimestamp(data.updated_at);
    trackOwnUpdate(normalizedTimestamp);
    registerRecentSave(rundownId, normalizedTimestamp);
    console.log('💾 Full update completed successfully with tab_id:', getTabId());

    return {
      updatedAt: normalizedTimestamp,
      docVersion: data.doc_version
    };
  }, [rundownId, trackOwnUpdate]);

  // Main save function using deltas
  const saveDeltaState = useCallback(async (currentState: RundownState): Promise<{ updatedAt: string; docVersion: number }> => {
    const deltas = extractDeltas(currentState, lastSavedStateRef.current);
    
    if (deltas.length === 0) {
      console.log('ℹ️ No deltas detected - skipping save');
      throw new Error('No changes to save');
    }

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
    console.log('🎯 Initialized saved state reference');
  }, []);

  return {
    saveDeltaState,
    initializeSavedState,
    trackFieldChange
  };
};