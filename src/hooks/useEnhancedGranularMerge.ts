import { useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';

interface StructuralMergeOptions {
  preserveLocalOrder?: boolean;
  preferLocalAdditions?: boolean;
  conflictResolutionStrategy?: 'local' | 'remote' | 'merge' | 'prompt';
}

interface MergeResult {
  items: RundownItem[];
  conflicts: Array<{
    type: 'addition' | 'deletion' | 'reorder' | 'field';
    itemId: string;
    resolution: string;
  }>;
  statistics: {
    totalItems: number;
    localChanges: number;
    remoteChanges: number;
    conflictsResolved: number;
  };
}

export const useEnhancedGranularMerge = () => {
  const mergeHistoryRef = useRef<MergeResult[]>([]);

  // Enhanced merge algorithm for structural changes
  const performEnhancedMerge = useCallback((
    localItems: RundownItem[],
    remoteItems: RundownItem[],
    protectedFields: Set<string>,
    options: StructuralMergeOptions = {}
  ): MergeResult => {
    const {
      preserveLocalOrder = false,
      preferLocalAdditions = true,
      conflictResolutionStrategy = 'merge'
    } = options;

    console.log('🔀 [Phase4] Starting enhanced granular merge:', {
      localCount: localItems.length,
      remoteCount: remoteItems.length,
      protectedFields: protectedFields.size,
      strategy: conflictResolutionStrategy
    });

    const conflicts: MergeResult['conflicts'] = [];
    const localMap = new Map(localItems.map((item, index) => [item.id, { item, index }]));
    const remoteMap = new Map(remoteItems.map((item, index) => [item.id, { item, index }]));
    
    // Track changes
    let localChanges = 0;
    let remoteChanges = 0;

    // Start with remote items as base (they represent the authoritative state)
    let resultItems = [...remoteItems];

    // Handle field-level protection
    resultItems = resultItems.map(remoteItem => {
      const localData = localMap.get(remoteItem.id);
      if (!localData) return remoteItem;

      const localItem = localData.item;
      let mergedItem = { ...remoteItem };
      let hasFieldConflicts = false;

      // Check each field for protection
      const fieldsToCheck = [
        'name', 'script', 'talent', 'notes', 'gfx', 'video', 'images',
        'duration', 'startTime', 'color', 'segmentName'
      ];

      fieldsToCheck.forEach(field => {
        const fieldKey = `${remoteItem.id}-${field}`;
        if (protectedFields.has(fieldKey)) {
          // Use local value for protected fields
          if (localItem[field as keyof RundownItem] !== remoteItem[field as keyof RundownItem]) {
            (mergedItem as any)[field] = localItem[field as keyof RundownItem];
            hasFieldConflicts = true;
            conflicts.push({
              type: 'field',
              itemId: remoteItem.id,
              resolution: `Preserved local value for protected field: ${field}`
            });
          }
        }
      });

      // Handle custom fields
      if (localItem.customFields && remoteItem.customFields) {
        const mergedCustomFields = { ...remoteItem.customFields };
        Object.keys(localItem.customFields).forEach(customField => {
          const fieldKey = `${remoteItem.id}-customFields.${customField}`;
          if (protectedFields.has(fieldKey)) {
            mergedCustomFields[customField] = localItem.customFields![customField];
            if (localItem.customFields![customField] !== remoteItem.customFields![customField]) {
              hasFieldConflicts = true;
              conflicts.push({
                type: 'field',
                itemId: remoteItem.id,
                resolution: `Preserved local value for protected custom field: ${customField}`
              });
            }
          }
        });
        mergedItem.customFields = mergedCustomFields;
      }

      if (hasFieldConflicts) {
        localChanges++;
      }

      return mergedItem;
    });

    // Handle structural changes (additions, deletions, reordering)
    if (conflictResolutionStrategy === 'merge') {
      // Find local additions (items in local but not in remote)
      const localAdditions = localItems.filter(localItem => 
        !remoteMap.has(localItem.id)
      );

      if (localAdditions.length > 0 && preferLocalAdditions) {
        // Insert local additions at their original positions when possible
        localAdditions.forEach(localItem => {
          const localIndex = localItems.findIndex(item => item.id === localItem.id);
          const insertIndex = Math.min(localIndex, resultItems.length);
          
          resultItems.splice(insertIndex, 0, localItem);
          localChanges++;
          
          conflicts.push({
            type: 'addition',
            itemId: localItem.id,
            resolution: `Added local item at position ${insertIndex}`
          });
        });
      }

      // Handle reordering if preserveLocalOrder is enabled
      if (preserveLocalOrder) {
        const reorderedItems: RundownItem[] = [];
        const usedRemoteItems = new Set<string>();

        // Follow local order for items that exist in both
        localItems.forEach(localItem => {
          const resultItem = resultItems.find(item => item.id === localItem.id);
          if (resultItem) {
            reorderedItems.push(resultItem);
            usedRemoteItems.add(resultItem.id);
          }
        });

        // Add any remaining remote items at the end
        resultItems.forEach(remoteItem => {
          if (!usedRemoteItems.has(remoteItem.id)) {
            reorderedItems.push(remoteItem);
            remoteChanges++;
          }
        });

        if (reorderedItems.length !== resultItems.length || 
            !reorderedItems.every((item, index) => item.id === resultItems[index].id)) {
          
          resultItems = reorderedItems;
          conflicts.push({
            type: 'reorder',
            itemId: 'multiple',
            resolution: 'Applied local ordering to merged items'
          });
        }
      }
    }

    const result: MergeResult = {
      items: resultItems,
      conflicts,
      statistics: {
        totalItems: resultItems.length,
        localChanges,
        remoteChanges,
        conflictsResolved: conflicts.length
      }
    };

    // Store merge history
    mergeHistoryRef.current.push(result);
    if (mergeHistoryRef.current.length > 20) {
      mergeHistoryRef.current = mergeHistoryRef.current.slice(-10);
    }

    console.log('✅ [Phase4] Enhanced merge completed:', result.statistics);
    
    return result;
  }, []);

  // Get merge statistics
  const getMergeHistory = useCallback(() => {
    return {
      recentMerges: mergeHistoryRef.current.slice(-5),
      totalMerges: mergeHistoryRef.current.length,
      averageConflicts: mergeHistoryRef.current.length > 0 
        ? mergeHistoryRef.current.reduce((sum, merge) => sum + merge.conflicts.length, 0) / mergeHistoryRef.current.length
        : 0
    };
  }, []);

  // Check if items have structural differences
  const hasStructuralDifferences = useCallback((
    items1: RundownItem[],
    items2: RundownItem[]
  ): boolean => {
    if (items1.length !== items2.length) return true;
    
    return !items1.every((item, index) => 
      items2[index] && item.id === items2[index].id
    );
  }, []);

  // Generate merge preview
  const generateMergePreview = useCallback((
    localItems: RundownItem[],
    remoteItems: RundownItem[],
    protectedFields: Set<string>
  ) => {
    const preview = performEnhancedMerge(localItems, remoteItems, protectedFields, {
      conflictResolutionStrategy: 'merge',
      preserveLocalOrder: true,
      preferLocalAdditions: true
    });

    return {
      wouldChange: preview.conflicts.length > 0,
      conflictCount: preview.conflicts.length,
      changesSummary: preview.conflicts.reduce((acc, conflict) => {
        acc[conflict.type] = (acc[conflict.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      preview: preview.items.slice(0, 5) // First 5 items for preview
    };
  }, [performEnhancedMerge]);

  return {
    performEnhancedMerge,
    getMergeHistory,
    hasStructuralDifferences,
    generateMergePreview
  };
};