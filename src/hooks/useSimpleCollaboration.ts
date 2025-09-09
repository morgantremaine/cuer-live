import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getTabId } from '@/utils/tabUtils';
import { useCellUpdateCoordination } from './useCellUpdateCoordination';

interface UseSimpleCollaborationProps {
  rundownId: string | null;
  state: any;
  actions: any;
  onRemoteUpdate?: (data: any) => void;
  enabled?: boolean;
}

/**
 * SIMPLIFIED COLLABORATION SYSTEM
 * 
 * Combines simple autosave + simple realtime in one hook.
 * Core principles:
 * 1. NO OCC - always save, database handles conflicts
 * 2. Per-cell protection only - protect actively typed cells
 * 3. Last-writer-wins for same cell
 * 4. Immediate remote updates for non-active cells
 * 5. No queues, no complex conflict resolution
 */
export const useSimpleCollaboration = ({
  rundownId,
  state,
  actions,
  onRemoteUpdate,
  enabled = true
}: UseSimpleCollaborationProps) => {
  const { user } = useAuth();
  const { shouldBlockAutoSave } = useCellUpdateCoordination();
  
  // Keep latest state/actions in refs to avoid resubscribing on every change
  const stateRef = useRef<any>(state);
  const actionsRef = useRef<any>(actions);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { actionsRef.current = actions; }, [actions]);
  
  // Auto-save state
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedStateRef = useRef<string>('');
  const isSavingRef = useRef(false);
  
  // Realtime state
  const subscriptionRef = useRef<any>(null);
  const lastUpdateTimestampRef = useRef<string | null>(null);
  
  // Cell tracking for protection
  const activeCellsRef = useRef<Set<string>>(new Set());
  const cellTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Track cell activity
  const markCellActive = useCallback((cellKey: string) => {
    activeCellsRef.current.add(cellKey);
    
    // Clear existing timeout
    const existingTimeout = cellTimeoutsRef.current.get(cellKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set new timeout to clear after typing stops
    const timeout = setTimeout(() => {
      activeCellsRef.current.delete(cellKey);
      cellTimeoutsRef.current.delete(cellKey);
    }, 1000); // 1 second after last keystroke
    
    cellTimeoutsRef.current.set(cellKey, timeout);
  }, []);

  // SIMPLE AUTO-SAVE FUNCTION
  const performSave = useCallback(async () => {
    if (!rundownId || !user || !enabled || isSavingRef.current) {
      return;
    }

    if (shouldBlockAutoSave()) {
      console.log('🛑 Simple AutoSave blocked by coordination');
      return;
    }

    const currentStateString = JSON.stringify({
      items: state.items || [],
      title: state.title || '',
      start_time: state.startTime || '09:00:00',
      timezone: state.timezone || 'America/New_York',
      external_notes: state.externalNotes || '',
      show_date: state.showDate?.toISOString().split('T')[0] || null
    });

    // Skip if no changes
    if (currentStateString === lastSavedStateRef.current) {
      return;
    }

    isSavingRef.current = true;
    console.log('💾 Simple collaboration: Saving changes...');

    try {
      const updateData = {
        items: state.items || [],
        title: state.title || '',
        start_time: state.startTime || '09:00:00',
        timezone: state.timezone || 'America/New_York',
        external_notes: state.externalNotes || '',
        show_date: state.showDate?.toISOString().split('T')[0] || null,
        last_updated_by: user.id,
        tab_id: getTabId(),
        updated_at: new Date().toISOString()
      };

      // SIMPLE SAVE: No OCC, no doc_version checks
      const { data, error } = await supabase
        .from('rundowns')
        .update(updateData)
        .eq('id', rundownId)
        .select('updated_at, doc_version')
        .single();

      if (error) {
        console.error('❌ Simple collaboration save failed:', error);
        return;
      }

      // Update saved state reference
      lastSavedStateRef.current = currentStateString;
      
      console.log('✅ Simple collaboration save completed');

      // Mark as saved in state
      actions.markSaved();

    } catch (error) {
      console.error('❌ Simple collaboration save error:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [rundownId, user, state, enabled, shouldBlockAutoSave, actions]);

  // Schedule debounced save
  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, 1500);
  }, [performSave]);

  // SIMPLE REALTIME HANDLER
  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('📱 Simple collaboration realtime update:', {
      timestamp: payload.new?.updated_at,
      tabId: payload.new?.tab_id,
      ownTabId: getTabId()
    });
    
    // Skip own updates
    if (payload.new?.tab_id === getTabId()) {
      console.log('⏭️ Skipping own update');
      return;
    }

    // Skip if not for current rundown
    if (payload.new?.id !== rundownId) {
      console.log('⏭️ Skipping - different rundown');
      return;
    }

    // Simple deduplication
    const updateTimestamp = payload.new?.updated_at;
    if (updateTimestamp && updateTimestamp === lastUpdateTimestampRef.current) {
      console.log('⏭️ Skipping duplicate timestamp');
      return;
    }
    lastUpdateTimestampRef.current = updateTimestamp;

    console.log('✅ Applying remote update with cell protection');
    
    try {
      const activeCells = Array.from(activeCellsRef.current);
      const remoteData = { ...payload.new };
      const stateCurrent = stateRef.current;
      const actionsCurrent = actionsRef.current;
      
      // Apply update with simple cell protection
      if (activeCells.length > 0) {
        console.log('🛡️ Protecting cells:', activeCells);
        
        // For items, protect individual cells
        if (remoteData.items && Array.isArray(remoteData.items)) {
          remoteData.items = remoteData.items.map((remoteItem: any) => {
            const hasActiveField = activeCells.some(cellKey => 
              cellKey.startsWith(`${remoteItem.id}-`)
            );
            
            if (hasActiveField) {
              // Keep current local item for protected cells
              const localItem = stateCurrent.items?.find((item: any) => item.id === remoteItem.id);
              return localItem || remoteItem;
            }
            
            return remoteItem;
          });
        }
        
        // Protect global fields
        if (activeCells.includes('title') && stateCurrent.title) {
          remoteData.title = stateCurrent.title;
        }
        if (activeCells.includes('startTime') && stateCurrent.startTime) {
          remoteData.start_time = stateCurrent.startTime;
        }
        if (activeCells.includes('timezone') && stateCurrent.timezone) {
          remoteData.timezone = stateCurrent.timezone;
        }
        if (activeCells.includes('externalNotes') && stateCurrent.externalNotes) {
          remoteData.external_notes = stateCurrent.externalNotes;
        }
      }
      
      // Apply the update to state
      actionsCurrent.loadState({
        items: remoteData.items || [],
        title: remoteData.title || '',
        startTime: remoteData.start_time || '09:00:00',
        timezone: remoteData.timezone || 'America/New_York',
        showDate: remoteData.show_date ? new Date(remoteData.show_date + 'T00:00:00') : null,
        externalNotes: remoteData.external_notes || ''
      });
      
      // Call optional callback
      onRemoteUpdate?.(remoteData);
      
    } catch (error) {
      console.error('Error applying remote update:', error);
    }
  }, [rundownId, onRemoteUpdate]);

  // Setup realtime subscription
  useEffect(() => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    if (!rundownId || !user || !enabled) {
      return;
    }

    console.log('✅ Setting up simple collaboration realtime for:', rundownId);

    const channel = supabase
      .channel(`simple-collab-${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${rundownId}`
        },
        handleRealtimeUpdate
      )
      .subscribe((status) => {
        console.log('📱 Simple collaboration subscription status:', status);
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [rundownId, user, enabled, handleRealtimeUpdate]);

  // Auto-save when state changes
  useEffect(() => {
    if (enabled && user) {
      scheduleSave();
    }
  }, [
    state.items, 
    state.title, 
    state.startTime, 
    state.timezone, 
    state.externalNotes, 
    state.showDate,
    scheduleSave,
    enabled,
    user
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      cellTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      cellTimeoutsRef.current.clear();
    };
  }, []);

  return {
    isSaving: isSavingRef.current,
    isConnected: !!subscriptionRef.current,
    markCellActive,
    activeCells: Array.from(activeCellsRef.current),
    forceSave: performSave
  };
};
