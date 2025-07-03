
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
