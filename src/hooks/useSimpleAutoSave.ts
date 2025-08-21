
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RundownState } from './useRundownState';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';
import { updateRundownWithConcurrencyCheck, mergeConflictedRundown } from '@/utils/optimisticConcurrency';
import { useToast } from '@/hooks/use-toast';
import { registerRecentSave } from './useRundownResumption';
import { normalizeTimestamp } from '@/utils/realtimeUtils';

export const useSimpleAutoSave = (
  state: RundownState,
  rundownId: string | null,
  onSaved: () => void,
  lastKnownTimestamp: string | null = null,
  onConflictResolved?: (mergedData: any) => void,
  updateLastKnownTimestamp?: (timestamp: string) => void
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
  const lastKnownTimestampRef = useRef<string | null>(lastKnownTimestamp);
  const isFlushingRef = useRef(false);

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

  // Immediate flush function for critical saves (page unload, route change)
  const flushSave = useCallback(async () => {
    if (!rundownId || rundownId === DEMO_RUNDOWN_ID || !state.hasUnsavedChanges || isFlushingRef.current) {
      return;
    }

    const currentSignature = createContentSignature();
    if (currentSignature === lastSavedRef.current) {
      onSaved();
      return;
    }

    isFlushingRef.current = true;
    console.log('🚨 FLUSH SAVE - Critical save initiated');

    try {
      const updateData = {
        title: state.title,
        items: state.items,
        start_time: state.startTime,
        timezone: state.timezone
      };
      const isStructural = structuralChangeRef.current;

      // Prefer concurrency check if we have a known server timestamp
      if (lastKnownTimestampRef.current) {
        const result = await updateRundownWithConcurrencyCheck(
          rundownId,
          updateData,
          lastKnownTimestampRef.current
        );

        if (result.success && result.conflictData?.updated_at) {
          const normalizedTimestamp = normalizeTimestamp(result.conflictData.updated_at);
          // Track own update so realtime ignores it
          trackMyUpdate(normalizedTimestamp, isStructural);
          lastKnownTimestampRef.current = normalizedTimestamp;
          updateLastKnownTimestamp?.(normalizedTimestamp);
          registerRecentSave(rundownId, normalizedTimestamp);
          lastSavedRef.current = currentSignature;
          onSaved();
          console.log('✅ FLUSH SAVE - Completed with concurrency check');
          return;
        }
      }

      // Fallback to plain update if concurrency fails or no timestamp
      const { data, error } = await supabase
        .from('rundowns')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', rundownId)
        .select('updated_at')
        .single();

      if (!error && data?.updated_at) {
        const normalizedTimestamp = normalizeTimestamp(data.updated_at);
        trackMyUpdate(normalizedTimestamp, isStructural);
        lastKnownTimestampRef.current = normalizedTimestamp;
        updateLastKnownTimestamp?.(normalizedTimestamp);
        registerRecentSave(rundownId, normalizedTimestamp);
        lastSavedRef.current = currentSignature;
        onSaved();
        console.log('✅ FLUSH SAVE - Completed with plain update');
      } else if (error) {
        console.error('❌ FLUSH SAVE - Failed:', error);
      }
    } catch (error) {
      console.error('❌ FLUSH SAVE - Error:', error);
    } finally {
      isFlushingRef.current = false;
    }
  }, [rundownId, state, createContentSignature, onSaved, trackMyUpdate, updateLastKnownTimestamp]);

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

    // Simple blocking conditions - no showcaller interference possible
    if (!state.hasUnsavedChanges || 
        undoActiveRef.current || 
        userTypingRef.current ||
        pendingSaveRef.current) {
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

    // Rate limiting
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;
    const minSaveInterval = 3000;
    
    const debounceTime = timeSinceLastSave < minSaveInterval ? 8000 : 3000;

    

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
              if (updateLastKnownTimestamp) {
                updateLastKnownTimestamp(normalizedTimestamp);
              }
              // Register this save to prevent false positives in resumption
              registerRecentSave(newRundown.id, normalizedTimestamp);
            }
            lastSavedRef.current = finalSignature;
            onSaved();
            navigate(`/rundown/${newRundown.id}`, { replace: true });
          }
        } else {
          // Use optimistic concurrency control for updates
          const updateData = {
            title: state.title,
            items: state.items,
            start_time: state.startTime,
            timezone: state.timezone
          };

          // Only use concurrency check if we have a known timestamp
          let result;
          if (lastKnownTimestampRef.current) {
            result = await updateRundownWithConcurrencyCheck(
              rundownId,
              updateData,
              lastKnownTimestampRef.current
            );
          } else {
            // No known timestamp - do a plain update without concurrency check
            console.log('📝 No known timestamp - performing plain update');
            const { data, error } = await supabase
              .from('rundowns')
              .update({
                ...updateData,
                updated_at: new Date().toISOString()
              })
              .eq('id', rundownId)
              .select('updated_at')
              .single();

            if (error) {
              result = { success: false, error: error.message };
            } else {
              result = { success: true, conflictData: { updated_at: data.updated_at } };
            }
          }

          if (result.success) {
            // Track the actual timestamp returned by the database
            if (result.conflictData?.updated_at) {
              const normalizedTimestamp = normalizeTimestamp(result.conflictData.updated_at);
              trackMyUpdate(normalizedTimestamp, isStructural);
              lastKnownTimestampRef.current = normalizedTimestamp;
              if (updateLastKnownTimestamp) {
                updateLastKnownTimestamp(normalizedTimestamp);
              }
              // Register this save to prevent false positives in resumption
              registerRecentSave(rundownId, normalizedTimestamp);
            }
            lastSavedRef.current = finalSignature;
            onSaved();
            console.log('✅ Rundown saved successfully with concurrency check');
          } else if (result.conflictData) {
            // Handle conflict - merge data and retry
            console.log('🔄 Handling conflict - merging changes');
            
            // Removed toast notification - user prefers just the blue icon indicator
            // toast({
            //   title: "Changes merged",
            //   description: "Your changes have been merged with updates from your team.",
            //   duration: 4000,
            // });

            // Get protected fields (currently being edited)
            const protectedFields = new Set<string>();
            if (userTypingRef.current) {
              // Add logic to track which fields are currently being typed in
              // This would need to be enhanced based on your typing tracking system
            }

            const mergedData = mergeConflictedRundown(updateData, result.conflictData, protectedFields);
            
            // Update our state with merged data
            if (onConflictResolved) {
              onConflictResolved(mergedData);
            }
            
            // Update our timestamp reference
            lastKnownTimestampRef.current = result.conflictData.updated_at;
            
            // Retry the save with merged data
            const retryResult = await updateRundownWithConcurrencyCheck(
              rundownId,
              {
                title: mergedData.title,
                items: mergedData.items,
                start_time: mergedData.start_time,
                timezone: mergedData.timezone
              },
              lastKnownTimestampRef.current
            );

            if (retryResult.success && retryResult.conflictData?.updated_at) {
              const normalizedTimestamp = normalizeTimestamp(retryResult.conflictData.updated_at);
              trackMyUpdate(normalizedTimestamp, isStructural);
              lastKnownTimestampRef.current = normalizedTimestamp;
              if (updateLastKnownTimestamp) {
                updateLastKnownTimestamp(normalizedTimestamp);
              }
              // Register this save to prevent false positives in resumption
              registerRecentSave(rundownId, normalizedTimestamp);
              lastSavedRef.current = finalSignature;
              onSaved();
            } else {
              console.error('❌ Retry save failed after conflict resolution');
              toast({
                title: "Save failed",
                description: "Unable to save changes after conflict resolution. Please try again.",
                variant: "destructive",
                duration: 5000,
              });
            }
          } else {
            console.error('❌ Save failed with concurrency check:', result.error);
            toast({
              title: "Save failed",
              description: result.error || "Unable to save changes. Please try again.",
              variant: "destructive",
              duration: 5000,
            });
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
  }, [state.hasUnsavedChanges, state.lastChanged, rundownId, onSaved, createContentSignature, isSaving, navigate, trackMyUpdate, location.state, toast, onConflictResolved]);

  // Update timestamp reference when it changes
  useEffect(() => {
    lastKnownTimestampRef.current = lastKnownTimestamp;
  }, [lastKnownTimestamp]);

  // Flush-on-leave protection - save immediately when user navigates away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (rundownId && rundownId !== DEMO_RUNDOWN_ID && state.hasUnsavedChanges) {
        flushSave();
        // Show browser warning for unsaved changes
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handlePageHide = () => {
      if (rundownId && rundownId !== DEMO_RUNDOWN_ID && state.hasUnsavedChanges) {
        flushSave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [rundownId, state.hasUnsavedChanges, flushSave]);

  // Flush on route changes
  useEffect(() => {
    return () => {
      // When this component unmounts (route change), flush any pending saves
      if (rundownId && rundownId !== DEMO_RUNDOWN_ID && state.hasUnsavedChanges) {
        flushSave();
      }
    };
  }, [location.pathname, rundownId, state.hasUnsavedChanges, flushSave]);

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
