
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RundownState } from './useRundownState';
import { supabase } from '@/lib/supabase';

export const useSimpleAutoSave = (
  state: RundownState,
  rundownId: string | null,
  onSaved: () => void
) => {
  const navigate = useNavigate();
  const lastSavedRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const [isSaving, setIsSaving] = useState(false);
  const undoActiveRef = useRef(false);
  const lastSaveTimeRef = useRef<number>(0);
  const trackOwnUpdateRef = useRef<((timestamp: string) => void) | null>(null);
  const userTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const showcallerUpdateRef = useRef(false);
  const showcallerUpdateTimeoutRef = useRef<NodeJS.Timeout>();

  // Function to coordinate with undo operations
  const setUndoActive = (active: boolean) => {
    undoActiveRef.current = active;
  };

  // Function to set user typing state - prevents saves during active typing
  const setUserTyping = (typing: boolean) => {
    userTypingRef.current = typing;
    
    if (typing) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set a timeout to clear typing state after user stops
      typingTimeoutRef.current = setTimeout(() => {
        userTypingRef.current = false;
        console.log('⌨️ User stopped typing, auto-save can resume');
      }, 2000); // 2 seconds after stopping typing
    }
  };

  // Function to set showcaller update state - prevents saves during showcaller updates
  const setShowcallerUpdate = (isUpdate: boolean) => {
    showcallerUpdateRef.current = isUpdate;
    
    if (isUpdate) {
      console.log('📺 Marking as showcaller update - preventing auto-save');
      // Clear existing timeout
      if (showcallerUpdateTimeoutRef.current) {
        clearTimeout(showcallerUpdateTimeoutRef.current);
      }
      
      // Set a timeout to clear showcaller update state
      showcallerUpdateTimeoutRef.current = setTimeout(() => {
        showcallerUpdateRef.current = false;
        console.log('📺 Showcaller update state cleared - auto-save can resume');
      }, 1000); // 1 second after showcaller update
    }
  };

  // Function to set the own update tracker from realtime hook
  const setTrackOwnUpdate = (tracker: (timestamp: string) => void) => {
    trackOwnUpdateRef.current = tracker;
  };

  useEffect(() => {
    // Enhanced conditions - Don't save if no changes, undo is active, user is actively typing, or showcaller is updating
    if (!state.hasUnsavedChanges || 
        undoActiveRef.current || 
        userTypingRef.current || 
        showcallerUpdateRef.current) {
      return;
    }

    // Create a signature of the current state - EXCLUDE showcaller data completely
    const currentSignature = JSON.stringify({
      items: state.items?.map(item => ({
        id: item.id,
        type: item.type,
        name: item.name,
        duration: item.duration,
        startTime: item.startTime,
        endTime: item.endTime,
        talent: item.talent,
        script: item.script,
        gfx: item.gfx,
        video: item.video,
        notes: item.notes,
        color: item.color,
        isFloating: item.isFloating,
        isFloated: item.isFloated,
        customFields: item.customFields,
        segmentName: item.segmentName,
        elapsedTime: item.elapsedTime,
        rowNumber: item.rowNumber
        // Explicitly exclude: status, currentSegmentId and any other showcaller fields
      })) || [],
      title: state.title,
      startTime: state.startTime,
      timezone: state.timezone
    });

    // Only save if state actually changed
    if (currentSignature === lastSavedRef.current) {
      return;
    }

    // Increased rate limiting: don't save more than once every 3 seconds
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;
    const minSaveInterval = 3000; // Increased from 2 seconds to 3 seconds
    
    // If we just saved recently, extend the debounce time significantly
    const debounceTime = timeSinceLastSave < minSaveInterval ? 5000 : 2000; // Increased debounce times

    console.log('💾 Auto-save scheduled in', debounceTime, 'ms');

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save with longer timing
    saveTimeoutRef.current = setTimeout(async () => {
      // Triple-check conditions when timeout executes
      if (isSaving || 
          undoActiveRef.current || 
          userTypingRef.current || 
          showcallerUpdateRef.current) {
        console.log('💾 Auto-save cancelled - conditions changed', {
          isSaving,
          undoActive: undoActiveRef.current,
          userTyping: userTypingRef.current,
          showcallerUpdate: showcallerUpdateRef.current
        });
        return;
      }
      
      // Check if state changed again during debounce
      const finalSignature = JSON.stringify({
        items: state.items?.map(item => ({
          id: item.id,
          type: item.type,
          name: item.name,
          duration: item.duration,
          startTime: item.startTime,
          endTime: item.endTime,
          talent: item.talent,
          script: item.script,
          gfx: item.gfx,
          video: item.video,
          notes: item.notes,
          color: item.color,
          isFloating: item.isFloating,
          isFloated: item.isFloated,
          customFields: item.customFields,
          segmentName: item.segmentName,
          elapsedTime: item.elapsedTime,
          rowNumber: item.rowNumber
        })) || [],
        title: state.title,
        startTime: state.startTime,
        timezone: state.timezone
      });
      
      if (finalSignature === lastSavedRef.current) {
        console.log('💾 Auto-save skipped - no changes detected');
        return;
      }
      
      setIsSaving(true);
      lastSaveTimeRef.current = Date.now();
      
      try {
        const updateTimestamp = new Date().toISOString();
        console.log('💾 Starting auto-save with timestamp:', updateTimestamp);

        // Track this as our own update BEFORE saving
        if (trackOwnUpdateRef.current) {
          trackOwnUpdateRef.current(updateTimestamp);
        }

        // For new rundowns, we need to create them first
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

          const { data: newRundown, error: createError } = await supabase
            .from('rundowns')
            .insert({
              title: state.title,
              items: state.items,
              start_time: state.startTime,
              timezone: state.timezone,
              team_id: teamData.team_id,
              user_id: (await supabase.auth.getUser()).data.user?.id,
              updated_at: updateTimestamp
            })
            .select()
            .single();

          if (createError) {
            console.error('❌ Save failed:', createError);
          } else {
            lastSavedRef.current = finalSignature;
            onSaved();
            console.log('✅ New rundown created and saved');
            
            // Update the URL to reflect the new rundown ID
            navigate(`/rundown/${newRundown.id}`, { replace: true });
          }
        } else {
          const { error } = await supabase
            .from('rundowns')
            .update({
              title: state.title,
              items: state.items,
              start_time: state.startTime,
              timezone: state.timezone,
              updated_at: updateTimestamp
            })
            .eq('id', rundownId);

          if (error) {
            console.error('❌ Save failed:', error);
          } else {
            lastSavedRef.current = finalSignature;
            onSaved();
            console.log('✅ Rundown auto-saved successfully');
          }
        }
      } catch (error) {
        console.error('❌ Save error:', error);
      } finally {
        setIsSaving(false);
      }
    }, debounceTime);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.hasUnsavedChanges, state.lastChanged, rundownId, onSaved, state.items, state.title, state.startTime, state.timezone, isSaving, navigate]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (showcallerUpdateTimeoutRef.current) {
        clearTimeout(showcallerUpdateTimeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    setUndoActive,
    setTrackOwnUpdate,
    setUserTyping,
    setShowcallerUpdate // Export this for showcaller integration
  };
};
