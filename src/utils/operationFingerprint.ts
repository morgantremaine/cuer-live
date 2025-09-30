/**
 * Operation Fingerprinting System
 * Creates unique fingerprints for operations to enable conflict detection
 * and selective gap resolution
 */

interface OperationFingerprint {
  operationType: 'cell_edit' | 'row_delete' | 'row_insert' | 'row_move' | 'global_edit';
  target: string; // itemId or global field name
  field?: string; // for cell edits
  value: any;
  timestamp: number;
  clientId: string;
  sequenceId: string;
}

interface FieldChange {
  itemId?: string;
  fieldName: string;
  newValue: any;
  timestamp: number;
  fingerprint: string;
}

class OperationFingerprinter {
  private recentOperations = new Map<string, OperationFingerprint>();
  private fieldChangeLog = new Map<string, FieldChange[]>(); // field key -> changes
  private maxAge = 30000; // 30 seconds

  // Create fingerprint for an operation
  createFingerprint(
    operationType: OperationFingerprint['operationType'],
    target: string,
    value: any,
    field?: string,
    clientId?: string
  ): string {
    const timestamp = Date.now();
    const sequenceId = `${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fingerprint: OperationFingerprint = {
      operationType,
      target,
      field,
      value,
      timestamp,
      clientId: clientId || 'unknown',
      sequenceId
    };

    const fingerprintKey = this.generateFingerprintKey(fingerprint);
    this.recentOperations.set(fingerprintKey, fingerprint);

    // Track field changes for comparison
    const fieldKey = field ? `${target}-${field}` : target;
    if (!this.fieldChangeLog.has(fieldKey)) {
      this.fieldChangeLog.set(fieldKey, []);
    }
    
    const fieldChange: FieldChange = {
      itemId: field ? target : undefined,
      fieldName: field || target,
      newValue: value,
      timestamp,
      fingerprint: fingerprintKey
    };

    this.fieldChangeLog.get(fieldKey)!.push(fieldChange);
    this.cleanup();

    console.log('🔍 Operation fingerprint created:', {
      type: operationType,
      target,
      field,
      fingerprintKey,
      valueLength: String(value).length
    });

    return fingerprintKey;
  }

  // Generate unique key for fingerprint
  private generateFingerprintKey(fp: OperationFingerprint): string {
    const valueHash = this.hashValue(fp.value);
    return `${fp.operationType}_${fp.target}_${fp.field || 'global'}_${valueHash}_${fp.timestamp}`;
  }

  // Simple hash for values
  private hashValue(value: any): string {
    const str = JSON.stringify(value);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Check if operation conflicts with recent operations
  hasConflictingOperation(
    target: string,
    field: string | undefined,
    serverValue: any,
    serverTimestamp: number
  ): { hasConflict: boolean; conflictingOperation?: OperationFingerprint } {
    const fieldKey = field ? `${target}-${field}` : target;
    const changes = this.fieldChangeLog.get(fieldKey) || [];
    
    // Look for operations newer than server timestamp
    const conflictingChange = changes.find(change => 
      change.timestamp > serverTimestamp && 
      JSON.stringify(change.newValue) !== JSON.stringify(serverValue)
    );

    if (conflictingChange) {
      const operation = this.recentOperations.get(conflictingChange.fingerprint);
      return {
        hasConflict: true,
        conflictingOperation: operation
      };
    }

    return { hasConflict: false };
  }

  // Get all recent operations for a time window
  getRecentOperations(maxAge: number = this.maxAge): OperationFingerprint[] {
    const now = Date.now();
    const recent: OperationFingerprint[] = [];

    this.recentOperations.forEach(operation => {
      if ((now - operation.timestamp) <= maxAge) {
        recent.push(operation);
      }
    });

    return recent.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Get operations that would conflict with server data
  getConflictingOperations(serverData: any, serverTimestamp: number): {
    fieldKey: string;
    localOperation: OperationFingerprint;
    serverValue: any;
  }[] {
    const conflicts: {
      fieldKey: string;
      localOperation: OperationFingerprint;
      serverValue: any;
    }[] = [];

    // Check global fields
    ['title', 'start_time', 'timezone', 'external_notes', 'show_date'].forEach(field => {
      const conflict = this.hasConflictingOperation('global', field, serverData[field], serverTimestamp);
      if (conflict.hasConflict && conflict.conflictingOperation) {
        conflicts.push({
          fieldKey: field,
          localOperation: conflict.conflictingOperation,
          serverValue: serverData[field]
        });
      }
    });

    // Check item fields
    if (Array.isArray(serverData.items)) {
      serverData.items.forEach((item: any) => {
        Object.keys(item).forEach(field => {
          if (field === 'id') return; // Skip ID field
          
          const conflict = this.hasConflictingOperation(item.id, field, item[field], serverTimestamp);
          if (conflict.hasConflict && conflict.conflictingOperation) {
            conflicts.push({
              fieldKey: `${item.id}-${field}`,
              localOperation: conflict.conflictingOperation,
              serverValue: item[field]
            });
          }
        });
      });
    }

    return conflicts;
  }

  // Apply selective merge - preserve local operations, apply non-conflicting server changes
  applySelectiveMerge(localData: any, serverData: any, serverTimestamp: number): {
    mergedData: any;
    preservedOperations: string[];
    appliedServerChanges: string[];
  } {
    const conflicts = this.getConflictingOperations(serverData, serverTimestamp);
    const conflictingFields = new Set(conflicts.map(c => c.fieldKey));
    
    const preservedOperations: string[] = [];
    const appliedServerChanges: string[] = [];
    
    // Start with server data as base
    const mergedData = { ...serverData };
    
    // Apply local shadows and recent operations
    const { localShadowStore } = require('@/state/localShadows');
    const activeShadows = localShadowStore.getActiveShadows();
    
    // Preserve active shadows (currently being typed)
    activeShadows.globals.forEach((shadow: any, fieldName: string) => {
      mergedData[fieldName] = shadow.value;
      preservedOperations.push(`global-${fieldName}`);
      console.log('🔒 Preserved active global shadow:', fieldName);
    });
    
    if (Array.isArray(mergedData.items)) {
      mergedData.items = mergedData.items.map((item: any) => {
        const itemShadows = activeShadows.items.get(item.id);
        if (itemShadows) {
          const shadowedItem = { ...item };
          Object.entries(itemShadows).forEach(([fieldName, shadow]: [string, any]) => {
            shadowedItem[fieldName] = shadow.value;
            preservedOperations.push(`${item.id}-${fieldName}`);
            console.log('🔒 Preserved active item shadow:', item.id, fieldName);
          });
          return shadowedItem;
        }
        return item;
      });
    }
    
    // Track which server changes were applied
    const compareData = (local: any, server: any, path: string = '') => {
      if (JSON.stringify(local) !== JSON.stringify(server) && !conflictingFields.has(path)) {
        appliedServerChanges.push(path);
      }
    };
    
    // Compare global fields
    ['title', 'start_time', 'timezone', 'external_notes', 'show_date'].forEach(field => {
      if (!conflictingFields.has(field)) {
        compareData(localData[field], serverData[field], field);
      }
    });
    
    console.log('🔄 Selective merge completed:', {
      conflictsFound: conflicts.length,
      preservedOperations: preservedOperations.length,
      appliedServerChanges: appliedServerChanges.length
    });
    
    return {
      mergedData,
      preservedOperations,
      appliedServerChanges
    };
  }

  // Cleanup old operations
  cleanup(): void {
    const now = Date.now();
    
    // Clean operations
    this.recentOperations.forEach((operation, key) => {
      if ((now - operation.timestamp) > this.maxAge) {
        this.recentOperations.delete(key);
      }
    });
    
    // Clean field changes
    this.fieldChangeLog.forEach((changes, fieldKey) => {
      const recentChanges = changes.filter(change => 
        (now - change.timestamp) <= this.maxAge
      );
      
      if (recentChanges.length === 0) {
        this.fieldChangeLog.delete(fieldKey);
      } else {
        this.fieldChangeLog.set(fieldKey, recentChanges);
      }
    });
  }

  // Get statistics for debugging
  getStats(): {
    totalOperations: number;
    totalFieldChanges: number;
    oldestOperation: number | null;
    newestOperation: number | null;
  } {
    const operations = Array.from(this.recentOperations.values());
    const timestamps = operations.map(op => op.timestamp);
    
    return {
      totalOperations: operations.length,
      totalFieldChanges: Array.from(this.fieldChangeLog.values()).reduce((sum, changes) => sum + changes.length, 0),
      oldestOperation: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestOperation: timestamps.length > 0 ? Math.max(...timestamps) : null
    };
  }
}

// Global singleton
export const operationFingerprinter = new OperationFingerprinter();

// Auto-cleanup every 10 seconds
setInterval(() => {
  operationFingerprinter.cleanup();
}, 10000);

export default operationFingerprinter;