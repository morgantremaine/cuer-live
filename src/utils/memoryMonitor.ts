import React from 'react';

// Memory monitoring utilities
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private measurements: Array<{ timestamp: number; used: number; total: number }> = [];
  private maxMeasurements = 100; // Keep last 100 measurements
  
  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }
  
  // Get current memory usage
  getCurrentMemory(): { used: number; total: number } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024) // MB
      };
    }
    return null;
  }
  
  // Record memory measurement
  recordMeasurement(): void {
    const memory = this.getCurrentMemory();
    if (memory) {
      this.measurements.push({
        timestamp: Date.now(),
        ...memory
      });
      
      // Keep only recent measurements
      if (this.measurements.length > this.maxMeasurements) {
        this.measurements = this.measurements.slice(-this.maxMeasurements);
      }
    }
  }
  
  // Get memory trend
  getMemoryTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.measurements.length < 10) return 'stable';
    
    const recent = this.measurements.slice(-10);
    const first = recent[0].used;
    const last = recent[recent.length - 1].used;
    const diff = last - first;
    
    if (diff > 5) return 'increasing'; // More than 5MB increase
    if (diff < -5) return 'decreasing'; // More than 5MB decrease
    return 'stable';
  }
  
  // Get average memory usage
  getAverageMemory(): number {
    if (this.measurements.length === 0) return 0;
    const sum = this.measurements.reduce((acc, m) => acc + m.used, 0);
    return Math.round(sum / this.measurements.length);
  }
  
  // Check if memory usage is concerning
  isMemoryHigh(): boolean {
    const current = this.getCurrentMemory();
    return current ? current.used > 200 : false; // Alert if over 200MB
  }
  
  // Force garbage collection if available
  forceGarbageCollection(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }
  
  // Get memory report
  getMemoryReport(): string {
    const current = this.getCurrentMemory();
    const average = this.getAverageMemory();
    const trend = this.getMemoryTrend();
    
    return `Memory Usage: ${current?.used || 0}MB (avg: ${average}MB, trend: ${trend})`;
  }
}

// Hook for using memory monitor in React components
export const useMemoryMonitor = () => {
  const monitor = MemoryMonitor.getInstance();
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      monitor.recordMeasurement();
      
      // Log memory warnings
      if (monitor.isMemoryHigh()) {
        console.warn('High memory usage detected:', monitor.getMemoryReport());
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, [monitor]);
  
  return {
    getCurrentMemory: () => monitor.getCurrentMemory(),
    getMemoryReport: () => monitor.getMemoryReport(),
    forceGarbageCollection: () => monitor.forceGarbageCollection(),
    isMemoryHigh: () => monitor.isMemoryHigh()
  };
};
