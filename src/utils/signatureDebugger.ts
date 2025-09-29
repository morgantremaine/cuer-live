/**
 * Development utilities for debugging signature consistency
 */

import { createContentSignature, createUIPreferencesSignature } from './contentSignature';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/columns';

interface SignatureDebugInfo {
  contentSignature: string;
  uiSignature: string;
  contentFields: any;
  uiFields: any;
  timestamp: number;
}

class SignatureDebugger {
  private lastDebugInfo: SignatureDebugInfo | null = null;
  
  /**
   * Compare signatures and log differences for debugging
   */
  compareSignatures(
    items: RundownItem[],
    title: string,
    columns: Column[] = [],
    timezone: string = '',
    startTime: string = '',
    context: string = 'unknown'
  ): SignatureDebugInfo {
    const contentSignature = createContentSignature({
      items,
      title,
      columns: [],
      timezone: '',
      startTime: '',
      showDate: null,
      externalNotes: ''
    });

    const uiSignature = createUIPreferencesSignature({
      items: [],
      title: '',
      columns,
      timezone,
      startTime,
      showDate: null,
      externalNotes: ''
    });

    const debugInfo: SignatureDebugInfo = {
      contentSignature,
      uiSignature,
      contentFields: {
        itemCount: items.length,
        title,
        itemFields: items.slice(0, 3).map(item => ({
          id: item.id,
          name: item.name,
          type: item.type,
          duration: item.duration
        }))
      },
      uiFields: {
        columnCount: columns.length,
        timezone,
        startTime,
        columnNames: columns.map(c => c.name)
      },
      timestamp: Date.now()
    };

    console.group(`🔐 SIGNATURE DEBUG [${context}]`);
    console.log('📋 Content Signature:', {
      signature: contentSignature.substring(0, 100) + '...',
      length: contentSignature.length,
      includes: ['items', 'title', 'showDate', 'externalNotes'],
      excludes: ['columns', 'timezone', 'startTime']
    });
    console.log('🎛️ UI Signature:', {
      signature: uiSignature.substring(0, 100) + '...',
      length: uiSignature.length,
      includes: ['columns', 'timezone', 'startTime'],
      excludes: ['items', 'title']
    });

    if (this.lastDebugInfo) {
      const contentChanged = this.lastDebugInfo.contentSignature !== contentSignature;
      const uiChanged = this.lastDebugInfo.uiSignature !== uiSignature;
      
      console.log('🔄 Changes Since Last Check:', {
        contentChanged,
        uiChanged,
        timeDiff: debugInfo.timestamp - this.lastDebugInfo.timestamp
      });

      if (contentChanged) {
        console.log('📝 Content change detected - this should trigger saves');
      }
      if (uiChanged) {
        console.log('🎛️ UI preference change - this should NOT trigger saves');
      }
    }
    console.groupEnd();

    this.lastDebugInfo = debugInfo;
    return debugInfo;
  }

  /**
   * Validate that content signatures are truly content-only
   */
  validateContentOnly(items: RundownItem[], title: string): boolean {
    // Test 1: Different UI settings should produce same content signature
    const sig1 = createContentSignature({
      items, title,
      columns: [],
      timezone: 'UTC',
      startTime: '09:00:00',
      showDate: null,
      externalNotes: ''
    });

    const sig2 = createContentSignature({
      items, title,
      columns: [{ id: 'test', key: 'test', name: 'Test', isVisible: true, isCustom: false, width: '100px', isEditable: false }],
      timezone: 'America/New_York',
      startTime: '12:00:00',
      showDate: new Date(),
      externalNotes: 'different'
    });

    const isValid = sig1 === sig2;
    
    if (!isValid) {
      console.error('❌ VALIDATION FAILED: Content signatures differ with different UI settings!', {
        sig1Length: sig1.length,
        sig2Length: sig2.length,
        sig1Preview: sig1.substring(0, 100),
        sig2Preview: sig2.substring(0, 100)
      });
    } else {
      console.log('✅ VALIDATION PASSED: Content signatures identical regardless of UI settings');
    }

    return isValid;
  }

  /**
   * Monitor signature creation in real-time
   */
  startMonitoring() {
    if (process.env.NODE_ENV !== 'development') return;
    
    console.log('👁️ Signature monitoring started - watch for signature creation logs');
    
    // Monitor for the specific log patterns we added
    const originalLog = console.log;
    console.log = (...args) => {
      const message = args.join(' ');
      if (message.includes('CONTENT-ONLY SIGNATURE') || 
          message.includes('CHANGE TRACKING') || 
          message.includes('AUTOSAVE')) {
        originalLog('🔍 SIGNATURE MONITOR:', ...args);
      } else {
        originalLog(...args);
      }
    };
  }
}

// Export singleton instance
export const signatureDebugger = new SignatureDebugger();

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development') {
  signatureDebugger.startMonitoring();
  console.log('🚀 Signature debugging enabled - check console for signature validation logs');
}