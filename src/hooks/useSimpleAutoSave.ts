import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RundownState } from './useRundownState';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';
import { useToast } from '@/hooks/use-toast';
import { registerRecentSave } from './useRundownResumption';
import { normalizeTimestamp } from '@/utils/realtimeUtils';

export const useSimpleAutoSave = (
  state: RundownState,
  rundownId: string | null,
  onSaved: () => void
) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const lastSavedRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const [isSaving, setIsSaving] = useState(false);
  const undoActiveRef = useRef(false);
  const lastSaveTimeRef = useRef<number>(0);
  const trackOwnUpdateRef = useRef<((timestamp: string, isStructural?: boolean) => void) | null>(null);
  const userTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingSaveRef = useRef(false);
  const structuralChangeRef = useRef(false);

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

  // Function to coordinate with undo operations
  const setUndoActive = (active: boolean) => {
    undoActiveRef.current = active;
  };

  // Track own updates including structural changes
  const trackMyUpdate = useCallback((timestamp: string, isStructural: boolean = false) => {
    if (trackOwnUpdateRef.current) {
      trackOwnUpdateRef.current(timestamp, isStructural);
    }
    
    // Always reset the structural change flag after tracking
    if (isStructural) {
      structuralChangeRef.current = false; // Reset flag
    }
  }, []);

  // Function to set user typing state with enhanced logic
  const setUserTyping = useCallback((typing: boolean) => {
    const wasTyping = userTypingRef.current;
    userTypingRef.current = typing;
    
    if (typing) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Reduced idle threshold for faster saves
      typingTimeoutRef.current = setTimeout(() => {
        console.log('⌨️ User stopped typing, allowing autosave');
        userTypingRef.current = false;
      }, 1200); // Reduced from 3000ms to 1200ms
    } else if (wasTyping) {
      // User explicitly stopped typing (blur event)
      console.log('⌨️ User explicitly stopped typing (blur)');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, []);

  // Function to set the own update tracker from realtime hook
  const setTrackOwnUpdate = useCallback((tracker: (timestamp: string, isStructural?: boolean) => void) => {
    trackOwnUpdateRef.current = tracker;
  }, []);

  // Function to mark structural changes (add/delete/move rows)
  const markStructuralChange = useCallback(() => {
    structuralChangeRef.current = true;
    console.log('📊 Marked structural change - will not filter in realtime');
  }, []);

  useEffect(() => {
    // Check if this is a demo rundown - skip saving but allow change detection
    if (rundownId === DEMO_RUNDOWN_ID) {
      // Still mark as saved to prevent UI from showing "unsaved" state
      if (state.hasUnsavedChanges) {
        onSaved();
      }
      return;
    }

    // Enhanced blocking conditions with background save capability
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;
    
    const isBlocked = !state.hasUnsavedChanges || 
                     undoActiveRef.current || 
                     pendingSaveRef.current;
    
    // Allow background saves during typing if it's been a while
    const allowBackgroundSave = userTypingRef.current && timeSinceLastSave > 10000; // 10 seconds
    
    if (isBlocked || (userTypingRef.current && !allowBackgroundSave)) {
      if (userTypingRef.current && !allowBackgroundSave) {
        console.log('⌨️ Blocking save - user is typing (last save:', timeSinceLastSave, 'ms ago)');
      }
      return;
    }
    
    if (allowBackgroundSave) {
      console.log('💾 Performing background save during typing session');
    }

    // Create signature of current state - excluding ALL showcaller data
    const currentSignature = createContentSignature();

    // Only save if content actually changed
    if (currentSignature === lastSavedRef.current) {
      // Mark as saved since there are no actual content changes
      onSaved();
      return;
    }

    // Rate limiting with faster saves for structural changes
    const minSaveInterval = 3000;
    
    // Speed up structural changes for show day safety
    const isStructuralChange = structuralChangeRef.current;
    const baseDebounceTime = timeSinceLastSave < minSaveInterval ? 8000 : 3000;
    const debounceTime = isStructuralChange ? Math.min(baseDebounceTime, 750) : baseDebounceTime;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      // Final check before saving
      if (isSaving || 
          undoActiveRef.current || 
          userTypingRef.current ||
          pendingSaveRef.current) {
        return;
      }
      
      // Final signature check
      const finalSignature = createContentSignature();
      
      if (finalSignature === lastSavedRef.current) {
        // Mark as saved since there are no actual content changes
        onSaved();
        return;
      }
      
      setIsSaving(true);
      pendingSaveRef.current = true;
      lastSaveTimeRef.current = Date.now();
      
      try {
        // Track this as our own update before saving
        const updateTimestamp = new Date().toISOString();
        const isStructural = structuralChangeRef.current;
        trackMyUpdate(updateTimestamp, isStructural);

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
              const normalizedTimestamp = normalizeTimestamp(newRundown.updated_at);
              trackMyUpdate(normalizedTimestamp, isStructural);
              // Register this save to prevent false positives in resumption
              registerRecentSave(newRundown.id, normalizedTimestamp);
            }
            lastSavedRef.current = finalSignature;
            onSaved();
            navigate(`/rundown/${newRundown.id}`, { replace: true });
          }
        } else {
          // Simple update for existing rundowns
          const { data, error } = await supabase
            .from('rundowns')
            .update({
              title: state.title,
              items: state.items,
              start_time: state.startTime,
              timezone: state.timezone,
              updated_at: new Date().toISOString()
            })
            .eq('id', rundownId)
            .select('updated_at')
            .single();

          if (error) {
            console.error('❌ Save failed:', error);
            toast({
              title: "Save failed",
              description: "Unable to save changes. Please try again.",
              variant: "destructive",
              duration: 5000,
            });
          } else {
            // Track the actual timestamp returned by the database
            if (data?.updated_at) {
              const normalizedTimestamp = normalizeTimestamp(data.updated_at);
              trackMyUpdate(normalizedTimestamp, isStructural);
              // Register this save to prevent false positives in resumption
              registerRecentSave(rundownId, normalizedTimestamp);
            }
            lastSavedRef.current = finalSignature;
            onSaved();
            console.log('✅ Rundown saved successfully');
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
  }, [state.hasUnsavedChanges, state.lastChanged, rundownId, onSaved, createContentSignature, isSaving, navigate, trackMyUpdate, location.state, toast]);

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
    setUserTyping,
    markStructuralChange
  };
};