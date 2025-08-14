import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ConflictInfo {
  itemId: string;
  fieldName: string;
  localValue: string;
  remoteValue: string;
  remoteTimestamp: string;
  remoteUserId: string;
}

interface ConflictResolution {
  conflictId: string;
  resolution: 'local' | 'remote' | 'merge';
  resolvedValue?: string;
}

export const useConflictResolution = () => {
  const [activeConflicts, setActiveConflicts] = useState<Map<string, ConflictInfo>>(new Map());
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [currentConflict, setCurrentConflict] = useState<ConflictInfo | null>(null);
  const { toast } = useToast();

  // Generate conflict ID
  const getConflictId = useCallback((itemId: string, fieldName: string) => {
    return `${itemId}-${fieldName}`;
  }, []);

  // Add a new conflict
  const addConflict = useCallback((conflict: ConflictInfo) => {
    const conflictId = getConflictId(conflict.itemId, conflict.fieldName);
    
    setActiveConflicts(prev => new Map(prev.set(conflictId, conflict)));
    
    // Show conflict notification
    toast({
      title: "Editing Conflict Detected",
      description: `Another user has modified the ${conflict.fieldName} field. Please resolve the conflict.`,
      variant: "destructive"
    });

    // Set as current conflict if no dialog is open
    if (!isConflictDialogOpen) {
      setCurrentConflict(conflict);
      setIsConflictDialogOpen(true);
    }
  }, [getConflictId, isConflictDialogOpen, toast]);

  // Resolve a conflict
  const resolveConflict = useCallback((resolution: ConflictResolution, onResolved?: (resolvedValue: string) => void) => {
    if (!currentConflict) return;

    const conflictId = getConflictId(currentConflict.itemId, currentConflict.fieldName);
    let resolvedValue = '';

    switch (resolution.resolution) {
      case 'local':
        resolvedValue = currentConflict.localValue;
        break;
      case 'remote':
        resolvedValue = currentConflict.remoteValue;
        break;
      case 'merge':
        resolvedValue = resolution.resolvedValue || currentConflict.localValue;
        break;
    }

    // Remove from active conflicts
    setActiveConflicts(prev => {
      const newMap = new Map(prev);
      newMap.delete(conflictId);
      return newMap;
    });

    // Close dialog
    setIsConflictDialogOpen(false);
    setCurrentConflict(null);

    // Call resolution callback
    if (onResolved) {
      onResolved(resolvedValue);
    }

    // Show resolution success
    toast({
      title: "Conflict Resolved",
      description: `The ${currentConflict.fieldName} field has been updated.`,
      variant: "default"
    });

    // Show next conflict if any
    const remainingConflicts = Array.from(activeConflicts.values());
    if (remainingConflicts.length > 0) {
      setCurrentConflict(remainingConflicts[0]);
      setIsConflictDialogOpen(true);
    }
  }, [currentConflict, getConflictId, activeConflicts, toast]);

  // Dismiss conflict dialog
  const dismissConflictDialog = useCallback(() => {
    setIsConflictDialogOpen(false);
    setCurrentConflict(null);
  }, []);

  // Get conflict for a specific field
  const getConflictForField = useCallback((itemId: string, fieldName: string) => {
    const conflictId = getConflictId(itemId, fieldName);
    return activeConflicts.get(conflictId) || null;
  }, [activeConflicts, getConflictId]);

  // Check if field has conflict
  const hasConflict = useCallback((itemId: string, fieldName: string) => {
    const conflictId = getConflictId(itemId, fieldName);
    return activeConflicts.has(conflictId);
  }, [activeConflicts, getConflictId]);

  // Get conflict count
  const conflictCount = activeConflicts.size;

  return {
    // State
    activeConflicts: Array.from(activeConflicts.values()),
    isConflictDialogOpen,
    currentConflict,
    conflictCount,

    // Actions
    addConflict,
    resolveConflict,
    dismissConflictDialog,
    getConflictForField,
    hasConflict
  };
};