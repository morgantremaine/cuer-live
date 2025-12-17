import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useRundownState } from './useRundownState';
import { useSimpleAutoSave } from './useSimpleAutoSave';
import { useOperationUndo } from './useOperationUndo';
import { useMemoryTracking } from './useMemoryTracking';
import { debouncedFieldTracker } from '@/utils/debouncedFieldTracker';

import { useConsolidatedRealtimeRundown } from './useConsolidatedRealtimeRundown';
import { useUserColumnPreferences } from './useUserColumnPreferences';
import { useRundownStateCache } from './useRundownStateCache';
import { useGlobalTeleprompterSync } from './useGlobalTeleprompterSync';
import { useCellEditIntegration } from './useCellEditIntegration';
import { useEdgeFunctionPrewarming } from './useEdgeFunctionPrewarming';
import { signatureDebugger } from '@/utils/signatureDebugger'; // Enable signature monitoring
import { useActiveTeam } from './useActiveTeam';

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
import { initializeSortOrders, compareSortOrder, generateKeyBetween } from '@/utils/fractionalIndex';

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
  const [saveCompletionCount, setSaveCompletionCount] = useState(0);
  
  
  // Connection state will come from realtime hook
  const [isConnected, setIsConnected] = useState(false);

  // Pre-warm edge functions AFTER UI is ready (2s delay)
  useEdgeFunctionPrewarming(rundownId, isInitialized, isConnected, 2000);

  // Enhanced conflict resolution system with validation
  const typingSessionRef = useRef<{ fieldKey: string; startTime: number } | null>(null);
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
  const TYPING_DEBOUNCE_MS = 2000; // Extended to cover save debounce (1500ms) + buffer
  const CONFLICT_RESOLUTION_DELAY = 2000; // Keep for edge cases
  
  // Track pending structural changes to prevent overwrite during save
  const pendingStructuralChangeRef = useRef(false);
  // Track when to refresh on next focus to prevent infinite loops
  const shouldRefreshOnFocusRef = useRef(false);
  
  // Track active structural operations to block realtime updates
  const activeStructuralOperationRef = useRef(false);
  
  // DRAG PROTECTION: Track recently dragged items to ignore remote sortOrder updates
  // Prevents race condition where concurrent drags desync row order
  const recentDragOperationsRef = useRef<Map<string, { sortOrder: string; timestamp: number }>>(new Map());
  const DRAG_PROTECTION_WINDOW_MS = 2000; // 2 seconds protection after drag
  
  // Enhanced cooldown management with explicit flags  
  const blockUntilLocalEditRef = useRef(false);
  const cooldownUntilRef = useRef<number>(0);
  
  // Track userId of last change to prevent spurious "unsaved changes" from remote broadcasts
  const lastChangeUserIdRef = useRef<string | null>(null);
  
  // Track if we've primed the autosave after initial load
  const lastSavedPrimedRef = useRef(false);
  
  // Ref for updateBaselineFromServerData (populated after autoSave is created)
  const updateBaselineRef = useRef<(() => void) | undefined>(undefined);
  
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
      recentlyEditedFieldsRef.current.clear();
      dropdownFieldProtectionRef.current.clear();
      recentDragOperationsRef.current.clear();
      typingSessionRef.current = null;
      activeFocusFieldRef.current = null;
    };
  }, []);

  // PHASE 1.2: Aggressive cleanup for recentlyEditedFieldsRef to prevent unbounded growth
  // Removes entries older than 30 seconds every 10 seconds
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const STALE_THRESHOLD_MS = 30000; // 30 seconds
      
      const cleanedKeys: string[] = [];
      for (const [key, timestamp] of recentlyEditedFieldsRef.current.entries()) {
        if (now - timestamp > STALE_THRESHOLD_MS) {
          recentlyEditedFieldsRef.current.delete(key);
          cleanedKeys.push(key);
        }
      }
      
    }, 10000); // Run every 10 seconds
    
    return () => clearInterval(cleanupInterval);
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
    
    // CRITICAL: Sort by sortOrder to ensure consistent display order
    const sortedItems = [...(mergedData.items || [])].sort((a, b) => 
      compareSortOrder(a.sortOrder, b.sortOrder)
    );
    
    // Apply merged data to state
    actions.loadState({
      items: sortedItems,
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
    
    // SINGLE POINT: Update baseline after conflict resolution
    updateBaselineRef.current?.();
  }, [actions, state.title, state.startTime, state.timezone]);

  // Auto-save functionality with unified save pipeline (no setTrackOwnUpdate needed - uses centralized tracker)
  const autoSave = useSimpleAutoSave(
    {
      ...state,
      columns: [] // Remove columns from team sync
    }, 
    rundownId, 
    (meta?: { updatedAt?: string; completionCount?: number }) => {
      actions.markSaved();
      
      // Handle completion count for save indicator
      if (meta?.completionCount !== undefined) {
        setSaveCompletionCount(meta.completionCount);
      }
      
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
  
  // Destructure autoSave functions and state
  const { 
    isSaving: autoSaveIsSaving, 
    setUndoActive, 
    markActiveTyping, 
    isTypingActive, 
    triggerImmediateSave, 
    retryFailedSaves, 
    getFailedSavesCount,
    updateBaselineFromServerData
  } = autoSave;

  // Populate ref for use in callbacks defined before autoSave
  useEffect(() => {
    updateBaselineRef.current = updateBaselineFromServerData;
  }, [updateBaselineFromServerData]);
  
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
  const reconciliationTimeoutRef = useRef<NodeJS.Timeout>();
  const syncBeforeWriteRef = useRef(false);
  
  // Ref for hasPendingUpdates function (populated later after cellEditIntegration is initialized)
  const hasPendingUpdatesRef = useRef<(() => boolean) | undefined>(undefined);
  
  const realtimeConnection = useConsolidatedRealtimeRundown({
    rundownId,
    blockUntilLocalEditRef,
    // Pass hasPendingUpdates function via ref (populated after cellEditIntegration init)
    hasPendingUpdates: () => hasPendingUpdatesRef.current?.() || false,
    onRundownUpdate: useCallback((updatedRundown) => {
      // Monotonic timestamp guard for stale updates
      if (updatedRundown.updated_at && lastKnownTimestamp) {
        const incomingTime = new Date(updatedRundown.updated_at).getTime();
        const knownTime = new Date(lastKnownTimestamp).getTime();
        
        if (incomingTime <= knownTime) {
          return;
        }
      }
      
      // ALWAYS apply updates - never block them. Google Sheets style.
      debugLogger.realtime('Processing realtime update immediately:', {
        docVersion: updatedRundown.doc_version,
        hasItems: !!updatedRundown.items,
        itemCount: updatedRundown.items?.length || 0,
        isTyping: isTypingActive(),
        activeField: typingSessionRef.current?.fieldKey
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
        
        // CRITICAL: Sort by sortOrder to ensure consistent display order
        const sortedMergedItems = [...mergedItems].sort((a, b) => 
          compareSortOrder(a.sortOrder, b.sortOrder)
        );
        
        // Apply the update with simple field-level protection
        actions.loadState({
          items: sortedMergedItems,
          title: protectedFields.has('title') ? state.title : updatedRundown.title,
          startTime: protectedFields.has('startTime') ? state.startTime : updatedRundown.start_time,
          timezone: protectedFields.has('timezone') ? state.timezone : updatedRundown.timezone,
          showDate: protectedFields.has('showDate') ? state.showDate : (updatedRundown.show_date ? new Date(updatedRundown.show_date + 'T00:00:00') : null),
          externalNotes: protectedFields.has('externalNotes') ? state.externalNotes : updatedRundown.external_notes
        });
        
        // Track remote update time
        lastRemoteUpdateRef.current = Date.now();
        
        // SINGLE POINT: Update baseline after server data load
        updateBaselineRef.current?.();
        
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
        if (updatedRundown.hasOwnProperty('items')) {
          // CRITICAL: Sort by sortOrder to ensure consistent display order across all views
          const sortedItems = [...(updatedRundown.items || [])].sort((a, b) => 
            compareSortOrder(a.sortOrder, b.sortOrder)
          );
          updateData.items = sortedItems;
        }
        if (updatedRundown.hasOwnProperty('title')) updateData.title = updatedRundown.title;
        if (updatedRundown.hasOwnProperty('start_time')) updateData.startTime = updatedRundown.start_time;
        if (updatedRundown.hasOwnProperty('timezone')) updateData.timezone = updatedRundown.timezone;
        if (updatedRundown.hasOwnProperty('show_date')) updateData.showDate = updatedRundown.show_date ? new Date(updatedRundown.show_date + 'T00:00:00') : null;
        
        // Add external notes to update data
        if (updatedRundown.hasOwnProperty('external_notes')) updateData.externalNotes = updatedRundown.external_notes;
        
        // Only apply if we have fields to update
        if (Object.keys(updateData).length > 0) {
          actions.loadState(updateData);
          
          // SINGLE POINT: Update baseline after server data load
          updateBaselineRef.current?.();
        }
        
        // REMOVED: blockUntilLocalEditRef blocking - autosave now operates independently
        debugLogger.autosave('AutoSave: Remote update received - autosave continues normally');
       }
    }, [actions, getProtectedFields]),
    enabled: !isLoading
  });
  
  // Update connection state from realtime hook
  useEffect(() => {
    setIsConnected(realtimeConnection.isConnected);
    debugLogger.realtime(`Connection status changed: ${realtimeConnection.isConnected}`);
  }, [realtimeConnection.isConnected]);

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

  // Operation-based undo system
  const {
    recordOperation,
    recordBatchedCellEdit,
    finalizeTypingSession,
    finalizeAllTypingSessions,
    undo,
    redo,
    canUndo,
    lastAction,
    canRedo,
    nextRedoAction,
    undoStackSize,
    redoStackSize,
    // Memory diagnostics getters
    getUndoStack,
    getRedoStack,
    getTypingSessionsCount
  } = useOperationUndo({
    items: state.items,
    updateItem: (id: string, updates: Partial<RundownItem>) => {
      // Extract all field keys from the updates object
      const fields = Object.keys(updates);
      
      // If this is a single-field update (typical for cell edits during undo/redo),
      // route it through enhancedUpdateItem to trigger broadcasts
      if (fields.length === 1) {
        const field = fields[0];
        const value = updates[field];
        
        // Call enhancedUpdateItem which has the broadcast logic
        enhancedUpdateItem(id, field, String(value));
      } else {
        // Multi-field updates go through the reducer as before
        actions.updateItem(id, updates);
      }
    },
    deleteRow: (id: string) => {
      actions.deleteItem(id);
    },
    setItems: (items: RundownItem[]) => {
      actions.setItems(items);
    },
    setUndoActive: setUndoActive,
    userId: currentUserId || 'anonymous',
    onOperationComplete: (operationType, operationData) => {
      // Only broadcast structural operations, not cell edits
      // Cell edits are handled by the per-cell save system automatically
      if (operationType === 'add_row' || 
          operationType === 'add_header' || 
          operationType === 'delete_row' || 
          operationType === 'reorder') {
        markStructuralChange(operationType, operationData);
      }
      // cell_edit operations will be broadcast by the per-cell save system
      // when updateItem triggers the UPDATE_ITEM action
    }
  });

  // Memory tracking for diagnostics - call window.memoryDiag() in console
  useMemoryTracking({
    items: state.items,
    undoStackSize,
    redoStackSize,
    rundownId,
    columns,
    getUndoStack,
    getRedoStack,
    getTypingSessionsCount,
    recentlyEditedFieldsRef,
    dropdownFieldProtectionRef,
    recentDragOperationsRef,
  });

  // Cell-level broadcast system for immediate sync
  useEffect(() => {
    if (!rundownId || !currentUserId) return;

    const unsubscribe = cellBroadcast.subscribeToCellUpdates(rundownId, async (update) => {
      // Only process cell value updates, not focus events
      if ('isFocused' in update) return;
      if (!('value' in update)) return;
      
      // Skip our own tab's updates (supports multiple tabs per user)
      const currentTabId = getTabId();
      if (cellBroadcast.isOwnUpdate(update, currentTabId)) {
        return;
      }
      
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
            case 'endTime':
              actionsRef.current.loadRemoteState({ endTime: update.value });
              break;
            case 'timezone':
              actionsRef.current.loadRemoteState({ timezone: update.value });
              break;
            case 'showDate':
              actionsRef.current.loadRemoteState({ showDate: update.value });
              break;
            case 'items:reorder': {
              // Legacy reorder handler - kept for backwards compatibility
              // New reordering uses sortOrder field with fractional indexing
              
              const order: string[] = Array.isArray(update.value?.order) ? update.value.order : [];
              if (order.length > 0) {
                const indexMap = new Map(order.map((id, idx) => [id, idx]));
                const reordered = [...stateRef.current.items].sort((a, b) => {
                  const ai = indexMap.has(a.id) ? (indexMap.get(a.id) as number) : Number.MAX_SAFE_INTEGER;
                  const bi = indexMap.has(b.id) ? (indexMap.get(b.id) as number) : Number.MAX_SAFE_INTEGER;
                  return ai - bi;
                });
                // CRITICAL: Final sort by sortOrder to ensure consistency (matches Teleprompter behavior)
                reordered.sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
                actionsRef.current.loadState({ items: reordered });
                console.log('🔄 Applied reorder broadcast:', { itemCount: reordered.length });
              }
              break;
            }
            case 'items:add': {
              const payload = update.value || {};
              
              // Check for batch add first (multiple items from undo/redo)
              if (payload.items && Array.isArray(payload.items)) {
                const items = payload.items;
                const index = Math.max(0, Math.min(payload.index ?? stateRef.current.items.length, stateRef.current.items.length));
                
                if (items.length > 0) {
                  // Filter out any items that already exist (prevent duplicates)
                  const newItemsToAdd = items.filter((item: RundownItem) => 
                    !stateRef.current.items.find(i => i.id === item.id)
                  );
                  
                  if (newItemsToAdd.length > 0) {
                    const newItems = [...stateRef.current.items];
                    newItems.splice(index, 0, ...newItemsToAdd);
                    // Re-sort by sortOrder to ensure consistency across clients
                    newItems.sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
                    actionsRef.current.loadState({ items: newItems });
                    console.log('📊 items:add batch - re-sorted by sortOrder', { count: newItemsToAdd.length });
                  }
                }
              } else {
                // Single item add (original behavior)
                const item = payload.item;
                const index = Math.max(0, Math.min(payload.index ?? stateRef.current.items.length, stateRef.current.items.length));
                if (item && !stateRef.current.items.find(i => i.id === item.id)) {
                  const newItems = [...stateRef.current.items];
                  newItems.splice(index, 0, item);
                  // Re-sort by sortOrder to ensure consistency across clients
                  newItems.sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
                  actionsRef.current.loadState({ items: newItems });
                  console.log('📊 items:add single - re-sorted by sortOrder', { itemId: item.id, sortOrder: item.sortOrder });
                }
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
                  // Re-sort by sortOrder to ensure consistency across clients
                  newItems.sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
                  actionsRef.current.loadState({ items: newItems });
                  console.log('📊 items:copy - re-sorted by sortOrder', { count: newItemsToAdd.length });
                }
              }
              break;
            }
            case 'items:remove': {
              const id = update.value?.id as string;
              if (id) {
                const newItems = stateRef.current.items.filter(i => i.id !== id);
                if (newItems.length !== stateRef.current.items.length) {
                  // CRITICAL: Sort by sortOrder to ensure consistent display order
                  newItems.sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
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
                  // CRITICAL: Sort by sortOrder to ensure consistent display order
                  newItems.sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
                  actionsRef.current.loadState({ items: newItems });
                }
              }
              break;
            }
            case 'lock_state': {
              const { numberingLocked, lockedRowNumbers } = update.value || {};
              if (numberingLocked !== undefined) {
                actionsRef.current.loadState({
                  numberingLocked,
                  lockedRowNumbers: lockedRowNumbers || {}
                });
              }
              break;
            }
            case 'sortOrder': {
              // Handle sortOrder updates from other users' drag operations
              // Uses functional state update via reducer - no stale ref issues!
              const { sortOrderUpdates } = update.value || {};
              if (sortOrderUpdates && Array.isArray(sortOrderUpdates) && sortOrderUpdates.length > 0) {
                const now = Date.now();
                
                // Filter out updates for items we recently dragged locally
                const filteredUpdates = sortOrderUpdates.filter((u: { itemId: string; sortOrder: string }) => {
                  const protection = recentDragOperationsRef.current.get(u.itemId);
                  if (protection && now - protection.timestamp < DRAG_PROTECTION_WINDOW_MS) {
                    console.log('🛡️ Ignoring remote sortOrder - item was just dragged locally', {
                      itemId: u.itemId.slice(-6),
                      localSortOrder: protection.sortOrder,
                      remoteSortOrder: u.sortOrder
                    });
                    return false;
                  }
                  return true;
                });
                
                if (filteredUpdates.length > 0) {
                  console.log('📡 Applying remote sortOrder changes via functional update', {
                    updateCount: filteredUpdates.length,
                    filtered: sortOrderUpdates.length - filteredUpdates.length
                  });
                  
                  // Use the reducer-based updateSortOrders action
                  // This operates on React's current state, not stateRef
                  actionsRef.current.updateSortOrders(filteredUpdates);
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
            return;
          }

          // CRITICAL: Get a fresh snapshot of items to avoid stale ref issues
          // when multiple broadcasts arrive in quick succession
          const currentItems = stateRef.current.items;
          const originalItemCount = currentItems.length;
          
          // Verify the item exists before updating
          const targetItem = currentItems.find(item => item.id === update.itemId);
          if (!targetItem) {
            console.warn('📊 Remote update for non-existent item:', update.itemId);
            return;
          }
          
          const updatedItems = currentItems.map(item => {
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

          if (updatedItems.some((item, index) => item !== currentItems[index])) {
            // If sortOrder was updated, re-sort the items array
            if (update.field === 'sortOrder') {
              // DRAG PROTECTION: Check if this item was recently dragged locally
              const now = Date.now();
              const protection = recentDragOperationsRef.current.get(update.itemId);
              if (protection && now - protection.timestamp < DRAG_PROTECTION_WINDOW_MS) {
                console.log('🛡️ Ignoring remote sortOrder update - item was just dragged locally', {
                  itemId: update.itemId.slice(-6),
                  localSortOrder: protection.sortOrder,
                  remoteSortOrder: update.value
                });
                return; // Skip this update, our local drag takes precedence
              }
              
              const sortedItems = [...updatedItems].sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
              
              // CRITICAL SAFETY CHECK: Verify item count consistency
              if (sortedItems.length !== originalItemCount) {
                console.error('🚨 CRITICAL: Item count mismatch after sortOrder update!', {
                  originalCount: originalItemCount,
                  sortedCount: sortedItems.length,
                  updatedItemId: update.itemId
                });
                return; // Abort to prevent data loss
              }
              
              // Verify the updated item still exists in sorted array
              const itemStillExists = sortedItems.some(item => item.id === update.itemId);
              if (!itemStillExists) {
                console.error('🚨 CRITICAL: Item disappeared after sorting!', {
                  itemId: update.itemId,
                  newSortOrder: update.value
                });
                return; // Abort to prevent data loss
              }
              
              console.log('📊 Applying remote sortOrder change - re-sorting items', {
                itemId: update.itemId,
                newSortOrder: update.value,
                itemCount: sortedItems.length
              });
              
              // CRITICAL: Update ref synchronously BEFORE calling loadRemoteState
              // This prevents stale ref issues when multiple broadcasts arrive quickly
              stateRef.current = { ...stateRef.current, items: sortedItems };
              actionsRef.current.loadRemoteState({ items: sortedItems });
            } else {
              actionsRef.current.loadRemoteState({ items: updatedItems });
            }
          }
      } catch (error) {
        console.error('📱 Error applying cell broadcast update:', error);
      }
    }, getTabId());

    return () => {
      unsubscribe();
      // Flush any pending debounced broadcasts before cleanup
      if (rundownId) {
        cellBroadcast.flushPendingBroadcasts(rundownId);
      }
    };
  }, [rundownId, currentUserId]);
  
  // Cell edit integration for per-cell saves (after realtime connection is established)
  const perCellEnabled = Boolean(state.perCellSaveEnabled);
  
  // CRITICAL: Track per-cell enabled state to coordinate with autosave
  useEffect(() => {
    if (import.meta.env.DEV && localStorage.getItem('debugPerCellSave') === '1') {
      console.log('🧪 PER-CELL SAVE: State updated', {
        perCellSaveEnabled: state.perCellSaveEnabled,
        rundownId,
        isEnabled: perCellEnabled
      });
    }
  }, [state.perCellSaveEnabled, rundownId, perCellEnabled]);
  
  const cellEditIntegration = useCellEditIntegration({
    rundownId,
    isPerCellEnabled: perCellEnabled,
    userId: currentUserId || undefined,
    onSaveComplete: (completionCount?: number) => {
      if (import.meta.env.DEV && localStorage.getItem('debugPerCellSave') === '1') {
        console.log('🧪 PER-CELL SAVE: Save completed - marking main state as saved');
      }
      actions.markSaved();
      if (completionCount !== undefined) {
        setSaveCompletionCount(completionCount);
      }
    },
    onSaveStart: () => {
      if (import.meta.env.DEV && localStorage.getItem('debugPerCellSave') === '1') {
        console.log('🧪 PER-CELL SAVE: Save started');
      }
      // The isSaving state will be managed by the per-cell save system itself
    },
    onUnsavedChanges: () => {
      if (import.meta.env.DEV && localStorage.getItem('debugPerCellSave') === '1') {
        console.log('🧪 PER-CELL SAVE: Unsaved changes detected');
      }
      // The hasUnsavedChanges will be managed by the per-cell save system itself
    }
  });
  
  // Populate hasPendingUpdates ref for realtime sync coordination
  useEffect(() => {
    if (perCellEnabled) {
      hasPendingUpdatesRef.current = cellEditIntegration.saveCoordination.hasPendingUpdates;
    } else {
      hasPendingUpdatesRef.current = undefined;
    }
  }, [perCellEnabled, cellEditIntegration.saveCoordination.hasPendingUpdates]);
  
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
    
    // Track endTime changes
    if (prev.endTime !== curr.endTime) {
      cellEditIntegration.handleCellChange(undefined, 'endTime', curr.endTime);
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
  
  // Structural save coordination is now handled by cellEditIntegration
  // (removed redundant saveCoordination instance)
  
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
    if (!autoSaveIsSaving && !pendingStructuralChangeRef.current && deferredUpdateRef.current) {
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
        
        // CRITICAL: Sort by sortOrder to ensure consistent display order
        const sortedMergedItems = [...mergedItems].sort((a, b) => 
          compareSortOrder(a.sortOrder, b.sortOrder)
        );
        
        // Apply merged update
        actions.loadState({
          items: sortedMergedItems,
          title: protectedFields.has('title') ? state.title : deferredUpdate.title,
          startTime: protectedFields.has('startTime') ? state.startTime : deferredUpdate.start_time,
          timezone: protectedFields.has('timezone') ? state.timezone : deferredUpdate.timezone,
          showDate: protectedFields.has('showDate') ? state.showDate : (deferredUpdate.show_date ? new Date(deferredUpdate.show_date + 'T00:00:00') : null)
        });
        
      } else {
        // CRITICAL: Sort by sortOrder to ensure consistent display order
        const sortedItems = [...(deferredUpdate.items || [])].sort((a, b) => 
          compareSortOrder(a.sortOrder, b.sortOrder)
        );
        
        // No protected fields - apply update normally
        actions.loadState({
          items: sortedItems,
          title: deferredUpdate.title,
          startTime: deferredUpdate.start_time,
          timezone: deferredUpdate.timezone,
          showDate: deferredUpdate.show_date ? new Date(deferredUpdate.show_date + 'T00:00:00') : null
        });
      }
    }
  }, [autoSaveIsSaving, actions, getProtectedFields, state.items, state.title, state.startTime, state.timezone, state.showDate]);

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
    // Get old value FIRST before making any changes for undo recording
    const item = state.items.find(i => i.id === id);
    const oldValue = item ? (field.startsWith('customFields.') ? 
      item.customFields?.[field.replace('customFields.', '')] : 
      (item as any)[field === 'segmentName' ? 'name' : field]) : undefined;
    
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
    
    // 🎯 Record cell edit operation for undo/redo (batched for typing fields)
    if (import.meta.env.DEV && localStorage.getItem('debugCellEdit') === '1') {
      console.log('📝 Recording cell edit:', { id, field, oldValue, newValue: value, isTypingField });
    }
    if (isTypingField) {
      // Batch text edits - groups rapid typing into single undo operation
      recordBatchedCellEdit(id, field, oldValue, value, false);
    } else {
      // Non-typing fields (color, isFloating, duration) record immediately
      recordOperation({
        type: 'cell_edit',
        data: { itemId: id, field, oldValue, newValue: value },
        description: `Edit ${field}`
      });
    }
    
    // Simplified: No field tracking needed - last writer wins
    
    // Broadcast cell update - debounced for typing fields, instant for others
    if (rundownId && currentUserId) {
      // Track that this change was made by the current user
      lastChangeUserIdRef.current = currentUserId;
      
      if (isTypingField) {
        // Debounce broadcasts for typing fields (500ms) - reduced load on realtime
        // Uses adaptive debouncing based on active user count
        cellBroadcast.broadcastCellUpdateDebounced(
          rundownId, 
          id, 
          field, 
          value, 
          currentUserId, 
          getTabId()
        );
      } else {
        // Immediate broadcast for non-typing fields (color, isFloating, duration)
        cellBroadcast.broadcastCellUpdate(rundownId, id, field, value, currentUserId, getTabId());
      }
    }
    
    if (isTypingField) {
      // CRITICAL: Tell autosave system that user is actively typing
      markActiveTyping();
      
      // CRITICAL FIX: Mark this field as recently edited for cell broadcast protection
      markFieldAsRecentlyEdited(sessionKey);
      
      if (!typingSessionRef.current || typingSessionRef.current.fieldKey !== sessionKey) {
        // Finalize previous typing session when switching fields
        if (typingSessionRef.current) {
          finalizeTypingSession(typingSessionRef.current.fieldKey);
        }
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
      // Duration changes already recorded by cell_edit operation
    } else if (isImmediateSyncField) {
      // For immediate sync fields like isFloating, save undo state and trigger immediate save
      console.log('🔄 FloatToggle: triggering immediate save for field:', field, 'id:', id);
      // Float toggle already recorded by cell_edit operation
      // DON'T use markActiveTyping() for floating - that triggers typing delay
      // Instead, trigger an immediate flush save that bypasses the typing delay mechanism
      triggerImmediateSave();
    } else if (field === 'color') {
      // Handle color changes separately - trigger immediate save
      // Color changes already recorded by cell_edit operation
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
      
      // Per-cell save tracking is now handled automatically by the reducer
      // No need for duplicate handleCellChange call here
    }
  }, [actions.updateItem, state.items, state.title, cellEditIntegration]);

  // Optimized field tracking with debouncing
  const markFieldAsRecentlyEdited = useCallback((fieldKey: string) => {
    const now = Date.now();
    recentlyEditedFieldsRef.current.set(fieldKey, now);
    
    // Use static import - avoids network errors during offline periods
    debouncedFieldTracker.trackField(fieldKey);
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
      if (operationType && operationData && cellEditIntegration.saveCoordination && currentUserId) {
        console.log('🏗️ STRUCTURAL: Triggering handleStructuralOperation', {
          operationType,
          operationData,
          currentUserId
        });
        cellEditIntegration.saveCoordination.handleStructuralOperation(operationType as any, operationData);
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
  }, [state.perCellSaveEnabled, rundownId, actions.markSaved, cellEditIntegration, currentUserId]);

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
            endTime: DEMO_RUNDOWN_DATA.end_time,
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
            const rawItems = Array.isArray(data.items) && data.items.length > 0 
              ? data.items 
              : createDefaultRundownItems();
            
            // Initialize sortOrder for items that don't have it
            const hadMissingSortOrders = rawItems.some((item: any) => !item.sortOrder);
            const itemsWithSortOrder = initializeSortOrders(rawItems) as RundownItem[];
            
            // CRITICAL: Sort by sortOrder to ensure array order matches sortOrder values
            // This fixes inconsistency where existing sortOrder values don't match array order
            const itemsToLoad = [...itemsWithSortOrder].sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
            console.log('📊 Items sorted by sortOrder after initialization');
            
            // If we initialized missing sortOrders, persist them to the database
            if (hadMissingSortOrders && rundownId) {
              console.log('📊 Persisting newly initialized sortOrder values to database');
              // Fire and forget - don't block UI for this background save
              supabase
                .from('rundowns')
                .update({ items: itemsToLoad })
                .eq('id', rundownId)
                .then(({ error }) => {
                  if (error) {
                    console.error('❌ Failed to persist sortOrder values:', error);
                  } else {
                    console.log('✅ sortOrder values persisted to database');
                  }
                });
            }

            // Sync time from server timestamp and store it
            if (data.updated_at) {
              updateTimeFromServer(data.updated_at);
              setLastKnownTimestamp(data.updated_at);
            }

            // Load content only (columns handled by useUserColumnPreferences)
            actions.loadState({
              items: itemsToLoad,
              columns: [], // Never load columns from rundown - use user preferences
              title: data.title || 'Untitled Rundown',
              startTime: data.start_time || '09:00:00',
              endTime: data.end_time,
              timezone: data.timezone || 'America/New_York',
              showDate: data.show_date ? new Date(data.show_date + 'T00:00:00') : null,
              externalNotes: data.external_notes,
              docVersion: data.doc_version || 0, // CRITICAL: Include docVersion for OCC
              perCellSaveEnabled: data.per_cell_save_enabled || false, // Include per-cell save setting
              numberingLocked: data.numbering_locked || false, // Load lock state
              lockedRowNumbers: data.locked_row_numbers || {} // Load locked numbers
            });
          }
        }
      } catch (error) {
        console.error('Failed to load rundown:', error);
        // DON'T replace existing data with blank data on error!
        // Only load default data if we have no existing data
        if (state.items.length === 0) {
          const defaultItems = createDefaultRundownItems();
          // CRITICAL: Sort by sortOrder to ensure consistent display order
          defaultItems.sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
          actions.loadState({
            items: defaultItems,
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
      }
    };

    loadRundown();
  }, [rundownId]); // Remove isInitialized dependency to prevent reload

  // SINGLE POINT: Update baseline after initial load completes
  useEffect(() => {
    if (isInitialized && !isLoading && updateBaselineRef.current) {
      // Small delay to ensure state has propagated
      const timer = setTimeout(() => {
        updateBaselineRef.current?.();
        console.log('📊 Initial load complete - baseline updated');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isInitialized, isLoading]);

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
      
      // CRITICAL: Sort by sortOrder to ensure consistent display order
      const sortedMergedItems = [...mergedItems].sort((a, b) => 
        compareSortOrder(a.sortOrder, b.sortOrder)
      );
      
      actions.loadState({
        items: sortedMergedItems,
        title: protectedFields.has('title') ? state.title : latestData.title,
        startTime: protectedFields.has('startTime') ? state.startTime : latestData.start_time,
        timezone: protectedFields.has('timezone') ? state.timezone : latestData.timezone,
        showDate: protectedFields.has('showDate') ? state.showDate : (latestData.show_date ? new Date(latestData.show_date + 'T00:00:00') : null),
        externalNotes: protectedFields.has('externalNotes') ? state.externalNotes : latestData.external_notes,
        docVersion: latestData.doc_version || 0 // CRITICAL: Include docVersion for OCC
      });
      
      // SINGLE POINT: Update baseline after server data load
      updateBaselineRef.current?.();
      return;
    }
    
    // No protected fields - safe to apply latest data
    // CRITICAL: Sort by sortOrder to ensure consistent display order
    const sortedItems = [...(latestData.items || [])].sort((a, b) => 
      compareSortOrder(a.sortOrder, b.sortOrder)
    );
    
    actions.loadState({
      items: sortedItems,
      title: latestData.title,
      startTime: latestData.start_time,
      timezone: latestData.timezone,
      showDate: latestData.show_date ? new Date(latestData.show_date + 'T00:00:00') : null,
      externalNotes: latestData.external_notes,
      docVersion: latestData.doc_version || 0 // CRITICAL: Include docVersion for OCC
    });
    
    // SINGLE POINT: Update baseline after server data load
    updateBaselineRef.current?.();
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
              start_time: '09:00:00',
              end_time: '12:00:00',
              timezone: 'America/New_York',
              show_date: new Date().toISOString().split('T')[0] // Set current date in YYYY-MM-DD format
            })
            .select()
            .single();
          
          if (error) throw error;
          
          console.log('✅ New rundown created with ID:', data.id);
          
          // Navigate to the actual rundown URL via React Router (replace history)
          navigate(`/rundown/${data.id}`, { replace: true });
          // Load the newly created rundown data
          const loadedItems = Array.isArray(data.items) ? data.items : createDefaultRundownItems();
          // Initialize sortOrder if needed and sort
          const itemsWithSortOrder = initializeSortOrders(loadedItems) as RundownItem[];
          itemsWithSortOrder.sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
          actions.loadState({
            items: itemsWithSortOrder,
            columns: [],
            title: data.title || 'Untitled Rundown',
            startTime: data.start_time || '09:00:00',
            endTime: data.end_time || '12:00:00',
            timezone: data.timezone || 'America/New_York',
            showDate: data.show_date ? new Date(data.show_date + 'T00:00:00') : null
          });
          
          setLastKnownTimestamp(data.updated_at);
          setIsInitialized(true);
          setIsLoading(false);
          
        } catch (error) {
          console.error('❌ Failed to create new rundown:', error);
          // Fallback to local-only mode
          const fallbackItems = createDefaultRundownItems();
          // CRITICAL: Sort by sortOrder to ensure consistent display order
          fallbackItems.sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
          actions.loadState({
            items: fallbackItems,
            columns: [],
            title: 'Untitled Rundown',
            startTime: '09:00:00',
            endTime: '12:00:00',
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
      const defaultItems = createDefaultRundownItems();
      // CRITICAL: Sort by sortOrder to ensure consistent display order
      defaultItems.sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
      actions.loadState({
        items: defaultItems,
        columns: [],
        title: 'Untitled Rundown',
        startTime: '09:00:00',
        endTime: '12:00:00',
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
      // Float toggle already recorded by cell_edit operation
      const item = state.items.find(i => i.id === id);
      if (item) {
        // Use enhancedUpdateItem for proper cell broadcasting
        enhancedUpdateItem(id, 'isFloating', !item.isFloating ? 'true' : 'false');
      }
    }, [enhancedUpdateItem, state.items, state.title]),

    deleteRow: useCallback((id: string) => {
      // Finalize any typing sessions before structural change
      finalizeAllTypingSessions();
      
      // Capture item before deletion for undo recording
      const deletedItem = state.items.find(item => item.id === id);
      const deletedIndex = state.items.findIndex(item => item.id === id);
      
      // Delete operation already recorded by delete_row operation
      
      actions.deleteItem(id);
      if (deletedItem && deletedIndex !== -1) {
        console.log('🗑️ Recording delete_row operation:', {
          deletedItem,
          deletedIndex,
          description: `Delete "${deletedItem.name || 'row'}"`
        });
        
        recordOperation({
          type: 'delete_row',
          data: { deletedItem, deletedIndex },
          description: `Delete "${deletedItem.name || 'row'}"`
        });
      }
      
      actions.deleteItem(id);
      
      // For per-cell saves, use structural save coordination
      if (cellEditIntegration.isPerCellEnabled) {
        console.log('🧪 STRUCTURAL CHANGE: deleteRow completed - triggering structural coordination');
        markStructuralChange('delete_row', { deletedIds: [id] });
      }
      
      // Broadcast handled by structural save system (after successful DB save)
    }, [actions.deleteItem, state.items, state.title, rundownId, currentUserId, cellEditIntegration.isPerCellEnabled, markStructuralChange, recordOperation, finalizeAllTypingSessions]),

    addRow: useCallback((insertIndex?: number, selectedRows?: Set<string>) => {
      // Capture the operation data returned by helpers.addRow
      const operationData = helpers.addRow(insertIndex, selectedRows);
      
      // For per-cell saves, use structural save coordination with CORRECT data
      if (cellEditIntegration.isPerCellEnabled && operationData) {
        console.log('🧪 STRUCTURAL CHANGE: addRow completed - triggering structural coordination');
        markStructuralChange('add_row', {
          newItems: operationData.newItems,
          insertIndex: operationData.insertIndex
        });
      }
      
      // Broadcast handled by structural save system (after successful DB save)
    }, [helpers.addRow, state.items, state.title, rundownId, currentUserId, cellEditIntegration.isPerCellEnabled, markStructuralChange]),

    addHeader: useCallback(() => {
      // Add header operation already recorded by add_header operation
      helpers.addHeader();
      
      // For per-cell saves, use structural save coordination
      if (cellEditIntegration.isPerCellEnabled) {
        console.log('🧪 STRUCTURAL CHANGE: addHeader completed - triggering structural coordination');
        markStructuralChange('add_header', { items: state.items });
      }
      
      // Broadcast handled by structural save system (after successful DB save)
    }, [helpers.addHeader, state.items, state.title, rundownId, currentUserId, cellEditIntegration.isPerCellEnabled, markStructuralChange]),

    setTitle: useCallback((newTitle: string) => {
      // Re-enable autosave after local edit if previously blocked
      if (blockUntilLocalEditRef.current) {
        console.log('✅ AutoSave: local edit detected - re-enabling saves');
        blockUntilLocalEditRef.current = false;
      }
      if (state.title !== newTitle) {
        // Field change tracking handled by useEffect that monitors state changes
        
        // Simplified: Just set typing session for active protection
        typingSessionRef.current = { fieldKey: 'title', startTime: Date.now() };
        
        // Broadcast rundown-level property change
        if (rundownId && currentUserId) {
          // Track that this change was made by the current user
          lastChangeUserIdRef.current = currentUserId;
          cellBroadcast.broadcastCellUpdate(rundownId, undefined, 'title', newTitle, currentUserId, getTabId());
        }
        
        // Title changes tracked separately
        actions.setTitle(newTitle);
        
        // Clear typing session after delay
        setTimeout(() => {
          if (typingSessionRef.current?.fieldKey === 'title') {
            typingSessionRef.current = null;
          }
        }, 5000); // Extended timeout for title editing
      }
    }, [actions.setTitle, state.items, state.title, rundownId, currentUserId, cellEditIntegration])
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
      // Finalize any typing sessions before structural change
      finalizeAllTypingSessions();
      
      // Auto-save will handle this change - no special handling needed
    // Add operation already recorded by add_row operation
    
    // Calculate sortOrder for the new item based on insertion position
    const prevItem = insertIndex > 0 ? state.items[insertIndex - 1] : null;
    const nextItem = insertIndex < state.items.length ? state.items[insertIndex] : null;
    const prevSortOrder = prevItem?.sortOrder || null;
    const nextSortOrder = nextItem?.sortOrder || null;
    const newSortOrder = generateKeyBetween(prevSortOrder, nextSortOrder);
    
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
      customFields: {},
      sortOrder: newSortOrder
    };

    const newItems = [...state.items];
    const actualIndex = Math.min(insertIndex, newItems.length);
    newItems.splice(actualIndex, 0, newItem);
    
    actions.setItems(newItems);
    
    // Record operation after creation
    console.log('➕ Recording add_row operation:', {
      addedItemId: newItem.id,
      addedIndex: actualIndex,
      description: 'Add row'
    });
    
    recordOperation({
      type: 'add_row',
      data: { 
        addedItem: newItem,
        addedItemId: newItem.id, 
        addedIndex: actualIndex 
      },
      description: 'Add row'
    });
    
    // Broadcast handled by structural save system (after successful DB save)
    
    // For per-cell saves, use structural save coordination
    if (cellEditIntegration.isPerCellEnabled) {
      markStructuralChange('add_row', { 
        newItems: [newItem], 
        insertIndex: actualIndex,
        lockedRowNumbers: state.lockedRowNumbers,
        numberingLocked: state.numberingLocked
      });
    }
  }, [state.items, state.title, state.startTime, state.numberingLocked, state.lockedRowNumbers, actions.setItems, actions.setLockedRowNumbers, rundownId, currentUserId, cellEditIntegration.isPerCellEnabled, markStructuralChange, recordOperation, finalizeAllTypingSessions]);

  // Fixed addHeaderAtIndex that properly inserts at specified index
  const addHeaderAtIndex = useCallback((insertIndex: number) => {
    // Finalize any typing sessions before structural change
    finalizeAllTypingSessions();
    
    // Auto-save will handle this change - no special handling needed
    // Add header operation already recorded by add_header operation
    
    // Calculate sortOrder for the new header based on insertion position
    const prevItem = insertIndex > 0 ? state.items[insertIndex - 1] : null;
    const nextItem = insertIndex < state.items.length ? state.items[insertIndex] : null;
    const prevSortOrder = prevItem?.sortOrder || null;
    const nextSortOrder = nextItem?.sortOrder || null;
    const newSortOrder = generateKeyBetween(prevSortOrder, nextSortOrder);
    
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
      customFields: {},
      sortOrder: newSortOrder
    };

    const newItems = [...state.items];
    const actualIndex = Math.min(insertIndex, newItems.length);
    newItems.splice(actualIndex, 0, newHeader);
    
    actions.setItems(newItems);
    
    // Record operation after creation
    console.log('➕ Recording add_header operation:', {
      addedItemId: newHeader.id,
      addedIndex: actualIndex,
      description: 'Add header'
    });
    
    recordOperation({
      type: 'add_header',
      data: { 
        addedItem: newHeader,
        addedItemId: newHeader.id, 
        addedIndex: actualIndex 
      },
      description: 'Add header'
    });
    
    // Broadcast handled by structural save system (after successful DB save)
    
    // For per-cell saves, use structural save coordination
    if (cellEditIntegration.isPerCellEnabled) {
      console.log('🧪 STRUCTURAL CHANGE: addHeaderAtIndex completed - triggering structural coordination');
      markStructuralChange('add_header', { newItems: [newHeader], insertIndex: actualIndex });
    }
  }, [state.items, state.title, actions.setItems, rundownId, currentUserId, cellEditIntegration.isPerCellEnabled, markStructuralChange, recordOperation, finalizeAllTypingSessions]);


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

  // Expose memory stats to DevTools for debugging
  useEffect(() => {
    if (typeof window !== 'undefined' && rundownId) {
      (window as any).__CUER_MEMORY_STATS = {
        rundownId,
        undoStackSize,
        redoStackSize,
        itemCount: state.items.length,
        columnCount: columns.length,
        realtimeSubscriptions: realtimeConnection.isConnected ? 1 : 0,
        timestamp: new Date().toISOString()
      };
    }
  }, [rundownId, undoStackSize, redoStackSize, state.items.length, columns.length, realtimeConnection.isConnected]);

  // CRITICAL FIX: Synchronous ref update for setItems to prevent race conditions
  // When a local drag operation calls setItems, the stateRef must be updated IMMEDIATELY
  // before React schedules the state update. Otherwise, incoming broadcast handlers
  // will read stale data from stateRef.current.items and overwrite the pending local state.
  const setItemsSync = useCallback((items: RundownItem[]) => {
    // 1. Update stateRef synchronously FIRST - this is the critical fix
    stateRef.current = { ...stateRef.current, items };
    // 2. Then trigger the React state update via dispatch
    actions.setItems(items);
  }, [actions]);

  return {
    // Core state with calculated values
    items: calculatedItems,
    setItems: actions.setItems,
    // Synchronous version that updates stateRef immediately - use for drag operations
    setItemsSync,
    columns,
    setColumns,
    visibleColumns,
    rundownTitle: state.title,
    rundownStartTime: state.startTime,
    rundownEndTime: state.endTime,
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
      autoSaveIsSaving,
    saveCompletionCount,
    failedSavesCount: perCellEnabled ? 
      (cellEditIntegration.saveCoordination?.getFailedSavesCount() || 0) :
      (getFailedSavesCount ? getFailedSavesCount() : 0),
    onRetryFailedSaves: perCellEnabled ?
      cellEditIntegration.saveCoordination?.retryFailedSaves :
      retryFailedSaves,
    saveError: perCellEnabled ? cellEditIntegration.saveError : null,
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
      // Finalize any typing sessions before structural change
      finalizeAllTypingSessions();
      
      // Capture items and their indices before deletion for undo
      const deletedItemsData = itemIds.map(id => {
        const index = state.items.findIndex(item => item.id === id);
        const item = state.items[index];
        return { item, index, id };
      }).filter(data => data.item && data.index !== -1);
      
      // Perform deletion
      actions.deleteMultipleItems(itemIds);
      
      // Record batch delete operation
      console.log('🗑️ Recording batch delete operation:', {
        deletedCount: deletedItemsData.length,
        description: `Delete ${deletedItemsData.length} rows`
      });
      
      recordOperation({
        type: 'delete_row',
        data: { 
          deletedItems: deletedItemsData.map(d => d.item),
          deletedIndices: deletedItemsData.map(d => d.index),
          deletedIds: itemIds
        },
        description: `Delete ${deletedItemsData.length} rows`
      });
      
      // For per-cell saves, use structural save coordination
      if (cellEditIntegration.isPerCellEnabled) {
        console.log('🧪 STRUCTURAL CHANGE: deleteMultipleItems completed - triggering structural coordination');
        markStructuralChange('delete_row', { deletedIds: itemIds });
      }
      
      // Broadcast handled by structural save system (after successful DB save)
    }, [actions.deleteMultipleItems, state.items, finalizeAllTypingSessions, recordOperation, rundownId, currentUserId, cellEditIntegration.isPerCellEnabled, markStructuralChange]),
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
      
      // Field change tracking handled by useEffect that monitors state changes
      
      // Broadcast rundown-level property change
      if (rundownId && currentUserId) {
        // Track that this change was made by the current user
        lastChangeUserIdRef.current = currentUserId;
        cellBroadcast.broadcastCellUpdate(rundownId, undefined, 'startTime', newStartTime, currentUserId, getTabId());
      }
      
      actions.setStartTime(newStartTime);
    }, [actions.setStartTime, rundownId, currentUserId, cellEditIntegration]),
    setEndTime: useCallback((newEndTime: string) => {
      console.log('🧪 SIMPLIFIED STATE: setEndTime called with:', newEndTime);
      if (blockUntilLocalEditRef.current) {
        console.log('✅ AutoSave: local edit detected - re-enabling saves');
        blockUntilLocalEditRef.current = false;
      }
      
      // Field change tracking handled by useEffect that monitors state changes
      
      // Broadcast rundown-level property change
      if (rundownId && currentUserId) {
        // Track that this change was made by the current user
        lastChangeUserIdRef.current = currentUserId;
        cellBroadcast.broadcastCellUpdate(rundownId, undefined, 'endTime', newEndTime, currentUserId, getTabId());
      }
      
      actions.setEndTime(newEndTime);
    }, [actions.setEndTime, rundownId, currentUserId, cellEditIntegration]),
    setTimezone: useCallback((newTimezone: string) => {
      console.log('🧪 SIMPLIFIED STATE: setTimezone called with:', newTimezone);
      if (blockUntilLocalEditRef.current) {
        console.log('✅ AutoSave: local edit detected - re-enabling saves');
        blockUntilLocalEditRef.current = false;
      }
      
      // Field change tracking handled by useEffect that monitors state changes
      
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
      
      // Field change tracking handled by useEffect that monitors state changes
      
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
      setColumns([...columns, column]);
    },
    
    updateColumnWidth: (columnId: string, width: string) => {
      const newColumns = columns.map(col =>
        col.id === columnId ? { ...col, width } : col
      );
      setColumns(newColumns);
    },

    // Undo/Redo functionality - operation-based system
    undo: () => {
      undo();
    },
    canUndo,
    lastAction,
    redo: () => {
      redo();
    },
    canRedo,
    nextRedoAction,
    
    // Memory monitoring - expose for DevTools debugging
    memoryStats: {
      undoStackSize,
      redoStackSize,
      itemCount: state.items.length,
      columnCount: columns.length,
      realtimeSubscriptions: realtimeConnection.isConnected ? 1 : 0
    },
    
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
    clearStructuralChange,
    
    // Operation-based undo/redo system
    recordOperation,
    finalizeAllTypingSessions,
    
    // Flush pending debounced broadcasts
    flushPendingBroadcasts: useCallback(() => {
      if (rundownId) {
        cellBroadcast.flushPendingBroadcasts(rundownId);
      }
    }, [rundownId]),
    
    // Drag state tracking - simplified with functional sortOrder updates
    // Protection windows no longer needed: reducer operates on current state, not stale refs
    setDragActive: useCallback((active: boolean) => {
      if (active) {
        console.log('🎯 Drag started');
      } else {
        console.log('🎯 Drag ended');
      }
    }, []),
    
    // Fractional indexing: track sortOrder changes for conflict-free reordering
    // This uses the STRUCTURAL save system with advisory locking to prevent race conditions
    // NOTE: Local state is already updated by useDragAndDrop - this only handles persistence and broadcast
    trackSortOrderChange: useCallback((itemId: string, newSortOrder: string) => {
      console.log('📊 trackSortOrderChange:', { itemId, newSortOrder });
      
      // DRAG PROTECTION: Record this drag operation to protect from concurrent remote updates
      // This prevents race conditions where two users drag the same row simultaneously
      recentDragOperationsRef.current.set(itemId, {
        sortOrder: newSortOrder,
        timestamp: Date.now()
      });
      
      // Cleanup old entries (older than protection window + buffer)
      const now = Date.now();
      const CLEANUP_THRESHOLD = DRAG_PROTECTION_WINDOW_MS + 1000;
      for (const [key, value] of recentDragOperationsRef.current.entries()) {
        if (now - value.timestamp > CLEANUP_THRESHOLD) {
          recentDragOperationsRef.current.delete(key);
        }
      }
      
      // Use structural save system with advisory locking to prevent race conditions
      // This ensures sortOrder updates are serialized per-rundown
      if (cellEditIntegration.saveCoordination && currentUserId) {
        cellEditIntegration.saveCoordination.handleStructuralOperation('update_sort_order', {
          sortOrderUpdates: [{ itemId, sortOrder: newSortOrder }]
        });
      }
      
      // Broadcast immediately for real-time sync
      if (rundownId && currentUserId) {
        cellBroadcast.broadcastCellUpdate(
          rundownId,
          itemId,
          'sortOrder',
          newSortOrder,
          currentUserId,
          getTabId()
        );
      }
    }, [cellEditIntegration, rundownId, currentUserId])
  };
};
