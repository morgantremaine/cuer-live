/**
 * LocalShadow Store - Bulletproof protection for active typing
 * Preserves user input during conflict resolution and realtime updates
 * Integrated with unified content signature system for consistency
 */

import { createContentSignature } from '@/utils/contentSignature';

interface ShadowEntry {
  value: any;
  timestamp: number;
  isActive: boolean;
  lastTyped: number;
}

interface ItemShadow {
  [fieldName: string]: ShadowEntry;
}

class LocalShadowStore {
  private shadows = new Map<string, ItemShadow>(); // itemId -> field shadows
  private globalFields = new Map<string, ShadowEntry>(); // global field shadows
  private typingBuffer = new Map<string, ShadowEntry>(); // recent typing buffer

  // Set shadow value for item field
  setShadow(itemId: string, fieldName: string, value: any, isActive: boolean = true): void {
    const now = Date.now();
    const fieldKey = `${itemId}-${fieldName}`;
    
    if (!this.shadows.has(itemId)) {
      this.shadows.set(itemId, {});
    }
    
    const itemShadow = this.shadows.get(itemId)!;
    itemShadow[fieldName] = {
      value,
      timestamp: now,
      isActive,
      lastTyped: now
    };

    // Also maintain in typing buffer for recent access
    this.typingBuffer.set(fieldKey, itemShadow[fieldName]);
    
    console.log('🔒 LocalShadow: Set shadow', { itemId, fieldName, isActive, valueLength: String(value).length });
  }

  // Set shadow for global field (title, startTime, etc.)
  setGlobalShadow(fieldName: string, value: any, isActive: boolean = true): void {
    const now = Date.now();
    this.globalFields.set(fieldName, {
      value,
      timestamp: now,
      isActive,
      lastTyped: now
    });
    
    console.log('🔒 LocalShadow: Set global shadow', { fieldName, isActive });
  }

  // Get shadow value if exists and is recent
  getShadow(itemId: string, fieldName: string, maxAge: number = 5000): any {
    const itemShadow = this.shadows.get(itemId);
    if (!itemShadow || !itemShadow[fieldName]) return undefined;
    
    const entry = itemShadow[fieldName];
    const age = Date.now() - entry.timestamp;
    
    if (age <= maxAge) {
      console.log('🔒 LocalShadow: Retrieved shadow', { itemId, fieldName, age });
      return entry.value;
    }
    
    return undefined;
  }

  // Get global shadow value
  getGlobalShadow(fieldName: string, maxAge: number = 5000): any {
    const entry = this.globalFields.get(fieldName);
    if (!entry) return undefined;
    
    const age = Date.now() - entry.timestamp;
    if (age <= maxAge) {
      console.log('🔒 LocalShadow: Retrieved global shadow', { fieldName, age });
      return entry.value;
    }
    
    return undefined;
  }

  // Check if field has active shadow (user is typing)
  hasActiveShadow(itemId: string, fieldName: string): boolean {
    const itemShadow = this.shadows.get(itemId);
    if (!itemShadow || !itemShadow[fieldName]) return false;
    
    const entry = itemShadow[fieldName];
    const age = Date.now() - entry.timestamp;
    
    return entry.isActive && age <= 1500; // 1.5 second active window - memory optimized
  }

  // Check if global field has active shadow
  hasActiveGlobalShadow(fieldName: string): boolean {
    const entry = this.globalFields.get(fieldName);
    if (!entry) return false;
    
    const age = Date.now() - entry.timestamp;
    return entry.isActive && age <= 1500; // Memory optimized
  }

  // Mark field as inactive (user stopped typing)
  markInactive(itemId: string, fieldName: string): void {
    const itemShadow = this.shadows.get(itemId);
    if (itemShadow && itemShadow[fieldName]) {
      itemShadow[fieldName].isActive = false;
      console.log('🔓 LocalShadow: Marked inactive', { itemId, fieldName });
    }
  }

  // Mark global field as inactive
  markGlobalInactive(fieldName: string): void {
    const entry = this.globalFields.get(fieldName);
    if (entry) {
      entry.isActive = false;
      console.log('🔓 LocalShadow: Marked global inactive', { fieldName });
    }
  }

  // Get all active shadows for conflict protection
  getActiveShadows(): { items: Map<string, ItemShadow>; globals: Map<string, ShadowEntry> } {
    const now = Date.now();
    const activeItems = new Map<string, ItemShadow>();
    const activeGlobals = new Map<string, ShadowEntry>();
    
    // Filter active item shadows
    this.shadows.forEach((itemShadow, itemId) => {
      const activeFields: ItemShadow = {};
      Object.entries(itemShadow).forEach(([fieldName, entry]) => {
        if (entry.isActive && (now - entry.timestamp) <= 1500) { // Memory optimized
          activeFields[fieldName] = entry;
        }
      });
      
      if (Object.keys(activeFields).length > 0) {
        activeItems.set(itemId, activeFields);
      }
    });
    
    // Filter active global shadows
    this.globalFields.forEach((entry, fieldName) => {
      if (entry.isActive && (now - entry.timestamp) <= 1500) { // Memory optimized
        activeGlobals.set(fieldName, entry);
      }
    });
    
    return { items: activeItems, globals: activeGlobals };
  }

  // Get recently typed fields (for broader protection)
  getRecentlyTypedFields(maxAge: number = 3000): string[] {
    const now = Date.now();
    const recentFields: string[] = [];
    
    this.typingBuffer.forEach((entry, fieldKey) => {
      if ((now - entry.lastTyped) <= maxAge) {
        recentFields.push(fieldKey);
      }
    });
    
    return recentFields;
  }

  // Clean up old shadows
  cleanup(): void {
    const now = Date.now();
    const maxAge = 10000; // 10 seconds - aggressive memory cleanup
    
    // Clean item shadows
    this.shadows.forEach((itemShadow, itemId) => {
      const cleanFields: ItemShadow = {};
      Object.entries(itemShadow).forEach(([fieldName, entry]) => {
        if ((now - entry.timestamp) <= maxAge) {
          cleanFields[fieldName] = entry;
        }
      });
      
      if (Object.keys(cleanFields).length > 0) {
        this.shadows.set(itemId, cleanFields);
      } else {
        this.shadows.delete(itemId);
      }
    });
    
    // Clean global shadows
    this.globalFields.forEach((entry, fieldName) => {
      if ((now - entry.timestamp) > maxAge) {
        this.globalFields.delete(fieldName);
      }
    });
    
    // Clean typing buffer
    this.typingBuffer.forEach((entry, fieldKey) => {
      if ((now - entry.timestamp) > maxAge) {
        this.typingBuffer.delete(fieldKey);
      }
    });
  }

  // Apply shadows to data during conflict resolution with signature validation
  applyShadowsToData(data: any): any {
    const activeShadows = this.getActiveShadows();
    
    if (activeShadows.items.size === 0 && activeShadows.globals.size === 0) {
      return data; // No active shadows to apply
    }
    
    const result = { ...data };
    
    // Apply global field shadows
    activeShadows.globals.forEach((entry, fieldName) => {
      console.log('🔒 LocalShadow: Applying global shadow', { fieldName, value: entry.value });
      result[fieldName] = entry.value;
    });
    
    // Apply item field shadows
    if (Array.isArray(result.items)) {
      result.items = result.items.map((item: any) => {
        const itemShadows = activeShadows.items.get(item.id);
        if (!itemShadows) return item;
        
        const shadowedItem = { ...item };
        Object.entries(itemShadows).forEach(([fieldName, entry]) => {
          console.log('🔒 LocalShadow: Applying item shadow', { itemId: item.id, fieldName, value: entry.value });
          shadowedItem[fieldName] = entry.value;
        });
        
        return shadowedItem;
      });
    }
    
    // Validate shadow application doesn't break signature consistency
    if (process.env.NODE_ENV === 'development') {
      const originalSignature = createContentSignature({
        items: data.items || [],
        title: data.title || '',
        columns: [],
        timezone: data.timezone || '',
        startTime: data.start_time || '',
        showDate: data.show_date ? new Date(data.show_date) : null,
        externalNotes: data.external_notes || ''
      });
      
      const shadowedSignature = createContentSignature({
        items: result.items || [],
        title: result.title || '',
        columns: [],
        timezone: result.timezone || '',
        startTime: result.start_time || '',
        showDate: result.show_date ? new Date(result.show_date) : null,
        externalNotes: result.external_notes || ''
      });
      
      const hasActiveShadows = activeShadows.items.size > 0 || activeShadows.globals.size > 0;
      if (hasActiveShadows && originalSignature === shadowedSignature) {
        console.warn('🚨 LocalShadow: Active shadows but signature unchanged - shadow application may be broken');
      } else if (!hasActiveShadows && originalSignature !== shadowedSignature) {
        console.warn('🚨 LocalShadow: No active shadows but signature changed - unexpected modification');
      }
    }

    return result;
  }

  // Clear all shadows (e.g., on successful save)
  clear(): void {
    this.shadows.clear();
    this.globalFields.clear();
    this.typingBuffer.clear();
    console.log('🔒 LocalShadow: Cleared all shadows');
  }
}

// Global singleton instance
export const localShadowStore = new LocalShadowStore();

// Auto-cleanup every 5 seconds for memory efficiency
setInterval(() => {
  localShadowStore.cleanup();
}, 5000);

export default localShadowStore;