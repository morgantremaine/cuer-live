/**
 * LocalShadow Store - Field-level protection for collaborative editing
 * Preserves user's actively edited fields during realtime updates and OCC refreshes
 */

interface LocalShadowEntry {
  value: any;
  timestamp: number;
  isActive: boolean;
}

interface GlobalShadowEntry {
  value: any;
  timestamp: number;
  isActive: boolean;
}

class LocalShadowStore {
  private itemShadows = new Map<string, Map<string, LocalShadowEntry>>();
  private globalShadows = new Map<string, GlobalShadowEntry>();
  private cleanupTimeouts = new Map<string, NodeJS.Timeout>();
  
  // Default protection window - can be extended for Live Show mode
  private protectionWindowMs = 3000;

  /**
   * Set protection window (useful for Live Show mode)
   */
  setProtectionWindow(ms: number) {
    this.protectionWindowMs = ms;
  }

  /**
   * Set shadow for item field (e.g., name, script, etc.)
   */
  setShadow(itemId: string, field: string, value: any, isActive = true) {
    const key = `${itemId}-${field}`;
    
    if (!this.itemShadows.has(itemId)) {
      this.itemShadows.set(itemId, new Map());
    }
    
    const itemMap = this.itemShadows.get(itemId)!;
    itemMap.set(field, {
      value,
      timestamp: Date.now(),
      isActive
    });
    
    // Schedule cleanup
    this.scheduleCleanup(key, itemId, field);
  }

  /**
   * Set shadow for global fields (title, startTime, etc.)
   */
  setGlobalShadow(field: string, value: any, isActive = true) {
    this.globalShadows.set(field, {
      value,
      timestamp: Date.now(),
      isActive
    });
    
    // Schedule cleanup
    this.scheduleCleanup(`global-${field}`, null, field);
  }

  /**
   * Get protected value for item field
   */
  getShadow(itemId: string, field: string): any | null {
    const itemMap = this.itemShadows.get(itemId);
    if (!itemMap) return null;
    
    const shadow = itemMap.get(field);
    if (!shadow) return null;
    
    const age = Date.now() - shadow.timestamp;
    if (age > this.protectionWindowMs) {
      // Cleanup expired shadow
      itemMap.delete(field);
      if (itemMap.size === 0) {
        this.itemShadows.delete(itemId);
      }
      return null;
    }
    
    return shadow.isActive ? shadow.value : null;
  }

  /**
   * Get protected value for global field
   */
  getGlobalShadow(field: string): any | null {
    const shadow = this.globalShadows.get(field);
    if (!shadow) return null;
    
    const age = Date.now() - shadow.timestamp;
    if (age > this.protectionWindowMs) {
      // Cleanup expired shadow
      this.globalShadows.delete(field);
      return null;
    }
    
    return shadow.isActive ? shadow.value : null;
  }

  /**
   * Check if field is protected
   */
  isProtected(itemId: string, field: string): boolean {
    return this.getShadow(itemId, field) !== null;
  }

  /**
   * Check if global field is protected
   */
  isGlobalProtected(field: string): boolean {
    return this.getGlobalShadow(field) !== null;
  }

  /**
   * Mark shadow as inactive (but keep it for a short time)
   */
  markInactive(itemId: string, field: string) {
    const itemMap = this.itemShadows.get(itemId);
    if (itemMap && itemMap.has(field)) {
      const shadow = itemMap.get(field)!;
      shadow.isActive = false;
    }
  }

  /**
   * Mark global shadow as inactive
   */
  markGlobalInactive(field: string) {
    const shadow = this.globalShadows.get(field);
    if (shadow) {
      shadow.isActive = false;
    }
  }

  /**
   * Clear specific shadow
   */
  clearShadow(itemId: string, field: string) {
    const itemMap = this.itemShadows.get(itemId);
    if (itemMap) {
      itemMap.delete(field);
      if (itemMap.size === 0) {
        this.itemShadows.delete(itemId);
      }
    }
    
    const key = `${itemId}-${field}`;
    const timeout = this.cleanupTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.cleanupTimeouts.delete(key);
    }
  }

  /**
   * Clear global shadow
   */
  clearGlobalShadow(field: string) {
    this.globalShadows.delete(field);
    
    const key = `global-${field}`;
    const timeout = this.cleanupTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.cleanupTimeouts.delete(key);
    }
  }

  /**
   * Get all currently protected field keys
   */
  getProtectedFields(): Set<string> {
    const protected_fields = new Set<string>();
    const now = Date.now();
    
    // Check item fields
    for (const [itemId, itemMap] of this.itemShadows.entries()) {
      for (const [field, shadow] of itemMap.entries()) {
        if (shadow.isActive && (now - shadow.timestamp) < this.protectionWindowMs) {
          protected_fields.add(`${itemId}-${field}`);
        }
      }
    }
    
    // Check global fields
    for (const [field, shadow] of this.globalShadows.entries()) {
      if (shadow.isActive && (now - shadow.timestamp) < this.protectionWindowMs) {
        protected_fields.add(field);
      }
    }
    
    return protected_fields;
  }

  /**
   * Schedule automatic cleanup of expired shadows
   */
  private scheduleCleanup(key: string, itemId: string | null, field: string) {
    // Clear existing timeout
    const existingTimeout = this.cleanupTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Schedule new cleanup
    const timeout = setTimeout(() => {
      if (itemId) {
        const itemMap = this.itemShadows.get(itemId);
        if (itemMap) {
          itemMap.delete(field);
          if (itemMap.size === 0) {
            this.itemShadows.delete(itemId);
          }
        }
      } else {
        this.globalShadows.delete(field);
      }
      
      this.cleanupTimeouts.delete(key);
    }, this.protectionWindowMs + 500); // Small buffer
    
    this.cleanupTimeouts.set(key, timeout);
  }

  /**
   * Clear all shadows (useful for rundown switches)
   */
  clearAll() {
    this.itemShadows.clear();
    this.globalShadows.clear();
    
    // Clear all timeouts
    for (const timeout of this.cleanupTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.cleanupTimeouts.clear();
  }
}

export const localShadowStore = new LocalShadowStore();