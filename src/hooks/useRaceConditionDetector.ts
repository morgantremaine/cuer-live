import { useCallback, useRef } from 'react';

interface RaceConditionEvent {
  operation: string;
  timestamp: number;
  source: string;
  signature?: string;
  affectedItemIds?: string[];  // Track which items are affected
  affectedFields?: string[];   // Track which fields are affected
  operationType?: 'cell' | 'row' | 'structural' | 'showcaller';
}

interface RaceConditionAnalysis {
  hasRaceCondition: boolean;
  conflictingOperations: RaceConditionEvent[];
  resolution: 'queue' | 'abort' | 'proceed';
  reason: string;
}

/**
 * Race condition detector to identify and prevent save conflicts
 * Analyzes operation timing and signatures to detect potential data races
 */
export const useRaceConditionDetector = () => {
  const recentOperationsRef = useRef<RaceConditionEvent[]>([]);
  const activeOperationsRef = useRef<Set<string>>(new Set());

  // Record an operation start with enhanced metadata
  const recordOperationStart = useCallback((
    operation: string,
    source: string,
    signature?: string,
    metadata?: {
      affectedItemIds?: string[];
      affectedFields?: string[];
      operationType?: 'cell' | 'row' | 'structural' | 'showcaller';
    }
  ) => {
    const event: RaceConditionEvent = {
      operation,
      timestamp: Date.now(),
      source,
      signature,
      ...metadata
    };

    recentOperationsRef.current.push(event);
    activeOperationsRef.current.add(`${operation}-${source}`);

    // Keep only last 50 operations for memory efficiency
    if (recentOperationsRef.current.length > 50) {
      recentOperationsRef.current = recentOperationsRef.current.slice(-50);
    }

    console.log('🏁 Race detector: Operation started', {
      operation,
      source,
      activeCount: activeOperationsRef.current.size
    });
  }, []);

  // Record an operation completion
  const recordOperationComplete = useCallback((
    operation: string,
    source: string
  ) => {
    activeOperationsRef.current.delete(`${operation}-${source}`);
    
    console.log('🏁 Race detector: Operation completed', {
      operation,
      source,
      activeCount: activeOperationsRef.current.size
    });
  }, []);

  // Analyze for potential race conditions with enhanced dependency analysis
  const analyzeRaceCondition = useCallback((
    proposedOperation: string,
    proposedSource: string,
    proposedSignature?: string,
    proposedMetadata?: {
      affectedItemIds?: string[];
      affectedFields?: string[];
      operationType?: 'cell' | 'row' | 'structural' | 'showcaller';
    }
  ): RaceConditionAnalysis => {
    const now = Date.now();
    const recentWindow = 2000; // 2 second window for race detection
    
    // Get recent operations within the race window
    const recentOps = recentOperationsRef.current.filter(
      op => now - op.timestamp < recentWindow
    );

    // Check for conflicting operations with dependency analysis
    const conflictingOps = recentOps.filter(op => {
      // Same operation type from different sources
      if (op.operation === proposedOperation && op.source !== proposedSource) {
        return true;
      }
      
      // Cell-level vs structural operation conflicts
      if (proposedMetadata?.operationType === 'cell' && op.operationType === 'structural') {
        // Check if structural operation affects the same items
        const proposedItems = proposedMetadata.affectedItemIds || [];
        const opItems = op.affectedItemIds || [];
        const hasOverlap = proposedItems.some(id => opItems.includes(id));
        if (hasOverlap) {
          console.log('⚠️ Race detector: Cell edit conflicts with structural operation', {
            cellItems: proposedItems,
            structuralItems: opItems
          });
          return true;
        }
      }
      
      // Structural vs cell operation conflicts
      if (proposedMetadata?.operationType === 'structural' && op.operationType === 'cell') {
        const proposedItems = proposedMetadata.affectedItemIds || [];
        const opItems = op.affectedItemIds || [];
        const hasOverlap = proposedItems.some(id => opItems.includes(id));
        if (hasOverlap) {
          console.log('⚠️ Race detector: Structural operation conflicts with active cell edit', {
            structuralItems: proposedItems,
            cellItems: opItems
          });
          return true;
        }
      }
      
      // Different operations that could conflict
      const conflictPairs = [
        ['autosave', 'manual-save'],
        ['autosave', 'undo'],
        ['manual-save', 'undo'],
        ['conflict-resolution', 'autosave'],
        ['localshadow-apply', 'autosave']
      ];
      
      const currentPair = [op.operation, proposedOperation].sort();
      return conflictPairs.some(pair => 
        pair[0] === currentPair[0] && pair[1] === currentPair[1]
      );
    });

    // Check for active operations that would conflict
    const hasActiveConflicts = Array.from(activeOperationsRef.current).some(activeOp => {
      const [activeOperation, activeSource] = activeOp.split('-');
      return activeOperation === proposedOperation && activeSource !== proposedSource;
    });

    const hasRaceCondition = conflictingOps.length > 0 || hasActiveConflicts;

    let resolution: 'queue' | 'abort' | 'proceed' = 'proceed';
    let reason = 'No conflicts detected';

    if (hasRaceCondition) {
      // Determine resolution strategy based on operation priority
      const operationPriority = {
        'undo': 1,                    // Highest priority - user action
        'manual-save': 2,             // High priority - explicit user save
        'conflict-resolution': 3,     // Medium-high priority - prevent data loss
        'blueprint': 4,               // Medium priority - blueprint operations
        'autosave': 5                 // Lowest priority - background operation
      };

      const proposedPriority = operationPriority[proposedOperation as keyof typeof operationPriority] || 10;
      const conflictPriorities = conflictingOps.map(op => 
        operationPriority[op.operation as keyof typeof operationPriority] || 10
      );

      const highestConflictPriority = Math.min(...conflictPriorities);

      if (proposedPriority <= highestConflictPriority) {
        resolution = 'proceed';
        reason = `Higher priority operation (${proposedOperation}) overrides conflicts`;
      } else if (proposedOperation === 'autosave') {
        resolution = 'queue';
        reason = 'Autosave queued due to higher priority operations';
      } else {
        resolution = 'abort';
        reason = 'Operation aborted due to conflicting higher priority operations';
      }
    }

    const analysis: RaceConditionAnalysis = {
      hasRaceCondition,
      conflictingOperations: conflictingOps,
      resolution,
      reason
    };

    if (hasRaceCondition) {
      console.warn('🚨 Race condition detected:', {
        proposed: `${proposedOperation}-${proposedSource}`,
        conflicts: conflictingOps.map(op => `${op.operation}-${op.source}`),
        resolution,
        reason
      });
    }

    return analysis;
  }, []);

  // Get current active operations
  const getActiveOperations = useCallback(() => {
    return Array.from(activeOperationsRef.current);
  }, []);

  // Clear old operations (cleanup)
  const cleanup = useCallback(() => {
    const now = Date.now();
    const maxAge = 30000; // 30 seconds
    
    recentOperationsRef.current = recentOperationsRef.current.filter(
      op => now - op.timestamp < maxAge
    );
  }, []);

  return {
    recordOperationStart,
    recordOperationComplete,
    analyzeRaceCondition,
    getActiveOperations,
    cleanup
  };
};
