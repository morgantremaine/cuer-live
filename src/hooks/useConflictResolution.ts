import { useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';

interface ConflictResolutionOptions {
  resolveFieldConflicts?: boolean;
  preserveUserEdits?: boolean;
  logConflicts?: boolean;
}

interface FieldConflict {
  fieldKey: string;
  localValue: any;
  remoteValue: any;
  timestamp: string;
}

export const useConflictResolution = (options: ConflictResolutionOptions = {}) => {
  const {
    resolveFieldConflicts = true,
    preserveUserEdits = true,
    logConflicts = true
  } = options;

  const detectedConflicts = useRef<FieldConflict[]>([]);

  // Detect conflicts between local and remote items
  const detectItemConflicts = useCallback((
    localItems: RundownItem[],
    remoteItems: RundownItem[],
    protectedFields: Set<string>
  ): FieldConflict[] => {
    const conflicts: FieldConflict[] = [];
    
    // Create maps for efficient lookup
    const localMap = new Map(localItems.map(item => [item.id, item]));
    const remoteMap = new Map(remoteItems.map(item => [item.id, item]));

    // Check for conflicts in existing items
    localMap.forEach((localItem, id) => {
      const remoteItem = remoteMap.get(id);
      if (!remoteItem) return;

      // Fields to check for conflicts
      const fieldsToCheck = [
        'name', 'script', 'talent', 'notes', 'gfx', 'video', 'images',
        'duration', 'startTime', 'color', 'segmentName'
      ];

      fieldsToCheck.forEach(field => {
        const fieldKey = `${id}-${field}`;
        const isProtected = protectedFields.has(fieldKey);
        
        if (isProtected && localItem[field as keyof RundownItem] !== remoteItem[field as keyof RundownItem]) {
          conflicts.push({
            fieldKey,
            localValue: localItem[field as keyof RundownItem],
            remoteValue: remoteItem[field as keyof RundownItem],
            timestamp: new Date().toISOString()
          });
        }
      });

      // Check custom fields
      const localCustomFields = localItem.customFields || {};
      const remoteCustomFields = remoteItem.customFields || {};
      
      Object.keys({ ...localCustomFields, ...remoteCustomFields }).forEach(customField => {
        const fieldKey = `${id}-customFields.${customField}`;
        const isProtected = protectedFields.has(fieldKey);
        
        if (isProtected && localCustomFields[customField] !== remoteCustomFields[customField]) {
          conflicts.push({
            fieldKey,
            localValue: localCustomFields[customField],
            remoteValue: remoteCustomFields[customField],
            timestamp: new Date().toISOString()
          });
        }
      });
    });

    return conflicts;
  }, []);

  // Resolve conflicts by preserving local changes in protected fields
  const resolveConflicts = useCallback((
    localItems: RundownItem[],
    remoteItems: RundownItem[],
    protectedFields: Set<string>
  ): RundownItem[] => {
    if (!resolveFieldConflicts) return remoteItems;

    const conflicts = detectItemConflicts(localItems, remoteItems, protectedFields);
    
    if (conflicts.length > 0) {
      detectedConflicts.current = conflicts;
      
      if (logConflicts) {
        console.log(`⚠️ [Conflict] Detected ${conflicts.length} field conflicts:`, conflicts);
      }
    }

    if (!preserveUserEdits || conflicts.length === 0) {
      return remoteItems;
    }

    // Create resolved items by preserving local values for protected fields
    const localMap = new Map(localItems.map(item => [item.id, item]));
    
    return remoteItems.map(remoteItem => {
      const localItem = localMap.get(remoteItem.id);
      if (!localItem) return remoteItem;

      const resolvedItem = { ...remoteItem };
      
      // Preserve local values for protected fields
      conflicts.forEach(conflict => {
        if (conflict.fieldKey.startsWith(`${remoteItem.id}-`)) {
          const field = conflict.fieldKey.substring(`${remoteItem.id}-`.length);
          
          if (field.startsWith('customFields.')) {
            const customField = field.substring('customFields.'.length);
            resolvedItem.customFields = {
              ...resolvedItem.customFields,
              [customField]: conflict.localValue
            };
          } else {
            (resolvedItem as any)[field] = conflict.localValue;
          }
        }
      });

      return resolvedItem;
    });
  }, [resolveFieldConflicts, preserveUserEdits, logConflicts, detectItemConflicts]);

  // Get current conflict information
  const getConflictInfo = useCallback(() => {
    return {
      hasConflicts: detectedConflicts.current.length > 0,
      conflictCount: detectedConflicts.current.length,
      conflicts: [...detectedConflicts.current]
    };
  }, []);

  // Clear conflict history
  const clearConflicts = useCallback(() => {
    detectedConflicts.current = [];
  }, []);

  // Check if a specific field has a conflict
  const hasFieldConflict = useCallback((fieldKey: string): boolean => {
    return detectedConflicts.current.some(conflict => conflict.fieldKey === fieldKey);
  }, []);

  return {
    detectItemConflicts,
    resolveConflicts,
    getConflictInfo,
    clearConflicts,
    hasFieldConflict
  };
};