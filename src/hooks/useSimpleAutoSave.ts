
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RundownState } from './useRundownState';
import { supabase } from '@/lib/supabase';
import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';
import { useSaveCoordination } from './useSaveCoordination';

export const useSimpleAutoSave = (
  state: RundownState,
  rundownId: string | null,
  onSaved: () => void,
  editingCoordination?: {
    hasActiveEditing: () => boolean;
    setPreparingSave: (preparing: boolean) => void;
    isPreparingSave: boolean;
  }
) => {
  const navigate = useNavigate();
  const location = useLocation();
  const lastSavedRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const [isSaving, setIsSaving] = useState(false);
  const undoActiveRef = useRef(false);
  const lastSaveTimeRef = useRef<number>(0);
  const trackOwnUpdateRef = useRef<((timestamp: string) => void) | null>(null);
  const userTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingSaveRef = useRef(false);
  const saveCoordination = useSaveCoordination();

  // Function to coordinate with undo operations
  const setUndoActive = (active: boolean) => {
    undoActiveRef.current = active;
  };

  // Function to set user typing state
  const setUserTyping = useCallback((typing: boolean) => {
    userTypingRef.current = typing;
    
    if (typing) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        userTypingRef.current = false;
      }, 3000);
    }
  }, []);

  // Function to set the own update tracker from realtime hook
  const setTrackOwnUpdate = useCallback((tracker: (timestamp: string) => void) => {
    trackOwnUpdateRef.current = tracker;
  }, []);

  // Track own updates
  const trackMyUpdate = useCallback((timestamp: string) => {
    if (trackOwnUpdateRef.current) {
      trackOwnUpdateRef.current(timestamp);
    }
  }, []);

  // Create content signature that ONLY includes actual content (NO showcaller fields at all)
  const createContentSignature = useCallback(() => {
    // Create signature with ONLY content fields - completely exclude ALL showcaller data
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
        // EXPLICITLY EXCLUDED: status, elapsedTime, and any other showcaller fields
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
    console.log('🔄 Auto-save effect triggered');
    
    if (!rundownId || rundownId === DEMO_RUNDOWN_ID) {
      console.log('⏭️ Skipping auto-save (demo rundown)');
      return;
    }
    
    // Multi-layer blocking checks with detailed logging
    const blockingFactors = {
      hasUnsavedChanges: state.hasUnsavedChanges,
      undoActive: undoActiveRef.current,
      userTyping: userTypingRef.current,
      pendingSave: pendingSaveRef.current,
      hasActiveEditing: editingCoordination?.hasActiveEditing?.() ?? false,
      isPreparingSave: editingCoordination?.isPreparingSave ?? false,
      hasActiveSaveOps: saveCoordination.hasActiveSaveOperations()
    };
    
    console.log('🔍 Auto-save blocking check:', blockingFactors);
    
    // Enhanced blocking conditions with editing coordination
    if (!state.hasUnsavedChanges || 
        undoActiveRef.current || 
        userTypingRef.current ||
        pendingSaveRef.current ||
        (editingCoordination?.hasActiveEditing?.() ?? false) ||
        (editingCoordination?.isPreparingSave ?? false) ||
        saveCoordination.hasActiveSaveOperations()) {
      console.log('🚫 Auto-save blocked, will retry later');
      return;
    }

    // Create signature of current state - excluding ALL showcaller data
    const currentSignature = createContentSignature();

    // Only save if content actually changed
    if (currentSignature === lastSavedRef.current) {
      // Mark as saved since there are no actual content changes
      onSaved();
      return;
    }

    // Enhanced rate limiting with adaptive debouncing
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;
    const minSaveInterval = 2000; // Reduced minimum interval
    
    // Adaptive debounce based on editing activity
    const hasRecentEditing = editingCoordination?.hasActiveEditing?.() ?? false;
    let debounceTime = timeSinceLastSave < minSaveInterval ? 4000 : 1500; // Faster saves
    
    // Extend debounce if actively editing
    if (hasRecentEditing) {
      debounceTime = Math.max(debounceTime, 3000);
    }

    

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Signal that we're preparing to save
    editingCoordination?.setPreparingSave?.(true);

    saveTimeoutRef.current = setTimeout(async () => {
      // Check what's blocking the save
      const blockingFactors = {
        isSaving,
        undoActive: undoActiveRef.current,
        userTyping: userTypingRef.current,
        pendingSave: pendingSaveRef.current,
        hasActiveEditing: editingCoordination?.hasActiveEditing?.() ?? false,
        hasActiveSaveOps: saveCoordination.hasActiveSaveOperations()
      };
      
      console.log('💾 Auto-save check:', blockingFactors);
      
      // Final enhanced check before saving
      if (isSaving || 
          undoActiveRef.current || 
          userTypingRef.current ||
          pendingSaveRef.current ||
          (editingCoordination?.hasActiveEditing?.() ?? false) ||
          saveCoordination.hasActiveSaveOperations()) {
        console.log('🚫 Auto-save blocked by:', blockingFactors);
        editingCoordination?.setPreparingSave?.(false);
        return;
      }
      
      console.log('✅ Auto-save proceeding...');
      
      // Final signature check
      const finalSignature = createContentSignature();
      
      if (finalSignature === lastSavedRef.current) {
        // Mark as saved since there are no actual content changes
        editingCoordination?.setPreparingSave?.(false);
        onSaved();
        return;
      }
      
      // Use coordinated save for conflict resolution
      const performSave = async () => {
        setIsSaving(true);
        pendingSaveRef.current = true;
        lastSaveTimeRef.current = Date.now();
      
      try {
        // Track this as our own update before saving
        const updateTimestamp = new Date().toISOString();
        trackMyUpdate(updateTimestamp);

        if (!rundownId) {
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

          // Get folder ID from location state if available
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
            // Track the actual timestamp returned by the database
            if (newRundown?.updated_at) {
              trackMyUpdate(newRundown.updated_at);
            }
            lastSavedRef.current = finalSignature;
            onSaved();
            navigate(`/rundown/${newRundown.id}`, { replace: true });
          }
        } else {
          // Save only main content - showcaller state handled completely separately
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
            // Track the actual timestamp returned by the database
            if (updatedRundown?.updated_at) {
              trackMyUpdate(updatedRundown.updated_at);
            }
            lastSavedRef.current = finalSignature;
            onSaved();
          }
        }
        } catch (error) {
          console.error('❌ Save error:', error);
        } finally {
          setIsSaving(false);
          pendingSaveRef.current = false;
          editingCoordination?.setPreparingSave?.(false);
        }
      };

      // Execute save with coordination
      await saveCoordination.coordinatedSave('rundown', performSave, {
        waitForOtherSaves: true,
        priority: 'normal'
      });
    }, debounceTime);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        editingCoordination?.setPreparingSave?.(false);
      }
    };
  }, [state.hasUnsavedChanges, state.lastChanged, rundownId, onSaved, createContentSignature, isSaving, navigate, trackMyUpdate, location.state]);

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
    setTrackOwnUpdate,
    setUserTyping
  };
};
