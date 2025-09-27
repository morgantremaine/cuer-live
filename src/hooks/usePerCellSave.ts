import { useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { usePerCellSaveFeatureFlag } from './usePerCellSaveFeatureFlag';

interface PerCellSaveResult {
  success: boolean;
  version?: number;
  error?: string;
}

export const usePerCellSave = (rundownId: string) => {
  const { user } = useAuth();
  const { isPerCellSaveEnabled } = usePerCellSaveFeatureFlag();
  const savingFieldsRef = useRef<Set<string>>(new Set());

  const saveField = useCallback(async (
    itemId: string,
    fieldName: string,
    fieldValue: any
  ): Promise<PerCellSaveResult> => {
    if (!isPerCellSaveEnabled) {
      logger.debug('Per-cell save not enabled for user, skipping', { rundownId, itemId, fieldName });
      return { success: false, error: 'Per-cell save not enabled' };
    }

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const fieldKey = `${itemId}.${fieldName}`;
    
    // Prevent concurrent saves of the same field
    if (savingFieldsRef.current.has(fieldKey)) {
      logger.debug('Field save already in progress, skipping', { fieldKey });
      return { success: false, error: 'Save already in progress' };
    }

    try {
      savingFieldsRef.current.add(fieldKey);
      
      logger.info('Saving field with per-cell save', {
        rundownId,
        itemId,
        fieldName,
        fieldKey,
        userId: user.id
      });

      // Call the atomic field update function
      const { data, error } = await supabase.rpc('update_rundown_field_atomic', {
        rundown_uuid: rundownId,
        item_id: itemId,
        field_name: fieldName,
        field_value: fieldValue,
        user_uuid: user.id
      });

      if (error) {
        logger.error('Per-cell save failed', { error, fieldKey });
        return { success: false, error: error.message };
      }

      logger.info('Per-cell save successful', {
        fieldKey,
        version: data?.version,
        result: data
      });

      return {
        success: true,
        version: data?.version
      };
    } catch (error) {
      logger.error('Per-cell save exception', { error, fieldKey });
      return { success: false, error: 'Unexpected error during save' };
    } finally {
      savingFieldsRef.current.delete(fieldKey);
    }
  }, [isPerCellSaveEnabled, user, rundownId]);

  const enablePerCellSaveForRundown = useCallback(async () => {
    if (!isPerCellSaveEnabled || !user) {
      return false;
    }

    try {
      logger.info('Enabling per-cell save for rundown', { rundownId, userId: user.id });
      
      const { error } = await supabase
        .from('rundowns')
        .update({ per_cell_save_enabled: true })
        .eq('id', rundownId);

      if (error) {
        logger.error('Failed to enable per-cell save for rundown', { error, rundownId });
        return false;
      }

      logger.info('Per-cell save enabled for rundown', { rundownId });
      return true;
    } catch (error) {
      logger.error('Exception enabling per-cell save for rundown', { error, rundownId });
      return false;
    }
  }, [isPerCellSaveEnabled, user, rundownId]);

  return {
    saveField,
    enablePerCellSaveForRundown,
    isPerCellSaveEnabled,
    isSaving: savingFieldsRef.current.size > 0
  };
};