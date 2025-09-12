import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useRundownState } from './useRundownState';
import { useEnhancedDataSync } from './useEnhancedDataSync';
import { useUserColumnPreferences } from './useUserColumnPreferences';
import { useRundownStateCache } from './useRundownStateCache';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_RUNDOWN_ID, DEMO_RUNDOWN_DATA } from '@/data/demoRundownData';
import { createDefaultRundownItems } from '@/data/defaultRundownItems';

/**
 * Bulletproof Rundown State Management
 * 
 * This hook provides the ultimate realtime collaboration experience with:
 * - Bulletproof offline support with local queuing
 * - Automatic conflict resolution using operational transformation
 * - Stale data detection and refresh on focus
 * - Granular field-level conflict resolution
 * - Network status awareness
 * - Persistent offline changes across sessions
 */
export const useBulletproofRundownState = () => {
  const params = useParams<{ id: string }>();
  const location = useLocation();
  const rundownId = params.id === 'new' ? null : (location.pathname === '/demo' ? DEMO_RUNDOWN_ID : params.id) || null;
  
  const { shouldSkipLoading, setCacheLoading } = useRundownStateCache(rundownId);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(!shouldSkipLoading);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showcallerActivity, setShowcallerActivity] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  
  const initializationRef = useRef(false);

  // Core rundown state management
  const {
    state,
    actions,
    helpers
  } = useRundownState({
    items: [],
    columns: [], // Managed separately
    title: 'Untitled Rundown',
    startTime: '09:00:00',
    timezone: 'America/New_York',
    showDate: null
  });

  // User-specific column preferences (separate from team sync)
  const {
    columns,
    updateColumns: setColumns, // Use updateColumns for external API compatibility
    isLoading: isLoadingColumns,
    isSaving: isSavingColumns
  } = useUserColumnPreferences(rundownId);

  // Enhanced data sync with offline support and conflict resolution
  const {
    syncWithServer,
    saveToServer,
    trackOfflineChange,
    hasOfflineChanges,
    isSyncing,
    isConnected,
    connectionType,
    staleness,
    hasUnresolvedConflicts,
    forceFocusCheck
  } = useEnhancedDataSync(
    rundownId,
    state,
    (newStateData) => {
      actions.loadState(newStateData);
    },
    (mergedData) => {
      console.log('🔀 Conflict resolved with merged data');
      // Additional conflict resolution callback if needed
    }
  );

  // Initialize rundown data
  const initializeRundown = useCallback(async () => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    setIsLoading(true);
    setError(null);

    try {
      if (location.pathname === '/demo') {
        // Load demo data
        actions.loadState({
          items: DEMO_RUNDOWN_DATA.items,
          title: DEMO_RUNDOWN_DATA.title,
          startTime: DEMO_RUNDOWN_DATA.start_time,
          timezone: DEMO_RUNDOWN_DATA.timezone,
          showDate: null
        });
        setIsInitialized(true);
        return;
      }

      if (!rundownId) {
        // New rundown - initialize with defaults
        actions.loadState({
          items: createDefaultRundownItems(),
          title: 'Untitled Rundown',
          startTime: '09:00:00',
          timezone: 'America/New_York',
          showDate: null
        });
        setIsInitialized(true);
        return;
      }

      // Load existing rundown with offline-first approach
      const { data, error } = await supabase
        .from('rundowns')
        .select('*')
        .eq('id', rundownId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Rundown not found');
        }
        throw error;
      }

      // Load rundown data
      actions.loadState({
        items: data.items || [],
        title: data.title || 'Untitled Rundown',
        startTime: data.start_time || '09:00:00',
        timezone: data.timezone || 'America/New_York',
        showDate: data.show_date ? new Date(data.show_date + 'T00:00:00') : null,
        externalNotes: data.external_notes || {}
      });

      // Check for any offline changes and apply them
      const syncResult = await syncWithServer(true);
      
      if (syncResult.hadConflicts) {
        console.log('⚠️ Conflicts resolved during initialization');
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize rundown:', error);
      setError(error instanceof Error ? error.message : 'Failed to load rundown');
    } finally {
      setIsLoading(false);
      setCacheLoading(false);
    }
  }, [rundownId, location.pathname, actions, syncWithServer, setCacheLoading]);

  // Initialize on mount
  useEffect(() => {
    initializeRundown();
  }, [initializeRundown]);

  // Auto-save with offline queueing
  const autoSave = useCallback(async () => {
    if (!isInitialized || state.hasUnsavedChanges === false) return;

    const success = await saveToServer();
    if (success) {
      actions.markSaved();
    }
  }, [isInitialized, state.hasUnsavedChanges, saveToServer, actions]);

  // Enhanced field change tracking with offline support
  const handleFieldChange = useCallback((fieldKey: string, value: any) => {
    // Track offline changes when not connected
    trackOfflineChange(fieldKey, value);
    
    // Apply change locally immediately for responsive UX
    const [itemId, fieldName] = fieldKey.split('-');
    
    if (itemId && fieldName) {
      const itemIndex = state.items.findIndex(item => item.id === itemId);
      if (itemIndex !== -1) {
        const updatedItems = [...state.items];
        if (fieldName.includes('.')) {
          const [parentField, subField] = fieldName.split('.');
          if (!updatedItems[itemIndex][parentField]) {
            updatedItems[itemIndex][parentField] = {};
          }
          updatedItems[itemIndex][parentField][subField] = value;
        } else {
          (updatedItems[itemIndex] as any)[fieldName] = value;
        }
        actions.setItems(updatedItems);
      }
    } else {
      // Global field change
      if (fieldKey === 'title') actions.setTitle(value);
      else if (fieldKey === 'startTime') actions.setStartTime(value);
      else if (fieldKey === 'timezone') actions.setTimezone(value);
      else if (fieldKey === 'showDate') actions.setShowDate(value);
    }

    // Trigger auto-save
    setTimeout(autoSave, 1500);
  }, [trackOfflineChange, state.items, actions, autoSave]);

  // Handle row selection
  const handleRowSelection = useCallback((rowId: string | null) => {
    setSelectedRowId(rowId);
  }, []);

  // Current time updater - OPTIMIZED: Only update when actually needed
  useEffect(() => {
    // Only update currentTime if we're actively using it for status calculations
    // For large rundowns, we'll use a less frequent update to reduce render churn
    const updateInterval = state.items.length > 100 ? 30000 : 5000; // 30s for large, 5s for small
    
    const timer = setInterval(() => {
      // Only update if the component is visible and we have current segments
      if (document.visibilityState === 'visible' && state.currentSegmentId) {
        setCurrentTime(new Date());
      }
    }, updateInterval);

    return () => clearInterval(timer);
  }, [state.items.length, state.currentSegmentId]); // Only restart timer when these change

  // Enhanced focus check with conflict resolution
  const handleTabFocus = useCallback(() => {
    if (isInitialized && isConnected) {
      console.log('👁️ Tab focused - checking for updates...');
      forceFocusCheck();
    }
  }, [isInitialized, isConnected, forceFocusCheck]);

  // Set up focus listeners
  useEffect(() => {
    window.addEventListener('focus', handleTabFocus);
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleTabFocus();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleTabFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleTabFocus]);

  return {
    // Core state
    rundownId,
    ...state,
    columns,
    
    // Status
    isLoading: isLoading || isLoadingColumns,
    isInitialized,
    isSaving: isSyncing || isSavingColumns,
    error,
    
    // Network and sync status
    isConnected,
    connectionType,
    staleness,
    hasOfflineChanges,
    hasUnresolvedConflicts,
    
    // Actions
    ...actions,
    setColumns,
    handleFieldChange,
    handleRowSelection,
    forceFocusCheck,
    
    // Helpers
    ...helpers,
    
    // UI State
    selectedRowId,
    showcallerActivity,
    setShowcallerActivity,
    currentTime,
    
    // Manual sync control
    syncNow: () => syncWithServer(true),
    saveNow: autoSave
  };
};