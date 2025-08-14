import { useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface FieldUpdate {
  itemId: string;
  fieldName: string;
  value: string;
  timestamp: string;
  userId: string;
}

interface UseFieldLevelSaveProps {
  rundownId: string | null;
  onConflictDetected?: (conflict: ConflictInfo) => void;
}

interface ConflictInfo {
  itemId: string;
  fieldName: string;
  localValue: string;
  remoteValue: string;
  remoteTimestamp: string;
  remoteUserId: string;
}

export const useFieldLevelSave = ({ rundownId, onConflictDetected }: UseFieldLevelSaveProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fieldTimestampsRef = useRef<Map<string, string>>(new Map());
  const pendingSavesRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Get field key for tracking
  const getFieldKey = useCallback((itemId: string, fieldName: string) => {
    return `${itemId}-${fieldName}`;
  }, []);

  // Update field timestamp when we receive external updates
  const updateFieldTimestamp = useCallback((itemId: string, fieldName: string, timestamp: string) => {
    const fieldKey = getFieldKey(itemId, fieldName);
    fieldTimestampsRef.current.set(fieldKey, timestamp);
  }, [getFieldKey]);

  // Detect conflicts before saving
  const detectConflict = useCallback(async (itemId: string, fieldName: string, localValue: string): Promise<ConflictInfo | null> => {
    if (!rundownId) return null;

    try {
      // Get current field value and timestamp from database
      const { data, error } = await supabase
        .from('rundowns')
        .select('items, updated_at, user_id')
        .eq('id', rundownId)
        .single();

      if (error || !data) return null;

      const items = data.items || [];
      const item = items.find((i: any) => i.id === itemId);
      
      if (!item) return null;

      // Get current database value for this field
      let dbValue = '';
      if (fieldName.startsWith('customFields.')) {
        const customFieldKey = fieldName.replace('customFields.', '');
        dbValue = item.customFields?.[customFieldKey] || '';
      } else {
        dbValue = item[fieldName] || '';
      }

      // Check if database value differs from our local value
      if (dbValue !== localValue) {
        const fieldKey = getFieldKey(itemId, fieldName);
        const lastKnownTimestamp = fieldTimestampsRef.current.get(fieldKey);
        
        // If we have a more recent timestamp in DB, it's a conflict
        if (!lastKnownTimestamp || data.updated_at > lastKnownTimestamp) {
          return {
            itemId,
            fieldName,
            localValue,
            remoteValue: dbValue,
            remoteTimestamp: data.updated_at,
            remoteUserId: data.user_id
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error detecting conflict:', error);
      return null;
    }
  }, [rundownId, getFieldKey]);

  // Save a single field with conflict detection
  const saveField = useCallback(async (itemId: string, fieldName: string, value: string): Promise<boolean> => {
    if (!rundownId || !user) return false;

    try {
      // Check for conflicts first
      const conflict = await detectConflict(itemId, fieldName, value);
      if (conflict && onConflictDetected) {
        onConflictDetected(conflict);
        return false;
      }

      // Get current rundown data
      const { data: currentData, error: fetchError } = await supabase
        .from('rundowns')
        .select('*')
        .eq('id', rundownId)
        .single();

      if (fetchError || !currentData) {
        throw new Error('Failed to fetch current rundown data');
      }

      // Update the specific field in the items array
      const updatedItems = [...(currentData.items || [])];
      const itemIndex = updatedItems.findIndex((item: any) => item.id === itemId);
      
      if (itemIndex === -1) {
        throw new Error('Item not found');
      }

      // Update the specific field
      const updatedItem = { ...updatedItems[itemIndex] };
      if (fieldName.startsWith('customFields.')) {
        const customFieldKey = fieldName.replace('customFields.', '');
        updatedItem.customFields = {
          ...updatedItem.customFields,
          [customFieldKey]: value
        };
      } else {
        updatedItem[fieldName] = value;
      }

      updatedItems[itemIndex] = updatedItem;

      // Update timestamp for tracking
      const timestamp = new Date().toISOString();

      // Save to database
      const { error: saveError } = await supabase
        .from('rundowns')
        .update({
          items: updatedItems,
          updated_at: timestamp,
          user_id: user.id
        })
        .eq('id', rundownId);

      if (saveError) {
        throw saveError;
      }

      // Update our local timestamp tracking
      updateFieldTimestamp(itemId, fieldName, timestamp);

      console.log(`✅ Field saved: ${fieldName} for item ${itemId}`);
      return true;

    } catch (error) {
      console.error('Error saving field:', error);
      toast({
        title: "Save Failed",
        description: `Failed to save ${fieldName}. Please try again.`,
        variant: "destructive"
      });
      return false;
    }
  }, [rundownId, user, detectConflict, onConflictDetected, updateFieldTimestamp, toast]);

  // Debounced field save to prevent too many rapid saves
  const debouncedSaveField = useCallback((itemId: string, fieldName: string, value: string, delay: number = 1000) => {
    const fieldKey = getFieldKey(itemId, fieldName);
    
    // Clear existing timeout for this field
    const existingTimeout = pendingSavesRef.current.get(fieldKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      saveField(itemId, fieldName, value);
      pendingSavesRef.current.delete(fieldKey);
    }, delay);

    pendingSavesRef.current.set(fieldKey, timeout);
  }, [getFieldKey, saveField]);

  // Immediate save for critical fields (no debounce)
  const immediateSaveField = useCallback((itemId: string, fieldName: string, value: string) => {
    const fieldKey = getFieldKey(itemId, fieldName);
    
    // Clear any pending debounced save for this field
    const existingTimeout = pendingSavesRef.current.get(fieldKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      pendingSavesRef.current.delete(fieldKey);
    }

    return saveField(itemId, fieldName, value);
  }, [getFieldKey, saveField]);

  // Clean up timeouts on unmount
  const cleanup = useCallback(() => {
    pendingSavesRef.current.forEach(timeout => clearTimeout(timeout));
    pendingSavesRef.current.clear();
  }, []);

  return {
    saveField,
    debouncedSaveField,
    immediateSaveField,
    updateFieldTimestamp,
    detectConflict,
    cleanup
  };
};