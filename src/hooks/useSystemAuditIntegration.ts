/**
 * System Audit Integration Hook
 * 
 * Integrates system auditing throughout the application lifecycle,
 * providing comprehensive monitoring of signature systems, state management,
 * and performance characteristics.
 */

import { useEffect, useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/columns';
import { 
  auditSignatures, 
  logStateTransition, 
  logConflictResolution, 
  logPerformanceAnomaly,
  trackSaveOperation,
  assertSignatureConsistency 
} from '@/utils/systemAudit';

interface SystemAuditIntegrationOptions {
  rundownId?: string;
  context: string;
  enablePerformanceTracking?: boolean;
  enableSignatureAuditing?: boolean;
  enableStateTransitionLogging?: boolean;
}

export const useSystemAuditIntegration = (options: SystemAuditIntegrationOptions) => {
  const {
    rundownId,
    context,
    enablePerformanceTracking = true,
    enableSignatureAuditing = true,
    enableStateTransitionLogging = true
  } = options;

  const saveCountRef = useRef(0);
  const lastSaveTimeRef = useRef(0);
  const operationTimingsRef = useRef<Record<string, number>>({});

  // Performance tracking for save operations
  const trackSave = useCallback((saveType: string) => {
    if (!enablePerformanceTracking) return;

    const now = Date.now();
    saveCountRef.current++;
    
    // Track excessive save frequency
    if (now - lastSaveTimeRef.current < 1000) { // Less than 1 second between saves
      logPerformanceAnomaly('excessive_saves', 'medium', {
        context,
        rundownId,
        timeBetweenSaves: now - lastSaveTimeRef.current,
        saveType,
        recentSaveCount: saveCountRef.current
      });
    }
    
    lastSaveTimeRef.current = now;
    trackSaveOperation(`${context}_${saveType}`);
    
    // Reset save count every minute
    setTimeout(() => {
      if (saveCountRef.current > 0) {
        saveCountRef.current--;
      }
    }, 60000);
  }, [context, rundownId, enablePerformanceTracking]);

  // Audit signatures when data changes
  const auditDataSignatures = useCallback((data: {
    items: RundownItem[];
    title: string;
    columns?: Column[];
    timezone?: string;
    startTime?: string;
    showDate?: Date | null;
    externalNotes?: string;
  }, operation: string) => {
    if (!enableSignatureAuditing) return;

    try {
      const auditResult = auditSignatures(data, `${context}_${operation}`);
      
      // Log critical signature inconsistencies
      if (auditResult.inconsistencies.length > 0) {
        logPerformanceAnomaly('signature_thrashing', 'high', {
          context,
          rundownId,
          operation,
          inconsistencies: auditResult.inconsistencies,
          signatureLengths: {
            content: auditResult.content.length,
            undo: auditResult.undo.length,
            header: auditResult.header.length,
            lightweight: auditResult.lightweight.length
          }
        });
      }
      
      return auditResult;
    } catch (error) {
      logPerformanceAnomaly('signature_thrashing', 'critical', {
        context,
        rundownId,
        operation,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [context, rundownId, enableSignatureAuditing]);

  // Track state transitions
  const trackStateTransition = useCallback((
    from: string, 
    to: string, 
    reason: string, 
    triggerSource: string = 'unknown'
  ) => {
    if (!enableStateTransitionLogging) return;

    logStateTransition(from, to, reason, context, triggerSource);
  }, [context, enableStateTransitionLogging]);

  // Track operation timing for performance analysis
  const startOperation = useCallback((operationName: string) => {
    if (!enablePerformanceTracking) return;

    operationTimingsRef.current[operationName] = Date.now();
  }, [enablePerformanceTracking]);

  const endOperation = useCallback((operationName: string, expectedDuration?: number) => {
    if (!enablePerformanceTracking) return;

    const startTime = operationTimingsRef.current[operationName];
    if (!startTime) return;

    const duration = Date.now() - startTime;
    delete operationTimingsRef.current[operationName];

    // Log slow operations
    if (expectedDuration && duration > expectedDuration * 2) {
      logPerformanceAnomaly('state_loops', 'medium', {
        context,
        rundownId,
        operationName,
        actualDuration: duration,
        expectedDuration,
        performanceRatio: duration / expectedDuration
      });
    }

    return duration;
  }, [context, rundownId, enablePerformanceTracking]);

  // Track conflict resolutions
  const trackConflictResolution = useCallback((
    conflictType: string,
    resolution: string,
    reason: string,
    dataLost: boolean = false
  ) => {
    logConflictResolution(conflictType, resolution, reason, dataLost, context);
    
    if (dataLost) {
      logPerformanceAnomaly('state_loops', 'critical', {
        context,
        rundownId,
        conflictType,
        resolution,
        reason,
        dataLossConfirmed: true
      });
    }
  }, [context, rundownId]);

  // Comprehensive data validation
  const validateDataConsistency = useCallback((data: {
    items: RundownItem[];
    title: string;
    columns?: Column[];
    timezone?: string;
    startTime?: string;
    showDate?: Date | null;
    externalNotes?: string;
  }, operation: string): boolean => {
    if (process.env.NODE_ENV !== 'development') return true;

    try {
      // Run signature consistency check
      const isConsistent = assertSignatureConsistency(data, `${context}_${operation}`);
      
      // Additional validations
      const hasValidItems = Array.isArray(data.items);
      const hasValidTitle = typeof data.title === 'string';
      const hasValidColumns = !data.columns || Array.isArray(data.columns);
      
      if (!hasValidItems || !hasValidTitle || !hasValidColumns) {
        logPerformanceAnomaly('state_loops', 'high', {
          context,
          rundownId,
          operation,
          validationErrors: {
            hasValidItems,
            hasValidTitle,
            hasValidColumns
          }
        });
        return false;
      }
      
      return isConsistent;
    } catch (error) {
      logPerformanceAnomaly('state_loops', 'critical', {
        context,
        rundownId,
        operation,
        validationError: error instanceof Error ? error.message : 'Unknown validation error'
      });
      return false;
    }
  }, [context, rundownId]);

  // Memory leak detection
  useEffect(() => {
    let memoryCheckInterval: NodeJS.Timeout;
    
    if (enablePerformanceTracking && typeof window !== 'undefined' && 'performance' in window) {
      memoryCheckInterval = setInterval(() => {
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          const usedMB = memory.usedJSHeapSize / 1024 / 1024;
          const totalMB = memory.totalJSHeapSize / 1024 / 1024;
          
          // Alert if memory usage is high (>500MB) or growing rapidly
          if (usedMB > 500 || (usedMB / totalMB) > 0.9) {
            logPerformanceAnomaly('memory_leak', 'high', {
              context,
              rundownId,
              usedMemoryMB: usedMB,
              totalMemoryMB: totalMB,
              memoryUsageRatio: usedMB / totalMB
            });
          }
        }
      }, 30000); // Check every 30 seconds
    }
    
    return () => {
      if (memoryCheckInterval) {
        clearInterval(memoryCheckInterval);
      }
    };
  }, [context, rundownId, enablePerformanceTracking]);

  return {
    // Core audit functions
    auditDataSignatures,
    trackStateTransition,
    trackConflictResolution,
    validateDataConsistency,
    
    // Performance tracking
    trackSave,
    startOperation,
    endOperation,
    
    // Convenience functions for common patterns
    trackAutosave: () => trackSave('autosave'),
    trackManualSave: () => trackSave('manual'),
    trackUndoSave: () => trackSave('undo'),
    
    // State transition helpers
    trackInitialization: (from: string) => trackStateTransition(from, 'initialized', 'Component mounted'),
    trackEdit: (field: string) => trackStateTransition('idle', 'editing', `Field ${field} changed`),
    trackSaveStart: () => trackStateTransition('editing', 'saving', 'Save operation started'),
    trackSaveComplete: () => trackStateTransition('saving', 'saved', 'Save operation completed'),
    trackError: (error: string) => trackStateTransition('any', 'error', `Error: ${error}`),
    
    // Operation timing helpers for common operations
    startSaveOperation: () => startOperation('save'),
    endSaveOperation: () => endOperation('save', 2000), // Expected: 2 seconds
    startSignatureOperation: () => startOperation('signature'),
    endSignatureOperation: () => endOperation('signature', 100), // Expected: 100ms
    startRenderOperation: () => startOperation('render'),
    endRenderOperation: () => endOperation('render', 16), // Expected: 16ms (60fps)
  };
};

export default useSystemAuditIntegration;