import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';

interface ConcurrencyCheckResult {
  success: boolean;
  conflictData?: any;
  error?: string;
}

interface RundownUpdateData {
  title?: string;
  items?: RundownItem[];
  start_time?: string;
  timezone?: string;
}

/**
 * Performs an optimistic concurrency update on a rundown
 * Only updates if the lastKnownTimestamp matches the current server timestamp
 */
export const updateRundownWithConcurrencyCheck = async (
  rundownId: string,
  updateData: RundownUpdateData,
  lastKnownTimestamp: string
): Promise<ConcurrencyCheckResult> => {
  try {
    const { data, error } = await supabase
      .from('rundowns')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', rundownId)
      .eq('updated_at', lastKnownTimestamp) // Concurrency check
      .select('updated_at')
      .maybeSingle();

    if (error) {
      console.error('❌ Concurrency update failed:', error);
      return { success: false, error: error.message };
    }

    // If no rows were updated, there was a conflict
    if (!data) {
      console.log('🔄 Concurrency conflict detected - fetching latest data');
      
      // Fetch the latest data to return to caller
      const { data: latestData, error: fetchError } = await supabase
        .from('rundowns')
        .select('*')
        .eq('id', rundownId)
        .single();

      if (fetchError) {
        return { success: false, error: fetchError.message };
      }

      return { 
        success: false, 
        conflictData: latestData,
        error: 'Conflict detected - rundown was modified by another user'
      };
    }

    return { 
      success: true,
      conflictData: { updated_at: data.updated_at }
    };
  } catch (error) {
    console.error('❌ Concurrency check error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Fetches the latest rundown data from the server
 */
export const fetchLatestRundownData = async (rundownId: string) => {
  try {
    const { data, error } = await supabase
      .from('rundowns')
      .select('*')
      .eq('id', rundownId)
      .single();

    if (error) {
      console.error('❌ Failed to fetch latest rundown:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Error fetching latest rundown:', error);
    return null;
  }
};

/**
 * Simple merge strategy for conflicting rundown changes
 * Preserves local changes to protected fields while accepting remote changes to others
 */
export const mergeConflictedRundown = (
  localData: RundownUpdateData,
  serverData: any,
  protectedFields: Set<string>
) => {
  const merged = { ...serverData };

  // Preserve protected fields from local data
  if (protectedFields.has('title') && localData.title !== undefined) {
    merged.title = localData.title;
  }
  if (protectedFields.has('startTime') && localData.start_time !== undefined) {
    merged.start_time = localData.start_time;
  }
  if (protectedFields.has('timezone') && localData.timezone !== undefined) {
    merged.timezone = localData.timezone;
  }

  // For items, we need more sophisticated merging
  if (protectedFields.size > 0 && localData.items && serverData.items) {
    merged.items = mergeItemsWithProtection(localData.items, serverData.items, protectedFields);
  }

  return merged;
};

/**
 * Merges item arrays while preserving local changes to protected fields
 */
const mergeItemsWithProtection = (
  localItems: RundownItem[],
  serverItems: RundownItem[],
  protectedFields: Set<string>
): RundownItem[] => {
  // Create a map of local items for quick lookup
  const localItemsMap = new Map(localItems.map(item => [item.id, item]));
  
  // Start with server items as base
  const mergedItems = serverItems.map(serverItem => {
    const localItem = localItemsMap.get(serverItem.id);
    
    if (!localItem) {
      // Item doesn't exist locally, use server version
      return serverItem;
    }

    // Merge item while preserving protected fields
    const merged = { ...serverItem };
    
    protectedFields.forEach(fieldKey => {
      if (fieldKey.startsWith(`${serverItem.id}-`)) {
        const field = fieldKey.substring(serverItem.id.length + 1);
        
        if (field.startsWith('customFields.')) {
          const customField = field.substring('customFields.'.length);
          merged.customFields = merged.customFields || {};
          if (localItem.customFields?.[customField] !== undefined) {
            merged.customFields[customField] = localItem.customFields[customField];
          }
        } else if (field in localItem && (localItem as any)[field] !== undefined) {
          (merged as any)[field] = (localItem as any)[field];
        }
      }
    });

    return merged;
  });

  // Add any local items that don't exist on server (newly created items)
  localItems.forEach(localItem => {
    if (!serverItems.some(serverItem => serverItem.id === localItem.id)) {
      mergedItems.push(localItem);
    }
  });

  return mergedItems;
};