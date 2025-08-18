import { useCallback, useRef, useState } from 'react';
import { RundownItem } from '@/types/rundown';

interface StructuralChange {
  type: 'addition' | 'deletion' | 'reorder' | 'modification';
  itemId: string;
  position?: number;
  previousPosition?: number;
  timestamp: string;
  conflictsWith?: string[];
}

interface ConflictIndicator {
  id: string;
  type: 'field' | 'structural' | 'timing';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedItems: string[];
  timestamp: string;
  resolved: boolean;
  resolutionStrategy?: string;
}

interface UseAdvancedConflictDetectionProps {
  enabled?: boolean;
  maxConflictHistory?: number;
}

export const useAdvancedConflictDetection = ({
  enabled = true,
  maxConflictHistory = 50
}: UseAdvancedConflictDetectionProps = {}) => {
  const [conflictIndicators, setConflictIndicators] = useState<ConflictIndicator[]>([]);
  const structuralChangesRef = useRef<StructuralChange[]>([]);
  const conflictHistoryRef = useRef<ConflictIndicator[]>([]);

  // Detect structural changes between item arrays
  const detectStructuralChanges = useCallback((
    oldItems: RundownItem[],
    newItems: RundownItem[],
    timestamp: string
  ): StructuralChange[] => {
    if (!enabled) return [];

    const changes: StructuralChange[] = [];
    const oldMap = new Map(oldItems.map((item, index) => [item.id, { item, index }]));
    const newMap = new Map(newItems.map((item, index) => [item.id, { item, index }]));

    // Detect additions
    newMap.forEach(({ item, index }, id) => {
      if (!oldMap.has(id)) {
        changes.push({
          type: 'addition',
          itemId: id,
          position: index,
          timestamp
        });
      }
    });

    // Detect deletions
    oldMap.forEach(({ item, index }, id) => {
      if (!newMap.has(id)) {
        changes.push({
          type: 'deletion',
          itemId: id,
          previousPosition: index,
          timestamp
        });
      }
    });

    // Detect reordering
    oldMap.forEach(({ item, index: oldIndex }, id) => {
      const newData = newMap.get(id);
      if (newData && newData.index !== oldIndex) {
        changes.push({
          type: 'reorder',
          itemId: id,
          position: newData.index,
          previousPosition: oldIndex,
          timestamp
        });
      }
    });

    return changes;
  }, [enabled]);

  // Analyze conflicts between local and remote changes
  const analyzeStructuralConflicts = useCallback((
    localChanges: StructuralChange[],
    remoteChanges: StructuralChange[],
    protectedFields: Set<string>
  ): ConflictIndicator[] => {
    if (!enabled) return [];

    const conflicts: ConflictIndicator[] = [];
    const now = new Date().toISOString();

    // Check for position conflicts
    localChanges.forEach(localChange => {
      remoteChanges.forEach(remoteChange => {
        // Same item being moved to different positions
        if (localChange.itemId === remoteChange.itemId && 
            localChange.type === 'reorder' && 
            remoteChange.type === 'reorder' &&
            localChange.position !== remoteChange.position) {
          
          conflicts.push({
            id: `position-conflict-${localChange.itemId}-${Date.now()}`,
            type: 'structural',
            severity: 'medium',
            message: `Item "${localChange.itemId}" moved to different positions by multiple users`,
            affectedItems: [localChange.itemId],
            timestamp: now,
            resolved: false,
            resolutionStrategy: 'prefer-local'
          });
        }

        // Addition at same position
        if (localChange.type === 'addition' && 
            remoteChange.type === 'addition' &&
            localChange.position === remoteChange.position) {
          
          conflicts.push({
            id: `insertion-conflict-${localChange.position}-${Date.now()}`,
            type: 'structural',
            severity: 'high',
            message: `Multiple items added at position ${localChange.position}`,
            affectedItems: [localChange.itemId, remoteChange.itemId],
            timestamp: now,
            resolved: false,
            resolutionStrategy: 'adjust-positions'
          });
        }
      });
    });

    // Check for field protection conflicts
    protectedFields.forEach(fieldKey => {
      const [itemId] = fieldKey.split('-');
      const hasLocalChange = localChanges.some(c => c.itemId === itemId);
      const hasRemoteChange = remoteChanges.some(c => c.itemId === itemId);
      
      if (hasLocalChange && hasRemoteChange) {
        conflicts.push({
          id: `protection-conflict-${fieldKey}-${Date.now()}`,
          type: 'field',
          severity: 'low',
          message: `Protected field "${fieldKey}" has conflicting changes`,
          affectedItems: [itemId],
          timestamp: now,
          resolved: false,
          resolutionStrategy: 'preserve-protection'
        });
      }
    });

    return conflicts;
  }, [enabled]);

  // Add conflict indicator
  const addConflictIndicator = useCallback((conflict: ConflictIndicator) => {
    setConflictIndicators(prev => {
      const updated = [conflict, ...prev];
      return updated.slice(0, maxConflictHistory);
    });
    
    conflictHistoryRef.current.push(conflict);
    if (conflictHistoryRef.current.length > maxConflictHistory) {
      conflictHistoryRef.current = conflictHistoryRef.current.slice(-maxConflictHistory);
    }

    console.log('⚠️ [Phase4] Conflict detected:', conflict);
  }, [maxConflictHistory]);

  // Resolve conflict indicator
  const resolveConflictIndicator = useCallback((conflictId: string, strategy?: string) => {
    setConflictIndicators(prev => 
      prev.map(conflict => 
        conflict.id === conflictId 
          ? { ...conflict, resolved: true, resolutionStrategy: strategy || conflict.resolutionStrategy }
          : conflict
      )
    );

    console.log('✅ [Phase4] Conflict resolved:', conflictId, strategy);
  }, []);

  // Get active conflicts
  const getActiveConflicts = useCallback(() => {
    return conflictIndicators.filter(c => !c.resolved);
  }, [conflictIndicators]);

  // Get conflict statistics
  const getConflictStats = useCallback(() => {
    const active = conflictIndicators.filter(c => !c.resolved);
    const resolved = conflictIndicators.filter(c => c.resolved);
    
    return {
      total: conflictIndicators.length,
      active: active.length,
      resolved: resolved.length,
      bySeverity: {
        high: active.filter(c => c.severity === 'high').length,
        medium: active.filter(c => c.severity === 'medium').length,
        low: active.filter(c => c.severity === 'low').length
      },
      byType: {
        field: active.filter(c => c.type === 'field').length,
        structural: active.filter(c => c.type === 'structural').length,
        timing: active.filter(c => c.type === 'timing').length
      }
    };
  }, [conflictIndicators]);

  // Clear resolved conflicts
  const clearResolvedConflicts = useCallback(() => {
    setConflictIndicators(prev => prev.filter(c => !c.resolved));
  }, []);

  // Record structural change
  const recordStructuralChange = useCallback((change: StructuralChange) => {
    structuralChangesRef.current.push(change);
    // Keep only recent changes
    if (structuralChangesRef.current.length > 100) {
      structuralChangesRef.current = structuralChangesRef.current.slice(-50);
    }
  }, []);

  return {
    // State
    conflictIndicators,
    
    // Detection functions
    detectStructuralChanges,
    analyzeStructuralConflicts,
    recordStructuralChange,
    
    // Management functions
    addConflictIndicator,
    resolveConflictIndicator,
    getActiveConflicts,
    getConflictStats,
    clearResolvedConflicts,
    
    // Statistics
    hasActiveConflicts: conflictIndicators.some(c => !c.resolved),
    conflictStats: getConflictStats()
  };
};
