
// Shared utilities for realtime functionality

// Utility function to normalize timestamps for consistent comparison
export const normalizeTimestamp = (timestamp: string): string => {
  try {
    // Convert to Date and back to ISO string to ensure consistent format
    return new Date(timestamp).toISOString();
  } catch (error) {
    // If parsing fails, return original timestamp
    return timestamp;
  }
};

// Centralized timeout management to prevent memory leaks
export class TimeoutManager {
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  
  set(id: string, callback: () => void, delay: number): void {
    this.clear(id);
    const timeout = setTimeout(callback, delay);
    this.timeouts.set(id, timeout);
  }
  
  clear(id: string): void {
    const timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }
  }
  
  clearAll(): void {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
  }
}

// Enhanced mobile-specific realtime connection optimization
export const getMobileOptimizedDelays = () => {
  // Check if we're on a mobile/tablet device
  const isMobileOrTablet = typeof window !== 'undefined' && (
    window.innerWidth < 1024 || 
    'ontouchstart' in window || 
    navigator.maxTouchPoints > 0
  );
  
  if (isMobileOrTablet) {
    return {
      processingDelay: 100,        // Faster processing for mobile
      activityTimeout: 6000,       // Shorter activity timeout
      contentProcessingDelay: 400,  // Shorter content processing visibility
      heartbeatInterval: 25000,    // More frequent heartbeat
      reconnectDelay: 1000,        // Faster reconnection
      saveDebounce: 1200,          // Shorter save debounce for mobile
      typingProtection: 2500       // Shorter typing protection window
    };
  }
  
  return {
    processingDelay: 150,          // Standard delays for desktop
    activityTimeout: 8000,
    contentProcessingDelay: 600,
    heartbeatInterval: 30000,
    reconnectDelay: 2000,
    saveDebounce: 1500,            // Standard save debounce
    typingProtection: 3000         // Standard typing protection
  };
};

// Exponential backoff for reconnection attempts
export const getReconnectDelay = (attemptCount: number): number => {
  const baseDelay = getMobileOptimizedDelays().reconnectDelay;
  const maxDelay = 30000; // Max 30 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attemptCount), maxDelay);
  
  // Add jitter to prevent thundering herd
  const jitter = delay * 0.1 * Math.random();
  return delay + jitter;
};

// Connection stability monitoring
export class ConnectionMonitor {
  private reconnectAttempts = 0;
  private lastDisconnect = 0;
  private healthCheck?: NodeJS.Timeout;
  private isHealthy = true;
  
  constructor(private onReconnectNeeded: () => void) {}
  
  recordDisconnect(): void {
    this.lastDisconnect = Date.now();
    this.reconnectAttempts++;
    this.isHealthy = false;
    
    console.warn('🔌 Connection lost - attempt', this.reconnectAttempts);
  }
  
  recordReconnect(): void {
    const downtime = Date.now() - this.lastDisconnect;
    console.log('✅ Connection restored after', downtime, 'ms');
    
    this.reconnectAttempts = 0;
    this.isHealthy = true;
    this.startHealthCheck();
  }
  
  getReconnectDelay(): number {
    return getReconnectDelay(this.reconnectAttempts);
  }
  
  startHealthCheck(): void {
    this.stopHealthCheck();
    
    this.healthCheck = setInterval(() => {
      // Simple heartbeat - if no realtime activity for too long, trigger reconnect
      const maxSilentTime = getMobileOptimizedDelays().heartbeatInterval * 2;
      const timeSinceLastActivity = Date.now() - this.lastDisconnect;
      
      if (this.isHealthy && timeSinceLastActivity > maxSilentTime) {
        console.warn('🔌 Connection appears stale - triggering reconnect');
        this.onReconnectNeeded();
      }
    }, getMobileOptimizedDelays().heartbeatInterval);
  }
  
  stopHealthCheck(): void {
    if (this.healthCheck) {
      clearInterval(this.healthCheck);
      this.healthCheck = undefined;
    }
  }
  
  destroy(): void {
    this.stopHealthCheck();
  }
}
