import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface RealtimeRundownState {
  items: any[];
  title: string;
  start_time: string | null;
  timezone: string | null;
  show_date: string | null;
  external_notes: any;
  isLoading: boolean;
  lastUpdate: number;
}

interface UseSimplifiedRealtimeRundownOptions {
  rundownId: string;
  userId: string;
  enabled?: boolean;
}

interface RealtimeUpdate {
  type: 'cell_edit' | 'row_insert' | 'row_delete' | 'row_move';
  data: any;
  userId: string;
  clientId: string;
  timestamp: number;
}

/**
 * Simplified Real-time Rundown System
 * - Immediate local updates (optimistic)
 * - Fast broadcasting via Supabase realtime
 * - Periodic database saves
 * - Last-write-wins conflict resolution
 */
export const useSimplifiedRealtimeRundown = ({
  rundownId,
  userId,
  enabled = true
}: UseSimplifiedRealtimeRundownOptions) => {
  const [state, setState] = useState<RealtimeRundownState>({
    items: [],
    title: '',
    start_time: null,
    timezone: null,
    show_date: null,
    external_notes: {},
    isLoading: true,
    lastUpdate: Date.now()
  });

  const [saveStatus, setSaveStatus] = useState<{
    isSaving: boolean;
    lastSaved: number | null;
    error: string | null;
  }>({
    isSaving: false,
    lastSaved: null,
    error: null
  });

  const clientId = useRef(`client_${userId}_${Date.now()}`).current;
  const channelRef = useRef<any>(null);
  const saveTimerRef = useRef<NodeJS.Timeout>();
  const pendingChangesRef = useRef<Set<string>>(new Set());
  const hasLoadedRef = useRef(false);

  // Load initial state
  useEffect(() => {
    if (!rundownId || !enabled || hasLoadedRef.current) return;

    const loadInitialState = async () => {
      try {
        logger.info('📥 REALTIME: Loading initial state', { rundownId });

        const { data: rundown, error } = await supabase
          .from('rundowns')
          .select('*')
          .eq('id', rundownId)
          .single();

        if (error || !rundown) {
          throw new Error('Failed to load rundown');
        }

        setState({
          items: rundown.items || [],
          title: rundown.title || '',
          start_time: rundown.start_time,
          timezone: rundown.timezone,
          show_date: rundown.show_date,
          external_notes: rundown.external_notes || {},
          isLoading: false,
          lastUpdate: Date.now()
        });

        hasLoadedRef.current = true;
        logger.info('✅ REALTIME: Initial state loaded', { itemCount: rundown.items?.length || 0 });
      } catch (error) {
        logger.error('❌ REALTIME: Failed to load initial state', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadInitialState();
  }, [rundownId, enabled]);

  // Set up real-time broadcasting
  useEffect(() => {
    if (!rundownId || !enabled) return;

    const channel = supabase.channel(`realtime-rundown-${rundownId}`);

    channel
      .on('broadcast', { event: 'update' }, (payload: any) => {
        const update = payload.payload as RealtimeUpdate;

        // Ignore our own updates
        if (update.clientId === clientId) {
          return;
        }

        logger.info('📡 REALTIME: Received update', {
          type: update.type,
          from: update.userId,
          timestamp: update.timestamp
        });

        // Apply update immediately
        applyUpdate(update);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('✅ REALTIME: Channel subscribed', { rundownId });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [rundownId, enabled, clientId]);

  // Apply update to state
  const applyUpdate = useCallback((update: RealtimeUpdate) => {
    setState(prev => {
      const newState = { ...prev };

      switch (update.type) {
        case 'cell_edit':
          const { itemId, field, value } = update.data;
          newState.items = prev.items.map(item =>
            item.id === itemId ? { ...item, [field]: value } : item
          );
          break;

        case 'row_insert':
          const { item, insertIndex } = update.data;
          newState.items = [
            ...prev.items.slice(0, insertIndex),
            item,
            ...prev.items.slice(insertIndex)
          ];
          break;

        case 'row_delete':
          const { rowId } = update.data;
          newState.items = prev.items.filter(item => item.id !== rowId);
          break;

        case 'row_move':
          const { fromIndex, toIndex } = update.data;
          const itemToMove = prev.items[fromIndex];
          const filtered = prev.items.filter((_, i) => i !== fromIndex);
          newState.items = [
            ...filtered.slice(0, toIndex),
            itemToMove,
            ...filtered.slice(toIndex)
          ];
          break;
      }

      newState.lastUpdate = Date.now();
      return newState;
    });
  }, []);

  // Broadcast update to other clients
  const broadcastUpdate = useCallback((update: Omit<RealtimeUpdate, 'userId' | 'clientId' | 'timestamp'>) => {
    if (!channelRef.current) return;

    const fullUpdate: RealtimeUpdate = {
      ...update,
      userId,
      clientId,
      timestamp: Date.now()
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'update',
      payload: fullUpdate
    });

    logger.debug('📤 REALTIME: Broadcasted update', { type: update.type });
  }, [userId, clientId]);

  // Save to database (debounced)
  const scheduleDatabaseSave = useCallback(() => {
    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Schedule save after 2 seconds of no changes
    saveTimerRef.current = setTimeout(async () => {
      if (pendingChangesRef.current.size === 0) return;

      setSaveStatus(prev => ({ ...prev, isSaving: true }));

      try {
        const { error } = await supabase
          .from('rundowns')
          .update({
            items: state.items,
            title: state.title,
            start_time: state.start_time,
            timezone: state.timezone,
            show_date: state.show_date,
            external_notes: state.external_notes,
            updated_at: new Date().toISOString(),
            last_updated_by: userId
          })
          .eq('id', rundownId);

        if (error) throw error;

        setSaveStatus({
          isSaving: false,
          lastSaved: Date.now(),
          error: null
        });

        pendingChangesRef.current.clear();
        logger.info('✅ REALTIME: Saved to database', { rundownId });
      } catch (error) {
        logger.error('❌ REALTIME: Save failed', error);
        setSaveStatus(prev => ({
          ...prev,
          isSaving: false,
          error: error instanceof Error ? error.message : 'Save failed'
        }));
      }
    }, 2000);
  }, [state, rundownId, userId]);

  // Handle cell edit
  const handleCellEdit = useCallback((itemId: string, field: string, value: any) => {
    // 1. Immediate local update (optimistic)
    setState(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      ),
      lastUpdate: Date.now()
    }));

    // 2. Broadcast to other users immediately
    broadcastUpdate({
      type: 'cell_edit',
      data: { itemId, field, value }
    });

    // 3. Schedule database save
    pendingChangesRef.current.add(`${itemId}-${field}`);
    scheduleDatabaseSave();

    logger.debug('🎯 REALTIME: Cell edited', { itemId, field });
  }, [broadcastUpdate, scheduleDatabaseSave]);

  // Handle row insert
  const handleRowInsert = useCallback((insertIndex: number, item: any) => {
    // 1. Immediate local update
    setState(prev => ({
      ...prev,
      items: [
        ...prev.items.slice(0, insertIndex),
        item,
        ...prev.items.slice(insertIndex)
      ],
      lastUpdate: Date.now()
    }));

    // 2. Broadcast immediately
    broadcastUpdate({
      type: 'row_insert',
      data: { item, insertIndex }
    });

    // 3. Schedule save
    pendingChangesRef.current.add(`insert-${item.id}`);
    scheduleDatabaseSave();

    logger.info('✅ REALTIME: Row inserted', { insertIndex, itemId: item.id });
  }, [broadcastUpdate, scheduleDatabaseSave]);

  // Handle row delete
  const handleRowDelete = useCallback((rowId: string) => {
    // 1. Immediate local update
    setState(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== rowId),
      lastUpdate: Date.now()
    }));

    // 2. Broadcast immediately
    broadcastUpdate({
      type: 'row_delete',
      data: { rowId }
    });

    // 3. Schedule save
    pendingChangesRef.current.add(`delete-${rowId}`);
    scheduleDatabaseSave();

    logger.info('✅ REALTIME: Row deleted', { rowId });
  }, [broadcastUpdate, scheduleDatabaseSave]);

  // Handle row move
  const handleRowMove = useCallback((fromIndex: number, toIndex: number) => {
    // 1. Immediate local update
    setState(prev => {
      const itemToMove = prev.items[fromIndex];
      const filtered = prev.items.filter((_, i) => i !== fromIndex);
      return {
        ...prev,
        items: [
          ...filtered.slice(0, toIndex),
          itemToMove,
          ...filtered.slice(toIndex)
        ],
        lastUpdate: Date.now()
      };
    });

    // 2. Broadcast immediately
    broadcastUpdate({
      type: 'row_move',
      data: { fromIndex, toIndex }
    });

    // 3. Schedule save
    pendingChangesRef.current.add(`move-${fromIndex}-${toIndex}`);
    scheduleDatabaseSave();

    logger.info('✅ REALTIME: Row moved', { fromIndex, toIndex });
  }, [broadcastUpdate, scheduleDatabaseSave]);

  // Force immediate save
  const forceSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setSaveStatus(prev => ({ ...prev, isSaving: true }));

    try {
      const { error } = await supabase
        .from('rundowns')
        .update({
          items: state.items,
          updated_at: new Date().toISOString(),
          last_updated_by: userId
        })
        .eq('id', rundownId);

      if (error) throw error;

      setSaveStatus({
        isSaving: false,
        lastSaved: Date.now(),
        error: null
      });

      pendingChangesRef.current.clear();
      logger.info('✅ REALTIME: Force saved', { rundownId });
    } catch (error) {
      logger.error('❌ REALTIME: Force save failed', error);
      setSaveStatus(prev => ({
        ...prev,
        isSaving: false,
        error: error instanceof Error ? error.message : 'Save failed'
      }));
    }
  }, [state.items, rundownId, userId]);

  // Local-only state update (for immediate UI feedback without save/broadcast)
  const updateLocalState = useCallback((itemId: string, field: string, value: any) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  }, []);

  return {
    // State
    items: state.items,
    title: state.title,
    start_time: state.start_time,
    timezone: state.timezone,
    show_date: state.show_date,
    external_notes: state.external_notes,
    isLoading: state.isLoading,
    
    // Save status
    isSaving: saveStatus.isSaving,
    lastSaved: saveStatus.lastSaved,
    saveError: saveStatus.error,
    hasUnsavedChanges: pendingChangesRef.current.size > 0,
    
    // Actions
    handleCellEdit,
    handleRowInsert,
    handleRowDelete,
    handleRowMove,
    forceSave,
    updateLocalState,
    
    // Metadata
    isRealtimeEnabled: enabled,
    clientId,
    lastUpdate: state.lastUpdate
  };
};
