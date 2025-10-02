/**
 * Save Coordination Dashboard
 * Provides real-time monitoring and debugging for save operations
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { useSaveCoordinationOptimizer } from './useSaveCoordinationOptimizer';
import { useUnifiedSaveCoordination } from './useUnifiedSaveCoordination';

interface DashboardMetrics {
  saveOperations: SaveOperationLog[];
  performanceStats: {
    averageSaveTime: number;
    totalSaves: number;
    successRate: number;
    coordinationEfficiency: number;
  };
  realTimeStatus: {
    activeSaves: number;
    queuedSaves: number;
    blockedSaves: number;
    currentMode: 'per-cell' | 'delta';
  };
  warnings: string[];
}

interface SaveOperationLog {
  id: string;
  type: 'cell' | 'structural' | 'delta' | 'showcaller';
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'success' | 'failed' | 'blocked';
  rundownId: string;
  mode: 'per-cell' | 'delta';
  error?: string;
}

export const useSaveCoordinationDashboard = (rundownData?: { per_cell_save_enabled?: boolean; id?: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const operationLogsRef = useRef<SaveOperationLog[]>([]);
  const warningsRef = useRef<string[]>([]);
  const refreshIntervalRef = useRef<NodeJS.Timeout>();

  const coordinationOptimizer = useSaveCoordinationOptimizer(rundownData);
  const saveCoordination = useUnifiedSaveCoordination(rundownData);

  // Log save operations
  const logSaveOperation = useCallback((operation: Omit<SaveOperationLog, 'id'>) => {
    const log: SaveOperationLog = {
      ...operation,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    operationLogsRef.current.unshift(log);

    // Keep only last 100 operations
    if (operationLogsRef.current.length > 100) {
      operationLogsRef.current = operationLogsRef.current.slice(0, 100);
    }

    // Add warning for slow operations
    if (log.duration && log.duration > 5000) {
      addWarning(`Slow save operation detected: ${log.type} took ${log.duration}ms`);
    }

    // Add warning for failed operations
    if (log.status === 'failed') {
      addWarning(`Save operation failed: ${log.type} - ${log.error || 'Unknown error'}`);
    }
  }, []);

  // Add warning to dashboard
  const addWarning = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    warningsRef.current.unshift(`[${timestamp}] ${message}`);

    // Keep only last 20 warnings
    if (warningsRef.current.length > 20) {
      warningsRef.current = warningsRef.current.slice(0, 20);
    }
  }, []);

  // Get current dashboard metrics
  const getDashboardMetrics = useCallback((): DashboardMetrics => {
    const logs = operationLogsRef.current;
    const recentLogs = logs.filter(log => Date.now() - log.startTime < 60000); // Last minute
    
    const successfulOps = recentLogs.filter(log => log.status === 'success');
    const totalOps = recentLogs.length;
    const successRate = totalOps > 0 ? (successfulOps.length / totalOps) * 100 : 0;

    const completedOps = recentLogs.filter(log => log.duration);
    const averageSaveTime = completedOps.length > 0 
      ? completedOps.reduce((sum, log) => sum + (log.duration || 0), 0) / completedOps.length
      : 0;

    const coordinationMetrics = coordinationOptimizer.getCoordinationMetrics();
    const saveState = saveCoordination.getCoordinationState();

    return {
      saveOperations: logs.slice(0, 20), // Show last 20 operations
      performanceStats: {
        averageSaveTime: Math.round(averageSaveTime),
        totalSaves: coordinationMetrics.totalSaves,
        successRate: Math.round(successRate),
        coordinationEfficiency: Math.round(coordinationMetrics.efficiency * 100)
      },
      realTimeStatus: {
        activeSaves: saveState.activeSaveCount,
        queuedSaves: saveState.queuedSaveCount,
        blockedSaves: 0, // Would need to track this separately
        currentMode: coordinationOptimizer.getCoordinationStrategy().mode as 'per-cell' | 'delta'
      },
      warnings: warningsRef.current.slice(0, 10)
    };
  }, [coordinationOptimizer, saveCoordination]);

  // Monitor save operations and log them
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      const metrics = coordinationOptimizer.getCoordinationMetrics();
      const currentStrategy = coordinationOptimizer.getCoordinationStrategy();
      
      // Check for performance issues
      if (metrics.averageCoordinationTime > 3000) {
        addWarning(`High coordination time detected: ${metrics.averageCoordinationTime}ms average`);
      }

      // Check for queue backlog
      const saveState = saveCoordination.getCoordinationState();
      if (saveState.queuedSaveCount > 5) {
        addWarning(`High save queue detected: ${saveState.queuedSaveCount} operations queued`);
      }

    }, 1000);

    refreshIntervalRef.current = interval;
    return () => clearInterval(interval);
  }, [autoRefresh, coordinationOptimizer, saveCoordination, addWarning]);

  // Dashboard controls
  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => !prev);
  }, []);

  const clearLogs = useCallback(() => {
    operationLogsRef.current = [];
    warningsRef.current = [];
  }, []);

  const exportMetrics = useCallback(() => {
    const metrics = getDashboardMetrics();
    const exportData = {
      timestamp: new Date().toISOString(),
      rundownId: rundownData?.id,
      metrics,
      strategy: coordinationOptimizer.getCoordinationStrategy()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `save-coordination-metrics-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [getDashboardMetrics, rundownData, coordinationOptimizer]);

  // Performance health check
  const getHealthStatus = useCallback(() => {
    const metrics = getDashboardMetrics();
    const warnings = [];

    if (metrics.performanceStats.averageSaveTime > 3000) {
      warnings.push('High average save time');
    }

    if (metrics.performanceStats.successRate < 90) {
      warnings.push('Low save success rate');
    }

    if (metrics.realTimeStatus.queuedSaves > 10) {
      warnings.push('High save queue backlog');
    }

    return {
      status: warnings.length === 0 ? 'healthy' : warnings.length <= 2 ? 'warning' : 'critical',
      warnings,
      score: Math.max(0, 100 - (warnings.length * 20))
    };
  }, [getDashboardMetrics]);

  return {
    // Dashboard state
    isVisible,
    autoRefresh,
    
    // Dashboard data
    getDashboardMetrics,
    getHealthStatus,
    
    // Dashboard controls
    toggleVisibility,
    toggleAutoRefresh,
    clearLogs,
    exportMetrics,
    
    // Logging functions (for integration with save systems)
    logSaveOperation,
    addWarning
  };
};
