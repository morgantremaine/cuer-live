/**
 * Global registry to track which fields are currently being edited
 * This prevents data loss during concurrent saves by preserving 
 * fields the user is actively editing
 */

type FieldKey = string; // Format: "rundownId-itemId-field" or "rundownId-field"
type FocusEntry = {
  timestamp: number;
  userId?: string;
};

class FieldFocusRegistry {
  private focusedFields = new Map<FieldKey, FocusEntry>();
  private focusTimeouts = new Map<FieldKey, NodeJS.Timeout>();
  
  /**
   * Register that a field is being focused/edited
   */
  setFieldFocus(rundownId: string, itemId: string | null, fieldName: string, userId?: string) {
    const key = this.generateKey(rundownId, itemId, fieldName);
    
    // Clear existing timeout for this field
    const existingTimeout = this.focusTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Register the focus
    this.focusedFields.set(key, {
      timestamp: Date.now(),
      userId
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 Field focus registered:', { rundownId, itemId, fieldName });
    }
    
    // Auto-clear focus after 30 seconds of inactivity
    const timeout = setTimeout(() => {
      this.clearFieldFocus(rundownId, itemId, fieldName);
    }, 30000);
    
    this.focusTimeouts.set(key, timeout);
  }
  
  /**
   * Clear field focus (when user blurs the field)
   */
  clearFieldFocus(rundownId: string, itemId: string | null, fieldName: string) {
    const key = this.generateKey(rundownId, itemId, fieldName);
    
    // Clear timeout
    const timeout = this.focusTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.focusTimeouts.delete(key);
    }
    
    // Clear focus
    this.focusedFields.delete(key);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 Field focus cleared:', { rundownId, itemId, fieldName });
    }
  }
  
  /**
   * Get all currently focused fields for a specific rundown
   * Returns a Set of field keys in the format expected by mergeConflictedRundown
   */
  getProtectedFields(rundownId: string): Set<string> {
    const protectedFields = new Set<string>();
    
    for (const [key, entry] of this.focusedFields.entries()) {
      if (key.startsWith(`${rundownId}-`)) {
        // Check if focus is still recent (within 5 minutes)
        const timeSinceFocus = Date.now() - entry.timestamp;
        if (timeSinceFocus < 5 * 60 * 1000) { // 5 minutes
          protectedFields.add(key);
        } else {
          // Auto-cleanup old focus entries
          this.focusedFields.delete(key);
          const timeout = this.focusTimeouts.get(key);
          if (timeout) {
            clearTimeout(timeout);
            this.focusTimeouts.delete(key);
          }
        }
      }
    }
    
    return protectedFields;
  }
  
  /**
   * Check if a specific field is currently focused
   */
  isFieldFocused(rundownId: string, itemId: string | null, fieldName: string): boolean {
    const key = this.generateKey(rundownId, itemId, fieldName);
    return this.focusedFields.has(key);
  }
  
  /**
   * Clear all focused fields for a rundown (when leaving the rundown)
   */
  clearRundownFocus(rundownId: string) {
    const keysToDelete: string[] = [];
    
    for (const key of this.focusedFields.keys()) {
      if (key.startsWith(`${rundownId}-`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.focusedFields.delete(key);
      const timeout = this.focusTimeouts.get(key);
      if (timeout) {
        clearTimeout(timeout);
        this.focusTimeouts.delete(key);
      }
    });
    
    if (process.env.NODE_ENV === 'development' && keysToDelete.length > 0) {
      console.log('📝 Cleared all field focus for rundown:', rundownId);
    }
  }
  
  private generateKey(rundownId: string, itemId: string | null, fieldName: string): string {
    if (itemId) {
      return `${rundownId}-${itemId}-${fieldName}`;
    }
    return `${rundownId}-${fieldName}`;
  }
}

// Export singleton instance
export const fieldFocusRegistry = new FieldFocusRegistry();