import { useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';

interface UseRealtimeConflictResolutionProps {
  isFieldRecentlyEdited: (itemId: string, field: string, withinMs?: number) => boolean;
  isPreparingSave: boolean;
  currentItems: RundownItem[];
}

export const useRealtimeConflictResolution = ({
  isFieldRecentlyEdited,
  isPreparingSave,
  currentItems
}: UseRealtimeConflictResolutionProps) => {
  const lastProcessedTimestampRef = useRef<string | null>(null);
  const duplicateTimestampCountRef = useRef<Map<string, number>>(new Map());
  
  // Enhanced duplicate detection
  const isDuplicateUpdate = useCallback((timestamp: string): boolean => {
    if (timestamp === lastProcessedTimestampRef.current) {
      const count = duplicateTimestampCountRef.current.get(timestamp) || 0;
      duplicateTimestampCountRef.current.set(timestamp, count + 1);
      
      // Allow first duplicate but block subsequent ones
      if (count > 0) {
        console.log('⏭️ Blocking duplicate realtime update:', { timestamp, count });
        return true;
      }
    } else {
      // Clear old duplicate tracking and set new timestamp
      duplicateTimestampCountRef.current.clear();
      lastProcessedTimestampRef.current = timestamp;
    }
    
    return false;
  }, []);
  
  // Smart field-level conflict resolution
  const resolveItemConflicts = useCallback((
    incomingItems: RundownItem[],
    localItems: RundownItem[] = currentItems
  ): RundownItem[] => {
    const resolvedItems: RundownItem[] = [];
    
    // Create a map of local items for faster lookup
    const localItemsMap = new Map(localItems.map(item => [item.id, item]));
    
    for (const incomingItem of incomingItems) {
      const localItem = localItemsMap.get(incomingItem.id);
      
      if (!localItem) {
        // New item - accept as is
        resolvedItems.push(incomingItem);
        continue;
      }
      
      // Field-by-field conflict resolution
      const resolvedItem: RundownItem = { ...incomingItem };
      
      // Text fields that might be actively edited
      const textFields = ['name', 'script', 'talent', 'notes', 'gfx', 'video', 'images'];
      
      for (const field of textFields) {
        if (isFieldRecentlyEdited(incomingItem.id, field, 10000)) {
          // Preserve local changes for recently edited fields
          (resolvedItem as any)[field] = (localItem as any)[field];
          console.log(`🔒 Preserving local edit for ${incomingItem.id}.${field}`);
        }
      }
      
      // Handle custom fields
      if (localItem.customFields && incomingItem.customFields) {
        const resolvedCustomFields = { ...incomingItem.customFields };
        
        for (const [customFieldKey, _] of Object.entries(localItem.customFields)) {
          if (isFieldRecentlyEdited(incomingItem.id, `customFields.${customFieldKey}`, 10000)) {
            resolvedCustomFields[customFieldKey] = localItem.customFields[customFieldKey];
            console.log(`🔒 Preserving local custom field edit for ${incomingItem.id}.customFields.${customFieldKey}`);
          }
        }
        
        resolvedItem.customFields = resolvedCustomFields;
      }
      
      resolvedItems.push(resolvedItem);
    }
    
    return resolvedItems;
  }, [isFieldRecentlyEdited, currentItems]);
  
  // Main conflict resolution logic
  const shouldBlockRealtimeUpdate = useCallback((
    timestamp: string,
    isSaving: boolean
  ): { shouldBlock: boolean; reason?: string } => {
    // Block if preparing to save
    if (isPreparingSave) {
      return { shouldBlock: true, reason: 'preparing_save' };
    }
    
    // Block if currently saving
    if (isSaving) {
      return { shouldBlock: true, reason: 'currently_saving' };
    }
    
    // Block duplicates
    if (isDuplicateUpdate(timestamp)) {
      return { shouldBlock: true, reason: 'duplicate_timestamp' };
    }
    
    return { shouldBlock: false };
  }, [isPreparingSave, isDuplicateUpdate]);
  
  // Process realtime update with conflict resolution
  const processRealtimeUpdate = useCallback((
    incomingData: any,
    isSaving: boolean
  ): { shouldApply: boolean; resolvedItems?: RundownItem[]; reason?: string } => {
    const blockCheck = shouldBlockRealtimeUpdate(incomingData.updated_at, isSaving);
    
    if (blockCheck.shouldBlock) {
      return { shouldApply: false, reason: blockCheck.reason };
    }
    
    // Apply conflict resolution to items
    if (incomingData.items && Array.isArray(incomingData.items)) {
      const resolvedItems = resolveItemConflicts(incomingData.items);
      return { 
        shouldApply: true, 
        resolvedItems,
        reason: 'conflict_resolved'
      };
    }
    
    return { shouldApply: true, reason: 'no_conflicts' };
  }, [shouldBlockRealtimeUpdate, resolveItemConflicts]);
  
  return {
    shouldBlockRealtimeUpdate,
    processRealtimeUpdate,
    resolveItemConflicts,
    isDuplicateUpdate
  };
};