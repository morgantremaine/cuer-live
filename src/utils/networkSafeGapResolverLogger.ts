/**
 * Enhanced Logging for Network-Safe Gap Resolution
 * Provides detailed debugging and monitoring for gap resolution operations
 */

interface LogEntry {
  timestamp: number;
  rundownId: string;
  type: 'gap_detected' | 'resolution_started' | 'resolution_completed' | 'conflict_detected' | 'operation_preserved' | 'server_change_applied';
  details: any;
}

class NetworkSafeGapResolverLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;
  private logToConsole = true;

  // Log gap detection
  logGapDetected(rundownId: string, details: {
    serverVersion: number;
    currentVersion: number;
    gap: number;
    reason: string;
  }): void {
    this.addLog(rundownId, 'gap_detected', details);
    
    if (this.logToConsole) {
      console.log('🔍 GAP DETECTED:', {
        rundownId,
        serverV: details.serverVersion,
        currentV: details.currentVersion,
        gap: details.gap,
        reason: details.reason
      });
    }
  }

  // Log resolution start
  logResolutionStarted(rundownId: string, details: {
    strategy: string;
    activeShadows: number;
    conflictingOperations: number;
    serverTimestamp: string;
  }): void {
    this.addLog(rundownId, 'resolution_started', details);
    
    if (this.logToConsole) {
      console.log('🔄 RESOLUTION STARTED:', {
        rundownId,
        strategy: details.strategy,
        shadows: details.activeShadows,
        conflicts: details.conflictingOperations
      });
    }
  }

  // Log resolution completion
  logResolutionCompleted(rundownId: string, details: {
    success: boolean;
    strategy: string;
    preservedOperations: string[];
    appliedServerChanges: string[];
    conflictsResolved: number;
    duration: number;
  }): void {
    this.addLog(rundownId, 'resolution_completed', details);
    
    if (this.logToConsole) {
      console.log('✅ RESOLUTION COMPLETED:', {
        rundownId,
        success: details.success,
        strategy: details.strategy,
        preserved: details.preservedOperations.length,
        applied: details.appliedServerChanges.length,
        conflicts: details.conflictsResolved,
        duration: `${details.duration}ms`
      });
    }
  }

  // Log conflict detection
  logConflictDetected(rundownId: string, details: {
    fieldKey: string;
    localValue: any;
    serverValue: any;
    operationType: string;
    operationTimestamp: number;
    serverTimestamp: number;
  }): void {
    this.addLog(rundownId, 'conflict_detected', details);
    
    if (this.logToConsole) {
      console.warn('⚠️ CONFLICT DETECTED:', {
        rundownId,
        field: details.fieldKey,
        opType: details.operationType,
        localNewer: details.operationTimestamp > details.serverTimestamp,
        timeDiff: details.operationTimestamp - details.serverTimestamp
      });
    }
  }

  // Log operation preservation
  logOperationPreserved(rundownId: string, details: {
    operationType: string;
    target: string;
    field?: string;
    reason: string;
    timestamp: number;
  }): void {
    this.addLog(rundownId, 'operation_preserved', details);
    
    if (this.logToConsole) {
      console.log('🛡️ OPERATION PRESERVED:', {
        rundownId,
        type: details.operationType,
        target: details.target,
        field: details.field,
        reason: details.reason
      });
    }
  }

  // Log server change application
  logServerChangeApplied(rundownId: string, details: {
    fieldKey: string;
    oldValue: any;
    newValue: any;
    reason: string;
  }): void {
    this.addLog(rundownId, 'server_change_applied', details);
    
    if (this.logToConsole) {
      console.log('📥 SERVER CHANGE APPLIED:', {
        rundownId,
        field: details.fieldKey,
        reason: details.reason,
        changed: JSON.stringify(details.oldValue) !== JSON.stringify(details.newValue)
      });
    }
  }

  // Add log entry
  private addLog(rundownId: string, type: LogEntry['type'], details: any): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      rundownId,
      type,
      details
    };

    this.logs.push(entry);

    // Maintain log size limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  // Get recent logs for debugging
  getRecentLogs(rundownId?: string, maxAge: number = 300000): LogEntry[] {
    const now = Date.now();
    let filtered = this.logs.filter(log => (now - log.timestamp) <= maxAge);
    
    if (rundownId) {
      filtered = filtered.filter(log => log.rundownId === rundownId);
    }
    
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Get resolution statistics
  getStats(rundownId?: string): {
    totalResolutions: number;
    successfulResolutions: number;
    conflictsDetected: number;
    operationsPreserved: number;
    averageResolutionTime: number;
    recentActivity: number;
  } {
    const logs = rundownId ? 
      this.logs.filter(log => log.rundownId === rundownId) : 
      this.logs;
    
    const resolutions = logs.filter(log => log.type === 'resolution_completed');
    const conflicts = logs.filter(log => log.type === 'conflict_detected');
    const preserved = logs.filter(log => log.type === 'operation_preserved');
    
    const successful = resolutions.filter(log => log.details.success);
    
    const durations = resolutions
      .map(log => log.details.duration)
      .filter(d => typeof d === 'number');
    
    const averageTime = durations.length > 0 ? 
      durations.reduce((sum, d) => sum + d, 0) / durations.length : 
      0;
    
    const now = Date.now();
    const recentWindow = 300000; // 5 minutes
    const recentActivity = logs.filter(log => 
      (now - log.timestamp) <= recentWindow
    ).length;
    
    return {
      totalResolutions: resolutions.length,
      successfulResolutions: successful.length,
      conflictsDetected: conflicts.length,
      operationsPreserved: preserved.length,
      averageResolutionTime: Math.round(averageTime),
      recentActivity
    };
  }

  // Generate resolution report
  generateReport(rundownId: string, maxAge: number = 600000): string {
    const logs = this.getRecentLogs(rundownId, maxAge);
    const stats = this.getStats(rundownId);
    
    const report = [
      `=== Network-Safe Gap Resolution Report ===`,
      `Rundown ID: ${rundownId}`,
      `Report Period: ${Math.round(maxAge / 60000)} minutes`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      `=== Statistics ===`,
      `Total Resolutions: ${stats.totalResolutions}`,
      `Successful: ${stats.successfulResolutions}`,
      `Success Rate: ${stats.totalResolutions > 0 ? Math.round((stats.successfulResolutions / stats.totalResolutions) * 100) : 0}%`,
      `Conflicts Detected: ${stats.conflictsDetected}`,
      `Operations Preserved: ${stats.operationsPreserved}`,
      `Average Resolution Time: ${stats.averageResolutionTime}ms`,
      `Recent Activity: ${stats.recentActivity} events`,
      ``,
      `=== Recent Events ===`
    ];
    
    logs.slice(0, 20).forEach(log => {
      const timeAgo = Math.round((Date.now() - log.timestamp) / 1000);
      report.push(`[${timeAgo}s ago] ${log.type.toUpperCase()}: ${this.formatLogDetails(log)}`);
    });
    
    return report.join('\n');
  }

  // Format log details for display
  private formatLogDetails(log: LogEntry): string {
    switch (log.type) {
      case 'gap_detected':
        return `Gap ${log.details.gap} (${log.details.currentVersion} -> ${log.details.serverVersion})`;
      
      case 'resolution_started':
        return `Strategy: ${log.details.strategy}, ${log.details.activeShadows} shadows, ${log.details.conflictingOperations} conflicts`;
      
      case 'resolution_completed':
        return `${log.details.success ? 'SUCCESS' : 'FAILED'} - ${log.details.preservedOperations.length} preserved, ${log.details.appliedServerChanges.length} applied`;
      
      case 'conflict_detected':
        return `Field: ${log.details.fieldKey}, Op: ${log.details.operationType}`;
      
      case 'operation_preserved':
        return `${log.details.operationType} on ${log.details.target}${log.details.field ? '.' + log.details.field : ''} - ${log.details.reason}`;
      
      case 'server_change_applied':
        return `Field: ${log.details.fieldKey} - ${log.details.reason}`;
      
      default:
        return JSON.stringify(log.details);
    }
  }

  // Clear logs
  clearLogs(rundownId?: string): void {
    if (rundownId) {
      this.logs = this.logs.filter(log => log.rundownId !== rundownId);
    } else {
      this.logs = [];
    }
    
    console.log('🧹 Gap resolution logs cleared', rundownId ? `for ${rundownId}` : '(all)');
  }

  // Toggle console logging
  setConsoleLogging(enabled: boolean): void {
    this.logToConsole = enabled;
    console.log(`🔧 Gap resolution console logging ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Global singleton
export const gapResolverLogger = new NetworkSafeGapResolverLogger();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).gapResolverLogger = gapResolverLogger;
}

export default gapResolverLogger;