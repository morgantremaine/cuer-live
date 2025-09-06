import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownState } from './useRundownState';
import { normalizeTimestamp } from '@/utils/realtimeUtils';
import { registerRecentSave } from './useRundownResumption';

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

  // Track field changes as deltas
  const trackFieldChange = useCallback((itemId: string | undefined, field: string, value: any) => {
    const delta: FieldDelta = {
      itemId,
      field,
      value,
      timestamp: Date.now()
    };
    
    pendingDeltasRef.current.push(delta);
    console.log('📝 Field delta tracked:', { itemId, field, valueLength: JSON.stringify(value).length });
  }, []);

  // Compare states and extract deltas
  const extractDeltas = useCallback((currentState: RundownState, previousState: RundownState | null): FieldDelta[] => {
    const deltas: FieldDelta[] = [];
    
    if (!previousState) {
      // Initial save - save everything
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
        // Check individual fields of existing item
        const itemFields = ['name', 'talent', 'script', 'gfx', 'video', 'images', 'notes', 'duration', 'color', 'isFloating', 'customFields'];
        
        itemFields.forEach(field => {
          const currentValue = (currentItem as any)[field];
          const previousValue = (previousItem as any)[field];
          
          if (JSON.stringify(currentValue) !== JSON.stringify(previousValue)) {
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

  // Apply deltas to database using optimized updates
  const saveDeltasToDatabase = useCallback(async (deltas: FieldDelta[], currentState: RundownState): Promise<{ updatedAt: string; docVersion: number }> => {
    if (!rundownId) {
      throw new Error('No rundown ID provided');
    }

    const updateTimestamp = new Date().toISOString();
    trackOwnUpdate(updateTimestamp);

    // Group deltas by type for efficient batching
    const globalDeltas = deltas.filter(d => !d.itemId);
    const itemDeltas = deltas.filter(d => d.itemId);
    const hasFullUpdate = deltas.some(d => d.field === 'fullState' || d.field === 'fullItem');

    if (hasFullUpdate || globalDeltas.length > 5) {
      // Fall back to full update for major changes
      console.log('💾 Performing full rundown update (major changes detected)');
      return await performFullUpdate(currentState, updateTimestamp);
    }

    // Perform optimized delta update
    console.log('⚡ Performing delta update:', { globalDeltas: globalDeltas.length, itemDeltas: itemDeltas.length });
    
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

    // For item changes, we still need to update the full items array
    // but we can optimize by only including changed items
    if (itemDeltas.length > 0) {
      updateData.items = currentState.items;
    }

    // Add metadata
    updateData.updated_at = updateTimestamp;
    updateData.last_updated_by = (await supabase.auth.getUser()).data.user?.id;

    // Increment doc version optimistically
    const { data: currentDoc } = await supabase
      .from('rundowns')
      .select('doc_version')
      .eq('id', rundownId)
      .single();

    updateData.doc_version = (currentDoc?.doc_version || 0) + 1;

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

    const updateData = {
      title: currentState.title,
      items: currentState.items,
      start_time: currentState.startTime,
      timezone: currentState.timezone,
      show_date: currentState.showDate ? `${currentState.showDate.getFullYear()}-${String(currentState.showDate.getMonth() + 1).padStart(2, '0')}-${String(currentState.showDate.getDate()).padStart(2, '0')}` : null,
      external_notes: currentState.externalNotes,
      updated_at: updateTimestamp,
      last_updated_by: (await supabase.auth.getUser()).data.user?.id
    };

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