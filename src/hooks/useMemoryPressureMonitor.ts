import { useEffect, useRef, useCallback } from 'react';
import { broadcastBatcher } from '@/utils/broadcastBatcher';

interface MemoryThresholds {
  elevated: number;  // MB - start throttling
  high: number;      // MB - aggressive throttling
  critical: number;  // MB - survival mode
}

const DEFAULT_THRESHOLDS: MemoryThresholds = {
  elevated: 400,   // 400MB - start throttling
  high: 600,       // 600MB - aggressive throttling  
  critical: 800,   // 800MB - survival mode
};

interface UseMemoryPressureMonitorOptions {
  enabled?: boolean;
  thresholds?: Partial<MemoryThresholds>;
  checkIntervalMs?: number;
  onPressureChange?: (level: 'normal' | 'elevated' | 'high' | 'critical') => void;
}

/**
 * Memory pressure monitor that automatically adjusts broadcast batching
 * based on current memory usage. Helps prevent memory bloat with many
 * concurrent users.
 */
export const useMemoryPressureMonitor = ({
  enabled = true,
  thresholds = {},
  checkIntervalMs = 30000, // Check every 30 seconds
  onPressureChange,
}: UseMemoryPressureMonitorOptions = {}) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentLevelRef = useRef<'normal' | 'elevated' | 'high' | 'critical'>('normal');
  const mergedThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };

  const getMemoryUsageMB = useCallback((): number | null => {
    if (typeof window === 'undefined' || !('performance' in window)) return null;
    
    const performance = window.performance as any;
    if (!performance.memory) return null;
    
    return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
  }, []);

  const checkMemoryPressure = useCallback(() => {
    const memoryMB = getMemoryUsageMB();
    if (memoryMB === null) return;

    let newLevel: 'normal' | 'elevated' | 'high' | 'critical' = 'normal';
    let multiplier = 1;

    if (memoryMB >= mergedThresholds.critical) {
      newLevel = 'critical';
      multiplier = 3; // 3x batch interval
    } else if (memoryMB >= mergedThresholds.high) {
      newLevel = 'high';
      multiplier = 2; // 2x batch interval
    } else if (memoryMB >= mergedThresholds.elevated) {
      newLevel = 'elevated';
      multiplier = 1.5; // 1.5x batch interval
    }

    // Update broadcast batcher
    broadcastBatcher.setMemoryPressureMultiplier(multiplier);

    // Notify if level changed
    if (newLevel !== currentLevelRef.current) {
      currentLevelRef.current = newLevel;
      
      if (newLevel !== 'normal') {
        console.log(`📊 Memory pressure: ${newLevel} (${memoryMB}MB) - batch multiplier: ${multiplier}x`);
      }
      
      onPressureChange?.(newLevel);

      // At high/critical levels, try to help GC
      if (newLevel === 'critical' || newLevel === 'high') {
        // Force garbage collection hint (only works in Chrome DevTools)
        if (typeof window !== 'undefined' && (window as any).gc) {
          try {
            (window as any).gc();
          } catch (e) {
            // Ignore - GC not available
          }
        }
      }
    }
  }, [getMemoryUsageMB, mergedThresholds, onPressureChange]);

  useEffect(() => {
    if (!enabled) return;

    // Initial check
    checkMemoryPressure();

    // Set up periodic checks
    intervalRef.current = setInterval(checkMemoryPressure, checkIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Reset multiplier on cleanup
      broadcastBatcher.setMemoryPressureMultiplier(1);
    };
  }, [enabled, checkIntervalMs, checkMemoryPressure]);

  // Force check (useful for testing)
  const forceCheck = useCallback(() => {
    checkMemoryPressure();
  }, [checkMemoryPressure]);

  return {
    currentLevel: currentLevelRef.current,
    getMemoryUsageMB,
    forceCheck,
  };
};
