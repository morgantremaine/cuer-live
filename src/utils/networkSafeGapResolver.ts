/**
 * Network-Safe Gap Resolution System
 * Implements operation-aware gap resolution that preserves local operations
 * and only applies non-conflicting server changes
 */

import { operationFingerprinter } from './operationFingerprint';
import { localShadowStore } from '@/state/localShadows';
import { normalizeTimestamp } from './realtimeUtils';
import { gapResolverLogger } from './networkSafeGapResolverLogger';

interface GapResolutionResult {
  shouldApply: boolean;
  mergedData?: any;
  reason: string;
  preservedOperations: string[];
  appliedServerChanges: string[];
  conflictsDetected: number;
}

interface GapResolutionOptions {
  currentData: any;
  serverData: any;
  serverTimestamp: string;
  serverDocVersion: number;
  currentDocVersion: number;
  rundownId: string;
}

class NetworkSafeGapResolver {
  private resolutionInProgress = new Map<string, boolean>();
  private lastResolutionTime = new Map<string, number>();
  private minResolutionInterval = 1000; // 1 second minimum between resolutions

  // Main gap resolution entry point
  async resolveGap(options: GapResolutionOptions): Promise<GapResolutionResult> {
    const {
      currentData,
      serverData,
      serverTimestamp,
      serverDocVersion,
      currentDocVersion,
      rundownId
    } = options;

    const startTime = Date.now();
    const gap = serverDocVersion - currentDocVersion;

    // Log gap detection
    gapResolverLogger.logGapDetected(rundownId, {
      serverVersion: serverDocVersion,
      currentVersion: currentDocVersion,
      gap,
      reason: 'Version gap detected during realtime update'
    });

    console.log('🔄 Network-safe gap resolution started:', {
      serverVersion: serverDocVersion,
      currentVersion: currentDocVersion,
      gap,
      rundownId
    });

    // Check if resolution is already in progress
    if (this.resolutionInProgress.get(rundownId)) {
      return {
        shouldApply: false,
        reason: 'Gap resolution already in progress',
        preservedOperations: [],
        appliedServerChanges: [],
        conflictsDetected: 0
      };
    }

    // Rate limiting - prevent too frequent resolutions
    const lastResolution = this.lastResolutionTime.get(rundownId) || 0;
    const timeSinceLastResolution = Date.now() - lastResolution;
    if (timeSinceLastResolution < this.minResolutionInterval) {
      return {
        shouldApply: false,
        reason: 'Rate limited - too soon since last resolution',
        preservedOperations: [],
        appliedServerChanges: [],
        conflictsDetected: 0
      };
    }

    this.resolutionInProgress.set(rundownId, true);
    this.lastResolutionTime.set(rundownId, Date.now());

    try {
      return await this.performResolution(options);
    } finally {
      this.resolutionInProgress.delete(rundownId);
    }
  }

  // Perform the actual gap resolution
  private async performResolution(options: GapResolutionOptions): Promise<GapResolutionResult> {
    const { serverData, serverTimestamp, currentData } = options;
    
    // Step 1: Check for active user operations
    const activeShadows = localShadowStore.getActiveShadows();
    const hasActiveOperations = activeShadows.items.size > 0 || activeShadows.globals.size > 0;

    if (hasActiveOperations) {
      console.log('🛡️ Gap resolution deferred - active user operations detected:', {
        activeItems: activeShadows.items.size,
        activeGlobals: activeShadows.globals.size
      });

      return {
        shouldApply: false,
        reason: 'Deferred due to active user operations',
        preservedOperations: Array.from(activeShadows.items.keys()).concat(Array.from(activeShadows.globals.keys())),
        appliedServerChanges: [],
        conflictsDetected: activeShadows.items.size + activeShadows.globals.size
      };
    }

    // Step 2: Check for recent conflicting operations
    const serverTimestampMs = new Date(normalizeTimestamp(serverTimestamp)).getTime();
    const conflictingOperations = operationFingerprinter.getConflictingOperations(serverData, serverTimestampMs);

    if (conflictingOperations.length > 0) {
      console.log('⚠️ Gap resolution conflicts detected:', {
        conflictCount: conflictingOperations.length,
        conflicts: conflictingOperations.map(c => ({
          field: c.fieldKey,
          localOp: c.localOperation.operationType,
          timestamp: c.localOperation.timestamp
        }))
      });

      // Perform selective merge
      const mergeResult = operationFingerprinter.applySelectiveMerge(
        currentData,
        serverData,
        serverTimestampMs
      );

      return {
        shouldApply: true,
        mergedData: mergeResult.mergedData,
        reason: 'Selective merge applied to resolve conflicts',
        preservedOperations: mergeResult.preservedOperations,
        appliedServerChanges: mergeResult.appliedServerChanges,
        conflictsDetected: conflictingOperations.length
      };
    }

    // Step 3: Check for queued operations that haven't been sent yet
    const recentOperations = operationFingerprinter.getRecentOperations(5000); // 5 seconds
    if (recentOperations.length > 0) {
      console.log('🔄 Gap resolution detecting recent operations:', {
        operationCount: recentOperations.length,
        operations: recentOperations.map(op => ({
          type: op.operationType,
          target: op.target,
          timestamp: op.timestamp
        }))
      });

      // Check if these operations would be overwritten
      const wouldOverwrite = this.checkForOverwrite(recentOperations, serverData);
      if (wouldOverwrite.length > 0) {
        console.log('🛡️ Gap resolution would overwrite recent operations:', wouldOverwrite);
        
        return {
          shouldApply: false,
          reason: 'Would overwrite recent local operations',
          preservedOperations: wouldOverwrite.map(op => `${op.target}-${op.field || 'global'}`),
          appliedServerChanges: [],
          conflictsDetected: wouldOverwrite.length
        };
      }
    }

    // Step 4: Safe to apply server data
    console.log('✅ Gap resolution safe to apply server data');
    
    return {
      shouldApply: true,
      mergedData: serverData,
      reason: 'No conflicts detected - safe to apply server data',
      preservedOperations: [],
      appliedServerChanges: this.getChangedFields(currentData, serverData),
      conflictsDetected: 0
    };
  }

  // Check if recent operations would be overwritten by server data
  private checkForOverwrite(recentOperations: any[], serverData: any): any[] {
    const wouldOverwrite: any[] = [];

    recentOperations.forEach(operation => {
      if (operation.operationType === 'cell_edit') {
        // Check if server data has different value for this field
        const serverItem = serverData.items?.find((item: any) => item.id === operation.target);
        if (serverItem && operation.field) {
          const serverValue = serverItem[operation.field];
          if (JSON.stringify(serverValue) !== JSON.stringify(operation.value)) {
            wouldOverwrite.push(operation);
          }
        }
      } else if (operation.operationType === 'global_edit') {
        // Check global field
        const serverValue = serverData[operation.target];
        if (JSON.stringify(serverValue) !== JSON.stringify(operation.value)) {
          wouldOverwrite.push(operation);
        }
      }
    });

    return wouldOverwrite;
  }

  // Get list of fields that changed between current and server data
  private getChangedFields(currentData: any, serverData: any): string[] {
    const changes: string[] = [];

    // Check global fields
    ['title', 'start_time', 'timezone', 'external_notes', 'show_date'].forEach(field => {
      if (JSON.stringify(currentData[field]) !== JSON.stringify(serverData[field])) {
        changes.push(field);
      }
    });

    // Check items (simplified - just count if items array changed)
    if (JSON.stringify(currentData.items) !== JSON.stringify(serverData.items)) {
      changes.push('items');
    }

    return changes;
  }

  // Queue gap resolution for later processing
  queueGapResolution(options: GapResolutionOptions, onResolve: (result: GapResolutionResult) => void): void {
    const { rundownId } = options;
    
    console.log('📦 Queueing gap resolution for later processing:', rundownId);
    
    // Check every second if it's safe to process
    const checkInterval = setInterval(async () => {
      const activeShadows = localShadowStore.getActiveShadows();
      const hasActiveOperations = activeShadows.items.size > 0 || activeShadows.globals.size > 0;
      
      if (!hasActiveOperations) {
        clearInterval(checkInterval);
        console.log('🔄 Processing queued gap resolution:', rundownId);
        
        try {
          const result = await this.resolveGap(options);
          onResolve(result);
        } catch (error) {
          console.error('❌ Error processing queued gap resolution:', error);
          onResolve({
            shouldApply: false,
            reason: `Error during resolution: ${error}`,
            preservedOperations: [],
            appliedServerChanges: [],
            conflictsDetected: 0
          });
        }
      }
    }, 1000);
    
    // Timeout after 30 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      console.warn('⏰ Gap resolution timeout - forcing application');
      onResolve({
        shouldApply: true,
        mergedData: options.serverData,
        reason: 'Timeout - forced application',
        preservedOperations: [],
        appliedServerChanges: [],
        conflictsDetected: 0
      });
    }, 30000);
  }

  // Get resolution statistics
  getStats(): {
    activeResolutions: number;
    recentResolutions: number;
    lastResolutionTimes: Record<string, number>;
  } {
    const now = Date.now();
    const recentWindow = 60000; // 1 minute
    
    const recentResolutions = Array.from(this.lastResolutionTime.values())
      .filter(time => (now - time) <= recentWindow).length;
    
    return {
      activeResolutions: this.resolutionInProgress.size,
      recentResolutions,
      lastResolutionTimes: Object.fromEntries(this.lastResolutionTime)
    };
  }
}

// Global singleton
export const networkSafeGapResolver = new NetworkSafeGapResolver();

export default networkSafeGapResolver;