import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { fieldFocusRegistry } from '@/utils/fieldFocusRegistry';

/**
 * Hook to track field focus for concurrent editing protection
 * Usage: const { onFieldFocus, onFieldBlur } = useFieldFocus(rundownId, itemId, fieldName)
 */
export const useFieldFocus = (
  rundownId: string | null, 
  itemId: string | null = null, 
  fieldName: string
) => {
  const { user } = useAuth();
  
  const onFieldFocus = useCallback(() => {
    if (rundownId && fieldName) {
      fieldFocusRegistry.setFieldFocus(rundownId, itemId, fieldName, user?.id);
    }
  }, [rundownId, itemId, fieldName, user?.id]);
  
  const onFieldBlur = useCallback(() => {
    if (rundownId && fieldName) {
      fieldFocusRegistry.clearFieldFocus(rundownId, itemId, fieldName);
    }
  }, [rundownId, itemId, fieldName]);
  
  return {
    onFieldFocus,
    onFieldBlur
  };
};