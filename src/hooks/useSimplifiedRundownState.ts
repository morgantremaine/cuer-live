import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useRundownState } from './useRundownState';
// Removed useSimpleAutoSave - using direct save approach
import { useStandaloneUndo } from './useStandaloneUndo';
import { useConsolidatedRealtimeRundown } from './useConsolidatedRealtimeRundown';
import { useUserColumnPreferences } from './useUserColumnPreferences';
import { useRundownStateCache } from './useRundownStateCache';
import { useGlobalTeleprompterSync } from './useGlobalTeleprompterSync';
// Removed complex cell edit systems - using simplified approach
import { signatureDebugger } from '@/utils/signatureDebugger'; // Enable signature monitoring
import { useActiveTeam } from './useActiveTeam';

import { globalFocusTracker } from '@/utils/focusTracker';
import { supabase } from '@/integrations/supabase/client';
import { normalizeBoolean } from '@/utils/booleanNormalization';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { createContentSignature } from '@/utils/contentSignature';

interface UseSimplifiedRundownStateOptions {
  rundownId: string | null;
  enabled?: boolean;
  sharedLayoutId?: string | null; 
  isSharedView?: boolean;
}

export const useSimplifiedRundownState = ({
  rundownId,
  enabled = true,
  sharedLayoutId = null,
  isSharedView = false
}: UseSimplifiedRundownStateOptions) => {
  const { user } = useAuth();
  const { activeTeamId } = useActiveTeam();
  
  // Core state management
  const { state, actions } = useRundownState({}, rundownId || '');
  
  // SIMPLIFIED: Track basic state
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastKnownTimestamp, setLastKnownTimestamp] = useState<string | null>(null);
  const [lastSeenDocVersion, setLastSeenDocVersion] = useState<number>(0);
  
  // SIMPLIFIED: Basic save state
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Refs for managing state
  const initialLoadGateRef = useRef(true);
  const blockUntilLocalEditRef = useRef(false);
  
  // SIMPLIFIED: Enhanced update handling with cell broadcast support
  const handleRealtimeUpdate = useCallback((updatedRundown: any) => {
    try {
      console.log('📡 Enhanced realtime update processing:', {
        timestamp: updatedRundown.updated_at,
        docVersion: updatedRundown.doc_version
      });

      // SIMPLIFIED: Direct state update - no complex protection
      actions.loadState(updatedRundown);
      
      if (updatedRundown.doc_version) {
        setLastSeenDocVersion(updatedRundown.doc_version);
      }
      
      setLastKnownTimestamp(updatedRundown.updated_at);
    } catch (error) {
      console.error('❌ Error processing realtime update:', error);
    }
  }, [actions]);

  // SIMPLIFIED: Cell broadcast handling
  const handleCellBroadcast = useCallback((update: any) => {
    console.log('📱 Cell broadcast received:', update);
    
    if (!update.itemId || !update.field) {
      console.warn('⚠️ Invalid cell broadcast update:', update);
      return;
    }

    try {
      // SIMPLIFIED: Direct application without LocalShadow protection
      console.log('📱 Applying cell broadcast update (simplified - no protection):', update);
      
      // LAST WRITER WINS: Just apply the change immediately
      // Use loadState to avoid triggering hasUnsavedChanges for remote data
      const currentItems = state.items || [];
      const updatedItems = currentItems.map((item: any) => {
        if (item.id === update.itemId) {
          return { ...item, [update.field]: update.value };
        }
        return item;
      });
      
      actions.loadState({
        ...state,
        items: updatedItems
      });

      console.log('✅ ALLOWING - user is NOT typing this field:', update.itemId, update.field);
    } catch (error) {
      console.error('❌ Error applying cell broadcast:', error);
    }
  }, [state, actions]);

  // SIMPLIFIED: Realtime connection
  const realtimeConnection = useConsolidatedRealtimeRundown({
    rundownId,
    // removed lastSeenDocVersion - simplified approach
    onRundownUpdate: useCallback((updatedRundown) => {
      handleRealtimeUpdate(updatedRundown);
    }, [handleRealtimeUpdate]),
    enabled: enabled && !!rundownId,
    isSharedView,
    trackOwnUpdate: () => {
      // Simplified tracking
    },
    isOwnUpdate: () => false
  });

  // Register cell broadcast handler
  useEffect(() => {
    if (!rundownId || !user?.id) return;

    const unsubscribe = cellBroadcast.subscribeToCellUpdates(rundownId, handleCellBroadcast);
    console.log('📱 Cell broadcast: Subscribed to updates for rundown', rundownId);

    return () => {
      unsubscribe();
      console.log('📱 Cell broadcast: Unsubscribed from rundown', rundownId);
    };
  }, [rundownId, user?.id, handleCellBroadcast]);

  // SIMPLIFIED: Save function
  const saveState = useCallback(async () => {
    if (!rundownId || !state.items) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('rundowns')
        .update({
          items: state.items,
          title: state.title,
          start_time: state.startTime,
          timezone: state.timezone,
          external_notes: state.externalNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', rundownId);

      if (error) throw error;
      
      setHasUnsavedChanges(false);
      console.log('💾 Save completed successfully');
    } catch (error) {
      console.error('❌ Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [rundownId, state]);

  // Wrapper to match expected interface signature
  const updateItemWrapper = (itemId: string, field: string, value: any) => {
    updateItem(itemId, { [field]: value });
  };
  const updateItem = useCallback((itemId: string, updates: any) => {
    console.log('📝 RUNDOWN INDEX: onUpdateItem called (from typing)', { itemId, updates });
    
    actions.updateItem(itemId, updates);
    setHasUnsavedChanges(true);
    
    // Broadcast the change immediately
    if (user?.id) {
      Object.keys(updates).forEach(field => {
        cellBroadcast.broadcastCellUpdate(
          rundownId!,
          itemId,
          field,
          updates[field],
          user.id
        );
      });
    }
  }, [actions, rundownId, user?.id]);

  // SIMPLIFIED: Initial load
  useEffect(() => {
    if (!rundownId || !enabled) {
      setIsInitialized(false);
      return;
    }

    const loadInitialData = async () => {
      try {
        const { data, error } = await supabase
          .from('rundowns')
          .select('*')
          .eq('id', rundownId)
          .single();

        if (error) throw error;
        if (data) {
          actions.loadState(data);
          setLastKnownTimestamp(data.updated_at);
          setLastSeenDocVersion(data.doc_version || 0);
          setIsInitialized(true);
          initialLoadGateRef.current = false;
        }
      } catch (error) {
        console.error('❌ Failed to load rundown:', error);
      }
    };

    loadInitialData();
  }, [rundownId, enabled, actions]);

  // Return object matching expected interface
  return {
    // Core state
    ...state,
    rundownId,
    rundownTitle: state.title,
    rundownStartTime: state.startTime,
    isInitialized,
    isLoading: !isInitialized,
    isSaving,
    hasUnsavedChanges,
    isConnected: realtimeConnection.isConnected,
    selectedRowId: null,
    currentTime: Date.now(),
    isProcessingRealtimeUpdate: false,
    
    // Core actions
    updateItem,
    saveState,
    addRow: actions.addItem,
    addHeader: (item: any, index?: number) => actions.addItem(item, index),
    deleteRow: actions.deleteItem,
    saveUndoState: () => {},
    markStructuralChange: () => {},
    clearStructuralChange: () => {},
    handleRowSelection: () => {},
    addRowAtIndex: (index: number) => actions.addItem({} as any, index),
    addHeaderAtIndex: (index: number) => actions.addItem({} as any, index),
    clearRowSelection: () => {},
    toggleFloat: () => {},
    addColumn: () => {},
    updateColumnWidth: () => {},
    undo: () => {},
    canUndo: false,
    lastAction: null,
    markActiveTyping: () => {},
    ...actions,
    
    // Simplified handlers that match expected interfaces
    handleCellChange: updateItemWrapper
  };
};