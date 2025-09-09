import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useRundownState } from './useRundownState';
import { useUserColumnPreferences } from './useUserColumnPreferences';
import { useSimpleCollaboration } from './useSimpleCollaboration';

import { useAuth } from './useAuth';

import { supabase } from '@/integrations/supabase/client';
import { DEMO_RUNDOWN_ID, DEMO_RUNDOWN_DATA } from '@/data/demoRundownData';
import { calculateItemsWithTiming, calculateTotalRuntime } from '@/utils/rundownCalculations';
import { RUNDOWN_DEFAULTS } from '@/constants/rundownDefaults';
import { FEATURE_FLAGS } from '@/config/features';

/**
 * CLEAN RUNDOWN STATE HOOK
 * 
 * Simplified version that removes all the complex OCC/LocalShadow/queue logic
 * and uses the new simple collaboration system.
 */
export const useCleanRundownState = () => {
  const params = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const rundownId = params.id === 'new' ? null : (location.pathname === '/demo' ? DEMO_RUNDOWN_ID : params.id) || null;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const loadedRef = useRef(false);

  // Initialize base rundown state
  const {
    state,
    actions,
    helpers
  } = useRundownState({
    items: [],
    columns: [],
    title: 'Untitled Rundown',
    startTime: '09:00:00',
    timezone: 'America/New_York',
    showDate: null
  }, rundownId || undefined);

  // User-specific column preferences
  const {
    columns,
    updateColumns: setColumns,
    isLoading: isLoadingColumns
  } = useUserColumnPreferences(rundownId);

  // Simple collaboration system
  const collaboration = useSimpleCollaboration({
    rundownId,
    state,
    actions,
    enabled: isInitialized && !!user
  });

  // Realtime activity indicator (simplified - just track collaboration state)
  const isProcessingUpdate = false; // Remove complex indicator for now

  // Load initial data
  const loadRundownData = useCallback(async () => {
    if (!rundownId || rundownId === 'new' || loadedRef.current) {
      return;
    }

    if (rundownId === DEMO_RUNDOWN_ID) {
      // Load demo data
      actions.loadState(DEMO_RUNDOWN_DATA);
      setIsLoading(false);
      setIsInitialized(true);
      loadedRef.current = true;
      return;
    }

    console.log('📂 Loading rundown data:', rundownId);
    
    try {
      const { data, error } = await supabase
        .from('rundowns')
        .select('*')
        .eq('id', rundownId)
        .single();

      if (error) {
        console.error('Failed to load rundown:', error);
        navigate('/');
        return;
      }

      if (data) {
        console.log('✅ Loaded rundown:', data.title);
        
        actions.loadState({
          items: data.items || [],
          title: data.title || 'Untitled Rundown',
          startTime: data.start_time || '09:00:00',
          timezone: data.timezone || 'America/New_York',
          showDate: data.show_date ? new Date(data.show_date + 'T00:00:00') : null,
          externalNotes: data.external_notes || ''
        });
        
        loadedRef.current = true;
        setIsInitialized(true);
      }
    } catch (error) {
      console.error('Error loading rundown:', error);
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  }, [rundownId, actions, navigate]);

  // Load data on mount
  useEffect(() => {
    if (rundownId && !loadedRef.current) {
      loadRundownData();
    } else if (rundownId === 'new') {
      // New rundown - start with defaults
      actions.loadState({
        items: [],
        title: 'Untitled Rundown',
        startTime: '09:00:00',
        timezone: 'America/New_York',
        showDate: null,
        externalNotes: ''
      });
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [rundownId, loadRundownData, actions]);

  // Update current time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate runtime information
  const runtimeInfo = calculateItemsWithTiming(
    state.items || [],
    state.startTime || '09:00:00'
  );

  const totalRuntime = calculateTotalRuntime(state.items || []);

  // Enhanced actions with cell tracking
  const enhancedActions = {
    ...actions,
    updateItemField: (itemId: string, field: string, value: any) => {
      // Mark this cell as active for collaboration protection
      collaboration.markCellActive(`${itemId}-${field}`);
      // Use updateItem instead of updateItemField
      actions.updateItem(itemId, { [field]: value });
    },
    setTitle: (title: string) => {
      collaboration.markCellActive('title');
      actions.setTitle(title);
    },
    setStartTime: (startTime: string) => {
      collaboration.markCellActive('startTime');
      actions.setStartTime(startTime);
    },
    setTimezone: (timezone: string) => {
      collaboration.markCellActive('timezone');
      actions.setTimezone(timezone);
    },
    setExternalNotes: (notes: string) => {
      collaboration.markCellActive('externalNotes');
      actions.setExternalNotes(notes);
    }
  };

  return {
    // State
    state: {
      ...state,
      columns // Include user-specific columns
    },
    
    // Loading states
    isLoading: isLoading || isLoadingColumns,
    isInitialized,
    
    // Actions
    actions: enhancedActions,
    helpers,
    
    // UI state
    selectedRowId,
    setSelectedRowId,
    currentTime,
    
    // Runtime calculations
    runtimeInfo,
    totalRuntime,
    
    // Collaboration state
    isSaving: collaboration.isSaving,
    isConnected: collaboration.isConnected,
    isProcessingUpdate,
    
    // Column management
    columns,
    setColumns,
    
    // Utilities
    createNewRundown: async (title: string = 'Untitled Rundown') => {
      if (!user) return null;
      
      try {
        const { data, error } = await supabase
          .from('rundowns')
          .insert({
            title,
            items: [],
            start_time: '09:00:00',
            timezone: 'America/New_York',
            user_id: user.id
          })
          .select()
          .single();
          
        if (error) throw error;
        
        navigate(`/rundown/${data.id}`);
        return data.id;
      } catch (error) {
        console.error('Failed to create rundown:', error);
        return null;
      }
    }
  };
};