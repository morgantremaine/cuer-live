import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface DirectSaveOptions {
  rundownId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Simple, reliable direct database save hook
 * No complex queuing - just save with retry logic
 */
export const useDirectSave = ({ rundownId, onSuccess, onError }: DirectSaveOptions) => {
  const saveInProgressRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  /**
   * Save a single cell edit directly to database
   * Uses edge function for consistency with operation system
   */
  const saveCellEdit = useCallback(async (
    itemId: string,
    field: string,
    newValue: any,
    userId: string,
    clientId: string
  ) => {
    if (saveInProgressRef.current) {
      logger.debug('⏸️ DIRECT SAVE: Save already in progress, queueing...');
      return;
    }

    saveInProgressRef.current = true;
    
    try {
      const authToken = (await supabase.auth.getSession()).data.session?.access_token;
      if (!authToken) {
        throw new Error('No auth token available');
      }

      logger.debug('💾 DIRECT SAVE: Saving cell edit', { itemId, field, value: String(newValue).substring(0, 50) });

      const SUPABASE_URL = 'https://khdiwrkgahsbjszlwnob.supabase.co';
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/apply-operation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            rundownId,
            operations: [{
              id: `${clientId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              rundownId,
              operationType: 'CELL_EDIT',
              operationData: {
                itemId,
                field,
                newValue,
                oldValue: undefined
              },
              userId,
              clientId,
              timestamp: Date.now()
            }]
          })
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Save failed');
      }

      logger.debug('✅ DIRECT SAVE: Cell edit saved successfully');
      retryCountRef.current = 0;
      onSuccess?.();

    } catch (error) {
      logger.error('❌ DIRECT SAVE: Failed', error);
      
      // Retry logic with exponential backoff
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        const delay = Math.pow(2, retryCountRef.current) * 1000; // 2s, 4s, 8s
        logger.debug(`🔄 DIRECT SAVE: Retrying in ${delay}ms (attempt ${retryCountRef.current}/${MAX_RETRIES})`);
        
        setTimeout(() => {
          saveInProgressRef.current = false;
          saveCellEdit(itemId, field, newValue, userId, clientId);
        }, delay);
      } else {
        retryCountRef.current = 0;
        onError?.(error instanceof Error ? error.message : 'Save failed');
      }
    } finally {
      if (retryCountRef.current === 0) {
        saveInProgressRef.current = false;
      }
    }
  }, [rundownId, onSuccess, onError]);

  /**
   * Save multiple fields at once (for immediate fields like color, type, status)
   */
  const saveMultipleFields = useCallback(async (
    updates: Array<{ itemId: string; field: string; newValue: any }>,
    userId: string,
    clientId: string
  ) => {
    if (saveInProgressRef.current) {
      logger.debug('⏸️ DIRECT SAVE: Save already in progress');
      return;
    }

    saveInProgressRef.current = true;
    
    try {
      const authToken = (await supabase.auth.getSession()).data.session?.access_token;
      if (!authToken) {
        throw new Error('No auth token available');
      }

      logger.debug('💾 DIRECT SAVE: Saving multiple fields', { count: updates.length });

      const SUPABASE_URL = 'https://khdiwrkgahsbjszlwnob.supabase.co';
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/apply-operation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            rundownId,
            operations: updates.map(update => ({
              id: `${clientId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              rundownId,
              operationType: 'CELL_EDIT',
              operationData: {
                itemId: update.itemId,
                field: update.field,
                newValue: update.newValue,
                oldValue: undefined
              },
              userId,
              clientId,
              timestamp: Date.now()
            }))
          })
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Save failed');
      }

      logger.debug('✅ DIRECT SAVE: Multiple fields saved successfully');
      onSuccess?.();

    } catch (error) {
      logger.error('❌ DIRECT SAVE: Multiple fields failed', error);
      onError?.(error instanceof Error ? error.message : 'Save failed');
    } finally {
      saveInProgressRef.current = false;
    }
  }, [rundownId, onSuccess, onError]);

  return {
    saveCellEdit,
    saveMultipleFields,
    isSaving: saveInProgressRef.current
  };
};
