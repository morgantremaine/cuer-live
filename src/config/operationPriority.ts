/**
 * Operation Priority Configuration for Google Sheets-style Performance
 * 
 * Categorizes operations by their required response time:
 * - HOT: Text edits, cursor moves (need 5-10ms response)
 * - WARM: Cell focus changes (need 20-50ms response)  
 * - COLD: Structural changes (can batch 50-200ms)
 */

export type OperationPriority = 'HOT' | 'WARM' | 'COLD';

export interface PriorityConfig {
  priority: OperationPriority;
  batchWindowMs: number;
  maxBatchSize: number;
  description: string;
}

// Operation type to priority mapping
export const OPERATION_PRIORITIES: Record<string, PriorityConfig> = {
  'CELL_EDIT': {
    priority: 'HOT',
    batchWindowMs: 5, // Near-instant for text edits
    maxBatchSize: 5,
    description: 'Text editing operations - need instant response'
  },
  'CELL_FOCUS': {
    priority: 'WARM',
    batchWindowMs: 20,
    maxBatchSize: 10,
    description: 'Cell navigation operations - need fast response'
  },
  'ROW_INSERT': {
    priority: 'COLD',
    batchWindowMs: 50,
    maxBatchSize: 20,
    description: 'Structural operations - can batch for efficiency'
  },
  'ROW_DELETE': {
    priority: 'COLD',
    batchWindowMs: 50,
    maxBatchSize: 20,
    description: 'Structural operations - can batch for efficiency'
  },
  'ROW_MOVE': {
    priority: 'COLD',
    batchWindowMs: 50,
    maxBatchSize: 20,
    description: 'Structural operations - can batch for efficiency'
  },
  'ROW_COPY': {
    priority: 'COLD',
    batchWindowMs: 50,
    maxBatchSize: 20,
    description: 'Structural operations - can batch for efficiency'
  },
  'GLOBAL_EDIT': {
    priority: 'WARM',
    batchWindowMs: 30,
    maxBatchSize: 10,
    description: 'Global changes - need moderate response'
  }
};

// Emergency flush threshold - if queue grows beyond this, flush immediately
export const EMERGENCY_FLUSH_THRESHOLD = 10;

// Get priority config for an operation type
export const getPriorityConfig = (operationType: string): PriorityConfig => {
  return OPERATION_PRIORITIES[operationType] || OPERATION_PRIORITIES['ROW_INSERT'];
};

// Check if operations can be batched together
export const canBatchTogether = (op1Type: string, op2Type: string): boolean => {
  const config1 = getPriorityConfig(op1Type);
  const config2 = getPriorityConfig(op2Type);
  
  // Only batch operations with same priority
  return config1.priority === config2.priority;
};

// Sort operations by priority (HOT first, COLD last)
export const priorityOrder: Record<OperationPriority, number> = {
  'HOT': 1,
  'WARM': 2,
  'COLD': 3
};

export const sortOperationsByPriority = <T extends { operationType: string }>(operations: T[]): T[] => {
  return [...operations].sort((a, b) => {
    const priorityA = getPriorityConfig(a.operationType).priority;
    const priorityB = getPriorityConfig(b.operationType).priority;
    return priorityOrder[priorityA] - priorityOrder[priorityB];
  });
};
