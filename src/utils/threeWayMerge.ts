// Three-way merge utilities for conflict resolution

export interface FieldConflict {
  field: string;
  itemId?: string;
  base: any;
  theirs: any;
  ours: any;
  timestamp: {
    base: number;
    theirs: number;
    ours: number;
  };
}

export interface MergeResult {
  merged: any[];
  conflicts: FieldConflict[];
  autoResolved: number;
}

/**
 * Performs three-way merge on field updates
 * Base = state when offline began
 * Theirs = current server state
 * Ours = offline changes
 */
export const threeWayMergeFieldUpdates = (
  base: any,
  theirs: any,
  ours: any,
  fieldUpdates: Array<{ itemId?: string; field: string; value: any; timestamp: number }>
): MergeResult => {
  const merged: any[] = [];
  const conflicts: FieldConflict[] = [];
  let autoResolved = 0;

  for (const update of fieldUpdates) {
    const { itemId, field, value: ourValue, timestamp: ourTimestamp } = update;
    
    // Get values from each version
    const baseValue = getFieldValue(base, itemId, field);
    const theirValue = getFieldValue(theirs, itemId, field);

    // Three-way merge logic
    if (baseValue === theirValue) {
      // No remote change - safe to apply our change
      merged.push(update);
      autoResolved++;
    } else if (baseValue === ourValue) {
      // We didn't change it - skip (keep their change)
      autoResolved++;
      continue;
    } else if (theirValue === ourValue) {
      // Both made same change - no conflict
      merged.push(update);
      autoResolved++;
    } else {
      // CONFLICT: Both changed same field differently
      conflicts.push({
        field: itemId ? `Row ${itemId} - ${field}` : field,
        itemId,
        base: baseValue,
        theirs: theirValue,
        ours: ourValue,
        timestamp: {
          base: 0, // Will be set from operation baseline
          theirs: Date.now(), // Current time
          ours: ourTimestamp
        }
      });
    }
  }

  return { merged, conflicts, autoResolved };
};

/**
 * Get field value from state (handles both rundown-level and item-level fields)
 */
function getFieldValue(state: any, itemId: string | undefined, field: string): any {
  if (!state) return undefined;
  
  if (itemId) {
    // Item-level field
    const item = state.items?.find((i: any) => i.id === itemId);
    return item?.[field];
  } else {
    // Rundown-level field (title, showDate, etc.)
    return state[field];
  }
}

/**
 * Apply resolved conflicts to field updates
 */
export const applyConflictResolutions = (
  fieldUpdates: Array<{ itemId?: string; field: string; value: any; timestamp: number }>,
  resolutions: Map<string, 'ours' | 'theirs' | any>
): Array<{ itemId?: string; field: string; value: any; timestamp: number }> => {
  return fieldUpdates.map(update => {
    const key = update.itemId ? `${update.itemId}-${update.field}` : update.field;
    const resolution = resolutions.get(key);
    
    if (resolution === 'ours') {
      return update; // Keep our change
    } else if (resolution === 'theirs') {
      return null; // Skip this update (keep theirs)
    } else if (resolution !== undefined) {
      // Manual merge value
      return { ...update, value: resolution };
    }
    return update;
  }).filter(Boolean) as Array<{ itemId?: string; field: string; value: any; timestamp: number }>;
};
