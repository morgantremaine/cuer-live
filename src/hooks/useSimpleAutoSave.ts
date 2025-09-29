import { useRef, useCallback, useEffect, useState } from 'react';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { SavedRundown } from '@/hooks/useRundownStorage/types';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/columns';
import { toast } from 'sonner';

const DEMO_RUNDOWN_ID = 'demo';

// Simple signature creation for content comparison
const createContentSignature = (data: { items: RundownItem[]; columns: Column[]; title: string; rundownId: string }) => {
  return JSON.stringify({ 
    items: data.items.map(item => ({ id: item.id, name: item.name, script: item.script, talent: item.talent })),
    title: data.title,
    columnCount: data.columns.length
  });
};

class KeystrokeJournal {
  private keystrokes: Array<{ timestamp: number; type: string; context: string }> = [];
  private maxEntries = 100;
  private verboseLogging = false;

  log(type: string, context: string) {
    this.keystrokes.push({
      timestamp: Date.now(),
      type,
      context
    });
    
    if (this.keystrokes.length > this.maxEntries) {
      this.keystrokes = this.keystrokes.slice(-this.maxEntries);
    }
    
    if (this.verboseLogging) {
      console.log(`⌨️ ${type}: ${context}`);
    }
  }

  getJournalStats() {
    const now = Date.now();
    const recent = this.keystrokes.filter(k => now - k.timestamp < 60000); // Last minute
    const byType = recent.reduce((acc, k) => {
      acc[k.type] = (acc[k.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalRecent: recent.length,
      byType,
      lastActivity: this.keystrokes.length > 0 ? this.keystrokes[this.keystrokes.length - 1] : null
    };
  }

  setVerboseLogging(enabled: boolean) {
    this.verboseLogging = enabled;
    console.log(`⌨️ Keystroke journal verbose logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  clearJournal() {
    this.keystrokes = [];
    console.log('⌨️ Keystroke journal cleared');
  }
}

const keystrokeJournal = new KeystrokeJournal();

interface UseSimpleAutoSaveOptions {
  rundownId: string;
  rundown: SavedRundown | null;
  items: RundownItem[];
  columns: Column[];
  title: string;
  onError?: (error: any) => void;
  isBootstrapping?: boolean;
}

export const useSimpleAutoSave = ({
  rundownId,
  rundown,
  items,
  columns,
  title,
  onError,
  isBootstrapping = false
}: UseSimpleAutoSaveOptions) => {
  // State management
  const [isSaving, setIsSaving] = useState(false);
  const [isTypingActive, setIsTypingActive] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Refs for stable references
  const isTypingRef = useRef(false);
  const lastTypingTimeRef = useRef(0);
  const hasUnsavedRef = useRef(false);
  const isSavingRef = useRef(false);
  const isLoadedRef = useRef(false);
  const rundownIdRef = useRef(rundownId);
  const lastSavedSignatureRef = useRef<string>('');
  const isUndoActiveRef = useRef(false);
  const isFlushingSaveRef = useRef(false);
  
  // Timeout refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>();
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>();
  const postTypingSafetyTimeoutRef = useRef<NodeJS.Timeout | undefined>();
  
  // Stable function refs
  const performSaveRef = useRef<(isFlushSave?: boolean) => Promise<void>>();
  const onErrorRef = useRef(onError);
  
  // Storage hook
  const { updateRundown } = useRundownStorage();
  
  // Update refs when props change
  useEffect(() => {
    rundownIdRef.current = rundownId;
    onErrorRef.current = onError;
    hasUnsavedRef.current = hasUnsavedChanges;
    isSavingRef.current = isSaving;
  }, [rundownId, onError, hasUnsavedChanges, isSaving]);

  // Track content changes through signature comparison
  const currentSignature = createContentSignature({ 
    items, 
    columns, 
    title,
    rundownId: rundownId || ''
  });

  // Detect content changes
  useEffect(() => {
    if (!isLoadedRef.current) {
      isLoadedRef.current = true;
      lastSavedSignatureRef.current = currentSignature;
      console.log('✅ AutoSave: primed baseline signature:', currentSignature.slice(0, 50));
      return;
    }

    const hasContentChanged = currentSignature !== lastSavedSignatureRef.current;
    
    if (hasContentChanged && !isUndoActiveRef.current) {
      if (!hasUnsavedChanges) {
        console.log('📝 CONTENT CHANGE: Setting hasUnsavedChanges=true', {
          action: 'CONTENT_SIGNATURE_CHANGE',
          isContentChange: true,
          reason: 'Content signature changed - new edits detected'
        });
        
        setHasUnsavedChanges(true);
      }
    }
  }, [currentSignature, hasUnsavedChanges]);

  // Typing detection
  const markActiveTyping = useCallback((context: string = 'unknown') => {
    const now = Date.now();
    const wasTypingBefore = isTypingRef.current;
    
    keystrokeJournal.log('typing', context);
    
    console.log('🎯 TYPING DETECTION: markActiveTyping called', { now, userTypingBefore: wasTypingBefore });
    
    isTypingRef.current = true;
    lastTypingTimeRef.current = now;
    
    if (!isTypingActive) {
      setIsTypingActive(true);
    }
    
    console.log('🎯 TYPING DETECTION: Set typing flags', { 
      userTyping: true, 
      hasUnsavedChanges: hasUnsavedRef.current || true 
    });
    
    // Ensure we mark changes when typing
    if (!hasUnsavedRef.current) {
      setHasUnsavedChanges(true);
    }
    
    // Clear any existing typing timeout and create a new one
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      console.log('⌨️ Typing timeout - clearing typing state');
      isTypingRef.current = false;
      setIsTypingActive(false);
      typingTimeoutRef.current = undefined;
      
      // Schedule a safety save after typing stops if we have unsaved changes
      if (hasUnsavedRef.current) {
        console.log('💾 Typing timeout: scheduling delayed save for remaining changes');
        postTypingSafetyTimeoutRef.current = setTimeout(() => {
          if (hasUnsavedRef.current && !isSavingRef.current) {
            console.log('💾 Post-typing safety save triggered');
            performSaveRef.current?.(false);
          }
        }, 1000);
      }
    }, 2000); // 2 second typing timeout
  }, [isTypingActive]);

  // Save operation
  const performSave = useCallback(async (isFlushSave: boolean = false) => {
    const context = isFlushSave ? 'flush-save' : 'auto-save';
    
    // Skip saves for demo rundown
    if (rundownIdRef.current === DEMO_RUNDOWN_ID) {
      console.log('🛑 AutoSave: blocked for demo rundown');
      return;
    }
    
    // Skip if already saving or in undo state
    if (isSavingRef.current || isUndoActiveRef.current) {
      console.log('🛑 AutoSave: blocked - already saving or undo active');
      return;
    }
    
    // Skip if no unsaved changes
    if (!hasUnsavedRef.current) {
      console.log('🛑 AutoSave: blocked - no unsaved changes');
      return;
    }
    
    // For non-flush saves, respect tab visibility unless we recently typed
    if (!isFlushSave && document.hidden) {
      const timeSinceTyping = Date.now() - lastTypingTimeRef.current;
      const allowDespiteHidden = timeSinceTyping < 5000; // Allow if typed within 5 seconds
      
      if (!allowDespiteHidden) {
        console.log('🛑 AutoSave: blocked - tab hidden and no recent typing');
        return;
      } else {
        console.log('✅ AutoSave: allowing save despite hidden tab due to recent keystrokes');
      }
    }
    
    // Additional check for flush saves on hidden tabs
    if (isFlushSave && document.hidden) {
      const timeSinceTyping = Date.now() - lastTypingTimeRef.current;
      const recentKeystroke = timeSinceTyping < 10000; // 10 seconds for flush saves
      
      if (recentKeystroke) {
        console.log('✅ AutoSave: tab hidden but save was initiated while active - proceeding');
      } else {
        console.log('🛑 AutoSave: blocked flush save - tab hidden too long without activity');
        return;
      }
    }
    
    try {
      setIsSaving(true);
      isFlushingSaveRef.current = isFlushSave;
      
      console.log('💾 AutoSave: Proceeding with save - hasUnsavedChanges=true, isFirstSave=false');
      
      // Use simple full save for now
      console.log('💾 AutoSave: using simple save for rundown', { 
        rundownId: rundownIdRef.current, 
        itemCount: items.length, 
        isFlushSave 
      });
      
      await updateRundown(
        rundownIdRef.current,
        title,
        items,
        false, // silent
        false, // archived
        columns
      );
      
      console.log('✅ AutoSave: save completed');
      lastSavedSignatureRef.current = currentSignature;
      setHasUnsavedChanges(false);
      console.log('✅ MARKED AS SAVED: hasUnsavedChanges=false', {
        previousState: true,
        reason: 'Save operation completed'
      });
      
    } catch (error) {
      console.error('❌ AutoSave failed:', error);
      if (onErrorRef.current) {
        onErrorRef.current(error);
      }
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
      isFlushingSaveRef.current = false;
    }
  }, [items, columns, title, currentSignature, updateRundown]);

  // Store the perform save function in ref for cleanup access
  useEffect(() => {
    performSaveRef.current = performSave;
  }, [performSave]);

  // Auto-save scheduling
  const scheduleSave = useCallback((debounceTime: number = 800, reason: string = 'content-change') => {
    if (rundownIdRef.current === DEMO_RUNDOWN_ID) return;
    
    console.log('⏳ AutoSave: scheduling save', { 
      isStructuralChange: false, 
      debounceTime, 
      hasUnsavedChanges: hasUnsavedRef.current,
      reason
    });
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      if (hasUnsavedRef.current && !isSavingRef.current) {
        console.log('💾 Save timeout reached - clearing typing state and saving');
        performSaveRef.current?.(false);
      }
      saveTimeoutRef.current = undefined;
    }, debounceTime);
  }, []);

  // Schedule saves when content changes
  useEffect(() => {
    if (hasUnsavedChanges && !isUndoActiveRef.current) {
      scheduleSave(800, 'content-signature-change');
    }
  }, [hasUnsavedChanges, scheduleSave]);

  // Handle tab visibility changes with keystroke preservation
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && hasUnsavedRef.current) {
        const timeSinceTyping = Date.now() - lastTypingTimeRef.current;
        const hasRecentKeystrokes = timeSinceTyping < 3000; // 3 seconds
        
        if (hasRecentKeystrokes) {
          console.log('🧯 AutoSave: flushing on tab blur/hidden to preserve keystrokes');
          performSaveRef.current?.(true);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Utility functions for external coordination
  const setUndoActive = useCallback((active: boolean) => {
    isUndoActiveRef.current = active;
    if (active) {
      console.log('↩️ Undo operation started - blocking autosave');
    } else {
      console.log('↩️ Undo operation completed - resuming autosave');
    }
  }, []);

  const setTrackOwnUpdate = useCallback((track: boolean) => {
    // This is a no-op in the simplified system since we use signatures
    // instead of tracking individual updates
    console.log('📝 Track own update:', track, '(signature-based system)');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (postTypingSafetyTimeoutRef.current) {
        clearTimeout(postTypingSafetyTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = undefined;
      }
      if (isLoadedRef.current && hasUnsavedRef.current && rundownIdRef.current !== DEMO_RUNDOWN_ID) {
        console.log('🧯 AutoSave: flushing pending changes on unmount');
        try {
          // Fire-and-forget flush save that bypasses tab-hidden checks
          performSaveRef.current?.(true);
        } catch (e) {
          console.error('❌ AutoSave: flush-on-unmount failed', e);
        }
      }
    };
  }, []);

  return {
    isSaving: !isBootstrapping && isSaving,
    setUndoActive,
    setTrackOwnUpdate,
    markActiveTyping,
    isTypingActive,
    triggerImmediateSave: () => performSave(true),
    getJournalStats: keystrokeJournal.getJournalStats,
    setVerboseLogging: keystrokeJournal.setVerboseLogging,
    clearJournal: keystrokeJournal.clearJournal
  };
};