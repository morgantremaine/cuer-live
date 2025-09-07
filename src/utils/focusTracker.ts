import { debugLogger } from './debugLogger';

// Focus tracking utility for field-level protection during real-time updates
class FocusTracker {
  private activeField: string | null = null;
  private listeners: ((fieldKey: string | null) => void)[] = [];
  private lastBlurTime: number = 0;
  private typingBuffer: Map<string, { value: any; timestamp: number }> = new Map();
  
  constructor() {
    this.setupGlobalListeners();
  }
  
  private setupGlobalListeners() {
    // Listen for focus events on input elements
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      if (this.isEditableElement(target)) {
        const fieldKey = this.extractFieldKey(target);
        if (fieldKey) {
          debugLogger.focus('Field focused for protection:', fieldKey);
          this.setActiveField(fieldKey);
        }
      }
    });
    
    // Listen for blur events
    document.addEventListener('focusout', (event) => {
      const target = event.target as HTMLElement;
      if (this.isEditableElement(target)) {
        const fieldKey = this.extractFieldKey(target);
        if (fieldKey === this.activeField) {
          // Throttle blur logging to reduce noise
          const now = Date.now();
          if (now - this.lastBlurTime > 1000) {
            debugLogger.focus('Field blurred, removing protection:', fieldKey || 'unknown field');
            this.lastBlurTime = now;
          }
          // Delay clearing to allow for quick refocusing
          setTimeout(() => {
            if (this.activeField === fieldKey) {
              this.setActiveField(null);
            }
          }, 1000);
        }
      }
    });

    // Track input values to build a typing buffer for OCC protection
    document.addEventListener('input', (event) => {
      const target = event.target as HTMLElement;
      if (!this.isEditableElement(target)) return;
      const fieldKey = this.extractFieldKey(target);
      if (!fieldKey) return;

      // Extract value from various editable elements
      let value: any = null;
      if ((target as HTMLInputElement).value !== undefined) {
        value = (target as HTMLInputElement).value;
      } else if ((target as HTMLTextAreaElement).value !== undefined) {
        value = (target as HTMLTextAreaElement).value;
      } else if (target.isContentEditable) {
        value = target.textContent;
      } else {
        value = (target as any).value ?? null;
      }

      this.typingBuffer.set(fieldKey, { value, timestamp: Date.now() });
    });
  }
  
  private isEditableElement(element: HTMLElement): boolean {
    return (
      element.tagName === 'INPUT' ||
      element.tagName === 'TEXTAREA' ||
      element.contentEditable === 'true' ||
      element.hasAttribute('data-field-key')
    );
  }
  
  private extractFieldKey(element: HTMLElement): string | null {
    // Try data attribute first
    const dataFieldKey = element.getAttribute('data-field-key');
    if (dataFieldKey) {
      return dataFieldKey;
    }
    
    // Try to extract from ID or other attributes
    const id = element.id;
    const name = element.getAttribute('name');
    
    // Look for patterns like "item_123_name" or similar
    if (id && id.includes('_')) {
      return id;
    }
    
    if (name && name.includes('_')) {
      return name;
    }
    
    // Check for aria-label or other identifying attributes
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.includes('field')) {
      return ariaLabel;
    }
    
    // Try to find parent with field information
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      const parentFieldKey = parent.getAttribute('data-field-key');
      if (parentFieldKey) {
        return parentFieldKey;
      }
      parent = parent.parentElement;
    }
    
    return null;
  }
  
  private setActiveField(fieldKey: string | null) {
    if (this.activeField !== fieldKey) {
      this.activeField = fieldKey;
      this.notifyListeners(fieldKey);
    }
  }
  
  public getActiveField(): string | null {
    return this.activeField;
  }
  
  public onActiveFieldChange(callback: (fieldKey: string | null) => void) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  private notifyListeners(fieldKey: string | null) {
    this.listeners.forEach(callback => callback(fieldKey));
  }
  
  // Manual field protection API for programmatic usage
  public setFieldProtection(fieldKey: string, durationMs: number = 5000) {
    debugLogger.focus('Manual field protection set:', fieldKey);
    this.setActiveField(fieldKey);
    
    setTimeout(() => {
      if (this.activeField === fieldKey) {
        this.setActiveField(null);
      }
    }, durationMs);
  }
  
  public clearFieldProtection(fieldKey?: string) {
    if (!fieldKey || this.activeField === fieldKey) {
      this.setActiveField(null);
    }
  }

  // Typing buffer API
  public getLatestValue(fieldKey: string): { value: any; timestamp: number } | null {
    return this.typingBuffer.get(fieldKey) || null;
  }

  public getRecentlyTypedFields(windowMs: number = 3000): string[] {
    const now = Date.now();
    return Array.from(this.typingBuffer.entries())
      .filter(([_, entry]) => now - entry.timestamp <= windowMs)
      .map(([key]) => key);
  }
}


// Create global instance
export const globalFocusTracker = new FocusTracker();