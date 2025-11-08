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
import { useEdgeFunctionPrewarming } from './useEdgeFunctionPrewarming';
import { signatureDebugger } from '@/utils/signatureDebugger'; // Enable signature monitoring
import { useActiveTeam } from './useActiveTeam';
import { useBroadcastBatcher } from './useBroadcastBatcher';

import { globalFocusTracker } from '@/utils/focusTracker';
import { supabase } from '@/integrations/supabase/client';
import { normalizeBoolean } from '@/utils/booleanNormalization';
import { Column } from '@/types/columns';
import { RundownItem } from '@/types/rundown';
import { createDefaultRundownItems } from '@/data/defaultRundownItems';
import { calculateItemsWithTiming, calculateTotalRuntime, calculateHeaderDuration } from '@/utils/rundownCalculations';
import { RUNDOWN_DEFAULTS } from '@/constants/rundownDefaults';
import { DEMO_RUNDOWN_ID, DEMO_RUNDOWN_DATA } from '@/data/demoRundownData';
import { updateTimeFromServer } from '@/services/UniversalTimeService';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { useCellUpdateCoordination } from './useCellUpdateCoordination';
import { useRealtimeActivityIndicator } from './useRealtimeActivityIndicator';
import { debugLogger } from '@/utils/debugLogger';
import { getTabId } from '@/utils/tabUtils';

export const useSimplifiedRundownState = () => {
  const params = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const rundownId = params.id === 'new' ? null : (location.pathname === '/demo' ? DEMO_RUNDOWN_ID : params.id) || null;
  
  const { shouldSkipLoading, setCacheLoading } = useRundownStateCache(rundownId);
  const { activeTeamId, loading: activeTeamLoading } = useActiveTeam();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Pre-warm edge functions to eliminate cold starts
  useEdgeFunctionPrewarming(rundownId, isInitialized);
  const [isLoading, setIsLoading] = useState(!shouldSkipLoading);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showcallerActivity, setShowcallerActivity] = useState(false);
  const [lastKnownTimestamp, setLastKnownTimestamp] = useState<string | null>(null);
  const [saveCompletionCount, setSaveCompletionCount] = useState(0);
  
  
  // Connection state will come from realtime hook
  const [isConnected, setIsConnected] = useState(false);

  // Enhanced conflict resolution system with validation
  const typingSessionRef = useRef<{ fieldKey: string; startTime: number } | null>(null);
  const recentCellUpdatesRef = useRef<Map<string, { timestamp: number; value: any; clientId?: string }>>(new Map());
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const recentlyEditedFieldsRef = useRef<Map<string, number>>(new Map());
  const activeFocusFieldRef = useRef<string | null>(null);
  
  // Track per-cell save enabled state to coordinate saving systems
  const [isPerCellSaveEnabled, setIsPerCellSaveEnabled] = useState(false);
  
  // Track structural operation save state
  const [isStructuralSaving, setIsStructuralSaving] = useState(false);
  const [hasStructuralUnsavedChanges, setHasStructuralUnsavedChanges] = useState(false);
  
  // Remove broadcast timeouts - no throttling of core functionality
  const lastRemoteUpdateRef = useRef<number>(0);
  const conflictResolutionTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Use proper React context for cell update coordination
  const { executeWithCellUpdate } = useCellUpdateCoordination();
  
  // Simplified: No protection windows needed - last writer wins
  const TYPING_DEBOUNCE_MS = 500; // Just for typing detection
  const CONFLICT_RESOLUTION_DELAY = 2000; // Keep for edge cases
  
  // Track pending structural changes to prevent overwrite during save
  const pendingStructuralChangeRef = useRef(false);
  // Track when to refresh on next focus to prevent infinite loops
  const shouldRefreshOnFocusRef = useRef(false);
  
  // Track active structural operations to block realtime updates
  const activeStructuralOperationRef = useRef(false);
  
  // Enhanced cooldown management with explicit flags  
  const blockUntilLocalEditRef = useRef(false);
  const cooldownUntilRef = useRef<number>(0);
  
  // Track userId of last change to prevent spurious "unsaved changes" from remote broadcasts
  const lastChangeUserIdRef = useRef<string | null>(null);
  
  // Track if we've primed the autosave after initial load
  const lastSavedPrimedRef = useRef(false);
  
  // Track last save time for race condition detection
  const lastSaveTimeRef = useRef<number>(0);
  
  // =================================================================================
  // ULTRA-SIMPLE FIELD PROTECTION
  //
  // ONLY block cell broadcasts for the exact field being actively typed.
  // No timers, no complex logic, no multiple protection layers.
  // =================================================================================
  
  // Listen to global focus tracker  
  useEffect(() => {
    const unsubscribe = globalFocusTracker.onActiveFieldChange((fieldKey) => {
      activeFocusFieldRef.current = fieldKey;
    });
    
    return unsubscribe;
  }, []);

  // Cleanup refs on unmount to release memory
  useEffect(() => {
    return () => {
      recentCellUpdatesRef.current.clear();
      recentlyEditedFieldsRef.current.clear();
      dropdownFieldProtectionRef.current.clear();
      typingSessionRef.current = null;
      activeFocusFieldRef.current = null;
    };
  }, []);



  // Simplified dropdown protection
  const dropdownFieldProtectionRef = useRef<Map<string, number>>(new Map());
  const DROPDOWN_PROTECTION_WINDOW_MS = 800; // Much shorter dropdown protection
  
  // Create ref for markActiveTyping to pass to useRundownState
  const markActiveTypingRef = useRef<(() => void) | undefined>(undefined);

  const markDropdownFieldChanged = useCallback((fieldKey: string) => {
    const now = Date.now();
    dropdownFieldProtectionRef.current.set(fieldKey, now);
    // Simplified: no field tracking needed
  }, []);

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
  }, rundownId || undefined, markActiveTypingRef);

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
      externalNotes: mergedData.external_notes !== undefined ? mergedData.external_notes : state.externalNotes
    });
    
    // Update timestamp tracking
    if (mergedData.updated_at) {
      setLastKnownTimestamp(mergedData.updated_at);
    }
  }, [actions, state.title, state.startTime, state.timezone]);

  // Auto-save functionality with unified save pipeline (no setTrackOwnUpdate needed - uses centralized tracker)
  const { isSaving, setUndoActive, markActiveTyping, isTypingActive, triggerImmediateSave } = useSimpleAutoSave(
    {
      ...state,
      columns: [] // Remove columns from team sync
    }, 
    rundownId, 
    (meta?: { updatedAt?: string }) => {
      actions.markSaved();
      
      // Track save time for race condition detection in cell broadcasts
      lastSaveTimeRef.current = Date.now();
      
      // Update our timestamp tracking
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
    pendingStructuralChangeRef,
    undefined, // Legacy ref no longer needed
    (isInitialized && !isLoadingColumns), // Wait for both rundown AND column initialization
    blockUntilLocalEditRef,
    cooldownUntilRef
  );
  
  // Update the ref so useRundownState can use it
  markActiveTypingRef.current = markActiveTyping;
 
  // Stable refs to avoid resubscribing on state changes
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const actionsRef = useRef(actions);
  useEffect(() => { actionsRef.current = actions; }, [actions]);

  // Track own updates for realtime filtering
  const ownUpdateTimestampRef = useRef<string | null>(null);

  // Simplified protected fields - only protect exact field being typed RIGHT NOW
  const getProtectedFields = useCallback(() => {
    const protectedFields = new Set<string>();
    const now = Date.now();
    
    // Only protect the specific field being typed in at this moment
    if (typingSessionRef.current && now - typingSessionRef.current.startTime < TYPING_DEBOUNCE_MS) {
      protectedFields.add(typingSessionRef.current.fieldKey);
      console.log('🛡️ Protecting actively typed field:', typingSessionRef.current.fieldKey);
    }
    
    return protectedFields;
  }, []);

  // Enhanced realtime connection with sync-before-write protection
  const deferredUpdateRef = useRef<any>(null);
  const initialLoadGateRef = useRef(true);
  const reconciliationTimeoutRef = useRef<NodeJS.Timeout>();
  const syncBeforeWriteRef = useRef(false);
  
  const realtimeConnection = useConsolidatedRealtimeRundown({
    rundownId,
    blockUntilLocalEditRef,
    onRundownUpdate: useCallback((updatedRundown) => {
      // SIMPLIFIED: Remove initial load gating - just apply updates immediately
      if (initialLoadGateRef.current) {
        console.log('⏳ Initial load in progress but applying update anyway');
        // Don't defer - just set the gate to false and continue
        initialLoadGateRef.current = false;
      }
      
      // Monotonic timestamp guard for stale updates
      if (updatedRundown.updated_at && lastKnownTimestamp) {
        const incomingTime = new Date(updatedRundown.updated_at).getTime();
        const knownTime = new Date(lastKnownTimestamp).getTime();
        
        if (incomingTime <= knownTime) {
          console.log('⏭️ Stale timestamp ignored:', {
            incoming: updatedRundown.updated_at,
            known: lastKnownTimestamp
          });
          return;
        }
      }
      
      // CRITICAL: Check for recent cell updates to prevent overwriting them
      const recentCellUpdates = recentCellUpdatesRef.current;
      let hasRecentCellUpdates = false;
      
      if (updatedRundown.items && Array.isArray(updatedRundown.items)) {
        // Check if any item fields have recent cell updates
        for (const item of updatedRundown.items) {
          const itemFromState = state.items.find(existing => existing.id === item.id);
          if (itemFromState) {
            for (const [field, value] of Object.entries(item)) {
              if (field === 'id') continue;
              const updateKey = `${item.id}-${field}`;
              const recentUpdate = recentCellUpdates.get(updateKey);
              if (recentUpdate && Date.now() - recentUpdate.timestamp < 3000) {
                console.log('🚫 Skipping realtime update for recently cell-updated field:', updateKey);
                hasRecentCellUpdates = true;
                // Don't override this field
                (item as any)[field] = itemFromState[field];
              }
            }
          }
        }
      }
      
      // ALWAYS apply updates - never block them. Google Sheets style.
      debugLogger.realtime('Processing realtime update immediately:', {
        docVersion: updatedRundown.doc_version,
        hasItems: !!updatedRundown.items,
        itemCount: updatedRundown.items?.length || 0,
        isTyping: isTypingActive(),
        activeField: typingSessionRef.current?.fieldKey,
        hasRecentCellUpdates
      });
      
      // SIMPLIFIED: Remove complex structural change detection and cooldowns
      // Just update timestamps
      if (updatedRundown.updated_at) {
        setLastKnownTimestamp(updatedRundown.updated_at);
      }
      
      // Apply granular merge only if actively typing in a specific field
      const protectedFields = getProtectedFields();
      
      // REMOVED: No more AutoSave blocking - embrace immediate saves
      // Field-level conflict resolution handles conflicts gracefully
      if (protectedFields.size > 0) {
        console.log('🛡️ Protecting actively typed field during realtime update:', Array.from(protectedFields));
      }
      
      if (protectedFields.size > 0) {
        // Create merged items by protecting local edits
        // Enhanced conflict resolution: merge changes at field level
        const mergedItems = updatedRundown.items?.map((remoteItem: any) => {
          const localItem = state.items.find(item => item.id === remoteItem.id);
          if (!localItem) return remoteItem; // New item from remote
          
          const merged = { ...remoteItem };
          
          // Apply operational transformation: merge non-conflicting changes
          Object.keys(localItem).forEach(key => {
            if (key === 'id') return; // Never change IDs
            
            const isProtected = protectedFields.has(`${remoteItem.id}-${key}`);
            const localValue = (localItem as any)[key];
            const remoteValue = (remoteItem as any)[key];
            
            if (isProtected) {
              // Keep local changes for actively edited fields
              merged[key] = localValue;
              console.log(`🛡️ Protected field ${key} for item ${remoteItem.id}: keeping local value`);
            } else if (key === 'customFields') {
              // Merge custom fields at field level
              merged.customFields = { ...remoteValue };
              if (localValue && typeof localValue === 'object') {
                Object.keys(localValue).forEach(customKey => {
                  const fieldKey = `${remoteItem.id}-customFields.${customKey}`;
                  if (protectedFields.has(fieldKey)) {
                    merged.customFields[customKey] = localValue[customKey];
                    console.log(`🛡️ Protected custom field ${customKey} for item ${remoteItem.id}`);
                  }
                });
              }
            }
          });
          
          return merged;
        }) || [];
        
        // Apply the update with simple field-level protection
        actions.loadState({
          items: mergedItems,
          title: protectedFields.has('title') ? state.title : updatedRundown.title,
          startTime: protectedFields.has('startTime') ? state.startTime : updatedRundown.start_time,
          timezone: protectedFields.has('timezone') ? state.timezone : updatedRundown.timezone,
          showDate: protectedFields.has('showDate') ? state.showDate : (updatedRundown.show_date ? new Date(updatedRundown.show_date + 'T00:00:00') : null),
          externalNotes: protectedFields.has('externalNotes') ? state.externalNotes : updatedRundown.external_notes
        });
        
        // Track remote update time
        lastRemoteUpdateRef.current = Date.now();
        
      } else {
        // Safety guard: Don't apply updates that would clear all items unless intentional
        // Also ensure we only update fields that are actually present in the payload
        const wouldClearItems = (!updatedRundown.items || updatedRundown.items.length === 0) && state.items.length > 0;
        
        if (wouldClearItems) {
          console.warn('🛡️ Prevented applying malformed update that would clear all items:', {
            incomingItems: updatedRundown.items?.length || 0,
            currentItems: state.items.length,
            timestamp: updatedRundown.updated_at
          });
          return;
        }
        
        debugLogger.realtime('Applying realtime update directly - last writer wins');
        
        // Simple approach: apply all changes, don't try to protect anything
        // If user is actively typing, their next keystroke will overwrite anyway
        const updateData: any = {};
        if (updatedRundown.hasOwnProperty('items')) updateData.items = updatedRundown.items || [];
        if (updatedRundown.hasOwnProperty('title')) updateData.title = updatedRundown.title;
        if (updatedRundown.hasOwnProperty('start_time')) updateData.startTime = updatedRundown.start_time;
        if (updatedRundown.hasOwnProperty('timezone')) updateData.timezone = updatedRundown.timezone;
        if (updatedRundown.hasOwnProperty('show_date')) updateData.showDate = updatedRundown.show_date ? new Date(updatedRundown.show_date + 'T00:00:00') : null;
        
        // Add external notes to update data
        if (updatedRundown.hasOwnProperty('external_notes')) updateData.externalNotes = updatedRundown.external_notes;
        
        // Only apply if we have fields to update
        if (Object.keys(updateData).length > 0) {
          actions.loadState(updateData);
        }
        
        // REMOVED: blockUntilLocalEditRef blocking - autosave now operates independently
        debugLogger.autosave('AutoSave: Remote update received - autosave continues normally');
       }
    }, [actions, isSaving, getProtectedFields, state.items, state.title, state.startTime, state.timezone, state.showDate]),
    enabled: !isLoading
  });
  
  // Update connection state from realtime hook
  useEffect(() => {
    setIsConnected(realtimeConnection.isConnected);
    console.log('🔌 Realtime connection status changed:', realtimeConnection.isConnected);
  }, [realtimeConnection.isConnected]);
  
  // Clear initial load gate after initialization and implement sync-before-write
  useEffect(() => {
    if (isInitialized) {
      setTimeout(() => {
        initialLoadGateRef.current = false;
        console.log('🚪 Initial load gate cleared - realtime updates enabled');
      }, 500);
    }
  }, [isInitialized]);

  // Connect realtime to auto-save typing/unsaved state
  realtimeConnection.setTypingChecker(() => isTypingActive());
  realtimeConnection.setUnsavedChecker(() => state.hasUnsavedChanges);

  // Get current user ID for cell broadcasts
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  // Standalone undo system - now with redo
  const { saveState: saveUndoState, undo, canUndo, lastAction, redo, canRedo, nextRedoAction } = useStandaloneUndo({
    onUndo: (items, _, title) => {
      setUndoActive(true);
      actions.setItems(items);
      actions.setTitle(title);
      
      // Broadcast the undo/redo as a structural change
      if (rundownId && currentUserId) {
        const order = items.map(i => i.id);
        setTimeout(() => {
          cellBroadcast.broadcastCellUpdate(
            rundownId,
            undefined,
            'items:reorder',
            { order },
            currentUserId,
            getTabId()
          );
        }, 0);
      }
      
      setTimeout(() => {
        actions.markSaved();
        actions.setItems([...items]);
        setUndoActive(false);
      }, 100);
    },
    setUndoActive,
    rundownId,
    userId: currentUserId
  });

  // Cell-level broadcast system for immediate sync
  useEffect(() => {
    if (!rundownId || !currentUserId) return;

    const unsubscribe = cellBroadcast.subscribeToCellUpdates(rundownId, async (update) => {
      console.log('📱 Cell broadcast received:', update);
      
      // Skip our own tab's updates (supports multiple tabs per user)
      const currentTabId = getTabId();
      if (cellBroadcast.isOwnUpdate(update, currentTabId)) {
        console.log('📱 Skipping own tab\'s cell broadcast update');
        return;
      }
      
      console.log('📱 Applying cell broadcast update (simplified - no protection):', update);
      
      // Track that this change came from another user
      lastChangeUserIdRef.current = update.userId;
      
      try {
        // SIMPLIFIED: No shadow protection - just apply changes immediately (Google Sheets style)
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
                console.log('🔄 Applied reorder broadcast:', { itemCount: reordered.length });
              }
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
            case 'items:copy': {
              // Handle immediate copy/paste for real-time collaboration
              const payload = update.value || {};
              const items = payload.items || [];
              const index = Math.max(0, Math.min(payload.index ?? stateRef.current.items.length, stateRef.current.items.length));
              
              if (items.length > 0) {
                // Filter out any items that already exist (prevent duplicates)
                const newItemsToAdd = items.filter((item: RundownItem) => 
                  !stateRef.current.items.find(i => i.id === item.id)
                );
                
                if (newItemsToAdd.length > 0) {
                  const newItems = [...stateRef.current.items];
                  newItems.splice(index, 0, ...newItemsToAdd);
                  actionsRef.current.loadState({ items: newItems });
                  console.log('📋 Applied copy broadcast:', { copiedCount: newItemsToAdd.length, index });
                }
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
            case 'items:remove-multiple': {
              const ids = update.value?.ids as string[];
              if (ids && Array.isArray(ids) && ids.length > 0) {
                const newItems = stateRef.current.items.filter(i => !ids.includes(i.id));
                if (newItems.length !== stateRef.current.items.length) {
                  console.log('📱 Multi-delete broadcast applied', { deletedCount: stateRef.current.items.length - newItems.length, idsCount: ids.length });
                  actionsRef.current.loadState({ items: newItems });
                }
              }
              break;
            }
            case 'lock_state': {
              const { numberingLocked, lockedRowNumbers } = update.value || {};
              if (numberingLocked !== undefined) {
                console.log('🔒 Lock state broadcast received:', {
                  numberingLocked,
                  lockedRowNumbersCount: Object.keys(lockedRowNumbers || {}).length
                });
                actionsRef.current.loadState({
                  numberingLocked,
                  lockedRowNumbers: lockedRowNumbers || {}
                });
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
      } catch (error) {
        console.error('📱 Error applying cell broadcast update:', error);
      }
    }, getTabId());

    return () => {
      unsubscribe();
    };
  }, [rundownId, currentUserId]);
  
  // Cell edit integration for per-cell saves (after realtime connection is established)
  const perCellEnabled = Boolean(state.perCellSaveEnabled);
  
  // Initialize broadcast batcher for batching cell updates
  const broadcastBatcher = useBroadcastBatcher({
    rundownId,
    batchWindowMs: 300,
    getItemExists: useCallback((itemId: string) => {
      return state.items.some(item => item.id === itemId);
    }, [state.items])
  });
  
  // CRITICAL: Track per-cell enabled state to coordinate with autosave
  useEffect(() => {
    console.log('🧪 PER-CELL SAVE: State updated', {
      perCellSaveEnabled: state.perCellSaveEnabled,
      rundownId,
      isEnabled: perCellEnabled
    });
  }, [state.perCellSaveEnabled, rundownId, perCellEnabled]);
  
  // Callback to broadcast after save completes
  const handleBroadcastAfterSave = useCallback((savedUpdates: Array<{ itemId?: string; field: string; value: any }>) => {
    if (!rundownId || !currentUserId) return;
    
    // DIAGNOSTIC: Log what we received
    console.log('🔍 Broadcast after save - received updates:', {
      total: savedUpdates.length,
      updates: savedUpdates.map(u => ({ itemId: u.itemId, field: u.field, hasValue: !!u.value }))
    });
    
    const validUpdates = savedUpdates
      .filter(u => u.itemId && u.itemId.trim() !== '') // Only broadcast item-level updates with valid itemId
      .map(u => ({
        itemId: u.itemId!,
        field: u.field,
        value: u.value
      }));
    
    console.log('🔍 After filtering - valid updates:', {
      valid: validUpdates.length,
      dropped: savedUpdates.length - validUpdates.length
    });
    
    if (validUpdates.length > 0) {
      console.log('📡 Broadcasting saved updates:', validUpdates);
      cellBroadcast.broadcastBatch(rundownId, validUpdates, currentUserId, getTabId());
    } else {
      console.warn('⚠️ No valid updates to broadcast - all updates filtered out');
    }
  }, [rundownId, currentUserId]);
  
  const cellEditIntegration = useCellEditIntegration({
    rundownId,
    isPerCellEnabled: perCellEnabled,
    onBroadcastReady: handleBroadcastAfterSave,
    onSaveComplete: (completionCount?: number) => {
      console.log('🧪 PER-CELL SAVE: Save completed - marking main state as saved');
      actions.markSaved();
      if (completionCount !== undefined) {
        setSaveCompletionCount(completionCount);
      }
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
  
  // Track state changes and notify per-cell save system
  const previousStateRef = useRef(state);
  const hasTrackedInitialLoad = useRef(false);
  
  useEffect(() => {
    if (!perCellEnabled || !isInitialized) return;
    
    // CRITICAL: Skip tracking if the last change was from a different user (remote change)
    if (lastChangeUserIdRef.current && lastChangeUserIdRef.current !== currentUserId) {
      previousStateRef.current = state;
      return;
    }
    
    const prev = previousStateRef.current;
    const curr = state;
    
    // Skip change tracking on initial load (when previous state was empty)
    if (!hasTrackedInitialLoad.current && prev.items.length === 0 && curr.items.length > 0) {
      console.log('🚫 Skipping change tracking for initial load', { itemsLoaded: curr.items.length });
      hasTrackedInitialLoad.current = true;
      previousStateRef.current = state;
      return;
    }
    
    hasTrackedInitialLoad.current = true;
    
    // Track title changes
    if (prev.title !== curr.title) {
      cellEditIntegration.handleCellChange(undefined, 'title', curr.title);
    }
    
    // Track startTime changes
    if (prev.startTime !== curr.startTime) {
      cellEditIntegration.handleCellChange(undefined, 'startTime', curr.startTime);
    }
    
    // Track timezone changes
    if (prev.timezone !== curr.timezone) {
      cellEditIntegration.handleCellChange(undefined, 'timezone', curr.timezone);
    }
    
    // Track showDate changes
    if (prev.showDate !== curr.showDate) {
      cellEditIntegration.handleCellChange(undefined, 'showDate', curr.showDate);
    }
    
    // Track item changes - compare by ID
    if (prev.items !== curr.items) {
      const prevItemsMap = new Map(prev.items.map(item => [item.id, item]));
      const currItemsMap = new Map(curr.items.map(item => [item.id, item]));
      
      // Check for changed items
      for (const [id, currItem] of currItemsMap) {
        const prevItem = prevItemsMap.get(id);
        if (prevItem) {
          // Check each field for changes
          for (const [field, value] of Object.entries(currItem)) {
            if (field !== 'id' && (prevItem as any)[field] !== value) {
              cellEditIntegration.handleCellChange(id, field, value);
            }
          }
        }
      }
    }
    
    previousStateRef.current = state;
  }, [state, perCellEnabled, isInitialized, cellEditIntegration]);
  
  // Get save coordination system for structural operations - use same callbacks as cell edit integration
  const saveCoordination = usePerCellSaveCoordination({
    rundownId,
    isPerCellEnabled: perCellEnabled,
    currentUserId,
    onSaveComplete: (completionCount?: number) => {
      console.log('🧪 STRUCTURAL SAVE: Save completed - updating UI state');
      setIsStructuralSaving(false);
      setHasStructuralUnsavedChanges(false);
      actions.markSaved();
      if (completionCount !== undefined) {
        setSaveCompletionCount(completionCount);
      }
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
  
  // Get catch-up sync function from realtime connection
  const performCatchupSync = realtimeConnection.performCatchupSync;
  
  // Run sync on initial mount and only when tab transitions to active
  const hasSyncedOnceRef = useRef(false);
  const lastSyncTimeRef = useRef(0);
  
  // TEMPORARILY DISABLE sync-before-write to fix typing issues
  // Enhanced sync-before-write with catch-up functionality (only on activation or first run)
  // useEffect(() => {
  //   const now = Date.now();
  //   const justActivated = isTabActive && !prevIsActiveRef.current;
  //   const shouldSync = (justActivated || !hasSyncedOnceRef.current) && isInitialized && rundownId;
  //   
  //   // Debounce rapid sync calls (prevent multiple syncs within 500ms)
  //   const timeSinceLastSync = now - lastSyncTimeRef.current;
  //   if (shouldSync && timeSinceLastSync > 500) {
  //     console.log('👁️ Tab became active - performing safety sync and catch-up');
  //     lastSyncTimeRef.current = now;
  //     syncBeforeWriteRef.current = true;
  //     
  //     // Trigger catch-up sync to get any missed updates
  //     if (performCatchupSync) {
  //       performCatchupSync();
  //     }
  //     
  //     const syncLatestData = async () => {
  //       // ... rest of sync logic temporarily disabled
  //     };
  //
  //     syncLatestData();
  //     hasSyncedOnceRef.current = true;
  //   }
  //
  //   // Track previous active state for transition detection
  //   prevIsActiveRef.current = isTabActive;
  // }, [isTabActive, isInitialized, rundownId, lastKnownTimestamp, actions, performCatchupSync]);

  // Apply deferred updates when save completes
  useEffect(() => {
    if (!isSaving && !pendingStructuralChangeRef.current && deferredUpdateRef.current) {
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
      
      // Detect if this is a structural change for cooldown
      const isStructural = deferredUpdate.items && state.items && (
        deferredUpdate.items.length !== state.items.length ||
        JSON.stringify(deferredUpdate.items.map(i => i.id)) !== JSON.stringify(state.items.map(i => i.id))
      );
      
      // Set cooldown after applying deferred teammate update
      if (isStructural) {
        cooldownUntilRef.current = Date.now() + 1500;
      } else {
        cooldownUntilRef.current = Date.now() + 800;
      }
      
      // Update our known timestamp
      if (deferredUpdate.updated_at) {
        setLastKnownTimestamp(deferredUpdate.updated_at);
      }
      
      // Get currently protected fields for granular merging
      const protectedFields = getProtectedFields();
      
      // Apply granular merge if we have protected fields
      if (protectedFields.size > 0) {
        
        // Create merged items by protecting local edits
        const mergedItems = deferredUpdate.items?.map((remoteItem: any) => {
          const localItem = state.items.find(item => item.id === remoteItem.id);
          if (!localItem) return remoteItem; // New item from remote
          
          const merged = { ...remoteItem };
          
          // Protect specific fields that are currently being edited
          protectedFields.forEach(fieldKey => {
            if (fieldKey.startsWith(remoteItem.id + '-')) {
              const field = fieldKey.substring(remoteItem.id.length + 1);
              if (field.startsWith('customFields.')) {
                const customFieldKey = field.replace('customFields.', '');
                // Ensure customFields object exists
                merged.customFields = merged.customFields || {};
                localItem.customFields = localItem.customFields || {};
                // Field-by-field protection for deferred updates too
                merged.customFields[customFieldKey] = localItem.customFields[customFieldKey] ?? merged.customFields[customFieldKey];
                console.log(`🛡️ Protected custom field ${customFieldKey} for item ${remoteItem.id} (deferred)`);
              } else if (localItem.hasOwnProperty(field)) {
                merged[field] = localItem[field]; // Keep local value
                console.log(`🛡️ Protected field ${field} for item ${remoteItem.id} (deferred)`);
              }
            }
          });
          
          return merged;
        }) || [];
        
        // Apply merged update
        actions.loadState({
          items: mergedItems,
          title: protectedFields.has('title') ? state.title : deferredUpdate.title,
          startTime: protectedFields.has('startTime') ? state.startTime : deferredUpdate.start_time,
          timezone: protectedFields.has('timezone') ? state.timezone : deferredUpdate.timezone,
          showDate: protectedFields.has('showDate') ? state.showDate : (deferredUpdate.show_date ? new Date(deferredUpdate.show_date + 'T00:00:00') : null)
        });
        
      } else {
        // No protected fields - apply update normally
        actions.loadState({
          items: deferredUpdate.items || [],
          title: deferredUpdate.title,
          startTime: deferredUpdate.start_time,
          timezone: deferredUpdate.timezone,
          showDate: deferredUpdate.show_date ? new Date(deferredUpdate.show_date + 'T00:00:00') : null
        });
      }
    }
  }, [isSaving, actions, getProtectedFields, state.items, state.title, state.startTime, state.timezone, state.showDate]);

  // No longer need to connect autosave tracking to realtime - both now use centralized OwnUpdateTracker

  // Connect typing state checker to realtime to prevent overwrites during typing
  useEffect(() => {
    if (realtimeConnection.setTypingChecker) {
      realtimeConnection.setTypingChecker(isTypingActive);
    }
  }, [realtimeConnection.setTypingChecker, isTypingActive]);

  // Connect unsaved changes checker to defer teammate updates until local save completes
  useEffect(() => {
    if (realtimeConnection.setUnsavedChecker) {
      realtimeConnection.setUnsavedChecker(() => state.hasUnsavedChanges);
    }
  }, [realtimeConnection.setUnsavedChecker, state.hasUnsavedChanges]);


  // Enhanced updateItem function with aggressive field-level protection tracking
  const enhancedUpdateItem = useCallback((id: string, field: string, value: string) => {
    // Re-enable autosave after local edit if it was blocked due to teammate update
    if (blockUntilLocalEditRef.current) {
      console.log('✅ AutoSave: local edit detected - re-enabling saves');
      blockUntilLocalEditRef.current = false;
    }
    // Check if this is a typing field or immediate-sync field
    const isTypingField = field === 'name' || field === 'script' || field === 'talent' || field === 'notes' || 
                         field === 'gfx' || field === 'video' || field === 'images' || field.startsWith('customFields.') || field === 'segmentName';
    const isImmediateSyncField = field === 'isFloating'; // Fields that need immediate database sync (removed color)
    
    const sessionKey = `${id}-${field}`;
    
    // Simplified: No field tracking needed - last writer wins
    
    // Queue broadcast for batch sending (will be sent AFTER save completes)
    // Only queue if per-cell save is enabled, otherwise use immediate broadcast for backwards compatibility
    if (rundownId && currentUserId) {
      // Track that this change was made by the current user
      lastChangeUserIdRef.current = currentUserId;
      
      if (perCellEnabled) {
        // Batch mode: Queue for later broadcast
        console.log('📦 Queueing broadcast for batch (per-cell mode):', { id, field });
        broadcastBatcher.queueBroadcast(id, field, value);
      } else {
        // Legacy mode: Immediate broadcast
        cellBroadcast.broadcastCellUpdate(rundownId, id, field, value, currentUserId, getTabId());
      }
    }
    
    if (isTypingField) {
      // CRITICAL: Tell autosave system that user is actively typing
      markActiveTyping();
      
      // CRITICAL FIX: Mark this field as recently edited for cell broadcast protection
      markFieldAsRecentlyEdited(sessionKey);
      
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
        
        // CRITICAL: Track custom field change for per-cell save system
        if (cellEditIntegration.isPerCellEnabled) {
          cellEditIntegration.handleCellChange(id, field, value);
        }
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
      
      // CRITICAL: Track field change for per-cell save system
      if (cellEditIntegration.isPerCellEnabled) {
        cellEditIntegration.handleCellChange(id, updateField, updateValue);
      }
    }
  }, [actions.updateItem, state.items, state.title, saveUndoState, cellEditIntegration]);

  // Optimized field tracking with debouncing
  const markFieldAsRecentlyEdited = useCallback((fieldKey: string) => {
    const now = Date.now();
    recentlyEditedFieldsRef.current.set(fieldKey, now);
    
    // Use debounced tracker to reduce logging overhead
    import('@/utils/debouncedFieldTracker').then(({ debouncedFieldTracker }) => {
      debouncedFieldTracker.trackField(fieldKey);
    });
  }, []);

  // Simplified handlers - enhanced for per-cell save coordination
  const markStructuralChange = useCallback((operationType?: string, operationData?: any) => {
    console.log('🏗️ markStructuralChange called', {
      perCellEnabled: Boolean(state.perCellSaveEnabled),
      rundownId,
      operationType,
      operationData
    });
    
    // For per-cell save mode, structural operations need immediate save coordination
    if (state.perCellSaveEnabled && cellEditIntegration) {
      console.log('🏗️ STRUCTURAL: Per-cell mode - triggering coordinated structural save');
      
      // If we have operation details, use the per-cell coordination system
      if (operationType && operationData && saveCoordination && currentUserId) {
        console.log('🏗️ STRUCTURAL: Triggering handleStructuralOperation', {
          operationType,
          operationData,
          currentUserId
        });
        saveCoordination.handleStructuralOperation(operationType as any, operationData);
      } else {
        console.log('🏗️ STRUCTURAL: Missing operation details, marking as immediate save');
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

      // Set loading state (may be skipped visually if we have cached UI state)
      setIsLoading(!shouldSkipLoading);
      if (shouldSkipLoading) {
        console.log('📋 Using cached UI state - fetching fresh data without loading indicator:', rundownId);
      }
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
            const itemsToLoad = Array.isArray(data.items) && data.items.length > 0 
              ? data.items 
              : createDefaultRundownItems();

            // Sync time from server timestamp and store it
            if (data.updated_at) {
              updateTimeFromServer(data.updated_at);
              setLastKnownTimestamp(data.updated_at);
            }

            // Load content only (columns handled by useUserColumnPreferences)
            console.log('📥 Loading rundown state from database:', {
              numberingLocked: data.numbering_locked,
              lockedRowNumbersCount: Object.keys(data.locked_row_numbers || {}).length,
              hasLockedData: !!data.locked_row_numbers
            });
            
            actions.loadState({
              items: itemsToLoad,
              columns: [], // Never load columns from rundown - use user preferences
              title: data.title || 'Untitled Rundown',
              startTime: data.start_time || '09:00:00',
              timezone: data.timezone || 'America/New_York',
              showDate: data.show_date ? new Date(data.show_date + 'T00:00:00') : null,
              externalNotes: data.external_notes,
              docVersion: data.doc_version || 0, // CRITICAL: Include docVersion for OCC
              perCellSaveEnabled: data.per_cell_save_enabled || false, // Include per-cell save setting
              numberingLocked: data.numbering_locked || false, // Load lock state
              lockedRowNumbers: data.locked_row_numbers || {} // Load locked numbers
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
    
    // Get currently protected fields to preserve local edits
    const protectedFields = getProtectedFields();
    
    // If there are protected fields (typing/focused/recently edited), do a granular merge
    if (protectedFields.size > 0) {
      const mergedItems = (latestData.items || []).map((remoteItem: any) => {
        const localItem = state.items.find(item => item.id === remoteItem.id);
        if (!localItem) return remoteItem;
        const merged = { ...remoteItem };
        protectedFields.forEach(fieldKey => {
          if (fieldKey.startsWith(remoteItem.id + '-')) {
            const field = fieldKey.substring(remoteItem.id.length + 1);
            if (field.startsWith('customFields.')) {
              const customFieldKey = field.replace('customFields.', '');
              // Ensure customFields object exists
              merged.customFields = merged.customFields || {};
              localItem.customFields = localItem.customFields || {};
              // Field-by-field protection for refresh updates too
              merged.customFields[customFieldKey] = localItem.customFields[customFieldKey] ?? merged.customFields?.[customFieldKey];
              console.log(`🛡️ Protected custom field ${customFieldKey} for item ${remoteItem.id} (refresh)`);
            } else if (Object.prototype.hasOwnProperty.call(localItem, field)) {
              (merged as any)[field] = (localItem as any)[field];
              console.log(`🛡️ Protected field ${field} for item ${remoteItem.id} (refresh)`);
            }
          }
        });
        return merged;
      });
      
      actions.loadState({
        items: mergedItems,
        title: protectedFields.has('title') ? state.title : latestData.title,
        startTime: protectedFields.has('startTime') ? state.startTime : latestData.start_time,
        timezone: protectedFields.has('timezone') ? state.timezone : latestData.timezone,
        showDate: protectedFields.has('showDate') ? state.showDate : (latestData.show_date ? new Date(latestData.show_date + 'T00:00:00') : null),
        externalNotes: protectedFields.has('externalNotes') ? state.externalNotes : latestData.external_notes,
        docVersion: latestData.doc_version || 0 // CRITICAL: Include docVersion for OCC
      });
      return;
    }
    
    // No protected fields - safe to apply latest data
    actions.loadState({
      items: latestData.items || [],
      title: latestData.title,
      startTime: latestData.start_time,
      timezone: latestData.timezone,
      showDate: latestData.show_date ? new Date(latestData.show_date + 'T00:00:00') : null,
      externalNotes: latestData.external_notes,
      docVersion: latestData.doc_version || 0 // CRITICAL: Include docVersion for OCC
    });
  }, [actions, getProtectedFields, state.items, state.title, state.startTime, state.timezone, state.showDate, state.externalNotes]);

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
            showDate: data.show_date ? new Date(data.show_date + 'T00:00:00') : null
          });
          
          setLastKnownTimestamp(data.updated_at);
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
    
    const calculated = calculateItemsWithTiming(
      state.items, 
      state.startTime,
      state.numberingLocked,
      state.lockedRowNumbers
    );
    return calculated;
  }, [state.items, state.startTime, state.numberingLocked, state.lockedRowNumbers]);

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
      actions.deleteItem(id);
      
      // For per-cell saves, use structural save coordination
      if (cellEditIntegration.isPerCellEnabled) {
        console.log('🧪 STRUCTURAL CHANGE: deleteRow completed - triggering structural coordination');
        markStructuralChange('delete_row', { deletedIds: [id] });
      }
      
      // Broadcast row removal for immediate realtime sync
      if (rundownId && currentUserId) {
        // Track that this change was made by the current user
        lastChangeUserIdRef.current = currentUserId;
        cellBroadcast.broadcastCellUpdate(
          rundownId,
          undefined,
          'items:remove',
          { id },
          currentUserId,
          getTabId()
        );
      }
    }, [actions.deleteItem, state.items, state.title, saveUndoState, rundownId, currentUserId, cellEditIntegration.isPerCellEnabled, markStructuralChange]),

    addRow: useCallback(() => {
      saveUndoState(state.items, [], state.title, 'Add segment');
      helpers.addRow();
      
      // For per-cell saves, use structural save coordination
      if (cellEditIntegration.isPerCellEnabled) {
        console.log('🧪 STRUCTURAL CHANGE: addRow completed - triggering structural coordination');
        markStructuralChange('add_row', { items: state.items });
      }
      
      // Best-effort immediate hint: broadcast new order so other clients can reflect movement
      if (rundownId && currentUserId) {
        const order = state.items.map(i => i.id);
        // Track that this change was made by the current user
        lastChangeUserIdRef.current = currentUserId;
        setTimeout(() => {
          cellBroadcast.broadcastCellUpdate(
            rundownId,
            undefined,
            'items:reorder',
            { order },
            currentUserId,
            getTabId()
          );
        }, 0);
      }
    }, [helpers.addRow, state.items, state.title, saveUndoState, rundownId, currentUserId, cellEditIntegration.isPerCellEnabled, markStructuralChange]),

    addHeader: useCallback(() => {
      saveUndoState(state.items, [], state.title, 'Add header');
      helpers.addHeader();
      
      // For per-cell saves, use structural save coordination
      if (cellEditIntegration.isPerCellEnabled) {
        console.log('🧪 STRUCTURAL CHANGE: addHeader completed - triggering structural coordination');
        markStructuralChange('add_header', { items: state.items });
      }
      
      if (rundownId && currentUserId) {
        const order = state.items.map(i => i.id);
        // Track that this change was made by the current user
        lastChangeUserIdRef.current = currentUserId;
        setTimeout(() => {
          cellBroadcast.broadcastCellUpdate(
            rundownId,
            undefined,
            'items:reorder',
            { order },
            currentUserId,
            getTabId()
          );
        }, 0);
      }
    }, [helpers.addHeader, state.items, state.title, saveUndoState, rundownId, currentUserId, cellEditIntegration.isPerCellEnabled, markStructuralChange]),

    setTitle: useCallback((newTitle: string) => {
      // Re-enable autosave after local edit if previously blocked
      if (blockUntilLocalEditRef.current) {
        console.log('✅ AutoSave: local edit detected - re-enabling saves');
        blockUntilLocalEditRef.current = false;
      }
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
          // Track that this change was made by the current user
          lastChangeUserIdRef.current = currentUserId;
          cellBroadcast.broadcastCellUpdate(rundownId, undefined, 'title', newTitle, currentUserId, getTabId());
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
  const addRowAtIndex = useCallback((insertIndex: number) => {
      // Auto-save will handle this change - no special handling needed
    saveUndoState(state.items, [], state.title, 'Add segment');
    
    const newItem = {
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
    };

    const newItems = [...state.items];
    const actualIndex = Math.min(insertIndex, newItems.length);
    newItems.splice(actualIndex, 0, newItem);
    
    actions.setItems(newItems);
    
    // Broadcast add at index for immediate realtime sync (use the updated item from array)
    if (rundownId && currentUserId) {
      const itemToBroadcast = newItems.find(i => i.id === newItem.id) || newItem;
      // Track that this change was made by the current user
      lastChangeUserIdRef.current = currentUserId;
      cellBroadcast.broadcastCellUpdate(
        rundownId,
        undefined,
        'items:add',
        { item: itemToBroadcast, index: actualIndex },
        currentUserId,
        getTabId()
      );
    }
    
    // For per-cell saves, use structural save coordination
    if (cellEditIntegration.isPerCellEnabled) {
      markStructuralChange('add_row', { 
        newItems: [newItem], 
        insertIndex: actualIndex,
        lockedRowNumbers: state.lockedRowNumbers,
        numberingLocked: state.numberingLocked
      });
    }
  }, [state.items, state.title, state.startTime, state.numberingLocked, state.lockedRowNumbers, saveUndoState, actions.setItems, actions.setLockedRowNumbers, rundownId, currentUserId, cellEditIntegration.isPerCellEnabled, markStructuralChange]);

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

    const newItems = [...state.items];
    const actualIndex = Math.min(insertIndex, newItems.length);
    newItems.splice(actualIndex, 0, newHeader);
    
    actions.setItems(newItems);
    
    // Broadcast header add at index for immediate realtime sync
    if (rundownId && currentUserId) {
      // Track that this change was made by the current user
      lastChangeUserIdRef.current = currentUserId;
      cellBroadcast.broadcastCellUpdate(
        rundownId,
        undefined,
        'items:add',
        { item: newHeader, index: actualIndex },
        currentUserId,
        getTabId()
      );
    }
    
    // For per-cell saves, use structural save coordination
    if (cellEditIntegration.isPerCellEnabled) {
      console.log('🧪 STRUCTURAL CHANGE: addHeaderAtIndex completed - triggering structural coordination');
      markStructuralChange('add_header', { newItems: [newHeader], insertIndex: actualIndex });
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
    
    // Row numbering lock state
    numberingLocked: state.numberingLocked,
    lockedRowNumbers: state.lockedRowNumbers,
    
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
      isSaving,
    saveCompletionCount,
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
      actions.deleteMultipleItems(itemIds);
      
      // For per-cell saves, use structural save coordination
      if (cellEditIntegration.isPerCellEnabled) {
        console.log('🧪 STRUCTURAL CHANGE: deleteMultipleItems completed - triggering structural coordination');
        markStructuralChange('delete_row', { deletedIds: itemIds });
      }
      
      // Broadcast multiple row removals for immediate realtime sync
      if (rundownId && currentUserId) {
        // Track that this change was made by the current user
        lastChangeUserIdRef.current = currentUserId;
        cellBroadcast.broadcastCellUpdate(
          rundownId,
          undefined,
          'items:remove-multiple',
          { ids: itemIds },
          currentUserId,
          getTabId()
        );
      }
    }, [actions.deleteMultipleItems, state.items, state.title, saveUndoState, rundownId, currentUserId, cellEditIntegration.isPerCellEnabled, markStructuralChange]),
    addItem: useCallback((item: any, targetIndex?: number) => {
      // Re-enable autosave after local edit if it was blocked due to teammate update
      if (blockUntilLocalEditRef.current) {
        console.log('✅ AutoSave: local edit detected - re-enabling saves');
        blockUntilLocalEditRef.current = false;
      }
      actions.addItem(item, targetIndex);
    }, [actions.addItem]),
    setTitle: enhancedActions.setTitle,
    setStartTime: useCallback((newStartTime: string) => {
      console.log('🧪 SIMPLIFIED STATE: setStartTime called with:', newStartTime);
      if (blockUntilLocalEditRef.current) {
        console.log('✅ AutoSave: local edit detected - re-enabling saves');
        blockUntilLocalEditRef.current = false;
      }
      
      // Track field change for per-cell save system
      if (cellEditIntegration.isPerCellEnabled) {
        console.log('🧪 SIMPLIFIED STATE: Tracking startTime change for per-cell save');
        cellEditIntegration.handleCellChange(undefined, 'startTime', newStartTime);
      }
      
      // Broadcast rundown-level property change
      if (rundownId && currentUserId) {
        // Track that this change was made by the current user
        lastChangeUserIdRef.current = currentUserId;
        cellBroadcast.broadcastCellUpdate(rundownId, undefined, 'startTime', newStartTime, currentUserId, getTabId());
      }
      
      actions.setStartTime(newStartTime);
    }, [actions.setStartTime, rundownId, currentUserId, cellEditIntegration]),
    setTimezone: useCallback((newTimezone: string) => {
      console.log('🧪 SIMPLIFIED STATE: setTimezone called with:', newTimezone);
      if (blockUntilLocalEditRef.current) {
        console.log('✅ AutoSave: local edit detected - re-enabling saves');
        blockUntilLocalEditRef.current = false;
      }
      
      // Track field change for per-cell save system
      if (cellEditIntegration.isPerCellEnabled) {
        console.log('🧪 SIMPLIFIED STATE: Tracking timezone change for per-cell save');
        cellEditIntegration.handleCellChange(undefined, 'timezone', newTimezone);
      }
      
      // Broadcast rundown-level property change
      if (rundownId && currentUserId) {
        // Track that this change was made by the current user
        lastChangeUserIdRef.current = currentUserId;
        cellBroadcast.broadcastCellUpdate(rundownId, undefined, 'timezone', newTimezone, currentUserId, getTabId());
      }
      
      actions.setTimezone(newTimezone);
    }, [actions.setTimezone, rundownId, currentUserId, cellEditIntegration]),
    setShowDate: useCallback((newShowDate: Date | null) => {
      console.log('🧪 SIMPLIFIED STATE: setShowDate called with:', newShowDate);
      if (blockUntilLocalEditRef.current) {
        console.log('✅ AutoSave: local edit detected - re-enabling saves');
        blockUntilLocalEditRef.current = false;
      }
      
      // Track field change for per-cell save system
      if (cellEditIntegration.isPerCellEnabled) {
        console.log('🧪 SIMPLIFIED STATE: Tracking showDate change for per-cell save');
        cellEditIntegration.handleCellChange(undefined, 'showDate', newShowDate);
      }
      
      // Broadcast rundown-level property change
      if (rundownId && currentUserId) {
        // Track that this change was made by the current user
        lastChangeUserIdRef.current = currentUserId;
        cellBroadcast.broadcastCellUpdate(rundownId, undefined, 'showDate', newShowDate, currentUserId, getTabId());
      }
      
      actions.setShowDate(newShowDate);
    }, [actions.setShowDate, rundownId, currentUserId, cellEditIntegration]),
    
    addRow: enhancedActions.addRow,
    addHeader: enhancedActions.addHeader,
    addRowAtIndex,
    addHeaderAtIndex,
    
    // Row numbering lock toggle with calculated items
    toggleLock: useCallback(() => {
      actions.toggleLock(calculatedItems);
      
      // In per-cell mode, trigger structural save to persist lock state
      if (cellEditIntegration.isPerCellEnabled && rundownId && currentUserId) {
        console.log('🔒 TOGGLE_LOCK: Triggering structural save', {
          willBeLocked: !state.numberingLocked,
          currentLockedCount: Object.keys(state.lockedRowNumbers).length
        });
        
        // Calculate the new state based on current lock status
        const newLockState = !state.numberingLocked;
        const newLockedNumbers = newLockState 
          ? (() => {
              const snapshot: { [itemId: string]: string } = {};
              calculatedItems.forEach((item: any) => {
                if (item.type === 'regular' && item.calculatedRowNumber) {
                  snapshot[item.id] = item.calculatedRowNumber;
                }
              });
              return snapshot;
            })()
          : {};
        
        markStructuralChange('toggle_lock', {
          numberingLocked: newLockState,
          lockedRowNumbers: newLockedNumbers,
          items: state.items
        });
      }
    }, [actions.toggleLock, calculatedItems, cellEditIntegration.isPerCellEnabled, rundownId, currentUserId, state.numberingLocked, state.lockedRowNumbers, state.items, markStructuralChange]),
    
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
    undo: () => undo(state.items, columns, state.title),
    canUndo,
    lastAction,
    redo: () => redo(),
    canRedo,
    nextRedoAction,
    
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
