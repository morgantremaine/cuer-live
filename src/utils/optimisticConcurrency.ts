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
      // Treat 406/zero-updated as a normal concurrency conflict
      const status = (error as any)?.status;
      const code = (error as any)?.code;
      const msg = (error as any)?.message || '';
      if (status === 406 || code === 'PGRST116' || msg.includes('406')) {
        console.log('🔄 Concurrency conflict detected (406) - fetching latest data');
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
      console.error('❌ Concurrency update failed:', error);
      return { success: false, error: msg };
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

  // Handle rundown-level protected fields (format: rundownId-fieldName)
  protectedFields.forEach(fieldKey => {
    const parts = fieldKey.split('-');
    if (parts.length === 2) {
      // Rundown-level field: rundownId-fieldName
      const field = parts[1];
      
      if (field === 'title' && localData.title !== undefined) {
        merged.title = localData.title;
      } else if (field === 'start_time' && localData.start_time !== undefined) {
        merged.start_time = localData.start_time;
      } else if (field === 'timezone' && localData.timezone !== undefined) {
        merged.timezone = localData.timezone;
      }
    }
  });

  // For items, always merge to preserve local changes where appropriate
  if (localData.items && serverData.items) {
    merged.items = mergeItemsWithProtection(localData.items, serverData.items, protectedFields);
  }

  return merged;
};

/**
 * Merges item arrays while preserving local changes to protected fields
 */
export const mergeItemsWithProtection = (
  localItems: RundownItem[],
  serverItems: RundownItem[],
  protectedFields: Set<string>
): RundownItem[] => {
  // Create quick-lookup maps
  const localMap = new Map(localItems.map((i) => [i.id, i]));
  const serverMap = new Map(serverItems.map((i) => [i.id, i]));

  const mergedItems: RundownItem[] = [] as any;

  // 1) Preserve LOCAL ORDER first
  for (const localItem of localItems) {
    const serverItem = serverMap.get(localItem.id);

    if (!serverItem) {
      // New local item (not yet on server)
      mergedItems.push(localItem);
      continue;
    }

    // Start from server version to include teammate changes
    const merged: any = { ...serverItem };

    // Preserve protected fields (actively edited)
    protectedFields.forEach((fieldKey) => {
      const parts = fieldKey.split('-');
      if (parts.length >= 3) {
        const itemId = parts[1];
        const field = parts.slice(2).join('-');
        if (itemId === serverItem.id) {
          if (field.startsWith('customFields.')) {
            const customField = field.substring('customFields.'.length);
            merged.customFields = merged.customFields || {};
            if (localItem.customFields?.[customField] !== undefined) {
              merged.customFields[customField] = localItem.customFields[customField];
            }
          } else if (field in localItem && (localItem as any)[field] !== undefined) {
            merged[field] = (localItem as any)[field];
          }
        }
      }
    });

    // Prefer LOCAL values for core content to avoid loss
    const coreFields = [
      'name','script','talent','gfx','video','images','notes',
      'duration','startTime','endTime','color','isFloating','rowNumber'
    ] as const;
    coreFields.forEach((fld) => {
      const lVal = (localItem as any)[fld];
      const sVal = (serverItem as any)[fld];
      if (lVal !== undefined && lVal !== sVal) {
        merged[fld] = lVal;
      }
    });

    // Merge customFields with local taking precedence
    if (localItem.customFields) {
      merged.customFields = { ...((serverItem as any).customFields || {}) };
      Object.keys(localItem.customFields).forEach((key) => {
        const lVal = localItem.customFields![key];
        const sVal = (serverItem as any).customFields?.[key];
        if (lVal !== undefined && lVal !== sVal) {
          merged.customFields[key] = lVal;
        }
      });
    }

    mergedItems.push(merged);
  }

  // 2) Append any SERVER-ONLY items (teammate added) preserving their relative order
  for (const serverItem of serverItems) {
    if (!localMap.has(serverItem.id)) {
      mergedItems.push(serverItem);
    }
  }

  return mergedItems;
};