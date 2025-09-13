import { useEffect, useRef, useCallback, useState } from 'react';
import { RundownState } from './useRundownState';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';
import { useToast } from '@/hooks/use-toast';

interface ReliableAutoSaveOptions {
  rundownId: string | null;
  state: RundownState;
  onSaved: (meta?: { updatedAt?: string; docVersion?: number }) => void;
  isInitiallyLoaded: boolean;
  isSharedView?: boolean;
  lastCellBroadcastTimeRef?: React.MutableRefObject<number>;
}

/**
 * Simplified, bulletproof autosave system that:
 * 1. Always saves when content changes
 * 2. Minimal blocking conditions
 * 3. Reliable conflict handling
 * 4. No complex coordination systems
 */
export const useReliableAutoSave = ({
  rundownId,
  state,
  onSaved,
  isInitiallyLoaded,
  isSharedView = false,
  lastCellBroadcastTimeRef
}: ReliableAutoSaveOptions) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  // Simple refs for core functionality
  const lastSavedSignatureRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isTypingRef = useRef(false);
  const lastTypingTimeRef = useRef(0);
  
  // Create content signature for change detection
  const createSignature = useCallback((targetState: RundownState) => {
    const cleanItems = targetState.items.map(item => ({
      id: item.id,
      type: item.type,
      name: item.name || '',
      talent: item.talent || '',
      script: item.script || '',
      gfx: item.gfx || '',
      video: item.video || '',
      images: item.images || '',
      notes: item.notes || '',
      duration: item.duration || '',
      color: item.color || '',
      isFloating: item.isFloating || false,
      customFields: item.customFields || {}
    }));

    return JSON.stringify({
      items: cleanItems,
      title: targetState.title || '',
      startTime: targetState.startTime || '',
      timezone: targetState.timezone || '',
      showDate: targetState.showDate?.toISOString() || null,
      externalNotes: targetState.externalNotes || ''
    });
  }, []);

  // Simple save function with minimal blocking
  const performSave = useCallback(async () => {
    if (!rundownId || rundownId === DEMO_RUNDOWN_ID || isSharedView) {
      return;
    }

    if (!isInitiallyLoaded) {
      console.log('🔄 ReliableAutoSave: Waiting for initial load');
      return;
    }

    const currentSignature = createSignature(state);
    
    // Skip if no actual changes
    if (currentSignature === lastSavedSignatureRef.current) {
      console.log('✅ ReliableAutoSave: No changes detected');
      return;
    }

    // Skip if currently typing (wait for typing to finish)
    if (isTypingRef.current && Date.now() - lastTypingTimeRef.current < 1500) {
      console.log('⌨️ ReliableAutoSave: Still typing, deferring save');
      // Reschedule save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(performSave, 1500);
      return;
    }

    // Skip if recent cell broadcast to prevent conflicts
    if (lastCellBroadcastTimeRef?.current && Date.now() - lastCellBroadcastTimeRef.current < 1000) {
      console.log('🛑 ReliableAutoSave: Recent cell broadcast activity, deferring save');
      // Reschedule save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(performSave, 1000);
      return;
    }

    setIsSaving(true);
    console.log('💾 ReliableAutoSave: Starting save...');

    try {
      const saveData = {
        items: state.items,
        title: state.title,
        start_time: state.startTime,
        timezone: state.timezone,
        show_date: state.showDate?.toISOString().split('T')[0] || null,
        external_notes: state.externalNotes,
        doc_version: (state.docVersion || 0) + 1 // Increment for optimistic concurrency control
      };

      const { data, error } = await supabase
        .from('rundowns')
        .update(saveData)
        .eq('id', rundownId)
        .select('updated_at, doc_version')
        .single();

      if (error) {
        throw error;
      }

      // Update signature only after successful save
      lastSavedSignatureRef.current = currentSignature;
      
      // Notify parent of successful save
      onSaved({
        updatedAt: data.updated_at,
        docVersion: data.doc_version
      });

      console.log('✅ ReliableAutoSave: Save completed successfully');

    } catch (error: any) {
      console.error('❌ ReliableAutoSave: Save failed:', error);
      
      // Only show toast for non-conflict errors
      if (!error.message?.includes('doc_version')) {
        toast({
          title: "Save Error",
          description: "Failed to save changes. Will retry automatically.",
          variant: "destructive"
        });
      }

      // Retry after a short delay
      setTimeout(() => {
        performSave();
      }, 2000);
    } finally {
      setIsSaving(false);
    }
  }, [rundownId, state, isInitiallyLoaded, isSharedView, createSignature, onSaved, toast]);

  // Prime signature on initial load
  useEffect(() => {
    if (isInitiallyLoaded && lastSavedSignatureRef.current === '') {
      lastSavedSignatureRef.current = createSignature(state);
      console.log('✅ ReliableAutoSave: Baseline signature established');
    }
  }, [isInitiallyLoaded, state, createSignature]);

  // Main effect: trigger save when content changes
  useEffect(() => {
    if (!isInitiallyLoaded || !state.hasUnsavedChanges) {
      return;
    }

    const currentSignature = createSignature(state);
    
    // Only save if content actually changed
    if (currentSignature === lastSavedSignatureRef.current) {
      return;
    }

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule save with appropriate delay
    const delay = isTypingRef.current ? 2000 : 500; // Longer delay while typing
    
    console.log(`⏰ ReliableAutoSave: Scheduling save in ${delay}ms`);
    saveTimeoutRef.current = setTimeout(performSave, delay);

  }, [state.hasUnsavedChanges, state.lastChanged, isInitiallyLoaded, createSignature, performSave]);

  // Track typing activity
  const markTyping = useCallback(() => {
    isTypingRef.current = true;
    lastTypingTimeRef.current = Date.now();
    
    // Clear typing flag after idle period
    setTimeout(() => {
      if (Date.now() - lastTypingTimeRef.current >= 1500) {
        isTypingRef.current = false;
        console.log('⌨️ ReliableAutoSave: Typing stopped');
      }
    }, 1500);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    markTyping
  };
};