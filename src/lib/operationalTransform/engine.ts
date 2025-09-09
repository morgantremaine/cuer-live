/**
 * Operational Transform Engine
 * 
 * Core engine that manages the OT system for collaborative editing
 */

import {
  Operation,
  OperationLogEntry,
  CollaborativeClient,
  CollaborativeSnapshot,
  EditSession,
  ConflictResolutionConfig,
  TransformResult
} from './types';
import { transformOperation, transformOperationSequence } from './transformer';
import { validateOperation, compareOperations, operationsConflict } from './operations';

export class OperationalTransformEngine {
  private clients: Map<string, CollaborativeClient> = new Map();
  private operationLog: OperationLogEntry[] = [];
  private serverSequence: number = 0;
  private activeSessions: Map<string, EditSession> = new Map();
  private config: ConflictResolutionConfig;
  
  // Callbacks for external integration
  private onOperationApplied?: (operation: Operation, result: any) => void;
  private onConflictDetected?: (conflict: any) => void;
  private onSessionUpdated?: (session: EditSession) => void;

  constructor(config?: Partial<ConflictResolutionConfig>) {
    this.config = {
      textConflicts: 'prefer_latest',
      fieldConflicts: 'prefer_latest', 
      structuralConflicts: 'prefer_latest',
      autoResolveTimeout: 5000,
      ...config
    };
  }

  // Register a new client
  registerClient(userId: string): CollaborativeClient {
    const client: CollaborativeClient = {
      userId,
      localOperations: [],
      acknowledgedOperations: [],
      pendingOperations: [],
      vectorClock: { [userId]: 0 },
      activeEdits: new Map()
    };

    this.clients.set(userId, client);
    return client;
  }

  // Remove a client
  unregisterClient(userId: string): void {
    this.clients.delete(userId);
    // Clean up any active sessions for this user
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        this.activeSessions.delete(sessionId);
      }
    }
  }

  // Start an edit session
  startEditSession(
    userId: string,
    targetId: string,
    field: string,
    initialValue?: any
  ): string {
    const sessionId = `${userId}-${targetId}-${field}-${Date.now()}`;
    const session: EditSession = {
      userId,
      targetId,
      field,
      startTime: Date.now(),
      lastActivity: Date.now(),
      currentValue: initialValue
    };

    this.activeSessions.set(sessionId, session);
    
    // Track in client
    const client = this.clients.get(userId);
    if (client) {
      client.activeEdits.set(sessionId, { field, startTime: Date.now() });
    }

    this.onSessionUpdated?.(session);
    return sessionId;
  }

  // End an edit session
  endEditSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      this.activeSessions.delete(sessionId);
      
      const client = this.clients.get(session.userId);
      if (client) {
        client.activeEdits.delete(sessionId);
      }
    }
  }

  // Update session activity
  updateSessionActivity(sessionId: string, value?: any): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
      if (value !== undefined) {
        session.currentValue = value;
      }
      this.onSessionUpdated?.(session);
    }
  }

  // Check if a field is currently being edited
  isFieldBeingEdited(targetId: string, field: string, excludeUserId?: string): boolean {
    for (const session of this.activeSessions.values()) {
      if (session.targetId === targetId && 
          session.field === field && 
          session.userId !== excludeUserId &&
          Date.now() - session.lastActivity < 30000) { // 30 second timeout
        return true;
      }
    }
    return false;
  }

  // Get active sessions for a target
  getActiveSessions(targetId?: string): EditSession[] {
    const sessions = Array.from(this.activeSessions.values());
    if (targetId) {
      return sessions.filter(s => s.targetId === targetId);
    }
    return sessions;
  }

  // Submit a local operation
  submitOperation(userId: string, operation: Operation): Promise<{ success: boolean; transformedOp?: Operation; conflicts?: any[] }> {
    return new Promise((resolve) => {
      if (!validateOperation(operation)) {
        resolve({ success: false });
        return;
      }

      const client = this.clients.get(userId);
      if (!client) {
        resolve({ success: false });
        return;
      }

      // Add to pending operations
      client.pendingOperations.push(operation);
      client.localOperations.push(operation);

      // Process immediately
      this.processOperation(operation).then(result => {
        resolve(result);
      });
    });
  }

  // Process an operation from any source
  private async processOperation(operation: Operation): Promise<{ success: boolean; transformedOp?: Operation; conflicts?: any[] }> {
    const client = this.clients.get(operation.userId);
    if (!client) {
      return { success: false };
    }

    // Get operations that need to be transformed against
    const concurrentOps = this.getConcurrentOperations(operation);
    
    let transformedOp = operation;
    const conflicts: any[] = [];

    // Transform against all concurrent operations
    for (const concurrentOp of concurrentOps) {
      const result = transformOperation(transformedOp, concurrentOp, this.config);
      transformedOp = result.transformedOp;
      
      if (result.conflict) {
        conflicts.push({
          operation: transformedOp,
          conflictsWith: concurrentOp,
          conflict: result.conflict
        });
        
        this.onConflictDetected?.(result.conflict);
      }
    }

    // Apply the transformed operation
    const applyResult = this.applyOperation(transformedOp);
    if (!applyResult.success) {
      return { success: false };
    }

    // Add to operation log
    const logEntry: OperationLogEntry = {
      operation: transformedOp,
      appliedAt: Date.now(),
      serverSequence: ++this.serverSequence,
      transformedAgainst: concurrentOps.map(op => `${op.userId}-${op.id.sequence}`)
    };
    this.operationLog.push(logEntry);

    // Update client state
    const operationIndex = client.pendingOperations.findIndex(
      op => op.id.userId === operation.id.userId && op.id.sequence === operation.id.sequence
    );
    if (operationIndex >= 0) {
      client.pendingOperations.splice(operationIndex, 1);
      client.acknowledgedOperations.push(transformedOp);
    }

    // Update vector clock
    client.vectorClock[operation.userId] = Math.max(
      client.vectorClock[operation.userId] || 0,
      operation.id.sequence
    );

    this.onOperationApplied?.(transformedOp, applyResult.result);

    return { 
      success: true, 
      transformedOp, 
      conflicts: conflicts.length > 0 ? conflicts : undefined 
    };
  }

  // Get operations that are concurrent with the given operation
  private getConcurrentOperations(operation: Operation): Operation[] {
    const concurrent: Operation[] = [];
    
    for (const logEntry of this.operationLog) {
      const logOp = logEntry.operation;
      
      // Skip if it's the same operation
      if (logOp.userId === operation.userId && 
          logOp.id.sequence === operation.id.sequence) {
        continue;
      }
      
      // Check if operations are concurrent
      if (this.areOperationsConcurrent(operation, logOp)) {
        concurrent.push(logOp);
      }
    }
    
    return concurrent.sort(compareOperations);
  }

  // Check if two operations are concurrent
  private areOperationsConcurrent(op1: Operation, op2: Operation): boolean {
    const vc1 = op1.vectorClock;
    const vc2 = op2.vectorClock;
    
    let op1BeforeOp2 = true;
    let op2BeforeOp1 = true;
    
    // Check all users in vector clocks
    const allUsers = new Set([...Object.keys(vc1), ...Object.keys(vc2)]);
    
    for (const user of allUsers) {
      const clock1 = vc1[user] || 0;
      const clock2 = vc2[user] || 0;
      
      if (clock1 > clock2) op2BeforeOp1 = false;
      if (clock2 > clock1) op1BeforeOp2 = false;
    }
    
    // Concurrent if neither is before the other
    return !op1BeforeOp2 && !op2BeforeOp1;
  }

  // Apply an operation to the data (to be overridden by specific implementations)
  protected applyOperation(operation: Operation): { success: boolean; result?: any } {
    // This is the interface that specific engines (rundown, blueprint) will implement
    // For now, just return success
    return { success: true };
  }

  // Get current snapshot of collaborative state
  getSnapshot(): CollaborativeSnapshot {
    return {
      data: {}, // To be filled by specific implementations
      operations: [...this.operationLog],
      activeSessions: Array.from(this.activeSessions.values()),
      vectorClock: this.getGlobalVectorClock(),
      lastUpdated: Date.now()
    };
  }

  // Get global vector clock
  private getGlobalVectorClock(): Record<string, number> {
    const globalClock: Record<string, number> = {};
    
    for (const client of this.clients.values()) {
      for (const [userId, clock] of Object.entries(client.vectorClock)) {
        globalClock[userId] = Math.max(globalClock[userId] || 0, clock);
      }
    }
    
    return globalClock;
  }

  // Cleanup old operations and sessions
  cleanup(maxAge: number = 3600000): void { // 1 hour default
    const cutoff = Date.now() - maxAge;
    
    // Remove old operations
    this.operationLog = this.operationLog.filter(entry => entry.appliedAt > cutoff);
    
    // Remove inactive sessions
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.lastActivity < cutoff) {
        this.activeSessions.delete(sessionId);
      }
    }
  }

  // Set callbacks
  setCallbacks(callbacks: {
    onOperationApplied?: (operation: Operation, result: any) => void;
    onConflictDetected?: (conflict: any) => void;
    onSessionUpdated?: (session: EditSession) => void;
  }): void {
    this.onOperationApplied = callbacks.onOperationApplied;
    this.onConflictDetected = callbacks.onConflictDetected;
    this.onSessionUpdated = callbacks.onSessionUpdated;
  }

  // Get client state
  getClient(userId: string): CollaborativeClient | undefined {
    return this.clients.get(userId);
  }

  // Get pending operations for a client
  getPendingOperations(userId: string): Operation[] {
    const client = this.clients.get(userId);
    return client ? [...client.pendingOperations] : [];
  }

  // Acknowledge operations for a client
  acknowledgeOperations(userId: string, operationIds: string[]): void {
    const client = this.clients.get(userId);
    if (!client) return;

    for (const opId of operationIds) {
      const pendingIndex = client.pendingOperations.findIndex(
        op => `${op.userId}-${op.id.sequence}` === opId
      );
      if (pendingIndex >= 0) {
        const [acknowledgedOp] = client.pendingOperations.splice(pendingIndex, 1);
        client.acknowledgedOperations.push(acknowledgedOp);
      }
    }
  }
}

// Specialized engine for rundown editing
export class RundownOTEngine extends OperationalTransformEngine {
  private rundownData: any = null;

  setRundownData(data: any): void {
    this.rundownData = data;
  }

  protected applyOperation(operation: Operation): { success: boolean; result?: any } {
    if (!this.rundownData) {
      return { success: false };
    }

    try {
      const result = this.applyToRundown(operation, this.rundownData);
      return { success: true, result };
    } catch (error) {
      console.error('Failed to apply operation to rundown:', error);
      return { success: false };
    }
  }

  private applyToRundown(operation: Operation, data: any): any {
    const clonedData = JSON.parse(JSON.stringify(data));

    switch (operation.type) {
      case 'text_insert':
      case 'text_delete':
      case 'text_replace':
        return this.applyTextOperation(operation, clonedData);
      
      case 'field_update':
        return this.applyFieldOperation(operation, clonedData);
      
      case 'item_insert':
      case 'item_delete':
      case 'item_move':
        return this.applyItemOperation(operation, clonedData);
      
      default:
        return clonedData;
    }
  }

  private applyTextOperation(operation: any, data: any): any {
    const target = operation.targetId === 'rundown' ? data : 
                  data.items?.find((item: any) => item.id === operation.targetId);
    
    if (!target) return data;

    let currentValue = target[operation.field] || '';
    
    switch (operation.type) {
      case 'text_insert':
        currentValue = currentValue.slice(0, operation.position) + 
                      operation.content + 
                      currentValue.slice(operation.position);
        break;
      
      case 'text_delete':
        currentValue = currentValue.slice(0, operation.position) + 
                      currentValue.slice(operation.position + operation.length);
        break;
      
      case 'text_replace':
        currentValue = currentValue.slice(0, operation.position) + 
                      operation.newContent + 
                      currentValue.slice(operation.position + operation.length);
        break;
    }

    target[operation.field] = currentValue;
    return data;
  }

  private applyFieldOperation(operation: any, data: any): any {
    const target = operation.targetId === 'rundown' ? data : 
                  data.items?.find((item: any) => item.id === operation.targetId);
    
    if (!target) return data;

    target[operation.field] = operation.newValue;
    return data;
  }

  private applyItemOperation(operation: any, data: any): any {
    if (!data.items) data.items = [];

    switch (operation.type) {
      case 'item_insert':
        if (operation.position === -1) break; // No-op
        data.items.splice(operation.position, 0, operation.item);
        break;
      
      case 'item_delete':
        if (operation.position === -1) break; // No-op
        data.items.splice(operation.position, 1);
        break;
      
      case 'item_move':
        if (operation.fromPosition === operation.toPosition) break; // No-op
        const [movedItem] = data.items.splice(operation.fromPosition, 1);
        data.items.splice(operation.toPosition, 0, movedItem);
        break;
    }

    return data;
  }

  getSnapshot(): CollaborativeSnapshot {
    const baseSnapshot = super.getSnapshot();
    return {
      ...baseSnapshot,
      data: this.rundownData
    };
  }
}