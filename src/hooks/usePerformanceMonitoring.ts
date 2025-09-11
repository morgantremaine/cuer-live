import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PerformanceMetrics {
  memoryUsage?: number;
  renderTime?: number;
  itemCount?: number;
  lastUpdate?: number;
}

interface UsePerformanceMonitoringProps {
  rundownId: string | null;
  itemCount: number;
  enabled?: boolean;
}

/**
 * Performance monitoring hook for large rundowns
 * Tracks memory usage, render performance, and provides user feedback
 */
export const usePerformanceMonitoring = ({ 
  rundownId, 
  itemCount, 
  enabled = true 
}: UsePerformanceMonitoringProps) => {
  const { toast } = useToast();
  const metricsRef = useRef<PerformanceMetrics>({});
  const lastWarningRef = useRef<number>(0);
  const performanceObserverRef = useRef<PerformanceObserver | null>(null);

  // Performance thresholds
  const MEMORY_WARNING_THRESHOLD = 400; // MB
  const MEMORY_CRITICAL_THRESHOLD = 600; // MB
  const LARGE_RUNDOWN_THRESHOLD = 150; // items
  const VERY_LARGE_RUNDOWN_THRESHOLD = 250; // items
  const WARNING_COOLDOWN = 30000; // 30 seconds between warnings

  // Get current memory usage (if available)
  const getMemoryUsage = useCallback(() => {
    if (typeof window === 'undefined' || !('performance' in window)) return 0;
    
    const performance = window.performance as any;
    if (!performance.memory) return 0;
    
    return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
  }, []);

  // Check performance and show warnings if needed
  const checkPerformance = useCallback(() => {
    if (!enabled || !rundownId) return;
    
    const now = Date.now();
    const memoryUsage = getMemoryUsage();
    
    metricsRef.current = {
      ...metricsRef.current,
      memoryUsage,
      itemCount,
      lastUpdate: now
    };

    // Only show warnings if enough time has passed since last warning
    if (now - lastWarningRef.current < WARNING_COOLDOWN) return;

    // Memory usage warnings
    if (memoryUsage > MEMORY_CRITICAL_THRESHOLD) {
      toast({
        title: "High Memory Usage Detected",
        description: `Using ${memoryUsage}MB with ${itemCount} items. Consider reducing rundown size or refreshing the page.`,
        variant: "destructive",
      });
      lastWarningRef.current = now;
    } else if (memoryUsage > MEMORY_WARNING_THRESHOLD && itemCount > LARGE_RUNDOWN_THRESHOLD) {
      toast({
        title: "Performance Notice",
        description: `Large rundown (${itemCount} items) using ${memoryUsage}MB. Performance may be slower.`,
      });
      lastWarningRef.current = now;
    }

    // Large rundown warnings
    if (itemCount > VERY_LARGE_RUNDOWN_THRESHOLD) {
      console.log(`📊 Performance Monitor: Very large rundown (${itemCount} items, ${memoryUsage}MB)`);
    }
  }, [enabled, rundownId, itemCount, getMemoryUsage, toast]);

  // Set up performance observer for render timing
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const renderEntries = entries.filter(entry => 
          entry.name.includes('rundown') || entry.name.includes('table')
        );
        
        if (renderEntries.length > 0) {
          const avgRenderTime = renderEntries.reduce((acc, entry) => acc + entry.duration, 0) / renderEntries.length;
          metricsRef.current.renderTime = avgRenderTime;
          
          if (avgRenderTime > 100) { // > 100ms render time
            console.warn(`⚠️ Slow render detected: ${avgRenderTime.toFixed(2)}ms`);
          }
        }
      });

      observer.observe({ entryTypes: ['measure', 'navigation'] });
      performanceObserverRef.current = observer;

      return () => {
        observer.disconnect();
        performanceObserverRef.current = null;
      };
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }
  }, [enabled]);

  // Monitor performance on item count changes
  useEffect(() => {
    if (enabled) {
      checkPerformance();
    }
  }, [itemCount, enabled, checkPerformance]);

  // Periodic memory check for large rundowns
  useEffect(() => {
    if (!enabled || itemCount < LARGE_RUNDOWN_THRESHOLD) return;

    const interval = setInterval(() => {
      checkPerformance();
    }, 10000); // Check every 10 seconds for large rundowns

    return () => clearInterval(interval);
  }, [enabled, itemCount, checkPerformance]);

  // Get current performance metrics
  const getMetrics = useCallback(() => {
    return {
      ...metricsRef.current,
      isLargeRundown: itemCount > LARGE_RUNDOWN_THRESHOLD,
      isVeryLargeRundown: itemCount > VERY_LARGE_RUNDOWN_THRESHOLD,
      currentMemory: getMemoryUsage()
    };
  }, [itemCount, getMemoryUsage]);

  // Force a performance check
  const forceCheck = useCallback(() => {
    lastWarningRef.current = 0; // Reset cooldown
    checkPerformance();
  }, [checkPerformance]);

  return {
    metrics: metricsRef.current,
    getMetrics,
    forceCheck,
    isLargeRundown: itemCount > LARGE_RUNDOWN_THRESHOLD,
    isVeryLargeRundown: itemCount > VERY_LARGE_RUNDOWN_THRESHOLD
  };
};