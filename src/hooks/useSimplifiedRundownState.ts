import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import { useRundownState } from './useRundownState';
import { useUserColumnPreferences } from './useUserColumnPreferences';
import { useSmartAutoSave } from './useSmartAutoSave';
import { useStandaloneUndo } from './useStandaloneUndo';
import { useSimpleRealtimeRundown } from './useSimpleRealtimeRundown';
import { useSmartFieldProtection } from './useSmartFieldProtection';
import { useUnifiedUpdateTracking } from './useUnifiedUpdateTracking';
import { useConflictResolution } from './useConflictResolution';
import { useShowcallerSession } from './useShowcallerSession';
import { useAdvancedConflictDetection } from './useAdvancedConflictDetection';
import { useEnhancedGranularMerge } from './useEnhancedGranularMerge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { DEMO_RUNDOWN_ID, DEMO_RUNDOWN_DATA } from '@/data/demoRundownData';
// Remove unused import
import { v4 as uuidv4 } from 'uuid';
import { useMemo } from 'react';

export const useSimplifiedRundownState = () => {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const rundownId = params.id === 'new' ? null : (params.id === 'demo' ? DEMO_RUNDOWN_ID : params.id) || null;
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showcallerActivity, setShowcallerActivity] = useState(false);
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);

  // Smart field protection with enhanced capabilities
  const { 
    protectField, 
    updateFieldActivity, 
    getProtectedFields, 
    forceUnprotectField, 
    hasProtectionConflict 
  } = useSmartFieldProtection({
    baseProtectionMs: 3000,
    maxProtectionMs: 8000,
    typingExtensionMs: 2000
  });

  // Conflict resolution for simultaneous edits
  const { resolveConflicts, getConflictInfo, clearConflicts } = useConflictResolution({
    resolveFieldConflicts: true,
    preserveUserEdits: true,
    logConflicts: true
  });

  // Advanced conflict detection (Phase 4)
  const conflictDetection = useAdvancedConflictDetection({
    enabled: true,
    maxConflictHistory: 50
  });

  // Enhanced granular merge (Phase 4)
  const { performEnhancedMerge, hasStructuralDifferences } = useEnhancedGranularMerge();

  // Showcaller session management (Phase 3)
  const showcallerSession = useShowcallerSession({
    rundownId,
    enabled: !!rundownId && rundownId !== DEMO_RUNDOWN_ID
  });

  // Simple Showcaller save coordination
  const showcallerSavingRef = useRef(false);

  // Unified update tracking
  const { trackOwnUpdate } = useUnifiedUpdateTracking({
    userId: user?.id || '',
    rundownId,
    enabled: true
  });

  // Initialize with default data
  const {
    state,
    actions,
    helpers
  } = useRundownState({
    items: [],
    columns: [],
    title: 'Untitled Rundown',
    startTime: '09:00:00',
    timezone: 'America/New_York'
  });

  // User-specific column preferences
  const {
    columns,
    setColumns,
    isLoading: isLoadingColumns,
    isSaving: isSavingColumns
  } = useUserColumnPreferences(rundownId);

  // Smart auto-save with enhanced coordination and Showcaller awareness
  const {
    isSaving,
    setUndoActive,
    setUserTyping,
    markStructuralChange,
    queueUpdate,
    setUpdateQueueCallback,
    isQueueProcessing
  } = useSmartAutoSave(state, rundownId, () => {
    actions.markSaved();
  }, trackOwnUpdate, {
    // Block saves when Showcaller is saving
    isBlocked: () => showcallerSavingRef.current
  });

  // Standalone undo system
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

  // Realtime updates with smart queuing and enhanced protection
  const realtimeConnection = useSimpleRealtimeRundown({
    rundownId,
    enabled: !!rundownId && rundownId !== DEMO_RUNDOWN_ID,
    queueUpdate: queueUpdate,
    onRundownUpdate: useCallback((updatedRundown: any) => {
      console.log('📥 [Enhanced] Realtime update received:', updatedRundown?.updated_at);
      
      // Check if this conflicts with Showcaller operations  
      if (showcallerSavingRef.current) {
        console.log('⏸️ [Phase3] Showcaller saving - queueing realtime update');
        return;
      }
      
      if (!isSaving && !isQueueProcessing) {
        console.log('🕒 Processing enhanced realtime update:', updatedRundown.updated_at);
        
        // Get currently protected fields using smart protection
        const protectedFields = getProtectedFields();
        console.log('🛡️ Smart protected fields during update:', Array.from(protectedFields));
        
        // Check for structural differences (Phase 4)
        const incomingItems = updatedRundown.items || [];
        const hasStructuralChanges = hasStructuralDifferences(state.items, incomingItems);
        
        if (hasStructuralChanges) {
          console.log('🔀 [Phase4] Structural changes detected, using enhanced merge');
          
          // Detect structural changes for conflict analysis
          const structuralChanges = conflictDetection.detectStructuralChanges(
            state.items,
            incomingItems,
            updatedRundown.updated_at
          );
          
          // Perform enhanced merge with conflict detection
          const mergeResult = performEnhancedMerge(
            state.items,
            incomingItems,
            protectedFields,
            {
              conflictResolutionStrategy: 'merge',
              preserveLocalOrder: true,
              preferLocalAdditions: true
            }
          );
          
          // Add conflict indicators for any detected conflicts
          mergeResult.conflicts.forEach(conflict => {
            conflictDetection.addConflictIndicator({
              id: `${conflict.type}-${conflict.itemId}-${Date.now()}`,
              type: conflict.type === 'field' ? 'field' : 'structural',
              severity: conflict.type === 'addition' ? 'medium' : 'low',
              message: conflict.resolution,
              affectedItems: [conflict.itemId],
              timestamp: new Date().toISOString(),
              resolved: true, // Auto-resolved by merge
              resolutionStrategy: 'enhanced-merge'
            });
          });
          
          // Use granular merge with enhanced protection and conflict resolution
          actions.mergeRealtimeUpdate({
            items: mergeResult.items,
            title: updatedRundown.title,
            startTime: updatedRundown.start_time,
            timezone: updatedRundown.timezone,
            protectedFields
          });
          
          console.log(`✅ [Phase4] Enhanced merge completed with ${mergeResult.conflicts.length} conflicts resolved`);
        } else {
          // Simple field-level conflict resolution for non-structural changes
          const resolvedItems = resolveConflicts(state.items, incomingItems, protectedFields);
          
          // Log conflict resolution if any occurred
          const conflictInfo = getConflictInfo();
          if (conflictInfo.hasConflicts) {
            console.log(`⚠️ [Phase4] Resolved ${conflictInfo.conflictCount} field conflicts during realtime update`);
          }
          
          // Use standard merge for field-only changes
          actions.mergeRealtimeUpdate({
            items: resolvedItems,
            title: updatedRundown.title,
            startTime: updatedRundown.start_time,
            timezone: updatedRundown.timezone,
            protectedFields
          });
        }
        
        console.log('🔄 Enhanced realtime update applied, item count:', updatedRundown.items?.length || 0);
      } else {
        console.log('⏸️ Save/queue processing in progress - update will be queued');
      }
    }, [isSaving, isQueueProcessing, actions, getProtectedFields, resolveConflicts, state.items, getConflictInfo, hasStructuralDifferences, conflictDetection, performEnhancedMerge])
  });

  // Connect queued update processing
  useEffect(() => {
    setUpdateQueueCallback((queuedUpdate: any) => {
      console.log('📤 Processing queued update:', queuedUpdate.updated_at);
      
      const protectedFields = getProtectedFields();
      
      // Apply enhanced conflict resolution to queued updates (Phase 4)
      const queuedItems = queuedUpdate.items || [];
      const hasStructuralChanges = hasStructuralDifferences(state.items, queuedItems);
      
      let finalItems: RundownItem[];
      if (hasStructuralChanges) {
        console.log('🔀 [Phase4] Processing queued structural changes');
        const mergeResult = performEnhancedMerge(state.items, queuedItems, protectedFields);
        finalItems = mergeResult.items;
      } else {
        finalItems = resolveConflicts(state.items, queuedItems, protectedFields);
      }
      
      actions.mergeRealtimeUpdate({
        items: finalItems,
        title: queuedUpdate.title,
        startTime: queuedUpdate.start_time,
        timezone: queuedUpdate.timezone,
        protectedFields
      });
    });
  }, [setUpdateQueueCallback, actions, getProtectedFields, resolveConflicts, state.items, hasStructuralDifferences, performEnhancedMerge]);

  // Update connection status from realtime
  useEffect(() => {
    setIsConnected(realtimeConnection.isConnected);
  }, [realtimeConnection.isConnected]);

  // Enhanced updateItem function with smart field protection
  const enhancedUpdateItem = useCallback((id: string, field: string, value: string) => {
    // Check if this is a typing field
    const isTypingField = field === 'name' || field === 'script' || field === 'talent' || field === 'notes' || 
                         field === 'gfx' || field === 'video' || field === 'images' || field.startsWith('customFields.') || field === 'segmentName';
    
    const fieldKey = `${id}-${field}`;
    
    if (isTypingField) {
      // Protect field with typing indication
      protectField(fieldKey, true);
      
      // Save undo state on first edit of this field
      saveUndoState(state.items, [], state.title, `Edit ${field}`);
      
      // Set user typing with smart timeout
      setUserTyping(true);
      
      // Update field activity for extended protection
      updateFieldActivity(fieldKey);
    } else {
      // For non-typing fields, still protect briefly and save undo
      protectField(fieldKey, false);
      saveUndoState(state.items, [], state.title, `Edit ${field}`);
    }

    actions.updateItem(id, { [field]: value });
  }, [actions, state.items, state.title, saveUndoState, setUserTyping, protectField, updateFieldActivity]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load rundown data
  useEffect(() => {
    const loadRundown = async () => {
      if (!rundownId) {
        // New rundown
        actions.loadState({
          items: [],
          columns: [],
          title: 'Untitled Rundown',
          startTime: '09:00:00',
          timezone: 'America/New_York'
        });
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      setIsLoading(true);
      try {
        if (rundownId === DEMO_RUNDOWN_ID) {
          // Load demo data
          actions.loadState({
            items: DEMO_RUNDOWN_DATA.items,
            columns: [],
            title: DEMO_RUNDOWN_DATA.title,
            startTime: DEMO_RUNDOWN_DATA.start_time,
            timezone: DEMO_RUNDOWN_DATA.timezone
          });
        } else {
          // Load from database
          const { data, error } = await supabase
            .from('rundowns')
            .select('*')
            .eq('id', rundownId)
            .single();

          if (error) {
            console.error('Error loading rundown:', error);
          } else if (data) {
            actions.loadState({
              items: data.items || [],
              columns: [],
              title: data.title || 'Untitled Rundown',
              startTime: data.start_time || '09:00:00',
              timezone: data.timezone || 'America/New_York'
            });
          }
        }
      } catch (error) {
        console.error('Failed to load rundown:', error);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    loadRundown();
  }, [rundownId, actions]);

  // Calculate total runtime
  const totalRuntime = useMemo(() => {
    const timeToSeconds = (timeStr: string) => {
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 2) {
        const [minutes, seconds] = parts;
        return minutes * 60 + seconds;
      } else if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        return hours * 3600 + minutes * 60 + seconds;
      }
      return 0;
    };

    const secondsToTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    let totalSeconds = 0;
    state.items.forEach(item => {
      if (item.type === 'regular' && item.duration && !item.isFloating && !item.isFloated) {
        totalSeconds += timeToSeconds(item.duration);
      }
    });

    return secondsToTime(totalSeconds);
  }, [state.items]);

  // Enhanced actions with smart protection and missing methods
  const enhancedActions = {
    ...actions,
    ...helpers,
    
    updateItem: enhancedUpdateItem,

    deleteRow: useCallback((id: string) => {
      saveUndoState(state.items, [], state.title, 'Delete row');
      markStructuralChange();
      actions.deleteItem(id);
    }, [actions, state.items, state.title, saveUndoState, markStructuralChange]),

    addRow: useCallback(() => {
      saveUndoState(state.items, [], state.title, 'Add segment');
      markStructuralChange();
      helpers.addRow();
    }, [helpers, state.items, state.title, saveUndoState, markStructuralChange]),

    addHeader: useCallback(() => {
      saveUndoState(state.items, [], state.title, 'Add header');
      markStructuralChange();
      helpers.addHeader();
    }, [helpers, state.items, state.title, saveUndoState, markStructuralChange]),

    addRowAtIndex: useCallback((insertIndex: number) => {
      saveUndoState(state.items, [], state.title, 'Add segment at index');
      markStructuralChange();
      const newItem: RundownItem = {
        id: uuidv4(),
        type: 'regular',
        rowNumber: '',
        name: '',
        startTime: '00:00:00',
        duration: '00:02:00',
        endTime: '00:02:00',
        talent: '',
        script: '',
        gfx: '',
        video: '',
        images: '',
        notes: '',
        color: '',
        isFloating: false,
        elapsedTime: '00:00:00',
        customFields: {}
      };
      actions.addItem(newItem, insertIndex);
    }, [actions, state.items, state.title, saveUndoState, markStructuralChange]),

    addHeaderAtIndex: useCallback((insertIndex: number) => {
      saveUndoState(state.items, [], state.title, 'Add header at index');
      markStructuralChange();
      const newHeader: RundownItem = {
        id: uuidv4(),
        type: 'header',
        rowNumber: '',
        name: 'New Header',
        startTime: '00:00:00',
        duration: '00:00:00',
        endTime: '00:00:00',
        talent: '',
        script: '',
        gfx: '',
        video: '',
        images: '',
        notes: '',
        color: '',
        isFloating: false,
        elapsedTime: '00:00:00',
        customFields: {}
      };
      actions.addItem(newHeader, insertIndex);
    }, [actions, state.items, state.title, saveUndoState, markStructuralChange]),

    setTitle: useCallback((newTitle: string) => {
      if (state.title !== newTitle) {
        protectField('title', true);
        saveUndoState(state.items, [], state.title, 'Change title');
        actions.setTitle(newTitle);
      }
    }, [actions, state.items, state.title, saveUndoState, protectField]),

    updateColumnWidth: useCallback((columnId: string, width: string) => {
      const updatedColumns = columns.map(col => 
        col.id === columnId ? { ...col, width } : col
      );
      setColumns(updatedColumns);
    }, [columns, setColumns])
  };

  // Helper functions
  const getRowNumber = useCallback((index: number) => {
    let rowCount = 1;
    for (let i = 0; i <= index && i < state.items.length; i++) {
      if (state.items[i].type === 'regular') {
        if (i === index) return rowCount.toString();
        rowCount++;
      } else if (i === index) {
        return ''; // Headers don't have row numbers
      }
    }
    return '';
  }, [state.items]);

  const handleRowSelection = useCallback((itemId: string) => {
    setSelectedRowId(prev => prev === itemId ? null : itemId);
  }, []);

  return {
    // Core state
    items: state.items,
    columns,
    visibleColumns: columns.filter(col => col.isVisible !== false),
    rundownTitle: state.title,
    rundownStartTime: state.startTime,
    timezone: state.timezone,
    totalRuntime,
    
    // UI state
    selectedRowId,
    currentTime,
    rundownId,
    isLoading: isLoading || isLoadingColumns,
    hasUnsavedChanges: state.hasUnsavedChanges,
    isSaving: isSaving || isSavingColumns,
    showcallerActivity,
    
    // Connection status
    isConnected,
    isProcessingRealtimeUpdate: realtimeConnection.isProcessingUpdate || showcallerSavingRef.current,
    
    // Showcaller session management (Phase 3)
    showcallerSession: showcallerSession.isActiveSession,
    showcallerActiveSessions: showcallerSession.activeSessions,
    startShowcallerSession: showcallerSession.startSession,
    endShowcallerSession: showcallerSession.endSession,
    
    // Advanced conflict detection (Phase 4)
    conflictIndicators: conflictDetection.conflictIndicators,
    hasActiveConflicts: conflictDetection.hasActiveConflicts,
    conflictStats: conflictDetection.conflictStats,
    resolveConflict: conflictDetection.resolveConflictIndicator,
    clearResolvedConflicts: conflictDetection.clearResolvedConflicts,
    
    // Actions
    ...enhancedActions,
    handleRowSelection,
    clearRowSelection: () => setSelectedRowId(null),
    getRowNumber,
    
    // Undo functionality
    saveUndoState,
    undo,
    canUndo,
    lastAction,
    
    // Column management
    setColumns,
    addColumn: (column: Column) => {
      setColumns([...columns, column]);
    },
    
    // Showcaller coordination handlers for backward compatibility
    teleprompterSaveHandlers: {
      onSaveStart: () => { showcallerSavingRef.current = true; },
      onSaveEnd: () => { showcallerSavingRef.current = false; }
    }
  };
};