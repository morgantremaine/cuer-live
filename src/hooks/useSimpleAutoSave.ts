
import { useEffect, useRef, useState, useCallback } from 'react';
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
  const showcallerActiveRef = useRef(false);
  const showcallerTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingSaveRef = useRef(false);

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

  // Enhanced showcaller blocking - completely isolates showcaller operations
  const setShowcallerUpdate = useCallback((isUpdate: boolean) => {
    showcallerActiveRef.current = isUpdate;
    
    if (isUpdate) {
      console.log('📺 Showcaller operation active - completely blocking autosave');
      
      if (showcallerTimeoutRef.current) {
        clearTimeout(showcallerTimeoutRef.current);
      }
      
      // Extended timeout to ensure showcaller operations complete fully
      showcallerTimeoutRef.current = setTimeout(() => {
        showcallerActiveRef.current = false;
        console.log('📺 Showcaller operation completed - autosave can resume');
      }, 10000); // 10 seconds to handle complex showcaller sequences
    } else {
      console.log('📺 Showcaller operation cleared');
    }
  }, []);

  // Function to set the own update tracker from realtime hook
  const setTrackOwnUpdate = useCallback((tracker: (timestamp: string) => void) => {
    trackOwnUpdateRef.current = tracker;
  }, []);

  // Track own updates
  const trackMyUpdate = useCallback((timestamp: string) => {
    console.log('💾 Tracking my own update:', timestamp);
    
    if (trackOwnUpdateRef.current) {
      trackOwnUpdateRef.current(timestamp);
    }
  }, []);

  // Create content signature that ONLY includes actual content (NO showcaller fields)
  const createContentSignature = useCallback(() => {
    // Immediately return last saved if showcaller is active
    if (showcallerActiveRef.current) {
      console.log('🚫 Showcaller active - using cached signature to prevent saves');
      return lastSavedRef.current;
    }

    // Create signature with ONLY content fields - completely exclude showcaller data
    const cleanItems = state.items?.map(item => {
      // Explicitly exclude ALL showcaller-related fields
      const {
        status,           // Showcaller field
        elapsedTime,      // Showcaller field  
        ...contentItem
      } = item;
      
      return {
        id: contentItem.id,
        type: contentItem.type,
        rowNumber: contentItem.rowNumber,
        name: contentItem.name,
        startTime: contentItem.startTime,
        duration: contentItem.duration,
        endTime: contentItem.endTime,
        talent: contentItem.talent,
        script: contentItem.script,
        gfx: contentItem.gfx,
        video: contentItem.video,
        images: contentItem.images,
        notes: contentItem.notes,
        color: contentItem.color,
        isFloating: contentItem.isFloating,
        customFields: contentItem.customFields
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
    // Enhanced blocking conditions - showcaller operations completely prevent saves
    if (!state.hasUnsavedChanges || 
        undoActiveRef.current || 
        userTypingRef.current || 
        showcallerActiveRef.current ||
        pendingSaveRef.current) {
      
      if (showcallerActiveRef.current) {
        console.log('🚫 Autosave completely blocked - showcaller operation in progress');
      }
      
      return;
    }

    // Create signature of current state - excluding ALL showcaller data
    const currentSignature = createContentSignature();

    // Only save if content actually changed
    if (currentSignature === lastSavedRef.current) {
      console.log('💾 No content changes detected - skipping save');
      return;
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;
    const minSaveInterval = 5000; // Increased interval
    
    const debounceTime = timeSinceLastSave < minSaveInterval ? 10000 : 5000; // Longer debounce

    console.log('💾 Scheduling autosave in', debounceTime, 'ms');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      // Final check for showcaller activity
      if (isSaving || 
          undoActiveRef.current || 
          userTypingRef.current || 
          showcallerActiveRef.current ||
          pendingSaveRef.current) {
        console.log('🚫 Save cancelled - showcaller or other blocking condition active');
        return;
      }
      
      // Final signature check
      const finalSignature = createContentSignature();
      
      if (finalSignature === lastSavedRef.current) {
        console.log('💾 No changes in final check - skipping save');
        return;
      }
      
      console.log('💾 Executing autosave...');
      setIsSaving(true);
      pendingSaveRef.current = true;
      lastSaveTimeRef.current = Date.now();
      
      try {
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
            console.log('✅ Successfully saved new rundown');
            onSaved();
            navigate(`/rundown/${newRundown.id}`, { replace: true });
          }
        } else {
          // Save only main content - showcaller state is handled separately
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
            console.log('✅ Successfully saved rundown at', updateTimestamp);
            onSaved();
          }
        }
      } catch (error) {
        console.error('❌ Save error:', error);
      } finally {
        setIsSaving(false);
        pendingSaveRef.current = false;
      }
    }, debounceTime);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.hasUnsavedChanges, state.lastChanged, rundownId, onSaved, createContentSignature, isSaving, navigate, trackMyUpdate]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (showcallerTimeoutRef.current) {
        clearTimeout(showcallerTimeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    setUndoActive,
    setTrackOwnUpdate,
    setUserTyping,
    setShowcallerUpdate
  };
};
