# Save System Architecture Documentation

## Overview

The rundown save system implements a sophisticated multi-layered architecture designed for real-time collaborative editing. This document explains the intentional design decisions and architectural patterns.

## System Layers

### Layer 1: Base Operations
**Files**: Individual save hooks (`useCellLevelSave`, `useFieldDeltaSave`, `useStructuralSave`)
**Purpose**: Handle direct database interactions and edge function calls
**Responsibilities**:
- Execute actual save operations
- Handle network errors and retries
- Manage optimistic updates
- Track individual operation state

### Layer 2: Coordination Logic
**Files**: `useCellUpdateCoordination`, `usePerCellSaveCoordination`
**Purpose**: Manage operation timing and prevent conflicts
**Responsibilities**:
- Queue operations by priority
- Prevent race conditions
- Route between save strategies
- Coordinate structural vs. content changes

### Layer 3: Unified Interface
**Files**: `useUnifiedSaveCoordination`
**Purpose**: Provide consistent interface to UI components
**Responsibilities**:
- Present unified save state to UI
- Abstract complexity from components
- Handle different save types consistently
- Manage global save indicators

## Save Strategy Architecture

### Per-Cell Save Strategy
**When Used**: Individual field edits in collaborative sessions
**Benefits**:
- Instant user feedback
- Granular conflict resolution
- Efficient bandwidth usage
- Real-time collaboration support

**Process Flow**:
```
User Edit → Field Change Tracking → Cell-Level Edge Function → Database Update → Broadcast
```

### Delta Save Strategy
**When Used**: Batch changes and fallback scenarios
**Benefits**:
- Handles complex changes
- Backward compatibility
- Efficient for large updates
- Comprehensive validation

**Process Flow**:
```
Content Changes → Delta Detection → Traditional Save → Version Update → Broadcast
```

### Structural Save Strategy
**When Used**: Row operations (add, delete, move, reorder)
**Benefits**:
- Atomic operations
- Conflict prevention
- Proper sequencing
- Data integrity

**Process Flow**:
```
Structural Operation → Coordination Queue → Edge Function → Database Update → State Sync
```

## Signature System Architecture

### Multiple Signature Types Rationale

#### Content Signatures
```typescript
createContentSignature(items, title, columns, { 
  excludeUIFields: true,
  includeStructural: true 
})
```
**Purpose**: Detect actual content changes, ignore UI state
**Use Cases**: Change detection, autosave triggers, conflict resolution

#### Lightweight Signatures  
```typescript
createLightweightSignature(items, title)
```
**Purpose**: Fast computation for frequent operations
**Use Cases**: Real-time collaboration, performance-critical paths

#### Unified Signatures
```typescript
createUnifiedSignature(completeState, { 
  includeMetadata: true,
  comprehensive: true 
})
```
**Purpose**: Complete state validation
**Use Cases**: Manual saves, backup operations, debugging

### Why Multiple Approaches Are Necessary

1. **Performance Optimization**: Different operations have different performance requirements
2. **Accuracy Needs**: Some operations need complete validation, others need speed
3. **Collaboration Support**: Real-time features need lightweight, frequent checks
4. **Conflict Resolution**: Different signature granularities help resolve different conflict types

## Coordination Patterns

### Operation Priority System
```typescript
// Priority 1: Structural Operations (highest)
executeWithStructuralOperation(() => addRow())

// Priority 2: Cell Updates (medium)  
executeWithCellUpdate(() => updateField())

// Priority 3: UI Operations (lowest)
executeWithShowcallerOperation(() => updateVisualState())
```

### Queue Management
- **Immediate execution**: When no conflicts exist
- **Queued execution**: When operations would conflict
- **Priority ordering**: Higher priority operations run first
- **Dependency tracking**: Operations wait for dependencies

### Blocking Policies
```typescript
shouldBlockAutoSave() // Prevents saves during critical operations
shouldBlockTeleprompterSave() // Protects teleprompter state
shouldBlockStructuralOperation() // Prevents concurrent structural changes
```

## State Management Architecture

### Distributed State Concerns

#### Content State
- **Location**: `usePersistedRundownState`
- **Purpose**: Actual rundown data (items, columns, title)
- **Scope**: Core business logic

#### UI State  
- **Location**: `useRundownUIState`
- **Purpose**: Visual presentation state
- **Scope**: User interface concerns

#### Coordination State
- **Location**: `useCellUpdateCoordination`, `useUnifiedSaveCoordination`
- **Purpose**: Operation management and timing
- **Scope**: System coordination

#### Performance State
- **Location**: `useRundownPerformanceOptimization`
- **Purpose**: Optimization and caching
- **Scope**: Performance enhancement

### Why Separation Is Maintained
1. **Single Responsibility**: Each state manager has a focused purpose
2. **Performance**: UI state changes don't trigger business logic
3. **Testing**: Individual concerns can be tested in isolation
4. **Scalability**: Different state types can be optimized independently

## Integration Patterns

### Hook Composition
The system uses careful hook composition to maintain separation of concerns:

```typescript
// Each hook handles a specific aspect
const coordination = useCellUpdateCoordination()
const perCellSave = usePerCellSaveCoordination()
const unifiedSave = useUnifiedSaveCoordination()

// Higher-level hooks compose lower-level functionality
const rundownState = useRundownStateCoordination()
```

### Event Flow
```
User Action → UI State Update → Content State Change → Save Coordination → Database Update → Real-time Broadcast
```

### Error Handling
- **Layer isolation**: Errors in one layer don't cascade
- **Graceful degradation**: Fallback mechanisms at each layer
- **Recovery**: Automatic retry and recovery patterns
- **User feedback**: Appropriate error messages at UI layer

## Collaboration Features

### Real-Time Synchronization
- **Change detection**: Signatures identify what changed
- **Conflict resolution**: Multiple strategies for different conflict types
- **Presence tracking**: Users see who's editing what sections
- **State reconciliation**: Automatic merging of compatible changes

### Multi-Tab Support
- **Cross-tab coordination**: Changes sync between browser tabs
- **Conflict prevention**: Operations coordinate across tabs
- **State consistency**: All tabs maintain consistent state

## Performance Optimizations

### Debounced Operations
- **Autosave**: Debounced to prevent excessive saves
- **Signature generation**: Cached and reused when possible
- **UI updates**: Batched for performance

### Selective Updates
- **Content-only changes**: Skip UI recalculation when possible
- **Field-level updates**: Only update affected components
- **Lazy loading**: Load expensive operations on demand

## Best Practices for Working with the Architecture

### ✅ Using Coordination Layers Properly
```typescript
// CORRECT: Use appropriate coordination layer
const { coordinatedSave } = useUnifiedSaveCoordination()
await coordinatedSave('manual', saveFunction)

// CORRECT: Route through specialized save mechanisms
const { saveShowcallerState } = useTeleprompterSave()
const { saveRundownContent } = useSimpleAutoSave()
```

### ✅ Respecting State Separation
```typescript
// CORRECT: Use specialized state hooks for their intended purposes
const { items } = usePersistedRundownState() // Core content data
const { isModified } = useChangeTracking() // Content change detection
const { canUndo } = useRundownUndo() // History management
const { showcallerState } = useShowcallerStateCoordination() // Playback state
```

### ✅ Extending Existing Architecture
```typescript
// CORRECT: Enhance existing coordination without bypassing
const useEnhancedSaveCoordination = () => {
  const base = useUnifiedSaveCoordination()
  
  return {
    ...base,
    saveWithValidation: async (type, saveFunction) => {
      if (await validateOperation()) {
        return base.coordinatedSave(type, saveFunction)
      }
    }
  }
}
```

### ✅ Maintaining Architecture Integrity
- **Preserve Layer Boundaries**: Use coordination mechanisms rather than direct calls
- **Respect Specialization**: Choose the right save mechanism for your operation type
- **Maintain Separation**: Keep content, UI, playback, and persistence concerns separate
- **Test Collaboration**: Verify changes work properly in multi-user scenarios

## Conclusion

This architecture enables sophisticated collaborative editing features while maintaining performance and reliability. The apparent complexity serves specific purposes and should not be simplified without understanding the collaborative editing requirements it supports.