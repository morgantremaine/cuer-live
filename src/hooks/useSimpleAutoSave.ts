import { useState, useEffect, useRef, useCallback } from 'react';
import { RundownState } from './useRundownState';
import { debugLogger } from '@/utils/debugLogger';
import { useUniversalTimer } from './useUniversalTimer';
import { useCellUpdateCoordination } from './useCellUpdateCoordination';
import { supabase } from '@/integrations/supabase/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { useKeystrokeJournal } from './useKeystrokeJournal';

interface UseSimpleAutoSaveProps {
  state: RundownState;
  rundownId: string | null;
  isInitiallyLoaded: boolean;
  onSavedRef: React.MutableRefObject<(() => void) | undefined>;
  saveTimeoutRef: React.MutableRefObject<NodeJS.Timeout | undefined>;
  isSharedView?: boolean;
  suppressUntilRef?: React.MutableRefObject<number>;
  lastEditAtRef?: React.MutableRefObject<number>;
  undoActiveRef?: React.MutableRefObject<boolean>;
  cooldownUntilRef?: React.MutableRefObject<number>;
  blockUntilLocalEditRef?: React.MutableRefObject<boolean>;
}

export const useSimpleAutoSave = ({
  state,
  rundownId,
  isInitiallyLoaded,
  onSavedRef,
  saveTimeoutRef,
  isSharedView = false,
  suppressUntilRef,
  lastEditAtRef,
  undoActiveRef,
  cooldownUntilRef,
  blockUntilLocalEditRef
}: UseSimpleAutoSaveProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { shouldBlockAutoSave } = useCellUpdateCoordination();
  
  // CORE FIX: Cell-level change tracking instead of full rundown processing
  const cellChangesRef = useRef<Map<string, { field: string; value: string; timestamp: number }>>(new Map());
  const lastFullSignatureRef = useRef<string>('');
  const hasStructuralChangesRef = useRef<boolean>(false);
  
  // State management
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // References for save coordination
  const lastSavedRef = useRef<string>('');
  const saveInProgressRef = useRef<boolean>(false);
  const currentSaveSignatureRef = useRef<string>('');
  const pendingFollowUpSaveRef = useRef<boolean>(false);
  const saveInitiatedWhileActiveRef = useRef<boolean>(false);
  const recentKeystrokes = useRef<number>(0);
  
  // Keystroke journal for large rundowns
  const keystrokeJournal = useKeystrokeJournal({
    rundownId: rundownId || '',
    state: state,
    enabled: (state.items?.length || 0) > 100
  });
  
  // Track individual cell changes to avoid full rundown processing
  const trackCellChange = useCallback((itemId: string, field: string, value: string) => {
    const changeKey = `${itemId}:${field}`;
    cellChangesRef.current.set(changeKey, { 
      field, 
      value, 
      timestamp: Date.now() 
    });
    
    setHasUnsavedChanges(true);
    console.log('📝 Cell change tracked:', changeKey, 'total pending:', cellChangesRef.current.size);
    
    // Clear old changes periodically to prevent memory leaks
    const now = Date.now();
    for (const [key, change] of cellChangesRef.current.entries()) {
      if (now - change.timestamp > 30000) { // Clear changes older than 30 seconds
        cellChangesRef.current.delete(key);
      }
    }
  }, []);

  // CORE FIX: Lightweight change detection - NO massive string generation during typing
  const hasContentChanges = useCallback(() => {
    return cellChangesRef.current.size > 0 || hasStructuralChangesRef.current;
  }, []);

  // CORE FIX: Only generate signatures when saving - prevents 50KB+ string creation on every keystroke
  const createFullContentSignature = useCallback((targetState: RundownState) => {
    console.log('💾 Generating signature for database save only');
    return JSON.stringify({
      items: targetState.items,
      title: targetState.title,
      startTime: targetState.startTime,
      timezone: targetState.timezone,
      externalNotes: targetState.externalNotes,
      timestamp: Date.now()
    });
  }, []);

  // Track structural changes (not cell edits)
  const markStructuralChange = useCallback(() => {
    hasStructuralChangesRef.current = true;
    setHasUnsavedChanges(true);
    if (lastEditAtRef) {
      lastEditAtRef.current = Date.now();
    }
    console.log('🏗️ Structural change marked');
  }, [lastEditAtRef]);

  // Enhanced mark as changed function for cell-level edits
  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true);
    if (lastEditAtRef) {
      lastEditAtRef.current = Date.now();
    }
    
    // Mark as active to allow saves even if tab becomes hidden
    saveInitiatedWhileActiveRef.current = !document.hidden && document.hasFocus();
    recentKeystrokes.current = Date.now();
    
    console.log('📝 Content marked as changed (cell-level)');
  }, [lastEditAtRef]);

  // Mark active typing for debouncing
  const markActiveTyping = useCallback(() => {
    if (lastEditAtRef) {
      lastEditAtRef.current = Date.now();
    }
    recentKeystrokes.current = Date.now();
    console.log('⌨️ Active typing detected');
  }, [lastEditAtRef]);

  // Perform save with incremental optimization
  const performSave = useCallback(async (isFlushSave = false, isSharedViewParam = isSharedView) => {
    if (!isInitiallyLoaded || !rundownId) {
      debugLogger.autosave('Save blocked: not initialized');
      console.log('🛑 AutoSave: blocked - not initialized');
      return;
    }

    // CRITICAL: Use coordinated blocking to prevent cross-saving conflicts
    if (shouldBlockAutoSave()) {
      console.log('🛑 AutoSave: blocked by coordination system');
      if (!saveTimeoutRef.current) {
        saveTimeoutRef.current = setTimeout(() => {
          saveTimeoutRef.current = undefined;
          performSave(isFlushSave, isSharedViewParam);
        }, 500);
      }
      return;
    }

    // Check for content changes using lightweight detection
    if (!hasContentChanges()) {
      console.log('ℹ️ AutoSave: no content changes detected');
      setHasUnsavedChanges(false);
      onSavedRef.current?.();
      return;
    }

    // Prevent overlapping saves
    if (saveInProgressRef.current || (undoActiveRef && undoActiveRef.current)) {
      console.log('🛑 AutoSave: blocked - already saving or undo active');
      
      if (saveInProgressRef.current) {
        pendingFollowUpSaveRef.current = true;
        console.log('🕒 AutoSave: follow-up save scheduled after in-progress save');
      }
      return;
    }

    // Enhanced typing protection with force-save after max delay
    const timeSinceLastEdit = lastEditAtRef ? Date.now() - lastEditAtRef.current : 0;
    const isRecentlyTyping = timeSinceLastEdit < 1500; // 1.5 second typing idle
    const hasExceededMaxDelay = timeSinceLastEdit > 8000; // 8 second max delay
    
    if (isRecentlyTyping && !hasExceededMaxDelay && !isFlushSave) {
      console.log('⌨️ AutoSave: user still typing, waiting for idle period');
      return;
    }
    
    if (hasExceededMaxDelay && isRecentlyTyping) {
      console.log('⚡ AutoSave: forcing save after max delay despite typing');
    }

    // Generate full signature only when actually saving
    const finalSignature = createFullContentSignature(state);

    if (finalSignature === lastFullSignatureRef.current) {
      console.log('ℹ️ AutoSave: no content changes detected - signatures match');
      setHasUnsavedChanges(false);
      onSavedRef.current?.();
      return;
    }

    // Mark save in progress
    setIsSaving(true);
    saveInProgressRef.current = true;
    currentSaveSignatureRef.current = finalSignature;
    
    try {
      console.log('💾 Starting incremental save with', cellChangesRef.current.size, 'cell changes');
      
      const itemCount = state.items?.length || 0;
      
      if (!rundownId) {
        // Handle new rundown creation
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
        const currentUserId = (await supabase.auth.getUser()).data.user?.id;
        
        const newRundownData = {
          title: state.title,
          items: state.items,
          start_time: state.startTime,
          timezone: state.timezone,
          show_date: state.showDate ? `${state.showDate.getFullYear()}-${String(state.showDate.getMonth() + 1).padStart(2, '0')}-${String(state.showDate.getDate()).padStart(2, '0')}` : null,
          external_notes: state.externalNotes,
          team_id: teamData.team_id,
          user_id: currentUserId,
          folder_id: folderId,
          last_updated_by: currentUserId
        };

        const { data: newRundown, error: createError } = await supabase
          .from('rundowns')
          .insert(newRundownData)
          .select('id')
          .single();

        if (createError) {
          console.error('❌ Failed to create new rundown:', createError);
          return;
        }

        console.log('✅ Created new rundown:', newRundown.id);
        navigate(`/rundown/${newRundown.id}`, { replace: true });
        
      } else {
        // Update existing rundown
        const currentUserId = (await supabase.auth.getUser()).data.user?.id;
        const updateData = {
          title: state.title,
          items: state.items,
          start_time: state.startTime,
          timezone: state.timezone,
          show_date: state.showDate ? `${state.showDate.getFullYear()}-${String(state.showDate.getMonth() + 1).padStart(2, '0')}-${String(state.showDate.getDate()).padStart(2, '0')}` : null,
          external_notes: state.externalNotes,
          last_updated_by: currentUserId,
          updated_at: new Date().toISOString()
        };

        const { error: updateError } = await supabase
          .from('rundowns')
          .update(updateData)
          .eq('id', rundownId);

        if (updateError) {
          console.error('❌ Failed to update rundown:', updateError);
          return;
        }

        console.log('✅ Updated rundown:', rundownId);
      }
      
      // Clear tracked changes after successful save
      cellChangesRef.current.clear();
      hasStructuralChangesRef.current = false;
      lastFullSignatureRef.current = finalSignature;
      lastSavedRef.current = finalSignature;
      
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      onSavedRef.current?.();
      console.log('✅ AutoSave: incremental save completed successfully');
      
    } catch (error) {
      console.error('❌ AutoSave failed:', error);
    } finally {
      setIsSaving(false);
      saveInProgressRef.current = false;
      currentSaveSignatureRef.current = '';
      
      // Handle pending follow-up save
      if (pendingFollowUpSaveRef.current) {
        pendingFollowUpSaveRef.current = false;
        console.log('🔁 AutoSave: executing pending follow-up save');
        setTimeout(() => performSave(), 100);
      }
    }
  }, [state, rundownId, isInitiallyLoaded, shouldBlockAutoSave, hasContentChanges, createFullContentSignature, isSharedView, location, navigate]);

  // Auto-save effect with intelligent debouncing
  useEffect(() => {
    if (!hasContentChanges() || !isInitiallyLoaded) {
      return;
    }

    console.log('🧪 TRACE IncrementalAutoSave: changes detected, scheduling save');
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Intelligent debouncing based on change type
    const hasStructural = hasStructuralChangesRef.current;
    const debounceTime = hasStructural ? 500 : 1500; // Faster save for structural changes
    
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = undefined;
      performSave();
    }, debounceTime);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = undefined;
      }
    };
  }, [hasContentChanges(), isInitiallyLoaded, performSave]);

  const flush = useCallback(() => {
    console.log('🧯 AutoSave: flushing pending saves');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }
    performSave(true);
  }, [performSave]);

  const suppressSave = useCallback((durationMs: number) => {
    if (suppressUntilRef) {
      suppressUntilRef.current = Date.now() + durationMs;
      console.log('🛑 AutoSave: suppressed for', durationMs, 'ms');
    }
  }, [suppressUntilRef]);

  const setOnSavedCallback = useCallback((callback: (() => void) | undefined) => {
    onSavedRef.current = callback;
  }, [onSavedRef]);

  return {
    isSaving,
    hasUnsavedChanges,
    lastSaved,
    markAsChanged,
    markStructuralChange,
    trackCellChange,
    markActiveTyping,
    flush,
    suppressSave,
    onSaved: setOnSavedCallback
  };
};