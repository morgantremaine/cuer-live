import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RundownState } from './useRundownState';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';

interface QueuedUpdate {
  data: any;
  timestamp: string;
  type: 'realtime_update';
}

export const useSmartAutoSave = (
  state: RundownState,
  rundownId: string | null,
  onSaved: () => void,
  trackOwnUpdate: (timestamp: string, type?: 'content' | 'showcaller' | 'structural') => void,
  options: { isBlocked?: () => boolean } = {}
) => {
  const navigate = useNavigate();
  const location = useLocation();
  const lastSavedRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const [isSaving, setIsSaving] = useState(false);
  const undoActiveRef = useRef(false);
  const lastSaveTimeRef = useRef<number>(0);
  const userTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingSaveRef = useRef(false);
  const structuralChangeRef = useRef(false);
  
  // Queue for updates that arrive during saves
  const updateQueueRef = useRef<QueuedUpdate[]>([]);
  const onUpdateQueuedRef = useRef<((update: any) => void) | null>(null);

  // Function to coordinate with undo operations
  const setUndoActive = (active: boolean) => {
    undoActiveRef.current = active;
  };

  // Function to set user typing state with smarter timing
  const setUserTyping = useCallback((typing: boolean) => {
    userTypingRef.current = typing;
    
    if (typing) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Reduced typing timeout from 3000ms to 2000ms
      typingTimeoutRef.current = setTimeout(() => {
        userTypingRef.current = false;
        console.log('🎯 [Smart] User typing ended - auto-save can proceed');
      }, 2000);
    }
  }, []);

  // Function to mark structural changes
  const markStructuralChange = useCallback(() => {
    structuralChangeRef.current = true;
    console.log('🏗️ [Smart] Marked structural change for next save');
  }, []);

  // Function to set update queue callback
  const setUpdateQueueCallback = useCallback((callback: (update: any) => void) => {
    onUpdateQueuedRef.current = callback;
  }, []);

  // Queue an update during save
  const queueUpdate = useCallback((updateData: any, timestamp: string) => {
    const queuedUpdate: QueuedUpdate = {
      data: updateData,
      timestamp,
      type: 'realtime_update'
    };
    
    updateQueueRef.current.push(queuedUpdate);
    console.log('📥 [Smart] Queued update during save:', {
      timestamp,
      queueLength: updateQueueRef.current.length
    });
  }, []);

  // Process queued updates after save completes
  const processQueuedUpdates = useCallback(() => {
    if (updateQueueRef.current.length === 0) return;
    
    console.log(`📤 [Smart] Processing ${updateQueueRef.current.length} queued updates`);
    
    const updates = [...updateQueueRef.current];
    updateQueueRef.current = [];
    
    // Process updates in order
    updates.forEach(update => {
      if (onUpdateQueuedRef.current) {
        onUpdateQueuedRef.current(update.data);
      }
    });
  }, []);

  // Create content signature excluding ALL showcaller fields
  const createContentSignature = useCallback(() => {
    const cleanItems = state.items?.map(item => {
      return {
        id: item.id,
        type: item.type,
        rowNumber: item.rowNumber,
        name: item.name,
        startTime: item.startTime,
        duration: item.duration,
        endTime: item.endTime,
        talent: item.talent,
        script: item.script,
        gfx: item.gfx,
        video: item.video,
        images: item.images,
        notes: item.notes,
        color: item.color,
        isFloating: item.isFloating,
        customFields: item.customFields
      };
    }) || [];

    const signature = JSON.stringify({
      items: cleanItems,
      title: state.title,
      startTime: state.startTime,
      timezone: state.timezone
    });

    return signature;
  }, [state.items, state.title, state.startTime, state.timezone]);

  useEffect(() => {
    // Skip demo rundowns
    if (rundownId === DEMO_RUNDOWN_ID) {
      if (state.hasUnsavedChanges) {
        onSaved();
      }
      return;
    }

    // Enhanced blocking conditions including external blocks
    if (!state.hasUnsavedChanges || 
        undoActiveRef.current || 
        userTypingRef.current ||
        pendingSaveRef.current ||
        (options.isBlocked && options.isBlocked())) {
      return;
    }

    // Create signature of current state
    const currentSignature = createContentSignature();

    // Only save if content actually changed
    if (currentSignature === lastSavedRef.current) {
      onSaved();
      return;
    }

    // Enhanced smart rate limiting with better coordination
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;
    const minSaveInterval = 1500; // Optimized interval
    
    // Enhanced adaptive debounce time with better heuristics
    let debounceTime = 1200; // Optimized base debounce
    if (timeSinceLastSave < minSaveInterval) {
      debounceTime = 2000; // Prevent thrashing
    } else if (updateQueueRef.current.length > 0) {
      debounceTime = 600; // Faster when updates are queued
    }
    if (structuralChangeRef.current) {
      debounceTime = 800; // Faster save for structural changes
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      // Final pre-save checks
      if (isSaving || 
          undoActiveRef.current || 
          userTypingRef.current ||
          pendingSaveRef.current) {
        return;
      }
      
      const finalSignature = createContentSignature();
      if (finalSignature === lastSavedRef.current) {
        onSaved();
        return;
      }
      
        console.log('💾 [Smart] Starting coordinated save operation');
        setIsSaving(true);
        pendingSaveRef.current = true;
        lastSaveTimeRef.current = Date.now();
      
      try {
        const updateTimestamp = new Date().toISOString();
        const isStructural = structuralChangeRef.current;
        
        // Pre-track this update before saving
        trackOwnUpdate(updateTimestamp, isStructural ? 'structural' : 'content');

        if (!rundownId) {
          // Create new rundown
          const { data: teamData, error: teamError } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
            .limit(1)
            .single();

          if (teamError || !teamData) {
            console.error('❌ Could not get team for new rundown:', teamError);
            return;
          }

          const folderId = location.state?.folderId || null;

          const { data: newRundown, error: createError } = await supabase
            .from('rundowns')
            .insert({
              title: state.title,
              items: state.items,
              start_time: state.startTime,
              timezone: state.timezone,
              team_id: teamData.team_id,
              user_id: (await supabase.auth.getUser()).data.user?.id,
              folder_id: folderId,
              updated_at: updateTimestamp
            })
            .select()
            .single();

          if (createError) {
            console.error('❌ Save failed:', createError);
          } else {
            if (newRundown?.updated_at) {
              trackOwnUpdate(newRundown.updated_at, isStructural ? 'structural' : 'content');
            }
            lastSavedRef.current = finalSignature;
            onSaved();
            navigate(`/rundown/${newRundown.id}`, { replace: true });
          }
        } else {
          // Update existing rundown
          const { data: updatedRundown, error } = await supabase
            .from('rundowns')
            .update({
              title: state.title,
              items: state.items,
              start_time: state.startTime,
              timezone: state.timezone,
              updated_at: updateTimestamp
            })
            .eq('id', rundownId)
            .select('updated_at')
            .single();

          if (error) {
            console.error('❌ Save failed:', error);
          } else {
            if (updatedRundown?.updated_at) {
              trackOwnUpdate(updatedRundown.updated_at, isStructural ? 'structural' : 'content');
            }
            lastSavedRef.current = finalSignature;
            onSaved();
            console.log('✅ [Smart] Save completed successfully');
          }
        }
      } catch (error) {
        console.error('❌ Save error:', error);
      } finally {
        setIsSaving(false);
        pendingSaveRef.current = false;
        structuralChangeRef.current = false; // Reset structural flag
        
        // Coordinated queued update processing
        setTimeout(() => {
          if (updateQueueRef.current.length > 0) {
            console.log(`📤 [Smart] Processing ${updateQueueRef.current.length} queued updates after save`);
            processQueuedUpdates();
          }
        }, 50); // Reduced delay for better responsiveness
      }
    }, debounceTime);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.hasUnsavedChanges, state.lastChanged, rundownId, onSaved, createContentSignature, isSaving, navigate, trackOwnUpdate, location.state, processQueuedUpdates]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    setUndoActive,
    setUserTyping,
    markStructuralChange,
    queueUpdate,
    setUpdateQueueCallback,
    isQueueProcessing: updateQueueRef.current.length > 0
  };
};