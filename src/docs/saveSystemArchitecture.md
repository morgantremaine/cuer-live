# Save System Architecture Documentation

## Overview

The rundown save system implements a per-cell save architecture designed for real-time collaborative editing. This document explains the design decisions and architectural patterns.

## System Layers

### Layer 1: Base Operations
**Files**: `useCellLevelSave`, `useStructuralSave`
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
- Coordinate structural vs. content changes
- Manage operation sequencing

### Layer 3: Integration Layer
**Files**: `useSimpleAutoSave`, `useRundownStateCoordination`
**Purpose**: Integrate saves with application state
**Responsibilities**:
- Connect save system to UI
- Manage autosave timing
- Handle user feedback
- Coordinate with state management

## Save Strategy: Per-Cell Architecture

### Current System (100% of Production)
**All rundowns use per-cell save:** Field-level updates with no doc_version conflicts

**Benefits**:
- ✅ Instant user feedback
- ✅ Granular conflict resolution
- ✅ Efficient bandwidth usage
- ✅ Real-time collaboration support
- ✅ No version conflicts

**Process Flow**:
```
User Edit → Field Tracking → Edge Function → Database Update → Real-time Broadcast
```

### Cell-Level Saves
**When Used**: Individual field edits in items
**Implementation**: `useCellLevelSave` hook
**Process**:
1. Track field change in memory
2. Debounce typing (800ms idle)
3. Batch multiple field updates
4. Send to `cell-field-save` edge function
5. Update item_field_updates JSONB column

### Structural Saves
**When Used**: Row operations (add, delete, move, reorder)
**Implementation**: `useStructuralSave` hook
**Process**:
1. Queue structural operation
2. Use coordination to prevent conflicts
3. Send to `structural-operation-save` edge function
4. Apply changes atomically
5. Broadcast to other clients

## Dual System Architecture

### Operation-Based System
**File**: `src/hooks/useOperationBasedRundown.ts`
**Purpose**: Core collaborative editing with Operational Transformation
**Use Cases**:
- Real-time multi-user editing
- Conflict resolution
- Operation history
- Complex state synchronization

### Simplified State System
**File**: `src/hooks/useSimplifiedRundownState.ts`
**Purpose**: Simple features without OT complexity
**Use Cases**:
- Showcaller/teleprompter state
- Column preferences
- UI state management
- Simple data updates

### Why Two Systems?

1. **Complexity Management**: Not all features need OT
2. **Performance**: Simple features run faster without OT overhead
3. **Maintenance**: Easier to debug and modify
4. **Flexibility**: Choose appropriate tool for each feature

## Signature System

### Purpose
Detect content changes without including UI state or calculated fields

### Content Signatures
```typescript
createContentSignature(items, title, columns, { 
  excludeUIFields: true,
  includeStructural: true 
})
```
**Purpose**: Detect actual content changes
**Use Cases**: Change detection, autosave triggers, conflict resolution

### Lightweight Signatures  
```typescript
createLightweightSignature(items, title)
```
**Purpose**: Fast computation for frequent operations
**Use Cases**: Real-time collaboration, performance-critical paths

### Why Multiple Types?

1. **Performance**: Different operations need different speeds
2. **Accuracy**: Some need complete validation, others need speed
3. **Collaboration**: Real-time features need lightweight checks
4. **Efficiency**: Avoid recalculating when unnecessary

## Coordination Patterns

### Operation Priority System
```typescript
// Priority 1: Structural Operations (highest)
executeWithStructuralOperation(() => addRow())

// Priority 2: Cell Updates (medium)  
executeWithCellUpdate(() => updateField())

// Priority 3: Showcaller Operations (lowest)
executeWithShowcallerOperation(() => updatePlayback())
```

### Queue Management
- **Immediate execution**: When no conflicts exist
- **Queued execution**: When operations would conflict
- **Priority ordering**: Higher priority operations run first
- **Coordination**: Proper sequencing prevents data loss

### Blocking Policies
```typescript
shouldBlockAutoSave() // Prevents saves during critical operations
isAnyOperationInProgress() // Checks for active operations
```

## State Management Architecture

### Content State
- **Location**: `useOperationBasedRundown` (OT system)
- **Purpose**: Core rundown data with conflict resolution
- **Scope**: Collaborative editing

### UI State  
- **Location**: `useRundownUIState`, `useSimplifiedRundownState`
- **Purpose**: Visual presentation state
- **Scope**: User interface concerns

### Coordination State
- **Location**: `useCellUpdateCoordination`, `usePerCellSaveCoordination`
- **Purpose**: Operation management and timing
- **Scope**: System coordination

### Playback State
- **Location**: `useShowcallerStateCoordination`
- **Purpose**: Teleprompter and showcaller state
- **Scope**: Playback features

## Integration Patterns

### Hook Composition
```typescript
// Layered hook composition
const coordination = useCellUpdateCoordination()
const perCellSave = usePerCellSaveCoordination()
const operationBased = useOperationBasedRundown()
const simplified = useSimplifiedRundownState()
```

### Event Flow
```
User Action → State Update → Change Detection → Save Coordination → Database → Real-time Broadcast
```

### Error Handling
- **Layer isolation**: Errors in one layer don't cascade
- **Graceful degradation**: Fallback mechanisms at each layer
- **Recovery**: Automatic retry patterns
- **User feedback**: Clear error messages

## Collaboration Features

### Real-Time Synchronization
- **Change detection**: Signatures identify what changed
- **Conflict resolution**: OT system handles concurrent edits
- **Presence tracking**: Users see who's editing
- **State reconciliation**: Automatic merging

### Multi-Tab Support
- **Cross-tab coordination**: Changes sync between tabs
- **Conflict prevention**: Operations coordinate
- **State consistency**: All tabs maintain consistency

## Performance Optimizations

### Debounced Operations
- **Cell saves**: 800ms typing idle time
- **Autosave**: Respects user typing
- **Signature generation**: Cached when possible

### Selective Updates
- **Field-level**: Only update changed fields
- **Batching**: Multiple changes in single request
- **Lazy loading**: Expensive operations on demand

## Best Practices

### ✅ Using Per-Cell Saves
```typescript
// Track field changes
trackFieldChange(itemId, field, value)

// System handles coordination automatically
// No need to manage doc_version
```

### ✅ Structural Operations
```typescript
// Use coordination for row operations
handleStructuralOperation('add_row', { items, insertIndex })

// System ensures atomic execution
// Prevents conflicts automatically
```

### ✅ Choosing the Right System
- **Operation-based**: Complex collaborative editing
- **Simplified state**: Simple features, UI preferences
- **Per-cell saves**: All field updates
- **Structural saves**: All row operations

## Architecture Benefits

### Eliminates Version Conflicts
- No doc_version checking needed
- Field-level updates avoid conflicts
- Structural coordination prevents races

### Enables Real-Time Collaboration
- Instant updates across clients
- Granular conflict resolution
- Efficient synchronization

### Maintainable Codebase
- Clear separation of concerns
- Appropriate complexity for each feature
- Well-defined coordination patterns

## Conclusion

This architecture successfully implements Google Sheets-like collaborative editing with:
- **Per-cell saves** for conflict-free updates
- **Dual system design** balancing complexity
- **Real-time synchronization** for collaboration
- **Clear coordination** preventing data loss

The ongoing refinements to handle edge cases are normal for enterprise-grade collaborative systems.
