/**
 * Clean Auto-Save System
 * 
 * A simplified, reliable auto-save system that eliminates the complexity
 * and race conditions of the previous auto-save implementations.
 * 
 * Features:
 * - Simple change detection based on content signatures
 * - Debounced saves with typing detection
 * - Minimal blocking logic
 * - Performance optimization for large rundowns
 * - Clean error handling and recovery
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getTabId } from '@/utils/tabUtils';

interface UseCleanAutoSaveProps {
  rundownId: string | null;
  state: any;
  enabled: boolean;
  onSaved?: (meta?: { updatedAt?: string; docVersion?: number }) => void;
}

export const useCleanAutoSave = ({
  rundownId,
  state,
  enabled,
  onSaved
}: UseCleanAutoSaveProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Refs for coordination
  const lastSavedSignatureRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTypingTimeRef = useRef<number>(0);
  const saveInProgressRef = useRef<boolean>(false);
  const retryCountRef = useRef<number>(0);
  
  // Constants
  const TYPING_IDLE_MS = 2000; // 2 seconds after typing stops
  const MAX_RETRY_ATTEMPTS = 3;
  const RETRY_DELAY_MS = 5000; // 5 seconds
  
  // Create content signature for change detection
  const createContentSignature = useCallback(() => {
    if (!state) return '';
    
    // For large rundowns, use lightweight signature
    const itemCount = state.items?.length || 0;
    if (itemCount > 200) {
      return JSON.stringify({
        itemCount,
        itemIds: state.items?.map((item: any) => item.id) || [],
        title: state.title || '',
        startTime: state.startTime || '',
        timezone: state.timezone || '',
        checksum: state.items?.reduce((acc: number, item: any) => 
          acc + (item.name?.length || 0) + (item.script?.length || 0), 0) || 0
      });
    }
    
    // Standard signature for smaller rundowns
    return JSON.stringify({
      items: state.items?.map((item: any) => ({
        id: item.id,
        name: item.name || '',
        talent: item.talent || '',
        script: item.script || '',
        gfx: item.gfx || '',
        video: item.video || '',
        duration: item.duration || '',
        color: item.color || '',
        customFields: item.customFields || {}
      })) || [],
      title: state.title || '',
      startTime: state.startTime || '',
      timezone: state.timezone || '',
      showDate: state.showDate?.toISOString() || null,
      externalNotes: state.externalNotes || {}
    });
  }, [state]);
  
  // Perform the actual save operation
  const performSave = useCallback(async (): Promise<boolean> => {
    if (!rundownId || !enabled || saveInProgressRef.current) {
      return false;
    }
    
    const currentSignature = createContentSignature();
    if (currentSignature === lastSavedSignatureRef.current) {
      return true; // No changes to save
    }
    
    try {
      saveInProgressRef.current = true;
      setIsSaving(true);
      setLastError(null);
      
      const updateData: any = {
        updated_at: new Date().toISOString(),
        last_updated_by: state.userId,
        tab_id: getTabId()
      };
      
      // Only include fields that exist in state
      if (state.items) updateData.items = state.items;
      if (state.title !== undefined) updateData.title = state.title;
      if (state.startTime) updateData.start_time = state.startTime;
      if (state.timezone) updateData.timezone = state.timezone;
      if (state.showDate) {
        updateData.show_date = state.showDate.toISOString().split('T')[0];
      }
      if (state.externalNotes) updateData.external_notes = state.externalNotes;
      
      const { data, error } = await supabase
        .from('rundowns')
        .update(updateData)
        .eq('id', rundownId)
        .select('updated_at, doc_version')
        .single();
      
      if (error) {
        throw error;
      }
      
      // Success - update saved signature and reset retry count
      lastSavedSignatureRef.current = currentSignature;
      retryCountRef.current = 0;
      
      if (onSaved && data) {
        onSaved({
          updatedAt: data.updated_at,
          docVersion: data.doc_version
        });
      }
      
      console.log('💾 Clean AutoSave: Successfully saved rundown');
      return true;
      
    } catch (error: any) {
      console.error('💾 Clean AutoSave: Save failed:', error);
      setLastError(error.message || 'Save failed');
      
      // Show user-friendly error message
      toast({
        title: "Save Error",
        description: "Failed to save changes. Retrying...",
        variant: "destructive"
      });
      
      return false;
      
    } finally {
      saveInProgressRef.current = false;
      setIsSaving(false);
    }
  }, [rundownId, enabled, createContentSignature, state, onSaved, toast]);
  
  // Schedule a save with debouncing
  const scheduleSave = useCallback(() => {
    if (!enabled || !rundownId) return;
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Check if we're still in typing window
    const timeSinceTyping = Date.now() - lastTypingTimeRef.current;
    const delayMs = timeSinceTyping < TYPING_IDLE_MS ? TYPING_IDLE_MS - timeSinceTyping : 0;
    
    saveTimeoutRef.current = setTimeout(async () => {
      const success = await performSave();
      
      // Retry logic for failed saves
      if (!success && retryCountRef.current < MAX_RETRY_ATTEMPTS) {
        retryCountRef.current++;
        console.log(`💾 Clean AutoSave: Retry attempt ${retryCountRef.current}/${MAX_RETRY_ATTEMPTS}`);
        
        setTimeout(() => {
          scheduleSave();
        }, RETRY_DELAY_MS);
      }
    }, Math.max(delayMs, 100)); // Minimum 100ms delay
    
  }, [enabled, rundownId, performSave]);
  
  // Mark active typing (called by components when user is typing)
  const markActiveTyping = useCallback(() => {
    lastTypingTimeRef.current = Date.now();
    console.log('⌨️ Clean AutoSave: Typing activity detected');
  }, []);
  
  // Force immediate save (for user-initiated saves)
  const forceSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    return await performSave();
  }, [performSave]);
  
  // Watch for state changes and schedule saves
  useEffect(() => {
    if (!enabled || !rundownId) return;
    
    const currentSignature = createContentSignature();
    if (currentSignature && currentSignature !== lastSavedSignatureRef.current) {
      console.log('📝 Clean AutoSave: State change detected, scheduling save');
      scheduleSave();
    }
  }, [state, enabled, rundownId, createContentSignature, scheduleSave]);
  
  // Initialize baseline signature when rundown loads
  useEffect(() => {
    if (enabled && rundownId && state && !lastSavedSignatureRef.current) {
      const signature = createContentSignature();
      lastSavedSignatureRef.current = signature;
      console.log('🎯 Clean AutoSave: Initialized baseline signature');
    }
  }, [enabled, rundownId, state, createContentSignature]);
  
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
    lastError,
    markActiveTyping,
    forceSave,
    isHealthy: retryCountRef.current === 0 && !lastError
  };
};