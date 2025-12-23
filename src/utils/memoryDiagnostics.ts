/**
 * Memory diagnostics utility for debugging memory usage in large rundowns
 * Call window.memoryDiag() from console to see detailed breakdown
 * Call window.memoryDiagDeep() for extended analysis
 */

import { broadcastBatcher } from './broadcastBatcher';
import { cellBroadcast } from './cellBroadcast';
import { getGlobalSubscriptionStats } from '@/hooks/useConsolidatedRealtimeRundown';

// Rough size estimation for objects
const estimateObjectSize = (obj: any, seen = new WeakSet()): number => {
  if (obj === null || obj === undefined) return 0;
  if (typeof obj === 'boolean') return 4;
  if (typeof obj === 'number') return 8;
  if (typeof obj === 'string') return obj.length * 2;
  if (typeof obj !== 'object') return 0;
  
  if (seen.has(obj)) return 0; // Avoid circular references
  seen.add(obj);
  
  let size = 0;
  if (Array.isArray(obj)) {
    size += obj.length * 8; // Array overhead
    for (const item of obj) {
      size += estimateObjectSize(item, seen);
    }
  } else if (obj instanceof Map) {
    size += obj.size * 16; // Map overhead
    for (const [key, value] of obj.entries()) {
      size += estimateObjectSize(key, seen);
      size += estimateObjectSize(value, seen);
    }
  } else if (obj instanceof Set) {
    size += obj.size * 8;
    for (const value of obj.values()) {
      size += estimateObjectSize(value, seen);
    }
  } else {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        size += key.length * 2; // Key size
        size += estimateObjectSize(obj[key], seen);
      }
    }
  }
  return size;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

interface TrackedObjectEstimate {
  name: string;
  size: string;
  sizeBytes: number;
  count?: number;
  details?: string;
  category?: string;
}

interface GlobalServiceStats {
  cellBroadcast: ReturnType<typeof cellBroadcast.getStats>;
  subscriptions: ReturnType<typeof getGlobalSubscriptionStats>;
}

interface ComponentEstimate {
  cellCount: number;
  estimatedOverheadMB: number;
  measuredPerCellKB: number;
  itemCount: number;
  columnCount: number;
}

interface ScalingProjection {
  rows: number;
  estimatedMB: number;
  status: 'ok' | 'warning' | 'danger';
}

interface MemoryBudgetAnalysis {
  trackedDataBytes: number;
  reactOverheadBytes: number;
  measuredPerCellKB: number;
  baselineOverheadMB: number;
  scalingProjections: ScalingProjection[];
  maxRecommendedRows: number;
}

interface MemoryReport {
  jsHeap: {
    used: string;
    usedBytes: number;
    total: string;
    limit: string;
    percentage: string;
  } | null;
  estimates: TrackedObjectEstimate[];
  totalTrackedBytes: number;
  componentEstimate: ComponentEstimate | null;
  globalServices: GlobalServiceStats | null;
  broadcastSystem: {
    batcherQueues: {
      cell: number;
      focus: number;
      structural: number;
    };
    currentInterval: string;
    memoryMultiplier: string;
    cellBroadcastChannels: number;
  };
  memoryBudgetAnalysis: MemoryBudgetAnalysis | null;
  recommendations: string[];
}

// Calibrated from actual measurements: ~15KB per cell (down from 50KB estimate)
const CALIBRATED_PER_CELL_KB = 15;
// Baseline app overhead (React, libraries, etc.) - approximately 40MB
const BASELINE_APP_OVERHEAD_MB = 40;

// Registry for trackable objects
const trackedObjects: Map<string, () => { data: any; count?: number; details?: string; category?: string }> = new Map();

export const registerTrackedObject = (name: string, getter: () => { data: any; count?: number; details?: string; category?: string }) => {
  trackedObjects.set(name, getter);
};

export const unregisterTrackedObject = (name: string) => {
  trackedObjects.delete(name);
};

// Store item/column counts for component estimation
let lastKnownItemCount = 0;
let lastKnownColumnCount = 0;

export const setComponentCounts = (items: number, columns: number) => {
  lastKnownItemCount = items;
  lastKnownColumnCount = columns;
};

export const runMemoryDiagnostics = (): MemoryReport => {
  const report: MemoryReport = {
    jsHeap: null,
    estimates: [],
    totalTrackedBytes: 0,
    componentEstimate: null,
    globalServices: null,
    broadcastSystem: {
      batcherQueues: { cell: 0, focus: 0, structural: 0 },
      currentInterval: 'unknown',
      memoryMultiplier: '1x',
      cellBroadcastChannels: 0,
    },
    memoryBudgetAnalysis: null,
    recommendations: [],
  };

  // JS Heap from performance.memory (Chrome only)
  const perf = performance as any;
  let usedBytes = 0;
  if (perf.memory) {
    usedBytes = perf.memory.usedJSHeapSize;
    const total = perf.memory.totalJSHeapSize;
    const limit = perf.memory.jsHeapSizeLimit;
    report.jsHeap = {
      used: formatBytes(usedBytes),
      usedBytes,
      total: formatBytes(total),
      limit: formatBytes(limit),
      percentage: `${((usedBytes / limit) * 100).toFixed(1)}%`,
    };

    if (usedBytes > 600 * 1024 * 1024) {
      report.recommendations.push('🔴 Critical memory usage (>600MB) - refresh recommended');
    } else if (usedBytes > 400 * 1024 * 1024) {
      report.recommendations.push('🟡 High memory usage (>400MB) - monitor closely');
    }
  }

  // Estimate tracked objects
  let totalTrackedBytes = 0;
  for (const [name, getter] of trackedObjects) {
    try {
      const { data, count, details, category } = getter();
      const sizeBytes = estimateObjectSize(data);
      totalTrackedBytes += sizeBytes;
      report.estimates.push({
        name,
        size: formatBytes(sizeBytes),
        sizeBytes,
        count,
        details,
        category,
      });

      // Add recommendations based on findings
      if (name === 'rundown-items' && sizeBytes > 10 * 1024 * 1024) {
        report.recommendations.push(`⚠️ ${name} is large (${formatBytes(sizeBytes)}) - possible large scripts`);
      }
      if (name === 'undo-stack' && count && count >= 5) {
        report.recommendations.push(`ℹ️ Undo stack at max capacity (${count}/5)`);
      }
      if (name === 'script-fields' && sizeBytes > 5 * 1024 * 1024) {
        report.recommendations.push(`⚠️ Script content is ${formatBytes(sizeBytes)} - ${count} fields`);
      }
      if (name === 'recently-edited-fields' && count && count > 50) {
        report.recommendations.push(`ℹ️ ${count} recently edited fields tracked - map may need cleanup`);
      }
    } catch (e) {
      report.estimates.push({
        name,
        size: 'error',
        sizeBytes: 0,
      });
    }
  }
  report.totalTrackedBytes = totalTrackedBytes;

  // Component overhead estimation with calibrated values
  const cellCount = lastKnownItemCount * lastKnownColumnCount;
  if (cellCount > 0) {
    // Calculate measured per-cell overhead from actual heap data
    const reactOverhead = usedBytes - totalTrackedBytes - (BASELINE_APP_OVERHEAD_MB * 1024 * 1024);
    const measuredPerCellKB = cellCount > 0 ? Math.max(0, reactOverhead / cellCount / 1024) : CALIBRATED_PER_CELL_KB;
    
    // Use measured value if reasonable, otherwise fall back to calibrated
    const effectivePerCellKB = (measuredPerCellKB > 5 && measuredPerCellKB < 50) ? measuredPerCellKB : CALIBRATED_PER_CELL_KB;
    const estimatedOverheadMB = (cellCount * effectivePerCellKB * 1024) / (1024 * 1024);
    
    report.componentEstimate = {
      cellCount,
      estimatedOverheadMB,
      measuredPerCellKB: effectivePerCellKB,
      itemCount: lastKnownItemCount,
      columnCount: lastKnownColumnCount,
    };

    // Cell count recommendations are now handled by memory-pressure-based logic below
  }

  // Global services stats
  try {
    report.globalServices = {
      cellBroadcast: cellBroadcast.getStats(),
      subscriptions: getGlobalSubscriptionStats(),
    };
  } catch (e) {
    // Ignore errors
  }

  // Broadcast batcher stats
  try {
    const batcher = broadcastBatcher as any;
    if (batcher.queues) {
      report.broadcastSystem.batcherQueues = {
        cell: batcher.queues.get('cell')?.size || 0,
        focus: batcher.queues.get('focus')?.size || 0,
        structural: batcher.queues.get('structural')?.size || 0,
      };
    }
    if (batcher.config && batcher.memoryPressureMultiplier !== undefined) {
      const interval = (batcher.config.baseBatchInterval || 500) * batcher.memoryPressureMultiplier;
      report.broadcastSystem.currentInterval = `${interval}ms`;
      report.broadcastSystem.memoryMultiplier = `${batcher.memoryPressureMultiplier}x`;
    }
  } catch (e) {
    // Ignore errors
  }

  // Cell broadcast stats
  try {
    const cb = cellBroadcast as any;
    if (cb.channels) {
      report.broadcastSystem.cellBroadcastChannels = cb.channels.size;
    }
  } catch (e) {
    // Ignore errors
  }

  // Memory budget analysis with scaling projections
  if (usedBytes > 0 && lastKnownItemCount > 0 && lastKnownColumnCount > 0) {
    const perCellKB = report.componentEstimate?.measuredPerCellKB || CALIBRATED_PER_CELL_KB;
    const reactOverheadBytes = (cellCount * perCellKB * 1024);
    
    // Calculate scaling projections
    const projectRows = (rows: number): ScalingProjection => {
      const cells = rows * lastKnownColumnCount;
      const estimatedMB = BASELINE_APP_OVERHEAD_MB + (cells * perCellKB / 1024) + (totalTrackedBytes / 1024 / 1024 * (rows / lastKnownItemCount));
      return {
        rows,
        estimatedMB: Math.round(estimatedMB),
        status: estimatedMB > 400 ? 'danger' : estimatedMB > 250 ? 'warning' : 'ok',
      };
    };

    // Calculate max recommended rows (target: stay under 300MB)
    const targetMemoryMB = 300;
    const availableForCells = (targetMemoryMB - BASELINE_APP_OVERHEAD_MB) * 1024; // KB available
    const maxCells = availableForCells / perCellKB;
    const maxRecommendedRows = Math.floor(maxCells / lastKnownColumnCount);

    report.memoryBudgetAnalysis = {
      trackedDataBytes: totalTrackedBytes,
      reactOverheadBytes,
      measuredPerCellKB: perCellKB,
      baselineOverheadMB: BASELINE_APP_OVERHEAD_MB,
      scalingProjections: [
        projectRows(lastKnownItemCount), // Current
        projectRows(300),
        projectRows(500),
        projectRows(800),
        projectRows(1000),
      ],
      maxRecommendedRows,
    };

    // Memory-pressure-based recommendations using actual heap data
    const heapUsedMB = usedBytes / (1024 * 1024);
    
    if (heapUsedMB > 300) {
      report.recommendations.push('🔴 Critical memory usage (>300MB) - reduce rows or consider virtualization');
    } else if (heapUsedMB > 200) {
      report.recommendations.push('⚠️ High memory usage (>200MB) - monitor for potential issues');
    } else if (heapUsedMB > 150) {
      report.recommendations.push('📊 Memory usage moderate - see scaling projections above for limits');
    } else if (cellCount > 0) {
      report.recommendations.push(`✅ Memory usage healthy - running efficiently at ~${perCellKB.toFixed(1)} KB/cell`);
    }

    // Add row limit warning when approaching max
    if (lastKnownItemCount > maxRecommendedRows * 0.8) {
      report.recommendations.push(`⚠️ Approaching row limit: ${lastKnownItemCount}/${maxRecommendedRows} max recommended`);
    } else if (lastKnownItemCount > maxRecommendedRows * 0.6) {
      report.recommendations.push(`ℹ️ Room for growth: ${maxRecommendedRows - lastKnownItemCount} more rows before recommended limit`);
    }
  }

  return report;
};

export const printMemoryDiagnostics = () => {
  const report = runMemoryDiagnostics();
  
  console.group('🧠 Memory Diagnostics Report');
  
  if (report.jsHeap) {
    console.group('📊 JS Heap');
    console.log(`Used: ${report.jsHeap.used} (${report.jsHeap.percentage} of limit)`);
    console.log(`Total: ${report.jsHeap.total}`);
    console.log(`Limit: ${report.jsHeap.limit}`);
    console.groupEnd();
  } else {
    console.log('📊 JS Heap: Not available (Chrome only)');
  }

  if (report.estimates.length > 0) {
    console.group('📦 Tracked Objects (sorted by size)');
    const sorted = [...report.estimates].sort((a, b) => b.sizeBytes - a.sizeBytes);
    
    for (const item of sorted) {
      const countStr = item.count !== undefined ? ` (${item.count} items)` : '';
      const detailStr = item.details ? ` - ${item.details}` : '';
      console.log(`${item.name}: ${item.size}${countStr}${detailStr}`);
    }
    console.log(`📊 Total tracked: ${formatBytes(report.totalTrackedBytes)}`);
    console.groupEnd();
  } else {
    console.log('📦 No tracked objects registered (open a rundown first)');
  }

  if (report.componentEstimate) {
    console.group('🧩 Component Overhead Estimate');
    console.log(`Cells: ${report.componentEstimate.cellCount.toLocaleString()} (${report.componentEstimate.itemCount} rows × ${report.componentEstimate.columnCount} columns)`);
    console.log(`Per-cell overhead: ~${report.componentEstimate.measuredPerCellKB.toFixed(1)} KB (measured)`);
    console.log(`Estimated React overhead: ~${report.componentEstimate.estimatedOverheadMB.toFixed(1)} MB`);
    console.groupEnd();
  }

  if (report.globalServices) {
    console.group('🌐 Global Services');
    const cb = report.globalServices.cellBroadcast;
    console.log(`CellBroadcast: ${cb.channelCount} channels, ${cb.callbackCount} callbacks, ${cb.pendingBroadcasts} pending`);
    console.log(`  Debounce: ${cb.currentDebounceMs}ms, Active users: ${cb.activeUserCount}`);
    
    const subs = report.globalServices.subscriptions;
    console.log(`Subscriptions: ${subs.subscriptionCount} active`);
    for (const sub of subs.subscriptions) {
      console.log(`  ${sub.rundownId.slice(0, 8)}...: connected=${sub.isConnected}, refs=${sub.refCount}, callbacks=${sub.callbackCounts.rundown}/${sub.callbackCounts.showcaller}/${sub.callbackCounts.blueprint}`);
    }
    console.groupEnd();
  }

  console.group('📡 Broadcast System');
  console.log(`Batcher queues: cell=${report.broadcastSystem.batcherQueues.cell}, focus=${report.broadcastSystem.batcherQueues.focus}, structural=${report.broadcastSystem.batcherQueues.structural}`);
  console.log(`Batch interval: ${report.broadcastSystem.currentInterval}`);
  console.log(`Memory pressure multiplier: ${report.broadcastSystem.memoryMultiplier}`);
  console.log(`Cell broadcast channels: ${report.broadcastSystem.cellBroadcastChannels}`);
  console.groupEnd();

  if (report.memoryBudgetAnalysis) {
    const mba = report.memoryBudgetAnalysis;
    console.group('📈 Memory Budget Analysis');
    console.log(`Tracked data: ${formatBytes(mba.trackedDataBytes)}`);
    console.log(`React component overhead: ~${formatBytes(mba.reactOverheadBytes)}`);
    console.log(`Per-cell overhead: ~${mba.measuredPerCellKB.toFixed(1)} KB (measured)`);
    console.log(`App baseline: ~${mba.baselineOverheadMB} MB`);
    console.groupEnd();
    
    console.group('📊 Scaling Projections');
    const statusEmoji = { ok: '✅', warning: '⚠️', danger: '🔴' };
    for (const proj of mba.scalingProjections) {
      const isCurrent = proj.rows === lastKnownItemCount;
      const label = isCurrent ? `Current (${proj.rows} rows)` : `At ${proj.rows} rows`;
      console.log(`${statusEmoji[proj.status]} ${label}: ~${proj.estimatedMB} MB`);
    }
    console.log(`Max recommended: ~${mba.maxRecommendedRows} rows (to stay under 300MB)`);
    console.groupEnd();
  }

  if (report.recommendations.length > 0) {
    console.group('💡 Recommendations');
    for (const rec of report.recommendations) {
      console.log(rec);
    }
    console.groupEnd();
  }

  console.groupEnd();
  
  return report;
};

// Deep diagnostics with more detailed breakdown
export const printMemoryDiagnosticsDeep = () => {
  const report = runMemoryDiagnostics();
  
  console.group('🔬 Deep Memory Diagnostics');
  
  // Standard report first
  printMemoryDiagnostics();
  
  console.group('📋 Detailed Object Breakdown');
  
  // Show top 10 largest items within rundown-items
  for (const [name, getter] of trackedObjects) {
    if (name === 'rundown-items') {
      try {
        const { data } = getter();
        if (Array.isArray(data) && data.length > 0) {
          console.group(`🔍 ${name} - Individual Item Sizes (top 10)`);
          const itemSizes = data.map((item: any, idx: number) => ({
            idx,
            id: item.id?.slice(0, 8) || 'unknown',
            size: estimateObjectSize(item),
            scriptSize: (item.script?.length || 0) * 2,
            hasScript: !!item.script,
          }));
          itemSizes.sort((a, b) => b.size - a.size);
          for (const item of itemSizes.slice(0, 10)) {
            console.log(`Row ${item.idx}: ${formatBytes(item.size)} (script: ${formatBytes(item.scriptSize)})`);
          }
          console.groupEnd();
        }
      } catch (e) {
        console.log(`Could not analyze ${name}:`, e);
      }
    }
  }
  
  console.groupEnd();
  
  // Memory trend tracking
  console.group('📊 Memory Snapshot');
  const perf = performance as any;
  if (perf.memory) {
    console.log('Current snapshot - save and compare later:');
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      heapUsed: perf.memory.usedJSHeapSize,
      trackedBytes: report.totalTrackedBytes,
      cellCount: report.componentEstimate?.cellCount || 0,
      itemCount: report.componentEstimate?.itemCount || 0,
    }));
  }
  console.groupEnd();
  
  console.groupEnd();
  
  return report;
};

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).memoryDiag = printMemoryDiagnostics;
  (window as any).memoryDiagRaw = runMemoryDiagnostics;
  (window as any).memoryDiagDeep = printMemoryDiagnosticsDeep;
  console.log('💡 Memory diagnostics available: window.memoryDiag() or window.memoryDiagDeep()');
}