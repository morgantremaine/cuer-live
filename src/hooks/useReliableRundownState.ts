import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownState } from './useRundownState';
import { useReliableAutoSave } from './useReliableAutoSave';
import { useReliableRealtime } from './useReliableRealtime';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';
import { useToast } from '@/hooks/use-toast';

/**
 * Reliable rundown state manager that combines:
 * 1. Core state management
 * 2. Bulletproof autosave
 * 3. Simple realtime updates
 * 4. Minimal coordination complexity
 */
export const useReliableRundownState = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const rundownId = params.id === 'new' ? null : params.id || null;
  
  // Loading and initialization state
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentDocVersion, setCurrentDocVersion] = useState(0);

  // Core rundown state
  const {
    state,
    actions,
    helpers,
    calculations
  } = useRundownState({
    items: [],
    columns: [],
    title: 'Untitled Rundown',
    startTime: '09:00:00',
    timezone: 'America/New_York',
    showDate: null,
    docVersion: 0
  }, rundownId || undefined);

  // Load initial data
  useEffect(() => {
    const loadRundown = async () => {
      if (!rundownId || rundownId === DEMO_RUNDOWN_ID) {
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      console.log('🔄 ReliableState: Loading rundown:', rundownId);

      try {
        const { data, error } = await supabase
          .from('rundowns')
          .select('*')
          .eq('id', rundownId)
          .single();

        if (error) {
          console.error('❌ ReliableState: Load error:', error);
          toast({
            title: "Load Error",
            description: "Failed to load rundown. Redirecting...",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        console.log('✅ ReliableState: Loaded rundown data');

        // Apply loaded data
        actions.loadState({
          items: data.items || [],
          title: data.title || 'Untitled Rundown',
          startTime: data.start_time || '09:00:00',
          timezone: data.timezone || 'America/New_York',
          showDate: data.show_date ? new Date(data.show_date + 'T00:00:00') : null,
          externalNotes: data.external_notes,
          docVersion: data.doc_version || 0
        });

        setCurrentDocVersion(data.doc_version || 0);

      } catch (error) {
        console.error('❌ ReliableState: Unexpected error:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    loadRundown();
  }, [rundownId, actions, navigate, toast]);

  // Handle successful saves
  const handleSaved = useCallback((meta?: { updatedAt?: string; docVersion?: number }) => {
    actions.markSaved();
    
    if (meta?.docVersion) {
      setCurrentDocVersion(meta.docVersion);
      actions.setDocVersion(meta.docVersion);
    }
    
    console.log('✅ ReliableState: Save confirmed, docVersion:', meta?.docVersion);
  }, [actions]);

  // Reliable autosave
  const { isSaving, markTyping } = useReliableAutoSave({
    rundownId,
    state,
    onSaved: handleSaved,
    isInitiallyLoaded: isInitialized
  });

  // Handle remote updates
  const handleRemoteUpdate = useCallback((data: any) => {
    console.log('📡 ReliableState: Processing remote update');
    
    // Update doc version first
    if (data.doc_version) {
      setCurrentDocVersion(data.doc_version);
    }

    // Apply remote changes using loadRemoteState to avoid triggering autosave
    actions.loadRemoteState({
      items: data.items || state.items,
      title: data.title !== undefined ? data.title : state.title,
      startTime: data.start_time !== undefined ? data.start_time : state.startTime,
      timezone: data.timezone !== undefined ? data.timezone : state.timezone,
      showDate: data.show_date ? new Date(data.show_date + 'T00:00:00') : state.showDate,
      externalNotes: data.external_notes !== undefined ? data.external_notes : state.externalNotes,
      docVersion: data.doc_version || currentDocVersion
    });
    
    console.log('✅ ReliableState: Remote update applied');
  }, [actions, state, currentDocVersion]);

  // Reliable realtime
  const { isConnected } = useReliableRealtime({
    rundownId,
    onRemoteUpdate: handleRemoteUpdate,
    currentDocVersion,
    enabled: isInitialized
  });

  // Enhanced actions with typing tracking
  const enhancedActions = {
    ...actions,
    updateItem: (id: string, updates: any) => {
      markTyping();
      actions.updateItem(id, updates);
    },
    setTitle: (title: string) => {
      markTyping();
      actions.setTitle(title);
    },
    setStartTime: (startTime: string) => {
      markTyping();
      actions.setStartTime(startTime);
    },
    setTimezone: (timezone: string) => {
      markTyping();
      actions.setTimezone(timezone);
    }
  };

  return {
    // State
    state,
    isLoading,
    isSaving,
    isConnected,
    
    // Actions
    actions: enhancedActions,
    helpers,
    calculations,
    
    // Utilities
    markTyping,
    rundownId
  };
};