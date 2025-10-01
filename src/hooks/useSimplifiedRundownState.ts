import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useRundownState } from './useRundownState';
import { useSimpleAutoSave } from './useSimpleAutoSave';
import { useStandaloneUndo } from './useStandaloneUndo';
import { useConsolidatedRealtimeRundown } from './useConsolidatedRealtimeRundown';
import { useUserColumnPreferences } from './useUserColumnPreferences';
import { useRundownStateCache } from './useRundownStateCache';
import { useGlobalTeleprompterSync } from './useGlobalTeleprompterSync';
import { useCellEditIntegration } from './useCellEditIntegration';
import { usePerCellSaveCoordination } from './usePerCellSaveCoordination';
import { signatureDebugger } from '@/utils/signatureDebugger'; // Enable signature monitoring
import { useActiveTeam } from './useActiveTeam';

import { globalFocusTracker } from '@/utils/focusTracker';
import { supabase } from '@/integrations/supabase/client';
import { normalizeBoolean } from '@/utils/booleanNormalization';
import { Column } from '@/types/columns';
import { createDefaultRundownItems } from '@/data/defaultRundownItems';
import { calculateItemsWithTiming, calculateTotalRuntime, calculateHeaderDuration } from '@/utils/rundownCalculations';
import { RUNDOWN_DEFAULTS } from '@/constants/rundownDefaults';
import { DEMO_RUNDOWN_ID, DEMO_RUNDOWN_DATA } from '@/data/demoRundownData';
import { updateTimeFromServer } from '@/services/UniversalTimeService';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { useCellUpdateCoordination } from './useCellUpdateCoordination';
import { useRealtimeActivityIndicator } from './useRealtimeActivityIndicator';
import { debugLogger } from '@/utils/debugLogger';

export const useSimplifiedRundownState = () => {
  const params = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const rundownId = params.id === 'new' ? null : (location.pathname === '/demo' ? DEMO_RUNDOWN_ID : params.id) || null;
  
  const { shouldSkipLoading, setCacheLoading } = useRundownStateCache(rundownId);
  const { activeTeamId, loading: activeTeamLoading } = useActiveTeam();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(!shouldSkipLoading);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showcallerActivity, setShowcallerActivity] = useState(false);
  const [lastKnownTimestamp, setLastKnownTimestamp] = useState<string | null>(null);
  const [lastSeenDocVersion, setLastSeenDocVersion] = useState<number>(0);
  
  
  // Connection state will come from realtime hook
  const [isConnected, setIsConnected] = useState(false);

  // Typing tracking for conflict detection
  const typingSessionRef = useRef<{ fieldKey: string; startTime: number } | null>(null);
  const recentCellUpdatesRef = useRef<Map<string, { timestamp: number; value: any; clientId?: string }>>(new Map());
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const activeFocusFieldRef = useRef<string | null>(null);
  
  // Track per-cell save enabled state to coordinate saving systems
  const [isPerCellSaveEnabled, setIsPerCellSaveEnabled] = useState(false);
  
  // Track structural operation save state
  const [isStructuralSaving, setIsStructuralSaving] = useState(false);
  const [hasStructuralUnsavedChanges, setHasStructuralUnsavedChanges] = useState(false);
  
  // Remove broadcast timeouts - no throttling of core functionality
  const lastRemoteUpdateRef = useRef<number>(0);
  const conflictResolutionTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Simplified: Just track typing for debounce
  const TYPING_DEBOUNCE_MS = 500;
  
  // Track if we've primed the autosave after initial load
  const lastSavedPrimedRef = useRef(false);
  
  // Track last save time for race condition detection
  const lastSaveTimeRef = useRef<number>(0);
  
  // Simplified: No protection needed - operations handle sync
  // =================================================================================
  
  // Listen to global focus tracker  
  useEffect(() => {
    const unsubscribe = globalFocusTracker.onActiveFieldChange((fieldKey) => {
      activeFocusFieldRef.current = fieldKey;
    });
    
    return unsubscribe;
  }, []);



  // Dropdown protection removed - operations handle sync directly

  // Track latest items state for rapid structural operations
  const latestItemsRef = useRef<any[]>([]);

  // Initialize with default data (WITHOUT columns - they're now user-specific)
  const {
    state,
    actions,
    helpers
  } = useRundownState({
    items: [],
    columns: [], // Empty - will be managed separately
    title: 'Untitled Rundown',
    startTime: '09:00:00',
    timezone: 'America/New_York',
    showDate: null
  }, rundownId || undefined); // Pass rundownId for broadcast functionality

  // Keep latestItemsRef in sync with state.items
  useEffect(() => {
    latestItemsRef.current = state.items;
  }, [state.items]);

  // User-specific column preferences (separate from team sync)
  const {
    columns,
    updateColumns: setColumns, // Use updateColumns for external API compatibility
    isLoading: isLoadingColumns,
    isSaving: isSavingColumns
  } = useUserColumnPreferences(rundownId);

  // Global teleprompter sync to show blue Wi-Fi when teleprompter saves
  const teleprompterSync = useGlobalTeleprompterSync();

  // Handle conflict resolution from auto-save
  const handleConflictResolved = useCallback((mergedData: any) => {
    
    // Apply merged data to state
    actions.loadState({
      items: mergedData.items || [],
      columns: [], // Keep columns separate
      title: mergedData.title || state.title,
      startTime: mergedData.start_time || state.startTime,
      timezone: mergedData.timezone || state.timezone,
      showDate: mergedData.show_date ? new Date(mergedData.show_date + 'T00:00:00') : state.showDate,
      externalNotes: mergedData.external_notes !== undefined ? mergedData.external_notes : state.externalNotes,
      docVersion: mergedData.doc_version || 0 // CRITICAL: Include docVersion for OCC
    });
    
    // Update timestamp and docVersion tracking
    if (mergedData.updated_at) {
      setLastKnownTimestamp(mergedData.updated_at);
    }
    if (mergedData.doc_version) {
      setLastSeenDocVersion(mergedData.doc_version);
    }
  }, [actions, state.title, state.startTime, state.timezone]);

  // Auto-save functionality with unified save pipeline (no setTrackOwnUpdate needed - uses centralized tracker)
  const { isSaving, setUndoActive, markActiveTyping, triggerImmediateSave } = useSimpleAutoSave(
    {
      ...state,
      columns: [] // Remove columns from team sync
    }, 
    rundownId, 
    (meta?: { updatedAt?: string; docVersion?: number }) => {
      actions.markSaved();
      
      // Track save time for race condition detection in cell broadcasts
      lastSaveTimeRef.current = Date.now();
      
      // Update our doc version and timestamp tracking
      if (meta?.docVersion) {
        setLastSeenDocVersion(meta.docVersion);
        actions.setDocVersion(meta.docVersion); // CRITICAL: Update state docVersion
      }
      if (meta?.updatedAt) {
        setLastKnownTimestamp(meta.updatedAt);
      }
      
      // Prime lastSavedRef after initial load to prevent false autosave triggers
      if (isInitialized && !lastSavedPrimedRef.current) {
        lastSavedPrimedRef.current = true;
      }
      
      // CRITICAL: When per-cell save is enabled, bypass main autosave hasUnsavedChanges
      if (isPerCellSaveEnabled) {
        console.log('🧪 MAIN SAVE: Per-cell save mode - main system marking saved after coordination');
      }
      
      // Coordinate with teleprompter saves to prevent conflicts
      if (teleprompterSync.isTeleprompterSaving) {
        debugLogger.autosave('Main rundown saved while teleprompter active - coordinating...');
      }
    },
    undefined, // No longer needed - operations handle sync
    undefined, // Legacy ref no longer needed
    (isInitialized && !isLoadingColumns) // Wait for both rundown AND column initialization
  );

  // Standalone undo system - now with redo support
  const { saveState: saveUndoState, undo, redo, canUndo, canRedo, lastAction, nextAction } = useStandaloneUndo({
    onUndo: (items, _, title) => {
      setUndoActive(true);
      actions.setItems(items);
      actions.setTitle(title);
      
      setTimeout(() => {
        actions.markSaved();
        actions.setItems([...items]);
        setUndoActive(false);
      }, 100);
    },
    onRedo: (items, _, title) => {
      setUndoActive(true);
      actions.setItems(items);
      actions.setTitle(title);
      
      setTimeout(() => {
        actions.markSaved();
        actions.setItems([...items]);
        setUndoActive(false);
      }, 100);
    },
    getCurrentState: () => ({
      items: state.items,
      columns: state.columns,
      title: state.title
    }),
    setUndoActive
  });
 
  // Stable refs to avoid resubscribing on state changes
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const actionsRef = useRef(actions);
  useEffect(() => { actionsRef.current = actions; }, [actions]);

  // Track own updates for realtime filtering
  const ownUpdateTimestampRef = useRef<string | null>(null);

  // Simplified realtime connection - operations handle content sync
  const deferredUpdateRef = useRef<any>(null);
  
  const realtimeConnection = useConsolidatedRealtimeRundown({
    rundownId,
    lastSeenDocVersion,
    onRundownUpdate: useCallback((updatedRundown) => {
      // OPERATION-BASED SYNC: Content updates handled by operations, not realtime
      // This callback should only receive updates from fallback scenarios
      console.log('📡 Realtime content update received (should be rare with operations):', {
        hasItems: !!updatedRundown.items,
        itemCount: updatedRundown.items?.length || 0
      });
      
      // Apply update directly - operations handle sync
      const wouldClearItems = (!updatedRundown.items || updatedRundown.items.length === 0) && state.items.length > 0;
      
      if (wouldClearItems) {
        console.warn('🛡️ Prevented malformed update that would clear items');
        return;
      }
      
      const updateData: any = {};
      if (updatedRundown.hasOwnProperty('items')) updateData.items = updatedRundown.items || [];
      if (updatedRundown.hasOwnProperty('title')) updateData.title = updatedRundown.title;
      if (updatedRundown.hasOwnProperty('start_time')) updateData.startTime = updatedRundown.start_time;
      if (updatedRundown.hasOwnProperty('timezone')) updateData.timezone = updatedRundown.timezone;
      if (updatedRundown.hasOwnProperty('show_date')) updateData.showDate = updatedRundown.show_date ? new Date(updatedRundown.show_date + 'T00:00:00') : null;
      if (updatedRundown.hasOwnProperty('external_notes')) updateData.externalNotes = updatedRundown.external_notes;
      
      if (Object.keys(updateData).length > 0) {
        actions.loadState(updateData);
      }
      
      lastRemoteUpdateRef.current = Date.now();
    }, [state, actions]),
    enabled: !isLoading
  });
  
  // Update connection state from realtime hook
  useEffect(() => {
    setIsConnected(realtimeConnection.isConnected);
    console.log('🔌 Realtime connection status changed:', realtimeConnection.isConnected);
  }, [realtimeConnection.isConnected]);
  
  // Clear initial load gate after initialization and implement sync-before-write
  // Initial load gate no longer needed with operation-based sync

  // Get current user ID for cell broadcasts
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  // Cell-level broadcast system for immediate sync
  useEffect(() => {
    if (!rundownId || !currentUserId) return;

    const unsubscribe = cellBroadcast.subscribeToCellUpdates(rundownId, async (update) => {
      console.log('📱 Cell broadcast received:', update);
      
      // Skip our own updates (simplified for single sessions) - now handled early in cellBroadcast
      if (cellBroadcast.isOwnUpdate(update, currentUserId)) {
        console.log('📱 Skipping own cell broadcast update');
        return;
      }
      
      console.log('📱 Applying cell broadcast update (simplified - no protection):', update);
      
      try {
        // No protection needed - operations handle sync directly
        
        // LAST WRITER WINS: Just apply the change immediately
        // Use loadState to avoid triggering hasUnsavedChanges for remote data
          // Handle rundown-level property updates (no itemId)
        if (!update.itemId) {
          // Check if we're actively editing this rundown-level field
          const isActivelyEditing = typingSessionRef.current?.fieldKey === update.field;
          if (isActivelyEditing) {
            console.log('🛡️ Skipping rundown-level broadcast - actively editing:', update.field);
            return;
          }
          
          console.log('📲 Applying rundown-level broadcast update:', { field: update.field, value: update.value });
          
          // Apply rundown-level property changes using loadRemoteState to prevent AutoSave
          switch (update.field) {
            case 'title':
              actionsRef.current.loadRemoteState({ title: update.value });
              break;
            case 'startTime':
              actionsRef.current.loadRemoteState({ startTime: update.value });
              break;
            case 'timezone':
              actionsRef.current.loadRemoteState({ timezone: update.value });
              break;
            case 'showDate':
              actionsRef.current.loadRemoteState({ showDate: update.value });
              break;
            case 'items:reorder': {
              const order: string[] = Array.isArray(update.value?.order) ? update.value.order : [];
              if (order.length > 0) {
                const indexMap = new Map(order.map((id, idx) => [id, idx]));
                const reordered = [...stateRef.current.items].sort((a, b) => {
                  const ai = indexMap.has(a.id) ? (indexMap.get(a.id) as number) : Number.MAX_SAFE_INTEGER;
                  const bi = indexMap.has(b.id) ? (indexMap.get(b.id) as number) : Number.MAX_SAFE_INTEGER;
                  return ai - bi;
                });
                actionsRef.current.loadState({ items: reordered });
              }
              break;
            }
            case 'structural:reorder':
            case 'structural:add_row':
            case 'structural:delete_row':
            case 'structural:copy_rows': {
              // DISABLED: Structural operations now handled by operation queue system
              // These broadcasts would conflict with the operation-based synchronization
              console.log('⚠️ IGNORING STRUCTURAL BROADCAST (handled by operations):', update.field);
              break;
            }
            case 'items:add': {
              const payload = update.value || {};
              const item = payload.item;
              const index = Math.max(0, Math.min(payload.index ?? stateRef.current.items.length, stateRef.current.items.length));
              if (item && !stateRef.current.items.find(i => i.id === item.id)) {
                const newItems = [...stateRef.current.items];
                newItems.splice(index, 0, item);
                actionsRef.current.loadState({ items: newItems });
              }
              break;
            }
            case 'items:remove': {
              const id = update.value?.id as string;
              if (id) {
                const newItems = stateRef.current.items.filter(i => i.id !== id);
                if (newItems.length !== stateRef.current.items.length) {
                  actionsRef.current.loadState({ items: newItems });
                }
              }
              break;
            }
            default:
              console.warn('🚨 Unknown rundown-level field:', update.field);
          }
          
          return;
        }
        
          // Handle item-level updates (existing logic)
          if (update.field === 'structuralChange') {
            // Structural changes are handled by the normal realtime update flow
            console.log('📱 Item structural change detected - handled by realtime');
            return;
          }
          
          // ULTRA-SIMPLE: Only block if THIS EXACT field is being typed right now
          const fieldKey = `item_${update.itemId}-${update.field}`;
          const isTypingThisField = activeFocusFieldRef.current === fieldKey;
          
          if (isTypingThisField) {
            console.log('🛡️ BLOCKING - user is typing this exact field:', update.itemId, update.field);
            return;
          }
          
          console.log('✅ ALLOWING - user is NOT typing this field:', update.itemId, update.field);

          const updatedItems = stateRef.current.items.map(item => {
            if (item.id === update.itemId) {
              // Handle nested field updates (like customFields.field)
              if (update.field.includes('.')) {
                const [parentField, childField] = update.field.split('.');
                return {
                  ...item,
                  [parentField]: {
                    ...(item[parentField as keyof typeof item] as Record<string, any> || {}),
                    [childField]: update.value,
                  }
                };
              } else {
                // Handle boolean normalization for float fields
                const isBooleanFloatField = update.field === 'isFloating' || update.field === 'isFloated';
                if (isBooleanFloatField) {
                  const boolVal = normalizeBoolean(update.value);
                  return {
                    ...item,
                    isFloating: boolVal,
                    isFloated: boolVal
                  };
                }
                
                if (update.field === 'customFields') {
                  return {
                    ...item,
                    customFields: { ...item.customFields, ...update.value }
                  };
                } else {
                  return {
                    ...item,
                    [update.field]: update.value
                  };
                }
              }
            }
            return item;
          });

          if (updatedItems.some((item, index) => item !== stateRef.current.items[index])) {
            actionsRef.current.loadRemoteState({ items: updatedItems });
          }
      } finally {
        // Reset flag immediately since loadRemoteState won't trigger AutoSave
        // Changes applied
      }
    }, currentUserId);

    return () => {
      unsubscribe();
    };
  }, [rundownId, currentUserId]);
  
  // Cell edit integration for per-cell saves (after realtime connection is established)
  const perCellEnabled = Boolean(state.perCellSaveEnabled);
  
  // CRITICAL: Track per-cell enabled state to coordinate with autosave
  useEffect(() => {
    console.log('🧪 PER-CELL SAVE: State updated', {
      perCellSaveEnabled: state.perCellSaveEnabled,
      rundownId,
      isEnabled: perCellEnabled
    });
  }, [state.perCellSaveEnabled, rundownId, perCellEnabled]);
  
  const cellEditIntegration = useCellEditIntegration({
    rundownId,
    isPerCellEnabled: perCellEnabled,
    onSaveComplete: () => {
      console.log('🧪 PER-CELL SAVE: Save completed - marking main state as saved');
      actions.markSaved();
    },
    onSaveStart: () => {
      console.log('🧪 PER-CELL SAVE: Save started');
      // The isSaving state will be managed by the per-cell save system itself
    },
    onUnsavedChanges: () => {
      console.log('🧪 PER-CELL SAVE: Unsaved changes detected');
      // The hasUnsavedChanges will be managed by the per-cell save system itself
    }
  });
  
  // Get save coordination system for structural operations (per-cell saves always enabled)
  const saveCoordination = usePerCellSaveCoordination({
    rundownId,
    currentUserId,
    onSaveComplete: () => {
      console.log('🧪 STRUCTURAL SAVE: Save completed - updating UI state');
      setIsStructuralSaving(false);
      setHasStructuralUnsavedChanges(false);
      actions.markSaved();
    },
    onSaveStart: () => {
      console.log('🧪 STRUCTURAL SAVE: Save started - updating UI state');
      setIsStructuralSaving(true);
    },
    onUnsavedChanges: () => {
      console.log('🧪 STRUCTURAL SAVE: Unsaved changes - updating UI state');
      setHasStructuralUnsavedChanges(true);
    }
  });
  // Catch-up sync no longer needed with operation-based sync
  // Operations handle all content synchronization automatically
  
  // SYNC-BEFORE-WRITE: No longer needed with operation-based system
  // All edits are tracked via operations which maintain consistency

  // Apply deferred updates when save completes
  useEffect(() => {
    if (!isSaving && deferredUpdateRef.current) {
      const deferredUpdate = deferredUpdateRef.current;
      deferredUpdateRef.current = null;
      
      // Monotonic update guard for deferred updates too
      if (deferredUpdate.updated_at && lastKnownTimestamp) {
        const incomingTime = new Date(deferredUpdate.updated_at).getTime();
        const knownTime = new Date(lastKnownTimestamp).getTime();
        
        if (incomingTime <= knownTime) {
          console.log('⏭️ Stale deferred update ignored:', {
            incoming: deferredUpdate.updated_at,
            known: lastKnownTimestamp
          });
          return;
        }
      }
      
      // No cooldown needed - operations handle sync
      
      // Update our known timestamp and doc version
      if (deferredUpdate.updated_at) {
        setLastKnownTimestamp(deferredUpdate.updated_at);
      }
      if (deferredUpdate.doc_version) {
        setLastSeenDocVersion(deferredUpdate.doc_version);
      }
      
      // Apply update directly - operations handle sync
      actions.loadState({
        items: deferredUpdate.items || [],
        title: deferredUpdate.title,
        startTime: deferredUpdate.start_time,
        timezone: deferredUpdate.timezone,
        showDate: deferredUpdate.show_date ? new Date(deferredUpdate.show_date + 'T00:00:00') : null
      });
    }
  }, [isSaving, actions, state.items, state.title, state.startTime, state.timezone, state.showDate]);

  // Realtime connection is simplified - operations handle content sync
  // No need for typing/unsaved checkers with operation-based system


  // Enhanced updateItem function with aggressive field-level protection tracking
  const enhancedUpdateItem = useCallback((id: string, field: string, value: string) => {
    // No blocking needed - operations handle sync
    // Check if this is a typing field or immediate-sync field
    const isTypingField = field === 'name' || field === 'script' || field === 'talent' || field === 'notes' || 
                         field === 'gfx' || field === 'video' || field === 'images' || field.startsWith('customFields.') || field === 'segmentName';
    const isImmediateSyncField = field === 'isFloating'; // Fields that need immediate database sync (removed color)
    
    const sessionKey = `${id}-${field}`;
    
    // Simplified: No field tracking needed - last writer wins
    
    // Broadcast cell update immediately for Google Sheets-style sync (no throttling - core functionality)
    if (rundownId && currentUserId) {
      cellBroadcast.broadcastCellUpdate(rundownId, id, field, value, currentUserId);
    }
    
    if (isTypingField) {
      // CRITICAL: Tell autosave system that user is actively typing
      markActiveTyping();
      
      if (!typingSessionRef.current || typingSessionRef.current.fieldKey !== sessionKey) {
        saveUndoState(state.items, [], state.title, `Edit ${field}`);
        typingSessionRef.current = {
          fieldKey: sessionKey,
          startTime: Date.now()
        };
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        if (typingSessionRef.current?.fieldKey === sessionKey) {
          typingSessionRef.current = null;
        }
      }, 3000); // Reduced to 3 seconds for faster sync
    } else if (field === 'duration') {
      saveUndoState(state.items, [], state.title, 'Edit duration');
    } else if (isImmediateSyncField) {
      // For immediate sync fields like isFloating, save undo state and trigger immediate save
      console.log('🔄 FloatToggle: triggering immediate save for field:', field, 'id:', id);
      saveUndoState(state.items, [], state.title, `Toggle ${field}`);
      // DON'T use markActiveTyping() for floating - that triggers typing delay
      // Instead, trigger an immediate flush save that bypasses the typing delay mechanism
      triggerImmediateSave();
    } else if (field === 'color') {
      // Handle color changes separately - save undo state and trigger immediate save
      saveUndoState(state.items, [], state.title, 'Change row color');
      // Color changes should trigger immediate save without marking as typing
      triggerImmediateSave();
    }
    
    if (field.startsWith('customFields.')) {
      const customFieldKey = field.replace('customFields.', '');
      const item = state.items.find(i => i.id === id);
      if (item) {
        const currentCustomFields = item.customFields || {};
        actions.updateItem(id, {
          customFields: {
            ...currentCustomFields,
            [customFieldKey]: value
          }
        });
      }
    } else {
      let updateField = field;
      if (field === 'segmentName') updateField = 'name';
      
      // Handle boolean fields that come as strings from cell broadcasts
      let updateValue: any = value;
      if (field === 'isFloating') {
        updateValue = value === 'true';
      }
      
      actions.updateItem(id, { [updateField]: updateValue });
      
      // Track field change for per-cell save system
      if (cellEditIntegration.isPerCellEnabled) {
        cellEditIntegration.handleCellChange(id, updateField, updateValue);
      }
    }
  }, [actions.updateItem, state.items, state.title, saveUndoState, cellEditIntegration]);

  // Simplified handlers - enhanced for per-cell save coordination
  const markStructuralChange = useCallback((operationType?: string, operationData?: any, overrideUserId?: string | null) => {
    // Use override user ID if provided, otherwise fall back to internal state
    const userIdToUse = overrideUserId || currentUserId;
    
    console.log('🏗️ markStructuralChange called', {
      perCellEnabled: Boolean(state.perCellSaveEnabled),
      rundownId,
      operationType,
      operationData,
      userIdToUse,
      hadOverride: !!overrideUserId
    });
    
    // For per-cell save mode, structural operations need immediate save coordination
    if (state.perCellSaveEnabled && cellEditIntegration) {
      console.log('🏗️ STRUCTURAL: Per-cell mode - triggering coordinated structural save');
      
      // If we have operation details, use the per-cell coordination system
      if (operationType && operationData && saveCoordination && userIdToUse) {
        // CRITICAL: Use latestItemsRef to get current state for rapid operations
        const currentOperationData = {
          ...operationData,
          items: latestItemsRef.current // Always use the most current items
        };
        
        console.log('🏗️ STRUCTURAL: Triggering handleStructuralOperation', {
          operationType,
          operationData: currentOperationData,
          userIdToUse,
          itemCount: latestItemsRef.current.length
        });
        saveCoordination.handleStructuralOperation(operationType as any, currentOperationData);
      } else {
        console.log('🏗️ STRUCTURAL: Missing required parameters', {
          hasOperationType: !!operationType,
          hasOperationData: !!operationData,
          hasSaveCoordination: !!saveCoordination,
          hasUserId: !!userIdToUse
        });
        // Fallback - just mark as saved for now
        setTimeout(() => {
          console.log('🏗️ STRUCTURAL: Marking saved after per-cell structural operation');
          actions.markSaved();
        }, 100);
      }
    }
    // For regular autosave mode, no action needed - autosave handles it
  }, [state.perCellSaveEnabled, rundownId, actions.markSaved, cellEditIntegration, saveCoordination, currentUserId]);

  // Clear structural change flag
  const clearStructuralChange = useCallback(() => {
    console.log('🏗️ clearStructuralChange called', {
      perCellEnabled: Boolean(state.perCellSaveEnabled)
    });
    // For per-cell mode, this is handled by markStructuralChange
    // For regular autosave mode, no action needed
  }, [state.perCellSaveEnabled]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load rundown data if we have an ID (content only, columns loaded separately)
  useEffect(() => {
    const loadRundown = async () => {
      if (!rundownId) return;

      // Check if we already have this rundown loaded to prevent reload
      if (isInitialized && state.items.length > 0) {
        console.log('📋 Skipping reload - rundown already loaded:', rundownId);
        return;
      }

      // Don't show loading if we have cached state
      if (shouldSkipLoading) {
        console.log('📋 Skipping loading state - using cached data for:', rundownId);
        setIsLoading(false);
        setIsInitialized(true);
        console.log('✅ Initialization complete (cached):', rundownId);
        return;
      }

      setIsLoading(true);
      setCacheLoading(true);
      try {
        // Check if this is a demo rundown
        if (rundownId === DEMO_RUNDOWN_ID) {
          console.log('📋 Loading demo rundown data');
          
          // Load demo data instead of from database
          actions.loadState({
            items: DEMO_RUNDOWN_DATA.items,
            columns: [],
            title: DEMO_RUNDOWN_DATA.title,
            startTime: DEMO_RUNDOWN_DATA.start_time,
            timezone: DEMO_RUNDOWN_DATA.timezone
          });
          
          
        } else {
          // Normal database loading for real rundowns
          const { data, error } = await supabase
            .from('rundowns')
            .select('*')
            .eq('id', rundownId)
            .maybeSingle();

          if (error) {
            console.error('Error loading rundown:', error);
          } else if (data) {
            // Merge item_field_updates with items array
            let itemsToLoad = Array.isArray(data.items) && data.items.length > 0 
              ? data.items 
              : createDefaultRundownItems();
            
            // Apply field updates from item_field_updates JSONB column
            if (data.item_field_updates && typeof data.item_field_updates === 'object') {
              console.log('🧪 PER-CELL LOAD: Merging field updates into items', {
                rundownId,
                fieldUpdateCount: Object.keys(data.item_field_updates).length
              });
              
              itemsToLoad = itemsToLoad.map(item => {
                const fieldUpdates = (data.item_field_updates as Record<string, any>)[item.id];
                if (fieldUpdates && typeof fieldUpdates === 'object') {
                  // Merge field updates into item
                  const mergedItem = { ...item };
                  for (const [field, updateData] of Object.entries(fieldUpdates)) {
                    if (updateData && typeof updateData === 'object' && 'value' in updateData) {
                      mergedItem[field] = (updateData as any).value;
                    }
                  }
                  return mergedItem;
                }
                return item;
              });
              
              console.log('✅ PER-CELL LOAD: Field updates merged successfully');
            }

            // Sync time from server timestamp and store it
            if (data.updated_at) {
              updateTimeFromServer(data.updated_at);
              setLastKnownTimestamp(data.updated_at);
            }
            
            // CRITICAL: Set docVersion for OCC
            if (data.doc_version) {
              setLastSeenDocVersion(data.doc_version);
            }

            // Load content only (columns handled by useUserColumnPreferences)
            actions.loadState({
              items: itemsToLoad,
              columns: [], // Never load columns from rundown - use user preferences
              title: data.title || 'Untitled Rundown',
              startTime: data.start_time || '09:00:00',
              timezone: data.timezone || 'America/New_York',
              showDate: data.show_date ? new Date(data.show_date + 'T00:00:00') : null,
              externalNotes: data.external_notes,
              docVersion: data.doc_version || 0, // CRITICAL: Include docVersion for OCC
              perCellSaveEnabled: data.per_cell_save_enabled || false // Include per-cell save setting
            });
            
            console.log('🧪 PER-CELL SAVE: Loaded from database', {
              rundownId,
              per_cell_save_enabled: data.per_cell_save_enabled,
              willUsePerCellSave: data.per_cell_save_enabled || false
            });
          }
        }
      } catch (error) {
        console.error('Failed to load rundown:', error);
        // DON'T replace existing data with blank data on error!
        // Only load default data if we have no existing data
        if (state.items.length === 0) {
          actions.loadState({
            items: createDefaultRundownItems(),
            columns: [],
            title: 'Untitled Rundown',
            startTime: '09:00:00',
            timezone: 'America/New_York'
          });
        }
        // If we have existing data, preserve it and show error in console
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
        setCacheLoading(false);
        console.log('✅ Initialization complete (loaded):', rundownId);
      }
    };

    loadRundown();
  }, [rundownId]); // Remove isInitialized dependency to prevent reload

  // Handle data refreshing from resumption
  const handleDataRefresh = useCallback((latestData: any) => {
    // Update timestamp first
    if (latestData.updated_at) {
      setLastKnownTimestamp(latestData.updated_at);
      updateTimeFromServer(latestData.updated_at);
    }
    
    // CRITICAL: Update docVersion for OCC
    if (latestData.doc_version) {
      setLastSeenDocVersion(latestData.doc_version);
    }
    
    // Merge item_field_updates with items array
    let itemsToApply = latestData.items || [];
    if (latestData.item_field_updates && typeof latestData.item_field_updates === 'object') {
      console.log('🧪 PER-CELL REFRESH: Merging field updates into items');
      
      itemsToApply = itemsToApply.map((item: any) => {
        const fieldUpdates = (latestData.item_field_updates as Record<string, any>)[item.id];
        if (fieldUpdates && typeof fieldUpdates === 'object') {
          const mergedItem = { ...item };
          for (const [field, updateData] of Object.entries(fieldUpdates)) {
            if (updateData && typeof updateData === 'object' && 'value' in updateData) {
              mergedItem[field] = (updateData as any).value;
            }
          }
          return mergedItem;
        }
        return item;
      });
    }
    
    // Apply latest data - operations handle sync
    actions.loadState({
      items: itemsToApply,
      title: latestData.title,
      startTime: latestData.start_time,
      timezone: latestData.timezone,
      showDate: latestData.show_date ? new Date(latestData.show_date + 'T00:00:00') : null,
      externalNotes: latestData.external_notes,
      docVersion: latestData.doc_version || 0 // CRITICAL: Include docVersion for OCC
    });
  }, [actions, state.items, state.title, state.startTime, state.timezone, state.showDate, state.externalNotes]);

  // Simplified: No tab-based refresh needed with single sessions
  // Data freshness is maintained through realtime updates only

  useEffect(() => {
    // Wait for activeTeamId to finish loading before creating rundown
    if (!rundownId && !isInitialized && params.id === 'new' && !activeTeamLoading) {
      console.log('🆕 Creating new rundown automatically with team:', activeTeamId);
      setIsLoading(true);
      
      const createNewRundown = async () => {
        try {
          // Get current user and team info
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData.user) {
            throw new Error('User not authenticated');
          }
          
          if (!activeTeamId) {
            console.error('❌ No active team selected when creating rundown');
            throw new Error('No active team selected');
          }
          
          // Get folder ID from location state if available
          const folderId = location.state?.folderId || null;
          
          // Create the rundown in the database
          const { data, error } = await supabase
            .from('rundowns')
            .insert({
              title: 'Untitled Rundown',
              items: createDefaultRundownItems(),
              user_id: userData.user.id,
              team_id: activeTeamId,
              folder_id: folderId,
              archived: false,
              show_date: new Date().toISOString().split('T')[0] // Set current date in YYYY-MM-DD format
            })
            .select()
            .single();
          
          if (error) throw error;
          
          console.log('✅ New rundown created with ID:', data.id);
          
          // Navigate to the actual rundown URL via React Router (replace history)
          navigate(`/rundown/${data.id}`, { replace: true });
          // Load the newly created rundown data
          actions.loadState({
            items: Array.isArray(data.items) ? data.items : createDefaultRundownItems(),
            columns: [],
            title: data.title || 'Untitled Rundown',
            startTime: data.start_time || '09:00:00',
            timezone: data.timezone || 'America/New_York',
            showDate: data.show_date ? new Date(data.show_date + 'T00:00:00') : null,
            docVersion: data.doc_version || 0 // CRITICAL: Include docVersion for OCC
          });
          
          setLastKnownTimestamp(data.updated_at);
          setLastSeenDocVersion(data.doc_version || 0);
          setIsInitialized(true);
          setIsLoading(false);
          
        } catch (error) {
          console.error('❌ Failed to create new rundown:', error);
          // Fallback to local-only mode
          actions.loadState({
            items: createDefaultRundownItems(),
            columns: [],
            title: 'Untitled Rundown',
            startTime: '09:00:00',
            timezone: 'America/New_York'
          });
          setIsInitialized(true);
          setIsLoading(false);
          console.log('✅ Initialized with fallback data (new rundown)');
        }
      };
      
      createNewRundown();
    } else if (!rundownId && !isInitialized) {
      // Handle other cases where rundownId is null but not 'new'
      actions.loadState({
        items: createDefaultRundownItems(),
        columns: [],
        title: 'Untitled Rundown',
        startTime: '09:00:00',
        timezone: 'America/New_York'
      });
      setIsLoading(false);
      setIsInitialized(true);
      console.log('✅ Initialization complete (new rundown)');
    }
  }, [rundownId, isInitialized, actions, params.id, location.state, navigate, activeTeamId, activeTeamLoading]);

  // Calculate all derived values using pure functions - unchanged
  const calculatedItems = useMemo(() => {
    if (!state.items || !Array.isArray(state.items)) {
      return [];
    }
    
    const calculated = calculateItemsWithTiming(state.items, state.startTime);
    return calculated;
  }, [state.items, state.startTime]);

  const totalRuntime = useMemo(() => {
    if (!state.items || !Array.isArray(state.items)) return '00:00:00';
    return calculateTotalRuntime(state.items);
  }, [state.items]);

  // Enhanced actions with undo state saving (content only)
  const enhancedActions = {
    ...actions,
    ...helpers,
    
    updateItem: enhancedUpdateItem,

    toggleFloatRow: useCallback((id: string) => {
      saveUndoState(state.items, [], state.title, 'Toggle float');
      const item = state.items.find(i => i.id === id);
      if (item) {
        // Use enhancedUpdateItem for proper cell broadcasting
        enhancedUpdateItem(id, 'isFloating', !item.isFloating ? 'true' : 'false');
      }
    }, [enhancedUpdateItem, state.items, state.title, saveUndoState]),

    deleteRow: useCallback((id: string) => {
      saveUndoState(state.items, [], state.title, 'Delete row');
      
      // Use latestItemsRef for rapid operations to avoid stale state
      const currentItems = latestItemsRef.current.length > 0 ? latestItemsRef.current : state.items;
      const newItems = currentItems.filter(item => item.id !== id);
      
      // Update ref immediately for next rapid operation
      latestItemsRef.current = newItems;
      
      actions.deleteItem(id);
      
      // Always trigger structural save coordination - markStructuralChange handles the logic internally
      console.log('🟢 DELETE ROW: Calling markStructuralChange');
      markStructuralChange('delete_row', { items: newItems, deletedIds: [id] }, currentUserId);
      
      // Broadcast row removal for immediate realtime sync
      if (rundownId && currentUserId) {
        cellBroadcast.broadcastCellUpdate(
          rundownId,
          undefined,
          'items:remove',
          { id },
          currentUserId
        );
      }
    }, [actions.deleteItem, state.items, state.title, saveUndoState, rundownId, currentUserId, cellEditIntegration.isPerCellEnabled, markStructuralChange]),

    addRow: useCallback((calculateEndTime?: any, selectedRowId?: string | null, selectedRows?: Set<string>, count: number = 1) => {
      console.log('🟢🟢🟢 ADD ROW START - enhancedActions.addRow called with count:', count);
      console.log('🟢🟢🟢 ADD ROW: Per-cell enabled?', cellEditIntegration.isPerCellEnabled);
      console.log('🟢🟢🟢 ADD ROW: Has saveCoordination?', !!saveCoordination);
      console.log('🟢🟢🟢 ADD ROW: Current userId?', currentUserId);
      saveUndoState(state.items, [], state.title, `Add ${count} segment${count > 1 ? 's' : ''}`);
      
      // Determine insert index based on selection
      let insertIndex = state.items.length;
      if (selectedRowId) {
        const selectedIndex = state.items.findIndex(item => item.id === selectedRowId);
        if (selectedIndex !== -1) {
          insertIndex = selectedIndex + 1;
        }
      } else if (selectedRows && selectedRows.size > 0) {
        const selectedIds = Array.from(selectedRows);
        const indices = selectedIds
          .map(id => state.items.findIndex(item => item.id === id))
          .filter(idx => idx !== -1);
        if (indices.length > 0) {
          const maxIndex = Math.max(...indices);
          insertIndex = maxIndex + 1;
        }
      }
      
      console.log('🟢 Creating', count, 'new items at insertIndex:', insertIndex);
      
      // Create and add multiple items
      const newItemsToAdd = [];
      for (let i = 0; i < count; i++) {
        newItemsToAdd.push({
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'segment' as const,
          rowNumber: '',
          name: 'New Segment',
          startTime: '',
          duration: '00:00:30',
          endTime: '',
          elapsedTime: '00:00:00',
          talent: '',
          script: '',
          gfx: '',
          video: '',
          images: '',
          notes: '',
          color: '#000000',
          isFloating: false
        });
      }
      
      // Insert all items at once
      const currentItems = latestItemsRef.current.length > 0 ? latestItemsRef.current : state.items;
      const newItems = [
        ...currentItems.slice(0, insertIndex),
        ...newItemsToAdd,
        ...currentItems.slice(insertIndex)
      ];
      
      latestItemsRef.current = newItems;
      console.log('🟢🟢🟢 ADD ROW: About to call actions.setItems with', newItems.length, 'items');
      actions.setItems(newItems);
      console.log('🟢🟢🟢 ADD ROW: actions.setItems called successfully');
      
      // Always trigger structural save coordination - markStructuralChange handles the logic internally
      console.log('🟢 ADD ROW: Calling markStructuralChange');
      markStructuralChange('add_row', { items: newItems, newItems: newItemsToAdd, insertIndex }, currentUserId);
      
      // Broadcast row addition for immediate realtime sync (like delete does)
      if (rundownId && currentUserId) {
        cellBroadcast.broadcastCellUpdate(
          rundownId,
          undefined,
          'structural:add_row',
          { items: newItems, newItems: newItemsToAdd, insertIndex },
          currentUserId
        );
      }
    }, [actions.setItems, state.items, state.title, saveUndoState, cellEditIntegration.isPerCellEnabled, markStructuralChange, currentUserId, rundownId, saveCoordination]),

    addHeader: useCallback((selectedRowId?: string | null, selectedRows?: Set<string>) => {
      console.log('🟢 enhancedActions.addHeader called');
      saveUndoState(state.items, [], state.title, 'Add header');
      
      // Determine insert index based on selection
      let insertIndex = state.items.length;
      if (selectedRowId) {
        const selectedIndex = state.items.findIndex(item => item.id === selectedRowId);
        if (selectedIndex !== -1) {
          insertIndex = selectedIndex + 1;
        }
      } else if (selectedRows && selectedRows.size > 0) {
        const selectedIds = Array.from(selectedRows);
        const indices = selectedIds
          .map(id => state.items.findIndex(item => item.id === id))
          .filter(idx => idx !== -1);
        if (indices.length > 0) {
          const maxIndex = Math.max(...indices);
          insertIndex = maxIndex + 1;
        }
      }
      
      console.log('🟢 Creating new header at insertIndex:', insertIndex);
      
      // Create the new header item
      const newHeaderItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'header' as const,
        rowNumber: 'A',
        name: 'New Header',
        startTime: '',
        duration: '00:00:00',
        endTime: '',
        elapsedTime: '00:00:00',
        talent: '',
        script: '',
        gfx: '',
        video: '',
        images: '',
        notes: '',
        color: '#000000',
        isFloating: false
      };
      
      // Insert the header
      const currentItems = latestItemsRef.current.length > 0 ? latestItemsRef.current : state.items;
      const newItems = [
        ...currentItems.slice(0, insertIndex),
        newHeaderItem,
        ...currentItems.slice(insertIndex)
      ];
      
      latestItemsRef.current = newItems;
      actions.setItems(newItems);
      
      // Always trigger structural save coordination - markStructuralChange handles the logic internally
      console.log('🟢 ADD HEADER: Calling markStructuralChange');
      markStructuralChange('add_header', { items: newItems, newItems: [newHeaderItem], insertIndex }, currentUserId);
      
      // Broadcast header addition for immediate realtime sync (like delete does)
      if (rundownId && currentUserId) {
        cellBroadcast.broadcastCellUpdate(
          rundownId,
          undefined,
          'structural:add_header',
          { items: newItems, newItems: [newHeaderItem], insertIndex },
          currentUserId
        );
      }
    }, [actions.setItems, state.items, state.title, saveUndoState, cellEditIntegration.isPerCellEnabled, markStructuralChange]),

    setTitle: useCallback((newTitle: string) => {
      // No blocking needed - operations handle sync
      if (state.title !== newTitle) {
        // Track field change for per-cell save system
        if (cellEditIntegration.isPerCellEnabled) {
          console.log('🧪 SIMPLIFIED STATE: Tracking title change for per-cell save');
          cellEditIntegration.handleCellChange(undefined, 'title', newTitle);
        }
        
        // Simplified: Just set typing session for active protection
        typingSessionRef.current = { fieldKey: 'title', startTime: Date.now() };
        
        // Broadcast rundown-level property change
        if (rundownId && currentUserId) {
          cellBroadcast.broadcastCellUpdate(rundownId, undefined, 'title', newTitle, currentUserId);
        }
        
        saveUndoState(state.items, [], state.title, 'Change title');
        actions.setTitle(newTitle);
        
        // Clear typing session after delay
        setTimeout(() => {
          if (typingSessionRef.current?.fieldKey === 'title') {
            typingSessionRef.current = null;
          }
        }, 5000); // Extended timeout for title editing
      }
    }, [actions.setTitle, state.items, state.title, saveUndoState, rundownId, currentUserId, cellEditIntegration])
  };

  // Get visible columns from user preferences
  const visibleColumns = useMemo(() => {
    if (!columns || !Array.isArray(columns)) {
      return [];
    }
    
    const visible = columns.filter(col => col.isVisible !== false);
    return visible;
  }, [columns]);

  const getHeaderDuration = useCallback((index: number) => {
    if (index === -1 || !state.items || index >= state.items.length) return '00:00:00';
    return calculateHeaderDuration(state.items, index);
  }, [state.items]);

  const getRowNumber = useCallback((index: number) => {
    if (index < 0 || index >= calculatedItems.length) return '';
    return calculatedItems[index].calculatedRowNumber;
  }, [calculatedItems]);

  const handleRowSelection = useCallback((itemId: string) => {
    setSelectedRowId(prev => {
      const newSelection = prev === itemId ? null : itemId;
      return newSelection;
    });
  }, [selectedRowId]);

  const clearRowSelection = useCallback(() => {
    setSelectedRowId(null);
  }, []);

  // Fixed addRowAtIndex that properly inserts at specified index
  const addRowAtIndex = useCallback((insertIndex: number, count: number = 1) => {
    console.log('🔵 addRowAtIndex called with insertIndex:', insertIndex, 'count:', count);
    // Auto-save will handle this change - no special handling needed
    saveUndoState(state.items, [], state.title, `Add ${count} segment${count > 1 ? 's' : ''}`);
    
    // Create multiple items
    const newItemsToAdd = [];
    for (let i = 0; i < count; i++) {
      newItemsToAdd.push({
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'regular' as const,
        rowNumber: '',
        name: RUNDOWN_DEFAULTS.DEFAULT_ROW_NAME,
        startTime: '00:00:00',
        duration: RUNDOWN_DEFAULTS.NEW_ROW_DURATION,
        endTime: '00:30:00',
        elapsedTime: '00:00',
        talent: '',
        script: '',
        gfx: '',
        video: '',
        images: '',
        notes: '',
        color: '',
        isFloating: false,
        customFields: {}
      });
    }
    console.log('🔵 Created', newItemsToAdd.length, 'new items');

    // Use latestItemsRef for rapid operations to avoid stale state
    const currentItems = latestItemsRef.current.length > 0 ? latestItemsRef.current : state.items;
    const newItems = [...currentItems];
    const actualIndex = Math.min(insertIndex, newItems.length);
    newItems.splice(actualIndex, 0, ...newItemsToAdd);
    console.log('🔵 Final array length:', newItems.length, 'added at index:', actualIndex);
    
    // Update ref immediately for next rapid operation
    latestItemsRef.current = newItems;
    
    actions.setItems(newItems);
    
    // Broadcast add at index for immediate realtime sync
    if (rundownId && currentUserId) {
      cellBroadcast.broadcastCellUpdate(
        rundownId,
        undefined,
        'items:add',
        { items: newItemsToAdd, index: actualIndex },
        currentUserId
      );
    }
    
    // For per-cell saves, use structural save coordination
    if (cellEditIntegration.isPerCellEnabled) {
      console.log('🧪 STRUCTURAL CHANGE: addRowAtIndex completed - triggering structural coordination');
      markStructuralChange('add_row', { items: newItems, newItems: newItemsToAdd, insertIndex: actualIndex });
    }
  }, [state.items, state.title, saveUndoState, actions.setItems, rundownId, currentUserId, cellEditIntegration.isPerCellEnabled, markStructuralChange]);

  // Fixed addHeaderAtIndex that properly inserts at specified index
  const addHeaderAtIndex = useCallback((insertIndex: number) => {
    // Auto-save will handle this change - no special handling needed
    saveUndoState(state.items, [], state.title, 'Add header');
    
    const newHeader = {
      id: `header_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'header' as const,
      rowNumber: 'A',
      name: RUNDOWN_DEFAULTS.DEFAULT_HEADER_NAME,
      startTime: '',
      duration: RUNDOWN_DEFAULTS.NEW_HEADER_DURATION,
      endTime: '',
      elapsedTime: '',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      images: '',
      notes: '',
      color: '',
      isFloating: false,
      customFields: {}
    };

    // Use latestItemsRef for rapid operations to avoid stale state
    const currentItems = latestItemsRef.current.length > 0 ? latestItemsRef.current : state.items;
    const newItems = [...currentItems];
    const actualIndex = Math.min(insertIndex, newItems.length);
    newItems.splice(actualIndex, 0, newHeader);
    
    // Update ref immediately for next rapid operation
    latestItemsRef.current = newItems;
    
    actions.setItems(newItems);
    
    // Broadcast header add at index for immediate realtime sync
    if (rundownId && currentUserId) {
      cellBroadcast.broadcastCellUpdate(
        rundownId,
        undefined,
        'items:add',
        { item: newHeader, index: actualIndex },
        currentUserId
      );
    }
    
    // For per-cell saves, use structural save coordination
    if (cellEditIntegration.isPerCellEnabled) {
      console.log('🧪 STRUCTURAL CHANGE: addHeaderAtIndex completed - triggering structural coordination');
      markStructuralChange('add_header', { items: newItems, insertIndex: actualIndex });
    }
  }, [state.items, state.title, saveUndoState, actions.setItems, rundownId, currentUserId, cellEditIntegration.isPerCellEnabled, markStructuralChange]);


  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced realtime activity indicator with debouncing and minimum duration
  const realtimeActivity = useRealtimeActivityIndicator({
    isProcessingUpdate: realtimeConnection.isProcessingUpdate,
    minimumDuration: 1500, // 1.5 seconds minimum to avoid flickering
    cooldownDuration: 1000  // 1 second cooldown after updates stop
  });

  return {
    // Core state with calculated values
    items: calculatedItems,
    setItems: actions.setItems,
    columns,
    setColumns,
    visibleColumns,
    rundownTitle: state.title,
    rundownStartTime: state.startTime,
    timezone: state.timezone,
    showDate: state.showDate,
    lastKnownTimestamp,
    
    selectedRowId,
    handleRowSelection,
    clearRowSelection,
    
    currentTime,
    rundownId,
    isLoading: isLoading || isLoadingColumns,
    hasUnsavedChanges: perCellEnabled ? 
      (cellEditIntegration.hasUnsavedChanges || hasStructuralUnsavedChanges) : 
      state.hasUnsavedChanges,
    isSaving: perCellEnabled ? 
      (cellEditIntegration.isPerCellSaving || isStructuralSaving) : 
      (isSaving || isSavingColumns),
    showcallerActivity,
    
    // Realtime connection status
    isConnected,
    isProcessingRealtimeUpdate: realtimeActivity.isShowingRealtimeActivity, // Enhanced with proper debouncing
    
    // Calculations
    totalRuntime,
    getRowNumber,
    getHeaderDuration: (id: string) => {
      const itemIndex = state.items.findIndex(item => item.id === id);
      return getHeaderDuration(itemIndex);
    },
    
    updateItem: enhancedActions.updateItem,
    deleteItem: enhancedActions.deleteRow,
    deleteRow: enhancedActions.deleteRow,
    toggleFloat: enhancedActions.toggleFloatRow,
    deleteMultipleItems: useCallback((itemIds: string[]) => {
      saveUndoState(state.items, [], state.title, 'Delete multiple items');
      
      // Use latestItemsRef for rapid operations to avoid stale state
      const currentItems = latestItemsRef.current.length > 0 ? latestItemsRef.current : state.items;
      const newItems = currentItems.filter(item => !itemIds.includes(item.id));
      
      // Update ref immediately for next rapid operation
      latestItemsRef.current = newItems;
      
      actions.deleteMultipleItems(itemIds);
      
      // For per-cell saves, use structural save coordination
      if (cellEditIntegration.isPerCellEnabled) {
        console.log('🧪 STRUCTURAL CHANGE: deleteMultipleItems completed - triggering structural coordination');
        // Pass updated items array, not just deleted IDs
        markStructuralChange('delete_row', { items: newItems, deletedIds: itemIds });
      }
      
      // Broadcast row removal for immediate realtime sync
      if (rundownId && currentUserId) {
        cellBroadcast.broadcastCellUpdate(
          rundownId,
          undefined,
          'items:remove',
          { ids: itemIds },
          currentUserId
        );
      }
    }, [actions.deleteMultipleItems, state.items, state.title, saveUndoState, cellEditIntegration.isPerCellEnabled, markStructuralChange, rundownId, currentUserId]),
    addItem: useCallback((item: any, targetIndex?: number) => {
      // No blocking needed - operations handle sync
      actions.addItem(item, targetIndex);
    }, [actions.addItem]),
    setTitle: enhancedActions.setTitle,
    setStartTime: useCallback((newStartTime: string) => {
      console.log('🧪 SIMPLIFIED STATE: setStartTime called with:', newStartTime);
      // No blocking needed - operations handle sync
      
      // Track field change for per-cell save system
      if (cellEditIntegration.isPerCellEnabled) {
        console.log('🧪 SIMPLIFIED STATE: Tracking startTime change for per-cell save');
        cellEditIntegration.handleCellChange(undefined, 'startTime', newStartTime);
      }
      
      // Broadcast rundown-level property change
      if (rundownId && currentUserId) {
        cellBroadcast.broadcastCellUpdate(rundownId, undefined, 'startTime', newStartTime, currentUserId);
      }
      
      actions.setStartTime(newStartTime);
    }, [actions.setStartTime, rundownId, currentUserId, cellEditIntegration]),
    setTimezone: useCallback((newTimezone: string) => {
      console.log('🧪 SIMPLIFIED STATE: setTimezone called with:', newTimezone);
      // No blocking needed - operations handle sync
      
      // Track field change for per-cell save system
      if (cellEditIntegration.isPerCellEnabled) {
        console.log('🧪 SIMPLIFIED STATE: Tracking timezone change for per-cell save');
        cellEditIntegration.handleCellChange(undefined, 'timezone', newTimezone);
      }
      
      // Broadcast rundown-level property change
      if (rundownId && currentUserId) {
        cellBroadcast.broadcastCellUpdate(rundownId, undefined, 'timezone', newTimezone, currentUserId);
      }
      
      actions.setTimezone(newTimezone);
    }, [actions.setTimezone, rundownId, currentUserId, cellEditIntegration]),
    setShowDate: useCallback((newShowDate: Date | null) => {
      console.log('🧪 SIMPLIFIED STATE: setShowDate called with:', newShowDate);
      // No blocking needed - operations handle sync
      
      // Track field change for per-cell save system
      if (cellEditIntegration.isPerCellEnabled) {
        console.log('🧪 SIMPLIFIED STATE: Tracking showDate change for per-cell save');
        cellEditIntegration.handleCellChange(undefined, 'showDate', newShowDate);
      }
      
      // Broadcast rundown-level property change
      if (rundownId && currentUserId) {
        cellBroadcast.broadcastCellUpdate(rundownId, undefined, 'showDate', newShowDate, currentUserId);
      }
      
      actions.setShowDate(newShowDate);
    }, [actions.setShowDate, rundownId, currentUserId, cellEditIntegration]),
    
    addRow: enhancedActions.addRow,
    addHeader: enhancedActions.addHeader,
    addRowAtIndex,
    addHeaderAtIndex,
    
    addColumn: (column: Column) => {
      saveUndoState(state.items, [], state.title, 'Add column');
      setColumns([...columns, column]);
    },
    
    updateColumnWidth: (columnId: string, width: string) => {
      const newColumns = columns.map(col =>
        col.id === columnId ? { ...col, width } : col
      );
      setColumns(newColumns);
    },

    // Undo/Redo functionality - properly expose these including saveUndoState
    saveUndoState,
    undo,
    redo,
    canUndo,
    canRedo,
    lastAction,
    nextAction,
    
    // Teleprompter sync callbacks (exposed globally) + track own update integration
    teleprompterSaveHandlers: {
      onSaveStart: () => {
        teleprompterSync.handleTeleprompterSaveStart();
        console.log('📝 Teleprompter save started - will track updates');
      },
      onSaveEnd: () => {
        teleprompterSync.handleTeleprompterSaveEnd();
        console.log('📝 Teleprompter save ended');
      },
      trackOwnUpdate: realtimeConnection.trackOwnUpdate // Pass through to realtime system
    },
    
    // Autosave typing guard
    markActiveTyping,
    
    // Structural change handling
    markStructuralChange,
    clearStructuralChange
  };
};
