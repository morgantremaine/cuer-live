/**
 * Save Coordination Optimizer
 * Streamlines save operations based on per-cell vs delta mode
 */

import { useCallback, useRef } from 'react';
import { getPerCellSaveConfig, shouldBypassDocVersion } from '@/utils/perCellSaveFeatureFlag';

interface SaveCoordinationStats {
  totalSaves: number;
  perCellSaves: number;
  deltaSaves: number;
  coordinationTime: number;
  lastSaveMode: 'per-cell' | 'delta' | null;
}

interface SaveOperation {
  id: string;
  type: 'cell' | 'structural' | 'delta' | 'showcaller';
  timestamp: number;
  rundownId: string;
  mode: 'per-cell' | 'delta';
}

export const useSaveCoordinationOptimizer = (rundownData?: { per_cell_save_enabled?: boolean }) => {
  const statsRef = useRef<SaveCoordinationStats>({
    totalSaves: 0,
    perCellSaves: 0,
    deltaSaves: 0,
    coordinationTime: 0,
    lastSaveMode: null
  });

  const activeOperationsRef = useRef<Map<string, SaveOperation>>(new Map());

  // Get optimized coordination strategy
  const getCoordinationStrategy = useCallback(() => {
    const config = getPerCellSaveConfig(rundownData);
    
    return {
      mode: config.isEnabled ? 'per-cell' : 'delta',
      bypassDocVersion: config.shouldBypassDocVersion,
      allowConcurrent: config.isEnabled,
      coordinationLevel: config.isEnabled ? 'minimal' : 'full'
    };
  }, [rundownData]);

  // Optimize save coordination based on mode
  const coordinateSave = useCallback(async (
    saveType: 'cell' | 'structural' | 'delta' | 'showcaller',
    operation: () => Promise<boolean>,
    rundownId: string
  ): Promise<boolean> => {
    const strategy = getCoordinationStrategy();
    const operationId = `${saveType}-${Date.now()}`;
    const startTime = Date.now();

    // Track operation
    const saveOperation: SaveOperation = {
      id: operationId,
      type: saveType,
      timestamp: startTime,
      rundownId,
      mode: strategy.mode as 'per-cell' | 'delta'
    };

    activeOperationsRef.current.set(operationId, saveOperation);

    try {
      console.log(`🎯 Coordinating ${saveType} save in ${strategy.mode} mode:`, {
        bypassDocVersion: strategy.bypassDocVersion,
        allowConcurrent: strategy.allowConcurrent,
        coordinationLevel: strategy.coordinationLevel
      });

      let result: boolean;

      if (strategy.mode === 'per-cell') {
        // Per-cell mode: minimal coordination, concurrent operations allowed
        switch (saveType) {
          case 'showcaller':
            // Showcaller can save immediately in per-cell mode
            result = await operation();
            break;
          case 'structural':
            // Structural operations still need coordination but bypass doc_version
            result = await operation();
            break;
          default:
            // Cell saves can run immediately
            result = await operation();
        }
      } else {
        // Delta mode: full coordination with doc_version
        result = await operation();
      }

      // Update stats
      const duration = Date.now() - startTime;
      statsRef.current.totalSaves++;
      statsRef.current.coordinationTime += duration;
      statsRef.current.lastSaveMode = strategy.mode as 'per-cell' | 'delta';

      if (strategy.mode === 'per-cell') {
        statsRef.current.perCellSaves++;
      } else {
        statsRef.current.deltaSaves++;
      }

      console.log(`✅ ${saveType} save completed in ${duration}ms (${strategy.mode} mode)`);
      return result;

    } catch (error) {
      console.error(`❌ ${saveType} save failed in ${strategy.mode} mode:`, error);
      return false;
    } finally {
      activeOperationsRef.current.delete(operationId);
    }
  }, [getCoordinationStrategy]);

  // Check if operations should be blocked
  const shouldBlockOperation = useCallback((operationType: string): boolean => {
    const strategy = getCoordinationStrategy();
    
    if (strategy.allowConcurrent) {
      // Per-cell mode: only block conflicting structural operations
      const hasStructuralOperation = Array.from(activeOperationsRef.current.values())
        .some(op => op.type === 'structural');
      
      return operationType === 'structural' && hasStructuralOperation;
    }

    // Delta mode: block all concurrent operations
    return activeOperationsRef.current.size > 0;
  }, [getCoordinationStrategy]);

  // Get coordination performance metrics
  const getCoordinationMetrics = useCallback(() => {
    const stats = statsRef.current;
    const averageTime = stats.totalSaves > 0 ? stats.coordinationTime / stats.totalSaves : 0;
    
    return {
      ...stats,
      averageCoordinationTime: Math.round(averageTime),
      activeOperations: activeOperationsRef.current.size,
      efficiency: stats.totalSaves > 0 ? stats.perCellSaves / stats.totalSaves : 0,
      currentStrategy: getCoordinationStrategy()
    };
  }, [getCoordinationStrategy]);

  // Clear coordination state
  const resetCoordination = useCallback(() => {
    activeOperationsRef.current.clear();
    statsRef.current = {
      totalSaves: 0,
      perCellSaves: 0,
      deltaSaves: 0,
      coordinationTime: 0,
      lastSaveMode: null
    };
  }, []);

  return {
    coordinateSave,
    shouldBlockOperation,
    getCoordinationMetrics,
    resetCoordination,
    getCoordinationStrategy,
    bypassDocVersion: shouldBypassDocVersion(rundownData)
  };
};