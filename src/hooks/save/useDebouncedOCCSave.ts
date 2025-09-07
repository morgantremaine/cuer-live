import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getTabId } from '@/utils/tabUtils';
import { SYNC_CONFIG } from '@/utils/realtime/types';

interface SaveData {
  id: string;
  items?: any[];
  title?: string;
  start_time?: string;
  timezone?: string;
  external_notes?: any;
  show_date?: string;
  showcaller_state?: any;
}

interface UseDebouncedOCCSaveOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export const useDebouncedOCCSave = (options: UseDebouncedOCCSaveOptions = {}) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingDataRef = useRef<SaveData | null>(null);
  const isSavingRef = useRef(false);

  const executeSave = useCallback(async (data: SaveData) => {
    if (isSavingRef.current) {
      console.log('🔄 Save already in progress, queuing...');
      pendingDataRef.current = data;
      return;
    }

    isSavingRef.current = true;
    
    try {
      console.log('💾 Executing optimistic save:', data.id);
      
      // Simple optimistic update with tab_id for echo prevention
      const updateData = {
        ...data,
        tab_id: getTabId(),
        updated_at: new Date().toISOString(),
        last_updated_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { error } = await supabase
        .from('rundowns')
        .update(updateData)
        .eq('id', data.id);

      if (error) {
        console.error('❌ Save failed:', error);
        options.onError?.(error);
      } else {
        console.log('✅ Save completed successfully');
        options.onSuccess?.(updateData);
      }
    } catch (error) {
      console.error('❌ Save error:', error);
      options.onError?.(error);
    } finally {
      isSavingRef.current = false;
      
      // Process any pending save
      if (pendingDataRef.current) {
        const pending = pendingDataRef.current;
        pendingDataRef.current = null;
        setTimeout(() => executeSave(pending), 100);
      }
    }
  }, [options]);

  const debouncedSave = useCallback((data: SaveData) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Store the latest data
    pendingDataRef.current = data;

    // Schedule save
    saveTimeoutRef.current = setTimeout(() => {
      if (pendingDataRef.current) {
        executeSave(pendingDataRef.current);
        pendingDataRef.current = null;
      }
    }, SYNC_CONFIG.AUTOSAVE_DELAY);

    console.log('⏳ Scheduled save in', SYNC_CONFIG.AUTOSAVE_DELAY, 'ms');
  }, [executeSave]);

  const immediateySave = useCallback((data: SaveData) => {
    // Cancel any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }
    
    executeSave(data);
  }, [executeSave]);

  return {
    debouncedSave,
    immediateySave,
    isSaving: isSavingRef.current
  };
};