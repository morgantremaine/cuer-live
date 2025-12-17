/**
 * Memory diagnostics utility for debugging memory usage in large rundowns
 * Call window.memoryDiag() from console to see detailed breakdown
 */

import { broadcastBatcher } from './broadcastBatcher';
import { cellBroadcast } from './cellBroadcast';

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

interface MemoryReport {
  jsHeap: {
    used: string;
    total: string;
    limit: string;
    percentage: string;
  } | null;
  estimates: {
    name: string;
    size: string;
    count?: number;
    details?: string;
  }[];
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
  recommendations: string[];
}

// Registry for trackable objects
const trackedObjects: Map<string, () => { data: any; count?: number; details?: string }> = new Map();

export const registerTrackedObject = (name: string, getter: () => { data: any; count?: number; details?: string }) => {
  trackedObjects.set(name, getter);
};

export const unregisterTrackedObject = (name: string) => {
  trackedObjects.delete(name);
};

export const runMemoryDiagnostics = (): MemoryReport => {
  const report: MemoryReport = {
    jsHeap: null,
    estimates: [],
    broadcastSystem: {
      batcherQueues: { cell: 0, focus: 0, structural: 0 },
      currentInterval: 'unknown',
      memoryMultiplier: '1x',
      cellBroadcastChannels: 0,
    },
    recommendations: [],
  };

  // JS Heap from performance.memory (Chrome only)
  const perf = performance as any;
  if (perf.memory) {
    const used = perf.memory.usedJSHeapSize;
    const total = perf.memory.totalJSHeapSize;
    const limit = perf.memory.jsHeapSizeLimit;
    report.jsHeap = {
      used: formatBytes(used),
      total: formatBytes(total),
      limit: formatBytes(limit),
      percentage: `${((used / limit) * 100).toFixed(1)}%`,
    };

    if (used > 600 * 1024 * 1024) {
      report.recommendations.push('🔴 Critical memory usage (>600MB) - refresh recommended');
    } else if (used > 400 * 1024 * 1024) {
      report.recommendations.push('🟡 High memory usage (>400MB) - monitor closely');
    }
  }

  // Estimate tracked objects
  for (const [name, getter] of trackedObjects) {
    try {
      const { data, count, details } = getter();
      const size = estimateObjectSize(data);
      report.estimates.push({
        name,
        size: formatBytes(size),
        count,
        details,
      });

      // Add recommendations based on findings
      if (name === 'rundown-items' && size > 10 * 1024 * 1024) {
        report.recommendations.push(`⚠️ ${name} is large (${formatBytes(size)}) - possible large scripts`);
      }
      if (name === 'undo-stack' && count && count >= 5) {
        report.recommendations.push(`ℹ️ Undo stack at max capacity (${count}/5)`);
      }
      if (name === 'script-fields' && size > 5 * 1024 * 1024) {
        report.recommendations.push(`⚠️ Script content is ${formatBytes(size)} - ${count} fields`);
      }
      if (name === 'recently-edited-fields' && count && count > 50) {
        report.recommendations.push(`ℹ️ ${count} recently edited fields tracked - map may need cleanup`);
      }
    } catch (e) {
      report.estimates.push({
        name,
        size: 'error',
      });
    }
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
    // Sort by size (parse the formatted string back)
    const sorted = [...report.estimates].sort((a, b) => {
      const parseSize = (s: string) => {
        if (s === 'error') return 0;
        const match = s.match(/^([\d.]+)\s*(B|KB|MB)$/);
        if (!match) return 0;
        const num = parseFloat(match[1]);
        const unit = match[2];
        if (unit === 'MB') return num * 1024 * 1024;
        if (unit === 'KB') return num * 1024;
        return num;
      };
      return parseSize(b.size) - parseSize(a.size);
    });
    
    for (const item of sorted) {
      const countStr = item.count !== undefined ? ` (${item.count} items)` : '';
      const detailStr = item.details ? ` - ${item.details}` : '';
      console.log(`${item.name}: ${item.size}${countStr}${detailStr}`);
    }
    console.groupEnd();
  } else {
    console.log('📦 No tracked objects registered (open a rundown first)');
  }

  console.group('📡 Broadcast System');
  console.log(`Batcher queues: cell=${report.broadcastSystem.batcherQueues.cell}, focus=${report.broadcastSystem.batcherQueues.focus}, structural=${report.broadcastSystem.batcherQueues.structural}`);
  console.log(`Batch interval: ${report.broadcastSystem.currentInterval}`);
  console.log(`Memory pressure multiplier: ${report.broadcastSystem.memoryMultiplier}`);
  console.log(`Cell broadcast channels: ${report.broadcastSystem.cellBroadcastChannels}`);
  console.groupEnd();

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

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).memoryDiag = printMemoryDiagnostics;
  (window as any).memoryDiagRaw = runMemoryDiagnostics;
  console.log('💡 Memory diagnostics available: window.memoryDiag()');
}
