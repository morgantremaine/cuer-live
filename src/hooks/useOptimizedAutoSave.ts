
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RundownState } from './useRundownState';
import { supabase } from '@/lib/supabase';

// Lightweight change signature that excludes showcaller fields
const createContentSignature = (state: RundownState) => {
  // Only include essential content fields for change detection
  const essentialData = {
    title: state.title,
    startTime: state.startTime,
    timezone: state.timezone,
    itemsLength: state.items?.length || 0,
    // Create a lightweight items signature focusing on core content
    itemsSignature: state.items?.map(item => ({
      id: item.id,
      name: item.name,
      duration: item.duration,
      startTime: item.startTime,
      type: item.type
    })) || []
  };
  
  return JSON.stringify(essentialData);
};

export const useOptimizedAutoSave = (
  state: RundownState,
  rundownId: string | null,
  onSaved: () => void
) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Performance-optimized refs
  const lastSavedSignatureRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSaveTimeRef = useRef<number>(0);
  const saveInProgressRef = useRef(false);
  const userTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const trackOwnUpdateRef = useRef<((timestamp: string) => void) | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);

  // Optimized user typing detection with longer debounce
  const setUserTyping = useCallback((typing: boolean) => {
    userTypingRef.current = typing;
    
    if (typing) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Extended timeout to reduce auto-save frequency during typing
      typingTimeoutRef.current = setTimeout(() => {
        userTypingRef.current = false;
        console.log('⌨️ User stopped typing - auto-save can resume');
      }, 4000); // Increased from 3000ms
    }
  }, []);

  // Set the own update tracker from realtime hook
  const setTrackOwnUpdate = useCallback((tracker: (timestamp: string) => void) => {
    trackOwnUpdateRef.current = tracker;
  }, []);

  // Track own updates to prevent processing them
  const trackMyUpdate = useCallback((timestamp: string) => {
    console.log('💾 Tracking my own update:', timestamp);
    if (trackOwnUpdateRef.current) {
      trackOwnUpdateRef.current(timestamp);
    }
  }, []);

  // Optimized auto-save with smarter debouncing
  useEffect(() => {
    // Skip if no unsaved changes or user is actively typing
    if (!state.hasUnsavedChanges || 
        userTypingRef.current ||
        saveInProgressRef.current) {
      return;
    }

    // Create lightweight content signature
    const currentSignature = createContentSignature(state);

    // Skip if content hasn't actually changed
    if (currentSignature === lastSavedSignatureRef.current) {
      console.log('💾 No content changes detected - skipping save');
      return;
    }

    // Smart rate limiting with longer intervals
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;
    const minSaveInterval = 5000; // Increased from 3000ms
    
    // Dynamic debounce time based on recent activity
    const debounceTime = timeSinceLastSave < minSaveInterval ? 10000 : 6000; // Increased delays

    console.log('💾 Scheduling optimized autosave in', debounceTime, 'ms');

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      // Final checks before saving
      if (saveInProgressRef.current || userTypingRef.current) {
        console.log('🚫 Save cancelled - user still typing or save in progress');
        return;
      }
      
      // Final signature check to prevent unnecessary saves
      const finalSignature = createContentSignature(state);
      if (finalSignature === lastSavedSignatureRef.current) {
        console.log('💾 No changes in final check - skipping save');
        return;
      }
      
      console.log('💾 Executing optimized autosave...');
      setIsSaving(true);
      saveInProgressRef.current = true;
      lastSaveTimeRef.current = Date.now();
      
      try {
        const updateTimestamp = new Date().toISOString();
        trackMyUpdate(updateTimestamp);

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
            lastSavedSignatureRef.current = finalSignature;
            console.log('✅ Successfully saved new rundown');
            onSaved();
            navigate(`/rundown/${newRundown.id}`, { replace: true });
          }
        } else {
          // Update existing rundown - only core content fields
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
            lastSavedSignatureRef.current = finalSignature;
            console.log('✅ Successfully saved rundown');
            onSaved();
          }
        }
      } catch (error) {
        console.error('❌ Save error:', error);
      } finally {
        setIsSaving(false);
        saveInProgressRef.current = false;
      }
    }, debounceTime);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.hasUnsavedChanges, state.lastChanged, rundownId, onSaved, navigate, trackMyUpdate, location.state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    setTrackOwnUpdate,
    setUserTyping
  };
};
