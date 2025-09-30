/**
 * Emergency Multi-User Data Loss Fix
 * Critical fix to stop the "HORRIBLE" multi-user editing experience
 */

import { criticalDataLossPrevention } from './criticalDataLossPrevention';
import { localShadowStore } from '@/state/localShadows';

// Emergency override for all cell broadcast processing
const originalSetShadow = localShadowStore.setShadow.bind(localShadowStore);

// Enhance LocalShadow with critical protection
localShadowStore.setShadow = function(itemId: string, fieldName: string, value: any, isActive: boolean = true) {
  console.log('🚨 EMERGENCY: Enhanced LocalShadow protection activated:', {
    itemId,
    fieldName,
    valueLength: String(value).length,
    isActive
  });
  
  // Call original function
  originalSetShadow(itemId, fieldName, value, isActive);
  
  // Add emergency protection tracking
  if (isActive) {
    criticalDataLossPrevention.trackLocalOperation('emergency', itemId, fieldName);
  }
};

// Global emergency data loss prevention
class EmergencyDataLossProtection {
  private blockedUpdates = new Map<string, any[]>();
  private lastUserActivity = new Map<string, number>();
  private emergencyMode = true; // Always on until multi-user issues are resolved

  // Emergency check for any incoming remote update
  emergencyCheck(update: {
    rundownId: string;
    itemId?: string;
    field: string;
    value: any;
    userId: string;
    timestamp: number;
  }, currentUserId: string): boolean {
    if (!this.emergencyMode) return true;

    const fieldKey = update.itemId ? `${update.itemId}-${update.field}` : update.field;
    
    // Record user activity
    this.lastUserActivity.set(currentUserId, Date.now());
    
    // Check 1: Is user actively editing ANY field?
    const userLastActivity = this.lastUserActivity.get(currentUserId) || 0;
    const isUserActive = (Date.now() - userLastActivity) < 5000; // 5 second protection
    
    if (isUserActive && update.userId !== currentUserId) {
      console.log('🚨 EMERGENCY: Blocking update - user is actively editing:', {
        fieldKey,
        timeSinceActivity: Date.now() - userLastActivity,
        incomingUserId: update.userId,
        currentUserId
      });
      
      this.recordBlockedUpdate(fieldKey, update);
      return false; // BLOCK
    }

    // Check 2: Is this specific field being edited?
    const activeShadows = localShadowStore.getActiveShadows();
    const isEditingThisField = update.itemId ? 
      activeShadows.items.has(update.itemId) : 
      activeShadows.globals.has(update.field);
    
    if (isEditingThisField) {
      console.log('🚨 EMERGENCY: Blocking update - field actively being edited:', fieldKey);
      this.recordBlockedUpdate(fieldKey, update);
      return false; // BLOCK
    }

    // Check 3: Recent typing in any field (super cautious)
    const hasRecentTyping = Array.from(this.lastUserActivity.values())
      .some(activity => (Date.now() - activity) < 2000); // 2 second super protection
    
    if (hasRecentTyping && update.userId !== currentUserId) {
      console.log('🚨 EMERGENCY: Blocking update - recent typing detected:', {
        fieldKey,
        hasRecentTyping
      });
      this.recordBlockedUpdate(fieldKey, update);
      return false; // BLOCK
    }

    console.log('✅ EMERGENCY: Allowing update - no conflicts detected:', fieldKey);
    return true; // ALLOW
  }

  // Record user typing to protect against overwrites
  recordUserTyping(userId: string, itemId?: string, field?: string): void {
    this.lastUserActivity.set(userId, Date.now());
    
    if (itemId && field) {
      criticalDataLossPrevention.trackLocalOperation('emergency', itemId, field);
    }
    
    console.log('🔒 EMERGENCY: Recorded user typing activity:', {
      userId,
      itemId,
      field,
      timestamp: Date.now()
    });
  }

  // Record blocked updates for later analysis
  private recordBlockedUpdate(fieldKey: string, update: any): void {
    if (!this.blockedUpdates.has(fieldKey)) {
      this.blockedUpdates.set(fieldKey, []);
    }
    
    this.blockedUpdates.get(fieldKey)!.push({
      ...update,
      blockedAt: Date.now()
    });
    
    // Limit blocked updates per field
    const blocked = this.blockedUpdates.get(fieldKey)!;
    if (blocked.length > 10) {
      this.blockedUpdates.set(fieldKey, blocked.slice(-5)); // Keep only last 5
    }
  }

  // Get protection statistics
  getEmergencyStats(): {
    emergencyMode: boolean;
    blockedUpdates: number;
    activeUsers: number;
    protectedFields: number;
  } {
    const now = Date.now();
    const activeUsers = Array.from(this.lastUserActivity.values())
      .filter(activity => (now - activity) < 10000).length; // 10 seconds
    
    const totalBlocked = Array.from(this.blockedUpdates.values())
      .reduce((sum, blocked) => sum + blocked.length, 0);
    
    return {
      emergencyMode: this.emergencyMode,
      blockedUpdates: totalBlocked,
      activeUsers,
      protectedFields: this.blockedUpdates.size
    };
  }

  // Disable emergency mode (when confident in fix)
  disableEmergencyMode(): void {
    this.emergencyMode = false;
    console.log('✅ EMERGENCY: Emergency mode disabled');
  }

  // Re-enable emergency mode
  enableEmergencyMode(): void {
    this.emergencyMode = true;
    console.log('🚨 EMERGENCY: Emergency mode enabled');
  }
}

// Global emergency system
export const emergencyDataLossProtection = new EmergencyDataLossProtection();

// Expose for debugging and manual control
if (typeof window !== 'undefined') {
  (window as any).emergencyDataLossProtection = emergencyDataLossProtection;
  (window as any).emergencyDisable = () => emergencyDataLossProtection.disableEmergencyMode();
  (window as any).emergencyEnable = () => emergencyDataLossProtection.enableEmergencyMode();
  (window as any).emergencyStats = () => emergencyDataLossProtection.getEmergencyStats();
}

export default emergencyDataLossProtection;