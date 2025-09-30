/**
 * Debug utilities for Network-Safe Gap Resolution
 * Provides runtime debugging tools and diagnostics
 */

import { gapResolverLogger } from './networkSafeGapResolverLogger';
import { operationFingerprinter } from './operationFingerprint';
import { localShadowStore } from '@/state/localShadows';

interface DebugSnapshot {
  timestamp: number;
  rundownId: string;
  activeShadows: {
    items: number;
    globals: number;
    details: any;
  };
  recentOperations: {
    count: number;
    operations: any[];
  };
  gapResolverStats: any;
  networkState: {
    isOnline: boolean;
    connectionStable: boolean;
  };
}

class GapResolutionDebugger {
  private snapshots: DebugSnapshot[] = [];
  private maxSnapshots = 50;

  // Take a debug snapshot
  takeSnapshot(rundownId: string, context: string = 'manual'): DebugSnapshot {
    const activeShadows = localShadowStore.getActiveShadows();
    const recentOperations = operationFingerprinter.getRecentOperations(10000); // 10 seconds
    const gapStats = gapResolverLogger.getStats(rundownId);
    
    const snapshot: DebugSnapshot = {
      timestamp: Date.now(),
      rundownId,
      activeShadows: {
        items: activeShadows.items.size,
        globals: activeShadows.globals.size,
        details: {
          items: Array.from(activeShadows.items.keys()),
          globals: Array.from(activeShadows.globals.keys())
        }
      },
      recentOperations: {
        count: recentOperations.length,
        operations: recentOperations.map(op => ({
          type: op.operationType,
          target: op.target,
          field: op.field,
          timestamp: op.timestamp,
          age: Date.now() - op.timestamp
        }))
      },
      gapResolverStats: gapStats,
      networkState: {
        isOnline: navigator.onLine,
        connectionStable: true // TODO: integrate with network status
      }
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    console.log('📸 Debug snapshot taken:', {
      context,
      rundownId,
      activeShadows: snapshot.activeShadows.items + snapshot.activeShadows.globals,
      recentOps: snapshot.recentOperations.count,
      resolutions: snapshot.gapResolverStats.totalResolutions
    });

    return snapshot;
  }

  // Analyze gap resolution issues
  analyzeIssues(rundownId: string): {
    issues: string[];
    recommendations: string[];
    severity: 'low' | 'medium' | 'high';
  } {
    const stats = gapResolverLogger.getStats(rundownId);
    const recentLogs = gapResolverLogger.getRecentLogs(rundownId, 300000); // 5 minutes
    const activeShadows = localShadowStore.getActiveShadows();
    const recentOperations = operationFingerprinter.getRecentOperations(5000);

    const issues: string[] = [];
    const recommendations: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';

    // Check for high conflict rate
    const conflictRate = stats.totalResolutions > 0 ? 
      stats.conflictsDetected / stats.totalResolutions : 0;
    
    if (conflictRate > 0.5) {
      issues.push(`High conflict rate: ${Math.round(conflictRate * 100)}%`);
      recommendations.push('Consider reducing operation frequency or improving coordination');
      severity = 'high';
    }

    // Check for failed resolutions
    const failureRate = stats.totalResolutions > 0 ?
      (stats.totalResolutions - stats.successfulResolutions) / stats.totalResolutions : 0;
    
    if (failureRate > 0.2) {
      issues.push(`High failure rate: ${Math.round(failureRate * 100)}%`);
      recommendations.push('Check network stability and operation queue health');
      if (severity === 'low') severity = 'medium';
    }

    // Check for stuck operations
    const oldOperations = recentOperations.filter(op => 
      (Date.now() - op.timestamp) > 10000 // 10 seconds
    );
    
    if (oldOperations.length > 0) {
      issues.push(`${oldOperations.length} operations older than 10 seconds`);
      recommendations.push('Check operation queue processing and network connectivity');
      if (severity === 'low') severity = 'medium';
    }

    // Check for too many active shadows
    const totalActiveShadows = activeShadows.items.size + activeShadows.globals.size;
    if (totalActiveShadows > 10) {
      issues.push(`Too many active shadows: ${totalActiveShadows}`);
      recommendations.push('User may be editing too many fields simultaneously');
      if (severity === 'low') severity = 'medium';
    }

    // Check for frequent gap detections
    const recentGaps = recentLogs.filter(log => log.type === 'gap_detected').length;
    if (recentGaps > 5) {
      issues.push(`Frequent gap detections: ${recentGaps} in 5 minutes`);
      recommendations.push('Check network stability and consider reducing update frequency');
      severity = 'high';
    }

    if (issues.length === 0) {
      issues.push('No issues detected');
      recommendations.push('Gap resolution system is functioning normally');
    }

    return { issues, recommendations, severity };
  }

  // Generate comprehensive debug report
  generateDebugReport(rundownId: string): string {
    const snapshot = this.takeSnapshot(rundownId, 'debug_report');
    const analysis = this.analyzeIssues(rundownId);
    const operationStats = operationFingerprinter.getStats();
    
    const report = [
      `=== Gap Resolution Debug Report ===`,
      `Rundown ID: ${rundownId}`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      `=== Current State ===`,
      `Active Shadows: ${snapshot.activeShadows.items} items, ${snapshot.activeShadows.globals} globals`,
      `Recent Operations: ${snapshot.recentOperations.count}`,
      `Network Online: ${snapshot.networkState.isOnline}`,
      ``,
      `=== Issue Analysis ===`,
      `Severity: ${analysis.severity.toUpperCase()}`,
      `Issues:`,
      ...analysis.issues.map(issue => `  - ${issue}`),
      ``,
      `Recommendations:`,
      ...analysis.recommendations.map(rec => `  - ${rec}`),
      ``,
      `=== Operation Fingerprinting ===`,
      `Total Operations Tracked: ${operationStats.totalOperations}`,
      `Total Field Changes: ${operationStats.totalFieldChanges}`,
      `Oldest Operation: ${operationStats.oldestOperation ? new Date(operationStats.oldestOperation).toISOString() : 'None'}`,
      `Newest Operation: ${operationStats.newestOperation ? new Date(operationStats.newestOperation).toISOString() : 'None'}`,
      ``,
      `=== Recent Operations ===`
    ];

    snapshot.recentOperations.operations.slice(0, 10).forEach(op => {
      report.push(`  - ${op.type} on ${op.target}${op.field ? '.' + op.field : ''} (${Math.round(op.age / 1000)}s ago)`);
    });

    if (snapshot.activeShadows.details.items.length > 0) {
      report.push(``, `=== Active Item Shadows ===`);
      snapshot.activeShadows.details.items.forEach((itemId: string) => {
        report.push(`  - ${itemId}`);
      });
    }

    if (snapshot.activeShadows.details.globals.length > 0) {
      report.push(``, `=== Active Global Shadows ===`);
      snapshot.activeShadows.details.globals.forEach((field: string) => {
        report.push(`  - ${field}`);
      });
    }

    return report.join('\n');
  }

  // Monitor gap resolution in real-time
  startMonitoring(rundownId: string, intervalMs: number = 5000): () => void {
    console.log('🔍 Starting gap resolution monitoring for:', rundownId);
    
    const interval = setInterval(() => {
      const analysis = this.analyzeIssues(rundownId);
      
      if (analysis.severity === 'high') {
        console.warn('🚨 HIGH SEVERITY gap resolution issues detected:', analysis.issues);
      } else if (analysis.severity === 'medium') {
        console.warn('⚠️ MEDIUM SEVERITY gap resolution issues detected:', analysis.issues);
      }
      
      // Take periodic snapshots
      this.takeSnapshot(rundownId, 'monitoring');
    }, intervalMs);

    return () => {
      clearInterval(interval);
      console.log('🔍 Gap resolution monitoring stopped for:', rundownId);
    };
  }

  // Get recent snapshots
  getRecentSnapshots(rundownId: string, count: number = 10): DebugSnapshot[] {
    return this.snapshots
      .filter(snapshot => snapshot.rundownId === rundownId)
      .slice(-count)
      .reverse();
  }

  // Compare two snapshots
  compareSnapshots(before: DebugSnapshot, after: DebugSnapshot): {
    shadowsChanged: boolean;
    operationsChanged: boolean;
    resolutionsChanged: boolean;
    summary: string;
  } {
    const shadowsChanged = 
      before.activeShadows.items !== after.activeShadows.items ||
      before.activeShadows.globals !== after.activeShadows.globals;
    
    const operationsChanged = 
      before.recentOperations.count !== after.recentOperations.count;
    
    const resolutionsChanged = 
      before.gapResolverStats.totalResolutions !== after.gapResolverStats.totalResolutions;

    const changes: string[] = [];
    if (shadowsChanged) changes.push('shadows');
    if (operationsChanged) changes.push('operations');
    if (resolutionsChanged) changes.push('resolutions');

    const summary = changes.length > 0 ? 
      `Changed: ${changes.join(', ')}` : 
      'No significant changes';

    return {
      shadowsChanged,
      operationsChanged,
      resolutionsChanged,
      summary
    };
  }
}

// Global singleton
export const gapResolutionDebugger = new GapResolutionDebugger();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).gapResolutionDebugger = gapResolutionDebugger;
  (window as any).debugGapResolution = (rundownId: string) => {
    console.log(gapResolutionDebugger.generateDebugReport(rundownId));
  };
}

export default gapResolutionDebugger;