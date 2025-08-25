// Focus tracking utility for field-level protection during real-time updates
class FocusTracker {
  private activeField: string | null = null;
  private listeners: ((fieldKey: string | null) => void)[] = [];
  
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
          console.log('🎯 Field focused for protection:', fieldKey);
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
          console.log('🎯 Field blurred, removing protection:', fieldKey);
          // Delay clearing to allow for quick refocusing
          setTimeout(() => {
            if (this.activeField === fieldKey) {
              this.setActiveField(null);
            }
          }, 1000);
        }
      }
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
    console.log('🛡️ Manual field protection set:', fieldKey);
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
}

// Create global instance
export const globalFocusTracker = new FocusTracker();