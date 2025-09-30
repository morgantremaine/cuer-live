import { useCallback, useRef } from 'react';
import { createContentSignature } from '@/utils/contentSignature';
import { useUnifiedSignatureValidation } from './useUnifiedSignatureValidation';
import { useMultiTabSignatureCoordination } from './useMultiTabSignatureCoordination';
import { useRaceConditionDetector } from './useRaceConditionDetector';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/columns';

interface SignatureCoordinationResult {
  shouldProceed: boolean;
  reason: string;
  currentSignature: string;
  action: 'save' | 'queue' | 'abort' | 'merge';
}

interface RundownStateSnapshot {
  items: RundownItem[];
  title: string;
  columns: Column[];
  timezone: string;
  startTime: string;
  showDate: Date | null;
  externalNotes: any;
}

/**
 * Unified signature coordinator that orchestrates all signature systems
 * Ensures consistency across autosave, undo, blueprints, conflict resolution, and multi-tab editing
 */
export const useUnifiedSignatureCoordinator = (
  rundownId: string,
  getCurrentState: () => RundownStateSnapshot
) => {
  const { validateSignature, validateSignatureConsistency } = useUnifiedSignatureValidation();
  const multiTabCoordination = useMultiTabSignatureCoordination(rundownId, getCurrentState);
  const raceDetector = useRaceConditionDetector();
  
  const lastCoordinatedSignatureRef = useRef<string | null>(null);
  const coordinationInProgressRef = useRef(false);

  // Create a comprehensive signature for the current state
  const createCoordinatedSignature = useCallback((
    source: 'autosave' | 'manual-save' | 'undo' | 'conflict-resolution' | 'blueprint'
  ): string => {
    const state = getCurrentState();
    
    // Use standard signature for all operations
    return createContentSignature({
      items: state.items,
      title: state.title,
      columns: state.columns,
      timezone: state.timezone,
      startTime: state.startTime,
      showDate: state.showDate,
      externalNotes: state.externalNotes
    });
  }, [getCurrentState]);

  // Coordinate signature across all systems before an operation
  const coordinateSignature = useCallback(async (
    operation: 'autosave' | 'manual-save' | 'undo' | 'conflict-resolution' | 'blueprint',
    source: string = 'unified-coordinator'
  ): Promise<SignatureCoordinationResult> => {
    if (coordinationInProgressRef.current) {
      return {
        shouldProceed: false,
        reason: 'Coordination already in progress',
        currentSignature: lastCoordinatedSignatureRef.current || '',
        action: 'abort'
      };
    }

    coordinationInProgressRef.current = true;

    try {
      // Step 1: Create current signature
      const currentSignature = createCoordinatedSignature(operation);
      
      // Step 2: Record operation start for race detection
      raceDetector.recordOperationStart(operation, source, currentSignature);
      
      // Step 3: Analyze for race conditions
      const raceAnalysis = raceDetector.analyzeRaceCondition(operation, source, currentSignature);
      
      if (raceAnalysis.hasRaceCondition && raceAnalysis.resolution !== 'proceed') {
        raceDetector.recordOperationComplete(operation, source);
        return {
          shouldProceed: false,
          reason: raceAnalysis.reason,
          currentSignature,
          action: raceAnalysis.resolution
        };
      }

      // Step 4: Check multi-tab consistency
      const tabConsistency = await multiTabCoordination.checkCrossTabSignatureConsistency();
      
      if (!tabConsistency.isConsistent) {
        console.warn('🚨 Cross-tab signature inconsistency detected, may need conflict resolution');
        // For now, proceed but log the inconsistency
        // In the future, this could trigger automatic conflict resolution
      }

      // Step 5: Validate signature integrity
      const state = getCurrentState();
      const validationResult = validateSignature(
        state.items,
        state.title,
        state.columns,
        currentSignature,
        { source: operation, location: source }
      );

      if (!validationResult.isValid) {
        console.error('🚨 Signature validation failed during coordination:', validationResult.errors);
        raceDetector.recordOperationComplete(operation, source);
        return {
          shouldProceed: false,
          reason: 'Signature validation failed: ' + validationResult.errors.join(', '),
          currentSignature,
          action: 'abort'
        };
      }

      // Step 6: Update coordination state
      lastCoordinatedSignatureRef.current = currentSignature;

      // Step 7: Broadcast to other tabs
      const broadcastOperation = operation === 'blueprint' ? 'manual-save' : operation;
      multiTabCoordination.broadcastSignatureUpdate(currentSignature, broadcastOperation);

      console.log('✅ Signature coordination successful:', {
        operation,
        source,
        signaturePreview: currentSignature.slice(0, 50),
        hadRaceCondition: raceAnalysis.hasRaceCondition,
        tabConsistent: tabConsistency.isConsistent
      });

      return {
        shouldProceed: true,
        reason: 'Coordination successful',
        currentSignature,
        action: 'save'
      };

    } finally {
      coordinationInProgressRef.current = false;
    }
  }, [
    createCoordinatedSignature,
    raceDetector,
    multiTabCoordination,
    validateSignature,
    getCurrentState
  ]);

  // Complete an operation (cleanup)
  const completeOperation = useCallback((
    operation: 'autosave' | 'manual-save' | 'undo' | 'conflict-resolution' | 'blueprint',
    source: string = 'unified-coordinator',
    success: boolean = true
  ) => {
    raceDetector.recordOperationComplete(operation, source);
    
    if (success) {
      const finalSignature = createCoordinatedSignature(operation);
      lastCoordinatedSignatureRef.current = finalSignature;
      const broadcastOperation = operation === 'blueprint' ? 'manual-save' : operation;
      multiTabCoordination.broadcastSignatureUpdate(finalSignature, broadcastOperation);
    }
    
    console.log('🏁 Operation completed:', { operation, source, success });
  }, [createCoordinatedSignature, raceDetector, multiTabCoordination]);

  // Get coordination statistics
  const getCoordinationStats = useCallback(() => {
    return {
      activeOperations: raceDetector.getActiveOperations(),
      lastSignature: lastCoordinatedSignatureRef.current,
      coordinationInProgress: coordinationInProgressRef.current,
      tabId: multiTabCoordination.tabId
    };
  }, [raceDetector, multiTabCoordination]);

  return {
    coordinateSignature,
    completeOperation,
    createCoordinatedSignature,
    getCoordinationStats
  };
};