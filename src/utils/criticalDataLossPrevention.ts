/**
 * Critical Multi-User Data Loss Prevention System
 * This is the final fix for the multi-user editing data loss issue
 */

import { useCallback } from 'react';

interface DataLossPreventionOptions {
  rundownId: string;
  userId: string;
  clientId: string;
}

interface PreventionResult {
  shouldProceed: boolean;
  reason: string;
  action: 'apply' | 'queue' | 'reject' | 'merge';
}

class CriticalDataLossPrevention {
  private activeOperations = new Map<string, Set<string>>(); // rundownId -> Set of fieldKeys
  private lastOperationTime = new Map<string, number>(); // fieldKey -> timestamp
  private userActivity = new Map<string, number>(); // userId -> last activity
  
  // Prevent data loss for incoming remote changes
  preventDataLoss(
    incomingChange: {
      rundownId: string;
      itemId?: string;
      field: string;
      value: any;
      userId: string;
      timestamp: number;
    },
    options: DataLossPreventionOptions
  ): PreventionResult {
    const fieldKey = incomingChange.itemId ? 
      `${incomingChange.itemId}-${incomingChange.field}` : 
      incomingChange.field;

    // Rule 1: NEVER overwrite if local user is actively editing this exact field
    const activeOps = this.activeOperations.get(options.rundownId) || new Set();
    if (activeOps.has(fieldKey) && incomingChange.userId !== options.userId) {
      console.log('🚨 DATA LOSS PREVENTION: Blocking incoming change - user actively editing field:', fieldKey);
      return {
        shouldProceed: false,
        reason: 'User actively editing this field',
        action: 'queue'
      };
    }

    // Rule 2: Check for very recent local operations (race condition protection)
    const lastLocalOp = this.lastOperationTime.get(fieldKey) || 0;
    const timeSinceLocalOp = Date.now() - lastLocalOp;
    
    if (timeSinceLocalOp < 2000 && incomingChange.userId !== options.userId) { // 2 second protection window
      console.log('🚨 DATA LOSS PREVENTION: Blocking incoming change - recent local operation:', {
        fieldKey,
        timeSinceLocal: timeSinceLocalOp
      });
      return {
        shouldProceed: false,
        reason: 'Recent local operation on same field',
        action: 'queue'
      };
    }

    // Rule 3: Check for concurrent editing (multiple users typing at same time)
    const recentUserActivity = this.userActivity.get(options.userId) || 0;
    const isUserActive = (Date.now() - recentUserActivity) < 3000; // 3 second activity window
    
    if (isUserActive && incomingChange.userId !== options.userId) {
      // User is active - be extra cautious
      const isVeryRecentRemoteChange = (Date.now() - incomingChange.timestamp) < 1000; // 1 second
      
      if (isVeryRecentRemoteChange) {
        console.log('🚨 DATA LOSS PREVENTION: Concurrent editing detected - queueing change:', {
          fieldKey,
          localUserActive: isUserActive,
          remoteChangeAge: Date.now() - incomingChange.timestamp
        });
        return {
          shouldProceed: false,
          reason: 'Concurrent editing detected',
          action: 'queue'
        };
      }
    }

    // Rule 4: Different fields, different users - always safe
    if (incomingChange.userId !== options.userId) {
      console.log('✅ DATA LOSS PREVENTION: Different user, allowing change:', fieldKey);
      return {
        shouldProceed: true,
        reason: 'Different user, no conflict',
        action: 'apply'
      };
    }

    // Rule 5: Same user - apply with timestamp validation
    if (incomingChange.timestamp > lastLocalOp) {
      console.log('✅ DATA LOSS PREVENTION: Same user, newer timestamp, allowing:', fieldKey);
      return {
        shouldProceed: true,
        reason: 'Same user, newer timestamp',
        action: 'apply'
      };
    }

    // Default: safe to apply
    return {
      shouldProceed: true,
      reason: 'No conflicts detected',
      action: 'apply'
    };
  }

  // Track local operations to prevent overwrites
  trackLocalOperation(rundownId: string, itemId: string | undefined, field: string): void {
    const fieldKey = itemId ? `${itemId}-${field}` : field;
    
    if (!this.activeOperations.has(rundownId)) {
      this.activeOperations.set(rundownId, new Set());
    }
    
    this.activeOperations.get(rundownId)!.add(fieldKey);
    this.lastOperationTime.set(fieldKey, Date.now());
    
    console.log('🔒 DATA LOSS PREVENTION: Tracking local operation:', fieldKey);
    
    // Auto-clear after 5 seconds
    setTimeout(() => {
      this.activeOperations.get(rundownId)?.delete(fieldKey);
    }, 5000);
  }

  // Track user activity
  trackUserActivity(userId: string): void {
    this.userActivity.set(userId, Date.now());
  }

  // Clear completed operation
  clearLocalOperation(rundownId: string, itemId: string | undefined, field: string): void {
    const fieldKey = itemId ? `${itemId}-${field}` : field;
    this.activeOperations.get(rundownId)?.delete(fieldKey);
    console.log('🔓 DATA LOSS PREVENTION: Cleared local operation:', fieldKey);
  }

  // Force clear all operations for a rundown (emergency)
  emergencyClear(rundownId: string): void {
    this.activeOperations.delete(rundownId);
    console.log('🚨 DATA LOSS PREVENTION: Emergency clear for rundown:', rundownId);
  }

  // Get protection status
  getProtectionStatus(rundownId: string): {
    activeOperations: number;
    protectedFields: string[];
    recentActivity: number;
  } {
    const activeOps = this.activeOperations.get(rundownId) || new Set();
    const now = Date.now();
    const recentActivity = Array.from(this.userActivity.values())
      .filter(time => (now - time) < 10000).length; // 10 seconds
    
    return {
      activeOperations: activeOps.size,
      protectedFields: Array.from(activeOps),
      recentActivity
    };
  }
}

// Global singleton for data loss prevention
export const criticalDataLossPrevention = new CriticalDataLossPrevention();

// Hook for easy integration
export const useDataLossPrevention = (options: DataLossPreventionOptions) => {
  const trackOperation = useCallback((itemId: string | undefined, field: string) => {
    criticalDataLossPrevention.trackLocalOperation(options.rundownId, itemId, field);
    criticalDataLossPrevention.trackUserActivity(options.userId);
  }, [options.rundownId, options.userId]);

  const clearOperation = useCallback((itemId: string | undefined, field: string) => {
    criticalDataLossPrevention.clearLocalOperation(options.rundownId, itemId, field);
  }, [options.rundownId]);

  const checkIncomingChange = useCallback((change: any) => {
    return criticalDataLossPrevention.preventDataLoss(change, options);
  }, [options]);

  return {
    trackOperation,
    clearOperation,
    checkIncomingChange,
    getProtectionStatus: () => criticalDataLossPrevention.getProtectionStatus(options.rundownId)
  };
};

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).criticalDataLossPrevention = criticalDataLossPrevention;
}

export default criticalDataLossPrevention;