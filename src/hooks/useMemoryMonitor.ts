import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface MemoryStats {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
}

interface UseMemoryMonitorProps {
  rundownId: string | null;
  itemCount: number;
  enabled?: boolean;
}

/**
 * Memory monitoring hook to detect and warn about excessive memory usage
 */
export const useMemoryMonitor = ({ 
  rundownId, 
  itemCount, 
  enabled = true 
}: UseMemoryMonitorProps) => {
  const { toast } = useToast();
  const lastWarningRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const MEMORY_WARNING_MB = 200; // Warn at 200MB
  const MEMORY_CRITICAL_MB = 400; // Critical at 400MB
  const WARNING_COOLDOWN = 30000; // 30 seconds between warnings

  const getMemoryStats = useCallback((): MemoryStats | null => {
    if (typeof window === 'undefined' || !('performance' in window)) return null;
    
    const performance = window.performance as any;
    if (!performance.memory) return null;
    
    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    };
  }, []);

  const checkMemoryUsage = useCallback(() => {
    if (!enabled || !rundownId) return;
    
    const stats = getMemoryStats();
    if (!stats) return;
    
    const usedMB = Math.round(stats.usedJSHeapSize! / 1024 / 1024);
    const now = Date.now();
    
    // Removed console logging to keep console clean
    
    // Only show warnings if enough time has passed
    if (now - lastWarningRef.current < WARNING_COOLDOWN) return;
    
    // For large rundowns, aggressively suggest GC when memory is high
    if (itemCount > 150 && usedMB > MEMORY_WARNING_MB) {
      // Try to hint at garbage collection
      if (typeof window !== 'undefined' && (window as any).gc) {
        try {
          (window as any).gc();
        } catch (e) {
          // Ignore errors
        }
      }
    }
    
    if (usedMB > MEMORY_CRITICAL_MB) {
      // Silently handle critical memory usage without user notifications
      lastWarningRef.current = now;
      
      // Force garbage collection if available (Chrome DevTools)
      if (typeof window !== 'undefined' && (window as any).gc) {
        try {
          (window as any).gc();
        } catch (e) {
          // Ignore errors
        }
      }
    } else if (usedMB > MEMORY_WARNING_MB) {
      // Silently handle high memory usage without user notifications
      lastWarningRef.current = now;
    }
  }, [enabled, rundownId, itemCount, getMemoryStats, toast]);

  // Set up memory monitoring interval
  useEffect(() => {
    if (!enabled) return;
    
    // Initial check
    checkMemoryUsage();
    
    // Check every 15 seconds
    intervalRef.current = setInterval(checkMemoryUsage, 15000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, checkMemoryUsage]);

  // Force a memory check
  const forceCheck = useCallback(() => {
    lastWarningRef.current = 0; // Reset cooldown
    checkMemoryUsage();
  }, [checkMemoryUsage]);

  return {
    getMemoryStats,
    forceCheck,
    isHighMemoryUsage: (getMemoryStats()?.usedJSHeapSize || 0) > MEMORY_WARNING_MB * 1024 * 1024
  };
};