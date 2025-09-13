import { useCallback, useRef } from 'react';
import { localShadowStore } from '@/state/localShadows';
import { useAuth } from '@/hooks/useAuth';

export interface ConflictResolution {
  strategy: 'local_wins' | 'remote_wins' | 'merge' | 'prompt_user';
  mergedValue?: any;
  reason: string;
}

export interface FieldConflict {
  itemId: string;
  fieldName: string;
  localValue: any;
  remoteValue: any;
  localTimestamp: number;
  remoteTimestamp: number;
  conflictId: string;
}

export const useMultiUserConflictResolution = () => {
  const { user } = useAuth();
  const userId = user?.id || 'anonymous';
  const conflictHistoryRef = useRef<Map<string, FieldConflict[]>>(new Map());

  // Detect conflicts between local and remote changes
  const detectConflict = useCallback((
    itemId: string,
    fieldName: string,
    remoteValue: any,
    remoteTimestamp: number
  ): FieldConflict | null => {
    const localShadow = localShadowStore.getShadow(itemId, fieldName, 30000); // 30 second window
    
    if (!localShadow || localShadow.value === remoteValue) {
      return null; // No conflict
    }

    const conflict: FieldConflict = {
      itemId,
      fieldName,
      localValue: localShadow.value,
      remoteValue,
      localTimestamp: localShadow.timestamp,
      remoteTimestamp,
      conflictId: `${itemId}:${fieldName}:${Date.now()}`
    };

    // Add to conflict history
    const fieldKey = `${itemId}:${fieldName}`;
    if (!conflictHistoryRef.current.has(fieldKey)) {
      conflictHistoryRef.current.set(fieldKey, []);
    }
    conflictHistoryRef.current.get(fieldKey)!.push(conflict);

    console.warn('⚠️ Conflict detected:', conflict);
    return conflict;
  }, []);

  // Resolve conflicts using intelligent strategies
  const resolveConflict = useCallback((conflict: FieldConflict): ConflictResolution => {
    const { itemId, fieldName, localValue, remoteValue, localTimestamp, remoteTimestamp } = conflict;

    // Strategy 1: Recent local typing wins (within 5 seconds)
    const timeDiff = Date.now() - localTimestamp;
    if (timeDiff < 5000 && localShadowStore.hasActiveShadow(itemId, fieldName)) {
      return {
        strategy: 'local_wins',
        reason: 'Recent local typing activity detected'
      };
    }

    // Strategy 2: Text field intelligent merging
    if (typeof localValue === 'string' && typeof remoteValue === 'string') {
      const mergedValue = attemptTextMerge(localValue, remoteValue);
      if (mergedValue !== null) {
        return {
          strategy: 'merge',
          mergedValue,
          reason: 'Successfully merged text changes'
        };
      }
    }

    // Strategy 3: Timestamp-based resolution (newer wins)
    if (remoteTimestamp > localTimestamp) {
      return {
        strategy: 'remote_wins',
        reason: 'Remote change is more recent'
      };
    } else {
      return {
        strategy: 'local_wins',
        reason: 'Local change is more recent'
      };
    }
  }, []);

  // Attempt to merge text changes intelligently
  const attemptTextMerge = useCallback((localText: string, remoteText: string): string | null => {
    // Simple merge strategy - if one is a subset/extension of the other
    if (localText.includes(remoteText)) {
      return localText; // Local has more content
    }
    if (remoteText.includes(localText)) {
      return remoteText; // Remote has more content
    }

    // Try to find common base and merge additions
    const commonLength = findCommonPrefixLength(localText, remoteText);
    if (commonLength > localText.length * 0.7) { // 70% similarity threshold
      const localSuffix = localText.slice(commonLength);
      const remoteSuffix = remoteText.slice(commonLength);
      return localText.slice(0, commonLength) + localSuffix + remoteSuffix;
    }

    return null; // Cannot merge safely
  }, []);

  // Find common prefix length between two strings
  const findCommonPrefixLength = useCallback((str1: string, str2: string): number => {
    let length = 0;
    const minLength = Math.min(str1.length, str2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (str1[i] === str2[i]) {
        length++;
      } else {
        break;
      }
    }
    
    return length;
  }, []);

  // Apply resolution to the conflict
  const applyResolution = useCallback((
    conflict: FieldConflict,
    resolution: ConflictResolution
  ): any => {
    const { itemId, fieldName, localValue, remoteValue } = conflict;
    
    let resolvedValue: any;
    
    switch (resolution.strategy) {
      case 'local_wins':
        resolvedValue = localValue;
        break;
      case 'remote_wins':
        resolvedValue = remoteValue;
        localShadowStore.markInactive(itemId, fieldName); // Clear local shadow
        break;
      case 'merge':
        resolvedValue = resolution.mergedValue;
        break;
      default:
        resolvedValue = remoteValue; // Default to remote
    }

    console.log(`🔧 Resolved conflict: ${resolution.strategy}`, {
      field: `${itemId}:${fieldName}`,
      resolvedValue,
      reason: resolution.reason
    });

    return resolvedValue;
  }, []);

  // Get conflict statistics
  const getConflictStats = useCallback(() => {
    const totalConflicts = Array.from(conflictHistoryRef.current.values())
      .reduce((total, conflicts) => total + conflicts.length, 0);
    
    return {
      totalConflicts,
      activeFields: conflictHistoryRef.current.size,
      recentConflicts: Array.from(conflictHistoryRef.current.values())
        .flat()
        .filter(c => Date.now() - c.remoteTimestamp < 60000).length // Last minute
    };
  }, []);

  // Clean up old conflict history
  const cleanupConflictHistory = useCallback(() => {
    const cutoffTime = Date.now() - (5 * 60 * 1000); // 5 minutes ago
    
    for (const [fieldKey, conflicts] of conflictHistoryRef.current) {
      const recentConflicts = conflicts.filter(c => c.remoteTimestamp > cutoffTime);
      
      if (recentConflicts.length === 0) {
        conflictHistoryRef.current.delete(fieldKey);
      } else {
        conflictHistoryRef.current.set(fieldKey, recentConflicts);
      }
    }
  }, []);

  return {
    detectConflict,
    resolveConflict,
    applyResolution,
    getConflictStats,
    cleanupConflictHistory
  };
};