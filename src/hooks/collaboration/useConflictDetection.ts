import { useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface ConflictData {
  hasConflict: boolean;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  currentValue?: string;
}

interface UseConflictDetectionProps {
  rundownId: string | null;
}

export const useConflictDetection = ({ rundownId }: UseConflictDetectionProps) => {
  const { user } = useAuth();
  const lastSaveTimestampsRef = useRef<{ [key: string]: string }>({});

  // Check for conflicts before saving
  const checkForConflicts = useCallback(async (
    itemId: string, 
    field: string, 
    value: string
  ): Promise<ConflictData> => {
    if (!rundownId || !user) {
      return { hasConflict: false };
    }

    try {
      // Get current rundown data
      const { data: rundown, error } = await supabase
        .from('rundowns')
        .select('items, updated_at, user_id')
        .eq('id', rundownId)
        .single();

      if (error || !rundown) {
        console.error('Error checking for conflicts:', error);
        return { hasConflict: false };
      }

      // Find the specific item
      const items = rundown.items || [];
      const item = items.find((i: any) => i.id === itemId);
      
      if (!item) {
        return { hasConflict: false };
      }

      // Get current value in database
      let currentDbValue: string;
      if (field.startsWith('customFields.')) {
        const customFieldKey = field.replace('customFields.', '');
        currentDbValue = item.customFields?.[customFieldKey] || '';
      } else {
        currentDbValue = item[field === 'segmentName' ? 'name' : field] || '';
      }

      // Check if values are different and we have a recent save timestamp
      const cellKey = `${itemId}-${field}`;
      const lastSaveTimestamp = lastSaveTimestampsRef.current[cellKey];
      
      // If we have a save timestamp and the database value differs from what we're trying to save
      if (lastSaveTimestamp && currentDbValue !== value) {
        // Check if the rundown was updated after our last save
        const dbUpdateTime = new Date(rundown.updated_at).getTime();
        const lastSaveTime = new Date(lastSaveTimestamp).getTime();
        
        if (dbUpdateTime > lastSaveTime) {
          return {
            hasConflict: true,
            lastModifiedAt: rundown.updated_at,
            currentValue: currentDbValue
          };
        }
      }

      // Update our save timestamp
      lastSaveTimestampsRef.current[cellKey] = new Date().toISOString();

      return { hasConflict: false };
    } catch (error) {
      console.error('Error in conflict detection:', error);
      return { hasConflict: false };
    }
  }, [rundownId, user]);

  // Update save timestamp after successful save
  const updateSaveTimestamp = useCallback((itemId: string, field: string) => {
    const cellKey = `${itemId}-${field}`;
    lastSaveTimestampsRef.current[cellKey] = new Date().toISOString();
  }, []);

  return {
    checkForConflicts,
    updateSaveTimestamp
  };
};