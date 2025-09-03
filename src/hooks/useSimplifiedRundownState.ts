import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useRundownState } from './useRundownState';
import { useSimpleAutoSave } from './useSimpleAutoSave';
import { useStandaloneUndo } from './useStandaloneUndo';
import { useSimpleRealtimeRundown } from './useSimpleRealtimeRundown';
import { useUserColumnPreferences } from './useUserColumnPreferences';
import { useRundownStateCache } from './useRundownStateCache';
import { useGlobalTeleprompterSync } from './useGlobalTeleprompterSync';
import { useRundownResumption } from './useRundownResumption';
import { globalFocusTracker } from '@/utils/focusTracker';
import { supabase } from '@/integrations/supabase/client';
import { Column } from './useColumnsManager';
import { createDefaultRundownItems } from '@/data/defaultRundownItems';
import { calculateItemsWithTiming, calculateTotalRuntime, calculateHeaderDuration } from '@/utils/rundownCalculations';
import { RUNDOWN_DEFAULTS } from '@/constants/rundownDefaults';
import { DEMO_RUNDOWN_ID, DEMO_RUNDOWN_DATA } from '@/data/demoRundownData';
import { updateTimeFromServer } from '@/services/UniversalTimeService';

export const useSimplifiedRundownState = () => {
  const params = useParams<{ id: string }>();
  const location = useLocation();
  const rundownId = params.id === 'new' ? null : (location.pathname === '/demo' ? DEMO_RUNDOWN_ID : params.id) || null;
  
  const { shouldSkipLoading, setCacheLoading } = useRundownStateCache(rundownId);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(!shouldSkipLoading);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showcallerActivity, setShowcallerActivity] = useState(false);
  const [lastKnownTimestamp, setLastKnownTimestamp] = useState<string | null>(null);
  const [lastSeenDocVersion, setLastSeenDocVersion] = useState<number>(0);
  const [isTabActive, setIsTabActive] = useState(true);
  
  // Connection state will come from realtime hook
  const [isConnected, setIsConnected] = useState(false);

  // Enhanced typing session tracking with global focus integration
  const typingSessionRef = useRef<{ fieldKey: string; startTime: number } | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const recentlyEditedFieldsRef = useRef<Map<string, number>>(new Map());
  const activeFocusFieldRef = useRef<string | null>(null);
  const PROTECTION_WINDOW_MS = 30000; // 30 second protection window (extended for better safety)
  const TYPING_PROTECTION_WINDOW_MS = 12000; // 12 second typing protection window
  
  // Track pending structural changes to prevent overwrite during save
  const pendingStructuralChangeRef = useRef(false);
  
  // Track cooldown after teammate updates to prevent ping-pong
  const remoteSaveCooldownRef = useRef<number>(0);
  
  // Track if we've primed the autosave after initial load
  const lastSavedPrimedRef = useRef(false);
  
  // Listen to global focus tracker
  useEffect(() => {
    const unsubscribe = globalFocusTracker.onActiveFieldChange((fieldKey) => {
      activeFocusFieldRef.current = fieldKey;
    });
    
    return unsubscribe;
  }, []);

  // Tab visibility and focus tracking for stale tab prevention
  const prevIsActiveRef = useRef(isTabActive);
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
      console.log('👁️ Tab visibility changed:', !document.hidden ? 'visible' : 'hidden');
    };

    const handleFocusChange = () => {
      setIsTabActive(document.hasFocus());
      console.log('🎯 Tab focus changed:', document.hasFocus() ? 'focused' : 'blurred');
    };

    const handleBeforeUnload = () => {
      // Force sync latest data before tab closes
      if (rundownId && isInitialized) {
        console.log('🔄 Tab closing - forcing final sync');
        // Could trigger a final save here if needed
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocusChange);
    window.addEventListener('blur', handleFocusChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocusChange);
      window.removeEventListener('blur', handleFocusChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Enhanced dropdown/select field protection
  const dropdownFieldProtectionRef = useRef<Map<string, number>>(new Map());
  const DROPDOWN_PROTECTION_WINDOW_MS = 15000; // 15 seconds for dropdown changes

  const markDropdownFieldChanged = useCallback((fieldKey: string) => {
    const now = Date.now();
    dropdownFieldProtectionRef.current.set(fieldKey, now);
    recentlyEditedFieldsRef.current.set(fieldKey, now);
    console.log(`🎛️ Dropdown field marked as protected: ${fieldKey}`);
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
  });

  // User-specific column preferences (separate from team sync)
  const {
    columns,
    setColumns,
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
    
    // Update timestamp
    if (mergedData.updated_at) {
      setLastKnownTimestamp(mergedData.updated_at);
    }
  }, [actions, state.title, state.startTime, state.timezone]);

  // Auto-save functionality with unified save pipeline
  const { isSaving, setUndoActive, setTrackOwnUpdate, markActiveTyping, isTypingActive } = useSimpleAutoSave(
    {
      ...state,
      columns: [] // Remove columns from team sync
    }, 
    rundownId, 
    (meta?: { updatedAt?: string; docVersion?: number }) => {
      actions.markSaved();
      
      // Update our doc version and timestamp tracking
      if (meta?.docVersion) {
        setLastSeenDocVersion(meta.docVersion);
      }
      if (meta?.updatedAt) {
        setLastKnownTimestamp(meta.updatedAt);
      }
      
      // Prime lastSavedRef after initial load to prevent false autosave triggers
      if (isInitialized && !lastSavedPrimedRef.current) {
        lastSavedPrimedRef.current = true;
      }
    },
    pendingStructuralChangeRef,
    remoteSaveCooldownRef,
    isInitialized
  );

  // Standalone undo system - unchanged
  const { saveState: saveUndoState, undo, canUndo, lastAction } = useStandaloneUndo({
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
    setUndoActive
  });

  // Track own updates for realtime filtering
  const ownUpdateTimestampRef = useRef<string | null>(null);

  // Create protected fields set for granular updates with enhanced detection
  const getProtectedFields = useCallback(() => {
    const protectedFields = new Set<string>();
    const now = Date.now();
    
    // Add currently typing field if any
    if (typingSessionRef.current) {
      protectedFields.add(typingSessionRef.current.fieldKey);
    }
    
    // Add active focus field (from DOM focus events)
    if (activeFocusFieldRef.current) {
      protectedFields.add(activeFocusFieldRef.current);
    }
    
    // Add ALL recently edited fields within extended protection window
    recentlyEditedFieldsRef.current.forEach((timestamp, fieldKey) => {
      const isActiveTyping = typingSessionRef.current?.fieldKey === fieldKey;
      const protectionWindow = isActiveTyping ? TYPING_PROTECTION_WINDOW_MS : PROTECTION_WINDOW_MS;
      
      if (now - timestamp < protectionWindow) {
        protectedFields.add(fieldKey);
      } else {
        // Clean up expired fields
        recentlyEditedFieldsRef.current.delete(fieldKey);
      }
    });

    // Add dropdown fields that are recently changed with extended protection
    dropdownFieldProtectionRef.current.forEach((timestamp, fieldKey) => {
      if (now - timestamp < DROPDOWN_PROTECTION_WINDOW_MS) {
        protectedFields.add(fieldKey);
      } else {
        // Clean up expired dropdown protections
        dropdownFieldProtectionRef.current.delete(fieldKey);
      }
    });
    
    // Add global title/timing/notes fields if they're being edited
    if (typingSessionRef.current?.fieldKey === 'title' || activeFocusFieldRef.current === 'title') {
      protectedFields.add('title');
    }
    if (typingSessionRef.current?.fieldKey === 'startTime' || activeFocusFieldRef.current === 'startTime') {
      protectedFields.add('startTime');
    }
    if (typingSessionRef.current?.fieldKey === 'timezone' || activeFocusFieldRef.current === 'timezone') {
      protectedFields.add('timezone');
    }
    if (typingSessionRef.current?.fieldKey === 'showDate' || activeFocusFieldRef.current === 'showDate') {
      protectedFields.add('showDate');
    }
    if (typingSessionRef.current?.fieldKey === 'externalNotes' || activeFocusFieldRef.current === 'externalNotes') {
      protectedFields.add('externalNotes');
    }
    
    return protectedFields;
  }, []);

  // Enhanced realtime connection with sync-before-write protection
  const deferredUpdateRef = useRef<any>(null);
  const initialLoadGateRef = useRef(true);
  const reconciliationTimeoutRef = useRef<NodeJS.Timeout>();
  const syncBeforeWriteRef = useRef(false);
  
  const realtimeConnection = useSimpleRealtimeRundown({
    rundownId,
    lastSeenDocVersion,
    onRundownUpdate: useCallback((updatedRundown) => {
      // Gate realtime processing for 500ms after initial load to let baseline prime
      if (initialLoadGateRef.current) {
        console.log('⏳ Gating realtime update - initial load in progress');
        // Store deferred update and it will be processed when gate clears
        deferredUpdateRef.current = updatedRundown;
        return;
      }
      
      // Monotonic doc version guard: ignore stale updates
      if (updatedRundown.doc_version && updatedRundown.doc_version <= lastSeenDocVersion) {
        console.log('⏭️ Stale doc_version ignored:', {
          incoming: updatedRundown.doc_version,
          lastSeen: lastSeenDocVersion
        });
        return;
      }
      
      // Monotonic timestamp guard as fallback
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
      
      // IMPROVED: Don't defer updates - use granular merge to handle concurrent editing
      // Store deferred update only if actively saving structural changes
      if (isSaving && pendingStructuralChangeRef.current) {
        console.log('⏸️ Deferring update during structural save operation');
        deferredUpdateRef.current = updatedRundown;
        return;
      }
      
      // Detect if this is a structural change (items array length or order change)
      // CRITICAL FIX: Only compute structural changes if payload contains items
      const isStructural = updatedRundown.items && state.items && (
        updatedRundown.items.length !== state.items.length ||
        JSON.stringify(updatedRundown.items.map(i => i.id)) !== JSON.stringify(state.items.map(i => i.id))
      );
      
      // Set cooldown after applying teammate update to prevent ping-pong
      if (isStructural) {
        remoteSaveCooldownRef.current = Date.now() + 1500; // 1.5 second cooldown for structural
      } else {
        remoteSaveCooldownRef.current = Date.now() + 800; // 0.8 second cooldown for content
      }
      
      // Update our known timestamp and doc version
      if (updatedRundown.updated_at) {
        setLastKnownTimestamp(updatedRundown.updated_at);
      }
      if (updatedRundown.doc_version) {
        setLastSeenDocVersion(updatedRundown.doc_version);
      }
      
      // Get currently protected fields for granular merging
      const protectedFields = getProtectedFields();
      
      // Apply granular merge if we have protected fields
      if (protectedFields.size > 0) {
        
        // Create merged items by protecting local edits
        const mergedItems = updatedRundown.items?.map((remoteItem: any) => {
          const localItem = state.items.find(item => item.id === remoteItem.id);
          if (!localItem) return remoteItem; // New item from remote
          
          const merged = { ...remoteItem };
          
          // Protect specific fields that are currently being edited
          protectedFields.forEach(fieldKey => {
            if (fieldKey.startsWith(remoteItem.id + '-')) {
              const field = fieldKey.substring(remoteItem.id.length + 1);
              if (field.startsWith('customFields.')) {
                const customFieldKey = field.replace('customFields.', '');
                merged.customFields = merged.customFields || {};
                merged.customFields[customFieldKey] = localItem.customFields?.[customFieldKey] || merged.customFields[customFieldKey];
              } else if (localItem.hasOwnProperty(field)) {
                merged[field] = localItem[field]; // Keep local value
              }
            }
          });
          
          return merged;
        }) || [];
        
        // Apply merged update
        actions.loadState({
          items: mergedItems,
          title: protectedFields.has('title') ? state.title : updatedRundown.title,
          startTime: protectedFields.has('startTime') ? state.startTime : updatedRundown.start_time,
          timezone: protectedFields.has('timezone') ? state.timezone : updatedRundown.timezone,
          showDate: protectedFields.has('showDate') ? state.showDate : (updatedRundown.show_date ? new Date(updatedRundown.show_date + 'T00:00:00') : null),
          externalNotes: protectedFields.has('externalNotes') ? state.externalNotes : updatedRundown.external_notes
        });
        
        // Schedule reconciliation save only if merged content actually differs for protected fields
        let hasProtectedDifferences = false;
        for (const merged of mergedItems) {
          if (hasProtectedDifferences) break;
          const localItem = state.items.find(item => item.id === merged.id);
          if (!localItem) continue;
          protectedFields.forEach(fieldKey => {
            if (hasProtectedDifferences) return;
            if (fieldKey.startsWith(merged.id + '-')) {
              const field = fieldKey.substring(merged.id.length + 1);
              if (field.startsWith('customFields.')) {
                const customFieldKey = field.replace('customFields.', '');
                const mergedVal = merged.customFields?.[customFieldKey] ?? '';
                const localVal = localItem.customFields?.[customFieldKey] ?? '';
                if (mergedVal !== localVal) hasProtectedDifferences = true;
              } else if (Object.prototype.hasOwnProperty.call(localItem, field)) {
                const mergedVal = (merged as any)[field] ?? '';
                const localVal = (localItem as any)[field] ?? '';
                if (mergedVal !== localVal) hasProtectedDifferences = true;
              }
            }
          });
        }
        
        if (hasProtectedDifferences) {
          if (reconciliationTimeoutRef.current) {
            clearTimeout(reconciliationTimeoutRef.current);
          }
          reconciliationTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Scheduling reconciliation save after protected merge');
            markActiveTyping();
          }, 600); // slightly faster to resolve conflicts sooner
        }
        
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
        
        // No protected fields - apply update normally but only for present fields
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
      }
    }, [actions, isSaving, getProtectedFields, state.items, state.title, state.startTime, state.timezone, state.showDate]),
    enabled: !isLoading,
    trackOwnUpdate: (timestamp: string) => {
      ownUpdateTimestampRef.current = timestamp;
    }
  });
  
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
  
  // Get catch-up sync function from realtime connection
  const performCatchupSync = realtimeConnection.performCatchupSync;
  
  // Run sync on initial mount and only when tab transitions to active
  const hasSyncedOnceRef = useRef(false);
  const lastSyncTimeRef = useRef(0);
  
  // Enhanced sync-before-write with catch-up functionality (only on activation or first run)
  useEffect(() => {
    const now = Date.now();
    const justActivated = isTabActive && !prevIsActiveRef.current;
    const shouldSync = (justActivated || !hasSyncedOnceRef.current) && isInitialized && rundownId;
    
    // Debounce rapid sync calls (prevent multiple syncs within 500ms)
    const timeSinceLastSync = now - lastSyncTimeRef.current;
    if (shouldSync && timeSinceLastSync > 500) {
      console.log('👁️ Tab became active - performing safety sync and catch-up');
      lastSyncTimeRef.current = now;
      syncBeforeWriteRef.current = true;
      
      // Trigger catch-up sync to get any missed updates
      if (performCatchupSync) {
        performCatchupSync();
      }
      
      const syncLatestData = async () => {
        try {
          console.log('🔄 Tab became active - syncing latest data before allowing writes');
          
          const { data: latestRundown, error } = await supabase
            .from('rundowns')
            .select('*')
            .eq('id', rundownId)
            .single();

          if (!error && latestRundown) {
            // IMPROVED: Use granular merge instead of skipping entirely
            if (state.hasUnsavedChanges) {
              console.log('🔄 Merging remote data with unsaved local changes');
              const protectedFields = getProtectedFields();
              if (protectedFields.size > 0) {
                // Apply granular merge for safety
                const mergedData = {
                  ...latestRundown,
                  items: latestRundown.items?.map((remoteItem: any) => {
                    const localItem = state.items.find(item => item.id === remoteItem.id);
                    if (!localItem) return remoteItem;
                    
                    const merged = { ...remoteItem };
                    protectedFields.forEach(fieldKey => {
                      if (fieldKey.startsWith(remoteItem.id + '-')) {
                        const field = fieldKey.substring(remoteItem.id.length + 1);
                        if (localItem.hasOwnProperty(field)) {
                          merged[field] = localItem[field];
                        }
                      }
                    });
                    return merged;
                  }) || []
                };
                
                actions.loadState({
                  items: mergedData.items,
                  title: protectedFields.has('title') ? state.title : mergedData.title,
                  startTime: protectedFields.has('startTime') ? state.startTime : mergedData.start_time,
                  timezone: protectedFields.has('timezone') ? state.timezone : mergedData.timezone
                });
                return;
              }
            }
            
            // Check if remote data is newer than what we have
            if (latestRundown.updated_at && lastKnownTimestamp) {
              const remoteTime = new Date(latestRundown.updated_at).getTime();
              const localTime = new Date(lastKnownTimestamp).getTime();
              
              if (remoteTime > localTime) {
                console.log('🔄 Remote data is newer - applying sync update');
                
                // Apply the remote data
                actions.loadState({
                  items: latestRundown.items || [],
                  title: latestRundown.title || state.title,
                  startTime: latestRundown.start_time || state.startTime,
                  timezone: latestRundown.timezone || state.timezone,
                  showDate: latestRundown.show_date ? new Date(latestRundown.show_date + 'T00:00:00') : state.showDate,
                  externalNotes: latestRundown.external_notes || state.externalNotes
                });
                
                setLastKnownTimestamp(latestRundown.updated_at);
                if (latestRundown.doc_version) {
                  setLastSeenDocVersion(latestRundown.doc_version);
                }
              } else {
                console.log('📊 Local data is current or newer - no sync needed');
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ Failed to sync latest data on tab activation:', error);
        } finally {
          // Reset sync flag after a delay
          setTimeout(() => {
            syncBeforeWriteRef.current = false;
          }, 1000);
        }
      };

      syncLatestData();
      hasSyncedOnceRef.current = true;
    }

    // Track previous active state for transition detection
    prevIsActiveRef.current = isTabActive;
  }, [isTabActive, isInitialized, rundownId, lastKnownTimestamp, actions, performCatchupSync]);

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
        remoteSaveCooldownRef.current = Date.now() + 1500;
      } else {
        remoteSaveCooldownRef.current = Date.now() + 800;
      }
      
      // Update our known timestamp and doc version
      if (deferredUpdate.updated_at) {
        setLastKnownTimestamp(deferredUpdate.updated_at);
      }
      if (deferredUpdate.doc_version) {
        setLastSeenDocVersion(deferredUpdate.doc_version);
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
                merged.customFields = merged.customFields || {};
                merged.customFields[customFieldKey] = localItem.customFields?.[customFieldKey] || merged.customFields[customFieldKey];
              } else if (localItem.hasOwnProperty(field)) {
                merged[field] = localItem[field]; // Keep local value
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

  // Connect autosave tracking to realtime tracking
  useEffect(() => {
    if (realtimeConnection.trackOwnUpdate) {
      setTrackOwnUpdate((timestamp: string) => {
        realtimeConnection.trackOwnUpdate(timestamp);
      });
    }
  }, [realtimeConnection.trackOwnUpdate, setTrackOwnUpdate]);

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

  // Update connection status from realtime
  useEffect(() => {
    setIsConnected(realtimeConnection.isConnected);
  }, [realtimeConnection.isConnected]);

  // Enhanced updateItem function with aggressive field-level protection tracking
  const enhancedUpdateItem = useCallback((id: string, field: string, value: string) => {
    // Check if this is a typing field
    const isTypingField = field === 'name' || field === 'script' || field === 'talent' || field === 'notes' || 
                         field === 'gfx' || field === 'video' || field === 'images' || field.startsWith('customFields.') || field === 'segmentName';
    
    const sessionKey = `${id}-${field}`;
    
    // ALWAYS track field edits for protection, regardless of type
    recentlyEditedFieldsRef.current.set(sessionKey, Date.now());
    
    if (isTypingField) {
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
      }, 8000); // Extended to 8 seconds for better protection
    } else if (field === 'duration') {
      saveUndoState(state.items, [], state.title, 'Edit duration');
    } else if (field === 'color') {
      saveUndoState(state.items, [], state.title, 'Change row color');
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
      
      actions.updateItem(id, { [updateField]: value });
    }
  }, [actions.updateItem, state.items, state.title, saveUndoState]);

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
            const itemsToLoad = Array.isArray(data.items) && data.items.length > 0 
              ? data.items 
              : createDefaultRundownItems();

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
              timezone: data.timezone || 'America/New_York',
              showDate: data.show_date ? new Date(data.show_date + 'T00:00:00') : null,
              externalNotes: data.external_notes
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
    
    // Load new data directly
    actions.loadState({
      items: latestData.items || [],
      title: latestData.title,
      startTime: latestData.start_time,
      timezone: latestData.timezone,
      showDate: latestData.show_date ? new Date(latestData.show_date + 'T00:00:00') : null
    });
  }, [actions, getProtectedFields]);

  // Set up resumption handling - disable if pending structural changes
  useRundownResumption({
    rundownId,
    onDataRefresh: handleDataRefresh,
    lastKnownTimestamp,
    enabled: isInitialized && !isLoading && !state.hasUnsavedChanges && !isSaving && !pendingStructuralChangeRef.current,
    updateLastKnownTimestamp: setLastKnownTimestamp
  });

  useEffect(() => {
    if (!rundownId && !isInitialized) {
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
  }, [rundownId, isInitialized, actions]);

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
        actions.updateItem(id, { isFloating: !item.isFloating });
      }
    }, [actions.updateItem, state.items, state.title, saveUndoState]),

    deleteRow: useCallback((id: string) => {
      pendingStructuralChangeRef.current = true;
      saveUndoState(state.items, [], state.title, 'Delete row');
      actions.deleteItem(id);
    }, [actions.deleteItem, state.items, state.title, saveUndoState]),

    addRow: useCallback(() => {
      pendingStructuralChangeRef.current = true;
      saveUndoState(state.items, [], state.title, 'Add segment');
      helpers.addRow();
    }, [helpers.addRow, state.items, state.title, saveUndoState]),

    addHeader: useCallback(() => {
      pendingStructuralChangeRef.current = true;
      saveUndoState(state.items, [], state.title, 'Add header');
      helpers.addHeader();
    }, [helpers.addHeader, state.items, state.title, saveUndoState]),

    setTitle: useCallback((newTitle: string) => {
      if (state.title !== newTitle) {
        // Track title editing for protection
        recentlyEditedFieldsRef.current.set('title', Date.now());
        typingSessionRef.current = { fieldKey: 'title', startTime: Date.now() };
        
        saveUndoState(state.items, [], state.title, 'Change title');
        actions.setTitle(newTitle);
        
        // Clear typing session after delay
        setTimeout(() => {
          if (typingSessionRef.current?.fieldKey === 'title') {
            typingSessionRef.current = null;
          }
        }, 5000); // Extended timeout for title editing
      }
    }, [actions.setTitle, state.items, state.title, saveUndoState])
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
    pendingStructuralChangeRef.current = true;
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
  }, [state.items, state.title, saveUndoState, actions.setItems]);

  // Fixed addHeaderAtIndex that properly inserts at specified index
  const addHeaderAtIndex = useCallback((insertIndex: number) => {
    pendingStructuralChangeRef.current = true;
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
  }, [state.items, state.title, saveUndoState, actions.setItems]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

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
    hasUnsavedChanges: state.hasUnsavedChanges,
    isSaving: isSaving || isSavingColumns,
    showcallerActivity,
    
    // Realtime connection status
    isConnected,
    isProcessingRealtimeUpdate: realtimeConnection.isProcessingUpdate || teleprompterSync.isTeleprompterSaving,
    
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
      pendingStructuralChangeRef.current = true;
      saveUndoState(state.items, [], state.title, 'Delete multiple items');
      actions.deleteMultipleItems(itemIds);
    }, [actions.deleteMultipleItems, state.items, state.title, saveUndoState]),
    addItem: actions.addItem,
    setTitle: enhancedActions.setTitle,
    setStartTime: useCallback((newStartTime: string) => {
      // Track start time editing for protection
      recentlyEditedFieldsRef.current.set('startTime', Date.now());
      typingSessionRef.current = { fieldKey: 'startTime', startTime: Date.now() };
      
      actions.setStartTime(newStartTime);
      
      // Clear typing session after delay
      setTimeout(() => {
        if (typingSessionRef.current?.fieldKey === 'startTime') {
          typingSessionRef.current = null;
        }
      }, 5000); // Extended timeout for start time editing
    }, [actions.setStartTime]),
    setTimezone: useCallback((newTimezone: string) => {
      console.log('🌍 setTimezone called with enhanced protection:', newTimezone);
      
      // Mark timezone as a dropdown field change for enhanced protection
      markDropdownFieldChanged('timezone');
      
      // Track timezone editing for protection with longer window
      const now = Date.now();
      recentlyEditedFieldsRef.current.set('timezone', now);
      dropdownFieldProtectionRef.current.set('timezone', now);
      typingSessionRef.current = { fieldKey: 'timezone', startTime: now };
      
      // Set cooldown to prevent immediate overwrites
      remoteSaveCooldownRef.current = now + 3000; // 3 second cooldown
      
      actions.setTimezone(newTimezone);
      
      // Clear typing session after extended delay
      setTimeout(() => {
        if (typingSessionRef.current?.fieldKey === 'timezone') {
          typingSessionRef.current = null;
        }
      }, 8000); // Even longer timeout for timezone editing
    }, [actions.setTimezone, markDropdownFieldChanged]),
    setShowDate: useCallback((newShowDate: Date | null) => {
      console.log('📅 setShowDate called with enhanced protection:', newShowDate);
      
      // Mark show date as a dropdown field change for enhanced protection
      markDropdownFieldChanged('showDate');
      
      // Track show date editing for protection with longer window
      const now = Date.now();
      recentlyEditedFieldsRef.current.set('showDate', now);
      dropdownFieldProtectionRef.current.set('showDate', now);
      typingSessionRef.current = { fieldKey: 'showDate', startTime: now };
      
      // Set cooldown to prevent immediate overwrites
      remoteSaveCooldownRef.current = now + 3000; // 3 second cooldown
      
      actions.setShowDate(newShowDate);
      
      // Clear typing session after extended delay
      setTimeout(() => {
        if (typingSessionRef.current?.fieldKey === 'showDate') {
          typingSessionRef.current = null;
        }
      }, 8000); // Even longer timeout for show date editing
    }, [actions.setShowDate, markDropdownFieldChanged]),
    
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

    // Undo functionality - properly expose these including saveUndoState
    saveUndoState,
    undo,
    canUndo,
    lastAction,
    
    // Teleprompter sync callbacks (exposed globally)
    teleprompterSaveHandlers: {
      onSaveStart: teleprompterSync.handleTeleprompterSaveStart,
      onSaveEnd: teleprompterSync.handleTeleprompterSaveEnd
    },
    
    // Autosave typing guard
    markActiveTyping
  };
};
