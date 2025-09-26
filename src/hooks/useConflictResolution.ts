import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { useAuth } from './useAuth';

interface ConflictResolutionOptions {
  rundownId: string;
  userId?: string;
  onResolutionApplied?: (mergedData: any, conflictFields: string[]) => void;
}

interface FieldConflict {
  field: string;
  localValue: any;
  remoteValue: any;
  resolution: 'local' | 'remote' | 'merge';
  reason: string;
}

/**
 * Advanced conflict resolution system for simultaneous edits
 * Handles teleprompter vs main rundown conflicts, multiple user edits, etc.
 */
export const useConflictResolution = (options: ConflictResolutionOptions) => {
  const { user } = useAuth();
  const { rundownId, userId = user?.id, onResolutionApplied } = options;
  
  const recentLocalEditsRef = useRef<Map<string, { value: any; timestamp: number }>>(new Map());
  const resolutionInProgressRef = useRef(false);

  // Track local edits with timestamps
  const trackLocalEdit = useCallback((field: string, value: any) => {
    const key = field;
    recentLocalEditsRef.current.set(key, {
      value,
      timestamp: Date.now()
    });

    // Clean up old edits after 30 seconds
    setTimeout(() => {
      const entry = recentLocalEditsRef.current.get(key);
      if (entry && Date.now() - entry.timestamp >= 30000) {
        recentLocalEditsRef.current.delete(key);
      }
    }, 30000);

    console.log('📝 Conflict: Tracked local edit', { field, timestamp: Date.now() });
  }, []);

  // Check if a field was recently edited locally
  const wasRecentlyEditedLocally = useCallback((field: string, withinMs: number = 10000): boolean => {
    const entry = recentLocalEditsRef.current.get(field);
    if (!entry) return false;
    
    const isRecent = Date.now() - entry.timestamp < withinMs;
    if (isRecent) {
      console.log('🔍 Conflict: Field was recently edited locally', { field, age: Date.now() - entry.timestamp });
    }
    return isRecent;
  }, []);

  // Detect conflicts between local and remote state
  const detectConflicts = useCallback((localState: any, remoteState: any): FieldConflict[] => {
    const conflicts: FieldConflict[] = [];

    // Check top-level fields
    const topLevelFields = ['title', 'start_time', 'timezone', 'external_notes', 'show_date'];
    
    for (const field of topLevelFields) {
      const localValue = localState[field];
      const remoteValue = remoteState[field];
      
      if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
        const wasLocallyEdited = wasRecentlyEditedLocally(field);
        
        conflicts.push({
          field,
          localValue,
          remoteValue,
          resolution: wasLocallyEdited ? 'local' : 'remote',
          reason: wasLocallyEdited ? 'Recently edited locally' : 'Accept remote change'
        });
      }
    }

    // Check item-level conflicts
    const localItems = localState.items || [];
    const remoteItems = remoteState.items || [];
    const maxItems = Math.max(localItems.length, remoteItems.length);

    for (let i = 0; i < maxItems; i++) {
      const localItem = localItems[i];
      const remoteItem = remoteItems[i];

      if (!localItem && remoteItem) {
        // Remote added an item
        conflicts.push({
          field: `items[${i}]`,
          localValue: null,
          remoteValue: remoteItem,
          resolution: 'remote',
          reason: 'Item added remotely'
        });
      } else if (localItem && !remoteItem) {
        // Local added an item (or remote deleted)
        conflicts.push({
          field: `items[${i}]`,
          localValue: localItem,
          remoteValue: null,
          resolution: 'local',
          reason: 'Item added locally or deleted remotely'
        });
      } else if (localItem && remoteItem && localItem.id === remoteItem.id) {
        // Same item, check field-level conflicts
        const itemFields = ['name', 'script', 'notes', 'talent', 'duration', 'gfx', 'video', 'images'];
        
        for (const itemField of itemFields) {
          const localFieldValue = localItem[itemField];
          const remoteFieldValue = remoteItem[itemField];
          
          if (JSON.stringify(localFieldValue) !== JSON.stringify(remoteFieldValue)) {
            const fieldKey = `${localItem.id}-${itemField}`;
            const wasLocallyEdited = wasRecentlyEditedLocally(fieldKey);
            
            conflicts.push({
              field: `items[${i}].${itemField}`,
              localValue: localFieldValue,
              remoteValue: remoteFieldValue,
              resolution: wasLocallyEdited ? 'local' : 'remote',
              reason: wasLocallyEdited 
                ? `${itemField} recently edited locally` 
                : `Accept remote ${itemField} change`
            });
          }
        }

        // Check custom fields
        const localCustomFields = localItem.customFields || {};
        const remoteCustomFields = remoteItem.customFields || {};
        const allCustomKeys = new Set([
          ...Object.keys(localCustomFields),
          ...Object.keys(remoteCustomFields)
        ]);

        for (const customKey of allCustomKeys) {
          const localCustomValue = localCustomFields[customKey];
          const remoteCustomValue = remoteCustomFields[customKey];
          
          if (JSON.stringify(localCustomValue) !== JSON.stringify(remoteCustomValue)) {
            const fieldKey = `${localItem.id}-customFields.${customKey}`;
            const wasLocallyEdited = wasRecentlyEditedLocally(fieldKey);
            
            conflicts.push({
              field: `items[${i}].customFields.${customKey}`,
              localValue: localCustomValue,
              remoteValue: remoteCustomValue,
              resolution: wasLocallyEdited ? 'local' : 'remote',
              reason: wasLocallyEdited 
                ? `Custom field ${customKey} recently edited locally`
                : `Accept remote custom field ${customKey} change`
            });
          }
        }
      }
    }

    console.log('🔍 Conflict: Detected conflicts', { count: conflicts.length, conflicts });
    return conflicts;
  }, [wasRecentlyEditedLocally]);

  // Apply conflict resolutions to create merged data
  const applyResolutions = useCallback((
    localState: any,
    remoteState: any,
    conflicts: FieldConflict[]
  ): { mergedData: any; appliedResolutions: string[] } => {
    // Start with remote state as base (it's the "official" state)
    const mergedData = JSON.parse(JSON.stringify(remoteState));
    const appliedResolutions: string[] = [];

    for (const conflict of conflicts) {
      const { field, localValue, resolution, reason } = conflict;
      
      if (resolution === 'local') {
        // Apply local value over remote
        if (field.startsWith('items[')) {
          // Handle item-level changes
          const itemMatch = field.match(/^items\[(\d+)\](?:\.(.+))?$/);
          if (itemMatch) {
            const itemIndex = parseInt(itemMatch[1], 10);
            const itemField = itemMatch[2];
            
            if (!itemField) {
              // Entire item
              if (localValue === null) {
                // Local deleted the item
                mergedData.items.splice(itemIndex, 1);
              } else {
                // Local added/modified the item
                if (mergedData.items[itemIndex]) {
                  mergedData.items[itemIndex] = localValue;
                } else {
                  mergedData.items.push(localValue);
                }
              }
            } else {
              // Specific item field
              if (mergedData.items[itemIndex]) {
                if (itemField.includes('.')) {
                  // Nested field (like customFields.fieldName)
                  const [parentField, subField] = itemField.split('.', 2);
                  if (!mergedData.items[itemIndex][parentField]) {
                    mergedData.items[itemIndex][parentField] = {};
                  }
                  mergedData.items[itemIndex][parentField][subField] = localValue;
                } else {
                  mergedData.items[itemIndex][itemField] = localValue;
                }
              }
            }
          }
        } else {
          // Top-level field
          mergedData[field] = localValue;
        }
        
        appliedResolutions.push(`${field}: ${reason}`);
        console.log('🔀 Conflict: Applied local resolution', { field, reason });
      } else {
        console.log('🔀 Conflict: Kept remote value', { field, reason });
      }
    }

    return { mergedData, appliedResolutions };
  }, []);

  // Broadcast resolved changes to inform other clients
  const broadcastResolution = useCallback((mergedData: any, conflictFields: string[]) => {
    if (!userId) return;

    // Broadcast significant field changes that other clients should know about
    for (const fieldPath of conflictFields) {
      if (fieldPath.includes('items[') && fieldPath.includes('.script')) {
        // Script field change - broadcast via cell broadcast
        const itemMatch = fieldPath.match(/^items\[(\d+)\]\.script$/);
        if (itemMatch) {
          const itemIndex = parseInt(itemMatch[1], 10);
          const item = mergedData.items[itemIndex];
          if (item) {
            cellBroadcast.broadcastCellUpdate(
              rundownId,
              item.id,
              'script',
              item.script,
              userId
            );
          }
        }
      }
    }

    console.log('📡 Conflict: Broadcasted resolution changes', { fieldCount: conflictFields.length });
  }, [rundownId, userId]);

  // Main conflict resolution function
  const resolveConflicts = useCallback(async (
    localState: any,
    remoteState: any,
    options: {
      autoResolve?: boolean;
      extendedOfflineMode?: boolean;
      onConflictsDetected?: (conflicts: FieldConflict[]) => void;
    } = {}
  ): Promise<{ mergedData: any; hadConflicts: boolean; conflictFields: string[] }> => {
    if (resolutionInProgressRef.current) {
      console.log('⏸️ Conflict: Resolution already in progress');
      return { mergedData: remoteState, hadConflicts: false, conflictFields: [] };
    }

    resolutionInProgressRef.current = true;

    try {
      const conflicts = detectConflicts(localState, remoteState);
      
      if (conflicts.length === 0) {
        console.log('✅ Conflict: No conflicts detected');
        return { mergedData: remoteState, hadConflicts: false, conflictFields: [] };
      }

      console.log(`🔀 Conflict: Resolving ${conflicts.length} conflicts${options.extendedOfflineMode ? ' (extended offline mode)' : ''}`);
      
      // In extended offline mode, prioritize local changes more heavily
      if (options.extendedOfflineMode) {
        for (const conflict of conflicts) {
          if (conflict.resolution === 'remote' && conflict.field.includes('items[')) {
            // In extended offline mode, lean towards keeping local item changes
            conflict.resolution = 'local';
            conflict.reason = 'Extended offline mode: prioritizing local changes';
          }
        }
      }
      
      // Notify about conflicts if requested
      options.onConflictsDetected?.(conflicts);

      // Apply automatic resolutions
      const { mergedData, appliedResolutions } = applyResolutions(localState, remoteState, conflicts);

      // Broadcast the resolution to other clients
      broadcastResolution(mergedData, appliedResolutions);

      // Notify parent about the resolution
      onResolutionApplied?.(mergedData, appliedResolutions);

      console.log('✅ Conflict: Resolution completed', {
        conflictCount: conflicts.length,
        resolutionsApplied: appliedResolutions.length
      });

      return {
        mergedData,
        hadConflicts: true,
        conflictFields: appliedResolutions
      };
    } finally {
      resolutionInProgressRef.current = false;
    }
  }, [detectConflicts, applyResolutions, broadcastResolution, onResolutionApplied]);

  // Create field-level edit tracker (for use with form fields)
  const createFieldTracker = useCallback((itemId?: string) => {
    return (fieldName: string, value: any) => {
      const fullFieldName = itemId ? `${itemId}-${fieldName}` : fieldName;
      trackLocalEdit(fullFieldName, value);
    };
  }, [trackLocalEdit]);

  return {
    // Core functions
    resolveConflicts,
    trackLocalEdit,
    createFieldTracker,
    
    // Utilities
    detectConflicts,
    wasRecentlyEditedLocally,
    
    // State
    isResolutionInProgress: () => resolutionInProgressRef.current
  };
};