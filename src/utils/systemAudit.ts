/**
 * System Audit and Monitoring Utilities
 * 
 * This module provides comprehensive auditing and monitoring capabilities
 * to detect inconsistencies, performance issues, and state management problems
 * across the application's signature and persistence systems.
 */

import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/columns';
import { createContentSignature, createLightweightContentSignature } from './contentSignature';

// ================ INVARIANT CHECKING ================

interface SignatureAuditResult {
  content: string;
  undo: string;
  header: string;
  lightweight: string;
  timestamp: number;
  context: string;
  inconsistencies: string[];
}

interface StateTransition {
  from: string;
  to: string;
  reason: string;
  timestamp: number;
  context: string;
  triggerSource: string;
}

interface ConflictResolution {
  conflictType: string;
  resolution: string;
  reason: string;
  dataLost: boolean;
  timestamp: number;
  context: string;
}

interface PerformanceAnomaly {
  type: 'excessive_saves' | 'signature_thrashing' | 'state_loops' | 'memory_leak';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  timestamp: number;
  context: string;
}

class SystemAuditor {
  private signatureHistory: SignatureAuditResult[] = [];
  private stateTransitions: StateTransition[] = [];
  private conflictResolutions: ConflictResolution[] = [];
  private performanceAnomalies: PerformanceAnomaly[] = [];
  
  // Performance tracking
  private saveOperationCount = 0;
  private lastSaveTime = 0;
  private signatureCallCount = 0;
  private lastSignatureCall = 0;
  
  // Signature consistency tracking
  private lastKnownSignatures: Record<string, string> = {};
  
  /**
   * SIGNATURE AUDIT - Compare all signature methods side-by-side
   */
  auditSignatures(data: {
    items: RundownItem[];
    title: string;
    columns?: Column[];
    timezone?: string;
    startTime?: string;
    showDate?: Date | null;
    externalNotes?: string;
  }, context: string): SignatureAuditResult {
    
    // Create all signature variants
    const contentSignature = createContentSignature(data);
    
    // Undo system signature (current implementation)
    const undoSignature = JSON.stringify({ 
      items: data.items, 
      columns: data.columns || [], 
      title: data.title 
    });
    
    // Header content-only signature (manual implementation)
    const headerSignature = JSON.stringify({
      items: (data.items || []).map(item => ({
        id: item.id,
        type: item.type,
        name: item.name || '',
        talent: item.talent || '',
        script: item.script || '',
        gfx: item.gfx || '',
        video: item.video || '',
        images: item.images || '',
        notes: item.notes || '',
        duration: item.duration || '',
        startTime: item.startTime || '',
        endTime: item.endTime || '',
        color: item.color || '',
        isFloating: Boolean(item.isFloating),
        isFloated: Boolean(item.isFloated),
        customFields: item.customFields || {},
        segmentName: item.segmentName || '',
        rowNumber: item.rowNumber || 0
      })),
      title: data.title || '',
      showDate: data.showDate ? 
        `${data.showDate.getFullYear()}-${String(data.showDate.getMonth() + 1).padStart(2, '0')}-${String(data.showDate.getDate()).padStart(2, '0')}` 
        : null,
      externalNotes: data.externalNotes || ''
    });
    
    // Lightweight signature
    const lightweightSignature = createLightweightContentSignature(data);
    
    // Detect inconsistencies
    const inconsistencies: string[] = [];
    
    if (contentSignature !== headerSignature) {
      inconsistencies.push(`Content vs Header signature mismatch (${contentSignature.length} vs ${headerSignature.length})`);
    }
    
    if (contentSignature.includes('"columns"') && context !== 'conflict-resolution') {
      inconsistencies.push('Content signature includes columns (should be excluded)');
    }
    
    if (undoSignature.includes('"timezone"') || undoSignature.includes('"startTime"')) {
      inconsistencies.push('Undo signature includes UI-only fields');
    }
    
    const result: SignatureAuditResult = {
      content: contentSignature,
      undo: undoSignature,
      header: headerSignature,
      lightweight: lightweightSignature,
      timestamp: Date.now(),
      context,
      inconsistencies
    };
    
    // Store for analysis
    this.signatureHistory.push(result);
    this.signatureHistory = this.signatureHistory.slice(-100); // Keep last 100
    
    // Log if inconsistencies found
    if (inconsistencies.length > 0) {
      console.error('🚨 SIGNATURE AUDIT FAILED:', {
        context,
        inconsistencies,
        signatureLengths: {
          content: contentSignature.length,
          undo: undoSignature.length,
          header: headerSignature.length,
          lightweight: lightweightSignature.length
        }
      });
    } else if (process.env.NODE_ENV === 'development') {
      console.log('✅ SIGNATURE AUDIT PASSED:', {
        context,
        signatureLengths: {
          content: contentSignature.length,
          undo: undoSignature.length,
          header: headerSignature.length,
          lightweight: lightweightSignature.length
        }
      });
    }
    
    return result;
  }
  
  /**
   * STATE TRANSITION LOGGING
   */
  logStateTransition(from: string, to: string, reason: string, context: string, triggerSource: string) {
    const transition: StateTransition = {
      from,
      to,
      reason,
      timestamp: Date.now(),
      context,
      triggerSource
    };
    
    this.stateTransitions.push(transition);
    this.stateTransitions = this.stateTransitions.slice(-200); // Keep last 200
    
    console.log('🔄 STATE TRANSITION:', transition);
    
    // Detect loops or rapid transitions
    const recentTransitions = this.stateTransitions.filter(t => 
      Date.now() - t.timestamp < 5000 && t.context === context
    );
    
    if (recentTransitions.length > 10) {
      this.logPerformanceAnomaly('state_loops', 'high', {
        context,
        transitionCount: recentTransitions.length,
        transitions: recentTransitions.slice(-5)
      });
    }
  }
  
  /**
   * CONFLICT RESOLUTION VISIBILITY
   */
  logConflictResolution(conflictType: string, resolution: string, reason: string, dataLost: boolean, context: string) {
    const conflict: ConflictResolution = {
      conflictType,
      resolution,
      reason,
      dataLost,
      timestamp: Date.now(),
      context
    };
    
    this.conflictResolutions.push(conflict);
    this.conflictResolutions = this.conflictResolutions.slice(-50); // Keep last 50
    
    console.warn('⚔️ CONFLICT RESOLUTION:', conflict);
    
    if (dataLost) {
      console.error('🚨 DATA LOSS in conflict resolution:', conflict);
    }
  }
  
  /**
   * PERFORMANCE ANOMALY DETECTION
   */
  logPerformanceAnomaly(type: PerformanceAnomaly['type'], severity: PerformanceAnomaly['severity'], details: Record<string, any>) {
    const anomaly: PerformanceAnomaly = {
      type,
      severity,
      details,
      timestamp: Date.now(),
      context: details.context || 'unknown'
    };
    
    this.performanceAnomalies.push(anomaly);
    this.performanceAnomalies = this.performanceAnomalies.slice(-100);
    
    if (severity === 'critical' || severity === 'high') {
      console.error('🚨 PERFORMANCE ANOMALY:', anomaly);
    } else {
      console.warn('⚠️ Performance issue:', anomaly);
    }
  }
  
  /**
   * SAVE OPERATION TRACKING
   */
  trackSaveOperation(context: string) {
    const now = Date.now();
    this.saveOperationCount++;
    
    // Detect excessive saves (more than 5 per second)
    if (now - this.lastSaveTime < 200) {
      this.logPerformanceAnomaly('excessive_saves', 'medium', {
        context,
        saveCount: this.saveOperationCount,
        timeSinceLastSave: now - this.lastSaveTime
      });
    }
    
    this.lastSaveTime = now;
    
    // Reset counter every minute
    setTimeout(() => {
      this.saveOperationCount = Math.max(0, this.saveOperationCount - 1);
    }, 60000);
  }
  
  /**
   * SIGNATURE CALL TRACKING
   */
  trackSignatureCall(signatureType: string) {
    const now = Date.now();
    this.signatureCallCount++;
    
    // Detect signature thrashing (more than 10 calls per second)
    if (now - this.lastSignatureCall < 100) {
      this.logPerformanceAnomaly('signature_thrashing', 'medium', {
        signatureType,
        callCount: this.signatureCallCount,
        timeSinceLastCall: now - this.lastSignatureCall
      });
    }
    
    this.lastSignatureCall = now;
    
    // Reset counter every 10 seconds
    setTimeout(() => {
      this.signatureCallCount = Math.max(0, this.signatureCallCount - 1);
    }, 10000);
  }
  
  /**
   * RUNTIME ASSERTIONS
   */
  assertSignatureConsistency(data: {
    items: RundownItem[];
    title: string;
    columns?: Column[];
    timezone?: string;
    startTime?: string;
    showDate?: Date | null;
    externalNotes?: string;
  }, context: string): boolean {
    
    if (process.env.NODE_ENV !== 'development') {
      return true; // Skip in production
    }
    
    const audit = this.auditSignatures(data, context);
    
    // Check if undo and content systems agree on data changes
    const contentHasData = audit.content.length > 100; // Arbitrary threshold
    const undoHasData = audit.undo.length > 50;
    
    if (contentHasData !== undoHasData) {
      console.error('🚨 SIGNATURE MISMATCH DETECTED between undo and content systems', {
        context,
        contentLength: audit.content.length,
        undoLength: audit.undo.length,
        contentHasData,
        undoHasData
      });
      return false;
    }
    
    return audit.inconsistencies.length === 0;
  }
  
  /**
   * GET AUDIT REPORT
   */
  getAuditReport(): {
    signatureHistory: SignatureAuditResult[];
    stateTransitions: StateTransition[];
    conflictResolutions: ConflictResolution[];
    performanceAnomalies: PerformanceAnomaly[];
    summary: {
      totalInconsistencies: number;
      criticalAnomalies: number;
      dataLossEvents: number;
      recentSaveRate: number;
    };
  } {
    const criticalAnomalies = this.performanceAnomalies.filter(a => a.severity === 'critical').length;
    const dataLossEvents = this.conflictResolutions.filter(c => c.dataLost).length;
    const totalInconsistencies = this.signatureHistory.reduce((sum, audit) => sum + audit.inconsistencies.length, 0);
    
    // Calculate save rate (saves per minute in last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentSaves = this.stateTransitions.filter(t => 
      t.timestamp > fiveMinutesAgo && t.reason.toLowerCase().includes('save')
    ).length;
    const recentSaveRate = recentSaves / 5; // per minute
    
    return {
      signatureHistory: this.signatureHistory,
      stateTransitions: this.stateTransitions,
      conflictResolutions: this.conflictResolutions,
      performanceAnomalies: this.performanceAnomalies,
      summary: {
        totalInconsistencies,
        criticalAnomalies,
        dataLossEvents,
        recentSaveRate
      }
    };
  }
  
  /**
   * CLEAR AUDIT DATA
   */
  clearAuditData() {
    this.signatureHistory = [];
    this.stateTransitions = [];
    this.conflictResolutions = [];
    this.performanceAnomalies = [];
    this.saveOperationCount = 0;
    this.signatureCallCount = 0;
    console.log('🧹 Audit data cleared');
  }
}

// Global auditor instance
export const systemAuditor = new SystemAuditor();

// Export individual functions for easy use
export const auditSignatures = systemAuditor.auditSignatures.bind(systemAuditor);
export const logStateTransition = systemAuditor.logStateTransition.bind(systemAuditor);
export const logConflictResolution = systemAuditor.logConflictResolution.bind(systemAuditor);
export const logPerformanceAnomaly = systemAuditor.logPerformanceAnomaly.bind(systemAuditor);
export const trackSaveOperation = systemAuditor.trackSaveOperation.bind(systemAuditor);
export const trackSignatureCall = systemAuditor.trackSignatureCall.bind(systemAuditor);
export const assertSignatureConsistency = systemAuditor.assertSignatureConsistency.bind(systemAuditor);
export const getAuditReport = systemAuditor.getAuditReport.bind(systemAuditor);
export const clearAuditData = systemAuditor.clearAuditData.bind(systemAuditor);

// Development-only global access for debugging
if (process.env.NODE_ENV === 'development') {
  (window as any).systemAuditor = systemAuditor;
}