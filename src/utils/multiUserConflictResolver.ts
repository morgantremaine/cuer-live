/**
 * Multi-User Conflict Resolution System
 * Prevents data loss when multiple users edit different cells simultaneously
 */

import { localShadowStore } from '@/state/localShadows';
import { operationFingerprinter } from './operationFingerprint';

interface ConflictResolutionOptions {
  incomingUpdate: {
    itemId?: string;
    field: string;
    value: any;
    timestamp: number;
    userId: string;
    clientId: string;
  };
  currentUserId: string;
  currentClientId: string;
}

interface ConflictResolutionResult {
  shouldApply: boolean;
  reason: string;
  priority: 'local' | 'remote' | 'merge';
  action: 'apply' | 'queue' | 'reject';
}

class MultiUserConflictResolver {
  private pendingConflicts = new Map<string, any[]>();
  private lastResolutionTime = new Map<string, number>();
  
  // Main conflict resolution logic
  resolveConflict(options: ConflictResolutionOptions): ConflictResolutionResult {
    const { incomingUpdate, currentUserId, currentClientId } = options;
    const fieldKey = incomingUpdate.itemId ? 
      `${incomingUpdate.itemId}-${incomingUpdate.field}` : 
      incomingUpdate.field;

    console.log('🔍 CONFLICT RESOLUTION:', {
      field: fieldKey,
      incomingFrom: incomingUpdate.userId,
      currentUser: currentUserId,
      timestamp: incomingUpdate.timestamp
    });

    // Rule 1: Never overwrite active typing
    const isActivelyTyping = incomingUpdate.itemId ? 
      localShadowStore.hasActiveShadow(incomingUpdate.itemId, incomingUpdate.field) :
      localShadowStore.hasActiveGlobalShadow(incomingUpdate.field);

    if (isActivelyTyping) {
      console.log('🛡️ CONFLICT: Rejecting incoming update - user actively typing');
      this.recordConflict(fieldKey, incomingUpdate, 'active_typing');
      
      return {
        shouldApply: false,
        reason: 'User actively typing this field',
        priority: 'local',
        action: 'queue'
      };
    }

    // Rule 2: Check for recent local operations
    const recentOperations = operationFingerprinter.getRecentOperations(5000);
    const hasRecentLocalOperation = recentOperations.some(op => {
      const opFieldKey = op.field ? `${op.target}-${op.field}` : op.target;
      return opFieldKey === fieldKey && 
             op.timestamp > incomingUpdate.timestamp - 1000; // 1 second tolerance
    });

    if (hasRecentLocalOperation) {
      console.log('🛡️ CONFLICT: Rejecting incoming update - recent local operation');
      this.recordConflict(fieldKey, incomingUpdate, 'recent_local_operation');
      
      return {
        shouldApply: false,
        reason: 'Recent local operation on same field',
        priority: 'local',
        action: 'queue'
      };
    }

    // Rule 3: Different field, different user - always allow
    const activeShadows = localShadowStore.getActiveShadows();
    const isEditingDifferentField = !this.isEditingRelatedField(fieldKey, activeShadows);
    
    if (isEditingDifferentField && incomingUpdate.userId !== currentUserId) {
      console.log('✅ CONFLICT: Allowing - different field, different user');
      
      return {
        shouldApply: true,
        reason: 'Different field, different user - no conflict',
        priority: 'remote',
        action: 'apply'
      };
    }

    // Rule 4: Same user, different client (multi-tab) - apply with timestamp precedence
    if (incomingUpdate.userId === currentUserId && incomingUpdate.clientId !== currentClientId) {
      const shouldApply = incomingUpdate.timestamp > (this.lastResolutionTime.get(fieldKey) || 0);
      
      console.log('🔄 CONFLICT: Multi-tab scenario:', {
        shouldApply,
        reason: shouldApply ? 'Newer timestamp from same user' : 'Older timestamp from same user'
      });
      
      return {
        shouldApply,
        reason: shouldApply ? 'Newer update from same user (different tab)' : 'Older update from same user',
        priority: shouldApply ? 'remote' : 'local',
        action: shouldApply ? 'apply' : 'reject'
      };
    }

    // Rule 5: Timestamp-based resolution for edge cases
    const lastResolution = this.lastResolutionTime.get(fieldKey) || 0;
    const isNewer = incomingUpdate.timestamp > lastResolution;
    
    if (isNewer) {
      console.log('✅ CONFLICT: Allowing - newer timestamp');
      this.lastResolutionTime.set(fieldKey, incomingUpdate.timestamp);
      
      return {
        shouldApply: true,
        reason: 'Newer timestamp wins',
        priority: 'remote',
        action: 'apply'
      };
    }

    // Default: reject to be safe
    console.log('🛡️ CONFLICT: Rejecting - default safety');
    this.recordConflict(fieldKey, incomingUpdate, 'default_rejection');
    
    return {
      shouldApply: false,
      reason: 'Default rejection for safety',
      priority: 'local',
      action: 'reject'
    };
  }

  // Check if user is editing a related field that might cause conflicts
  private isEditingRelatedField(fieldKey: string, activeShadows: any): boolean {
    // Check if actively editing the exact same field
    if (activeShadows.globals.has(fieldKey)) return true;
    
    // Check if actively editing same item field
    const [itemId, field] = fieldKey.split('-');
    if (itemId && field && activeShadows.items.has(itemId)) {
      const itemShadows = activeShadows.items.get(itemId);
      return Object.keys(itemShadows || {}).includes(field);
    }
    
    return false;
  }

  // Record conflict for analysis
  private recordConflict(fieldKey: string, update: any, reason: string): void {
    if (!this.pendingConflicts.has(fieldKey)) {
      this.pendingConflicts.set(fieldKey, []);
    }
    
    this.pendingConflicts.get(fieldKey)!.push({
      ...update,
      reason,
      recordedAt: Date.now()
    });

    // Clean up old conflicts
    this.cleanupOldConflicts();
  }

  // Process queued conflicts when safe
  processQueuedConflicts(onApplyUpdate: (update: any) => void): void {
    const activeShadows = localShadowStore.getActiveShadows();
    const hasActiveOperations = activeShadows.items.size > 0 || activeShadows.globals.size > 0;
    
    if (hasActiveOperations) {
      console.log('🛡️ CONFLICT: Still have active operations, keeping conflicts queued');
      return;
    }

    this.pendingConflicts.forEach((conflicts, fieldKey) => {
      console.log(`🔄 CONFLICT: Processing ${conflicts.length} queued conflicts for ${fieldKey}`);
      
      // Apply the most recent conflict that's still valid
      const sortedConflicts = conflicts.sort((a, b) => b.timestamp - a.timestamp);
      const latestConflict = sortedConflicts[0];
      
      if (latestConflict) {
        const resolutionResult = this.resolveConflict({
          incomingUpdate: latestConflict,
          currentUserId: latestConflict.currentUserId || '',
          currentClientId: latestConflict.currentClientId || ''
        });
        
        if (resolutionResult.shouldApply) {
          console.log(`✅ CONFLICT: Applying queued update for ${fieldKey}`);
          onApplyUpdate(latestConflict);
        }
      }
    });
    
    // Clear processed conflicts
    this.pendingConflicts.clear();
  }

  // Clean up old conflicts
  private cleanupOldConflicts(): void {
    const now = Date.now();
    const maxAge = 30000; // 30 seconds
    
    this.pendingConflicts.forEach((conflicts, fieldKey) => {
      const recent = conflicts.filter(conflict => 
        (now - conflict.recordedAt) <= maxAge
      );
      
      if (recent.length === 0) {
        this.pendingConflicts.delete(fieldKey);
      } else {
        this.pendingConflicts.set(fieldKey, recent);
      }
    });
  }

  // Get conflict statistics
  getConflictStats(): {
    pendingConflicts: number;
    totalFields: number;
    recentResolutions: number;
  } {
    const now = Date.now();
    const recentWindow = 60000; // 1 minute
    
    const totalConflicts = Array.from(this.pendingConflicts.values())
      .reduce((sum, conflicts) => sum + conflicts.length, 0);
    
    const recentResolutions = Array.from(this.lastResolutionTime.values())
      .filter(time => (now - time) <= recentWindow).length;
    
    return {
      pendingConflicts: totalConflicts,
      totalFields: this.pendingConflicts.size,
      recentResolutions
    };
  }

  // Force resolution of all pending conflicts
  forceResolveAll(onApplyUpdate: (update: any) => void): void {
    console.log('🚨 CONFLICT: Force resolving all pending conflicts');
    this.processQueuedConflicts(onApplyUpdate);
  }

  // Clear all conflicts (use with caution)
  clearAllConflicts(): void {
    console.log('🧹 CONFLICT: Clearing all pending conflicts');
    this.pendingConflicts.clear();
    this.lastResolutionTime.clear();
  }
}

// Global singleton
export const multiUserConflictResolver = new MultiUserConflictResolver();

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).multiUserConflictResolver = multiUserConflictResolver;
}

export default multiUserConflictResolver;