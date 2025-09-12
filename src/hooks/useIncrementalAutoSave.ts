import { useState, useEffect, useRef, useCallback } from 'react';
import { RundownState } from './useRundownState';
import { debugLogger } from '@/utils/debugLogger';

interface UseIncrementalAutoSaveProps {
  state: RundownState;
  rundownId: string | null;
  isInitiallyLoaded: boolean;
  shouldBlockAutoSave: () => boolean;
  onSavedRef: React.MutableRefObject<(() => void) | undefined>;
  saveTimeoutRef: React.MutableRefObject<NodeJS.Timeout | undefined>;
  setIsSaving: (saving: boolean) => void;
  saveInProgressRef: React.MutableRefObject<boolean>;
  currentSaveSignatureRef: React.MutableRefObject<string>;
  lastEditAtRef: React.MutableRefObject<number>;
  undoActiveRef: React.MutableRefObject<boolean>;
  pendingFollowUpSaveRef: React.MutableRefObject<boolean>;
  saveService: any;
}

export const useIncrementalAutoSave = ({
  state,
  rundownId,
  isInitiallyLoaded,
  shouldBlockAutoSave,
  onSavedRef,
  saveTimeoutRef,
  setIsSaving,
  saveInProgressRef,
  currentSaveSignatureRef,
  lastEditAtRef,
  undoActiveRef,
  pendingFollowUpSaveRef,
  saveService
}: UseIncrementalAutoSaveProps) => {
  
  // CORE FIX: Cell-level change tracking instead of full rundown processing
  const cellChangesRef = useRef<Map<string, { field: string; value: string; timestamp: number }>>(new Map());
  const lastFullSignatureRef = useRef<string>('');
  const hasStructuralChangesRef = useRef<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Track individual cell changes to avoid full rundown processing
  const trackCellChange = useCallback((itemId: string, field: string, value: string) => {
    const changeKey = `${itemId}:${field}`;
    cellChangesRef.current.set(changeKey, { 
      field, 
      value, 
      timestamp: Date.now() 
    });
    
    setHasUnsavedChanges(true);
    console.log('📝 Cell change tracked:', changeKey, cellChangesRef.current.size, 'total changes');
    
    // Clear old changes periodically to prevent memory leaks
    const now = Date.now();
    for (const [key, change] of cellChangesRef.current.entries()) {
      if (now - change.timestamp > 30000) { // Clear changes older than 30 seconds
        cellChangesRef.current.delete(key);
      }
    }
  }, []);

  // CORE FIX: Lightweight change detection for typing - only generate full signatures when saving
  const hasContentChanges = useCallback(() => {
    // Check if there are any pending cell changes
    if (cellChangesRef.current.size > 0) {
      return true;
    }
    
    // Check for structural changes (add/delete items, etc.)
    if (hasStructuralChangesRef.current) {
      return true;
    }

    // Check if unsaved changes flag is set
    if (hasUnsavedChanges) {
      return true;
    }
    
    return false;
  }, [hasUnsavedChanges]);

  // Only generate full signature when actually saving to database
  const createFullContentSignature = useCallback((targetState: RundownState) => {
    const itemCount = targetState.items?.length || 0;
    
    console.log('📝 Generating full content signature for save:', itemCount, 'items');
    
    // Build comprehensive signature for database save
    const signature = JSON.stringify({
      items: targetState.items || [],
      title: targetState.title || '',
      startTime: targetState.startTime || '',
      timezone: targetState.timezone || '',
      externalNotes: targetState.externalNotes || {},
      itemCount,
      timestamp: Date.now()
    });
    
    // Cache this as the new baseline
    lastFullSignatureRef.current = signature;
    return signature;
  }, []);

  // CORE FIX: Track structural changes (not cell edits)
  const markStructuralChange = useCallback(() => {
    hasStructuralChangesRef.current = true;
    setHasUnsavedChanges(true);
    lastEditAtRef.current = Date.now();
    console.log('🏗️ Structural change marked');
  }, []);

  // Lightweight change marking for cell edits
  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true);
    lastEditAtRef.current = Date.now();
  }, []);

  // Perform save with incremental optimization
  const performSave = useCallback(async (isFlushSave = false) => {
    if (!isInitiallyLoaded || !rundownId) {
      console.log('🛑 AutoSave: blocked - not initialized');
      return;
    }

    // CRITICAL: Use coordinated blocking to prevent cross-saving conflicts
    if (shouldBlockAutoSave()) {
      console.log('🛑 AutoSave: blocked by coordination system');
      return;
    }

    // CORE FIX: Only check if we have changes, don't generate full signature during typing
    if (!hasContentChanges()) {
      console.log('ℹ️ AutoSave: no content changes detected');
      setHasUnsavedChanges(false);
      onSavedRef.current?.();
      return;
    }

    // Prevent overlapping saves
    if (saveInProgressRef.current || undoActiveRef.current) {
      console.log('🛑 AutoSave: blocked - already saving or undo active');
      
      if (saveInProgressRef.current) {
        pendingFollowUpSaveRef.current = true;
        console.log('🕒 AutoSave: follow-up save scheduled after in-progress save');
      }
      return;
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
      
      // Use existing save service
      await saveService.performSave(state);
      
      // Clear tracked changes after successful save
      cellChangesRef.current.clear();
      hasStructuralChangesRef.current = false;
      lastFullSignatureRef.current = finalSignature;
      
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      onSavedRef.current?.();
      console.log('✅ AutoSave: incremental save completed successfully');
      
      // Show success toast
      console.log('💾 Save completed - changes saved successfully');
      
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
  }, [state, rundownId, isInitiallyLoaded, shouldBlockAutoSave, hasContentChanges, createFullContentSignature, saveService]);

  // Auto-save effect with smart debouncing
  useEffect(() => {
    if (!isInitiallyLoaded) {
      return;
    }

    // Check for changes 
    const hasChanges = hasContentChanges();
    if (!hasChanges) {
      return;
    }

    console.log('🧪 TRACE IncrementalAutoSave: changes detected, scheduling save');
    
    // Only schedule if no timeout is currently active
    if (!saveTimeoutRef.current) {
      const hasStructural = hasStructuralChangesRef.current;
      const debounceTime = hasStructural ? 500 : 1500;
      
      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = undefined;
        performSave();
      }, debounceTime);
    }
  }, [hasUnsavedChanges, isInitiallyLoaded, performSave]);

  const flush = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }
    performSave(true);
  }, [performSave]);

  return {
    hasUnsavedChanges,
    lastSaved,
    markAsChanged,
    markStructuralChange,
    trackCellChange,
    flush,
    performSave
  };
};