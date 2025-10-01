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

## Save Strategy: Hybrid Architecture

The system uses a **hybrid save approach** optimized by operation type and conflict risk:

### OT-Based Operations (High Conflict Risk)

All content and structural operations flow through the Operational Transformation system:

1. **Content Operations**: Cell edits (script, talent, duration, etc.)
2. **Structural Operations**: 
   - Row reordering (drag & drop)
   - Row copy/paste
   - Row deletion
   - Adding rows/headers
   - Row floating/unfloating
   - Row coloring

**Benefits:**
- Robust conflict resolution via OT
- Operation history and replay
- Real-time synchronization
- Atomic operations with rollback

**Process Flow:**
```
User Action
  ↓
Local State Update (Optimistic)
  ↓
Queue Operation in OT System
  ↓
Broadcast to Other Users (Real-time)
  ↓
Save to Database (via apply-operation edge function)
  ↓
Confirmation & Sync
```

### Direct Metadata Saves (Low Conflict Risk)

Simple metadata fields use direct database updates:

1. **Metadata**: Title, start time, date, timezone
2. **Preferences**: Column layouts, saved layouts
3. **Playback State**: Showcaller/teleprompter state

**Benefits:**
- Faster saves (no OT overhead)
- Simpler implementation
- Lower latency
- Appropriate for fields with minimal conflict risk

**Process Flow:**
```
User Edit
  ↓
Local State Update
  ↓
Debounced Auto-Save (if applicable)
  ↓
Direct Database Update
  ↓
Broadcast Change Notification
```

## Hybrid System Architecture

The codebase uses different strategies based on conflict risk and coordination needs:

### OT System for Content & Structure (`useOperationBasedRundown`)

**Purpose**: All operations requiring robust conflict resolution

**Handles**:
- Cell content edits
- Row reordering (drag & drop)
- Row copy/paste operations
- Row deletion
- Adding rows/headers  
- Row floating/unfloating
- Row coloring

**Features**:
- Operational Transformation (OT) for conflict resolution
- Operation queue with sequencing
- Real-time broadcasting of operations
- Operation history and replay capability
- Atomic operations with rollback

**When to Use**: Any operation that modifies rundown content or structure

### Direct Saves for Metadata (`useSimpleAutoSave`)

**Purpose**: Fast updates for low-conflict fields

**Handles**:
- Rundown metadata (title, start time, date, timezone)
- Column preferences and layouts
- Showcaller/teleprompter state
- UI state and visual preferences

**Features**:
- Direct database updates
- Debounced auto-save
- Change detection via signatures
- Broadcast notifications

**When to Use**: Fields with minimal conflict risk that don't require OT coordination

**Design Rationale**: This hybrid approach optimizes for both robustness (OT for high-risk operations) and performance (direct saves for low-risk fields), providing the best balance for different operation types.

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

### When to Use OT Operations

✅ **Use for:**
- All content edits (cell fields)
- All structural operations (rows, reordering)
- Any operation users might conflict on
- Operations needing history/replay

**Implementation**: Route through `handleCellEdit`, `handleRowInsert`, `handleRowDelete`, `handleRowMove`, `handleRowCopy` in the OT system.

### When to Use Direct Saves

✅ **Use for:**
- Metadata (title, start time, date, timezone)
- User preferences (column layouts)
- Playback state (showcaller)
- Low-conflict UI state

**Implementation**: Use `markAsChanged()` and let `useSimpleAutoSave` handle the direct database update.

### Migration Checklist

When adding new features, ask:

1. **Can multiple users conflict on this?** → Use OT
2. **Does it modify rundown content/structure?** → Use OT
3. **Is it simple metadata or preferences?** → Use direct saves
4. **Does it need operation history?** → Use OT

**Default Rule**: When in doubt, use OT for content/structure operations and direct saves for metadata/preferences.

## Architecture Benefits

1. **Optimized by Risk**: High-conflict operations use OT, low-conflict uses direct saves
2. **No Version Conflicts**: Per-cell architecture eliminates doc_version conflicts  
3. **Real-Time Collaboration**: OT system provides robust multi-user editing
4. **Fast Metadata Updates**: Direct saves provide instant feedback for simple changes
5. **Maintainable**: Clear rules for when to use each system
6. **Performant**: Right tool for each job - not over-engineering simple operations

## Conclusion

This hybrid architecture successfully balances robustness and performance by:
- Using OT for content and structural operations (high conflict risk)
- Using direct saves for metadata and preferences (low conflict risk)  
- Maintaining clear boundaries based on operation characteristics
- Eliminating version conflicts through per-cell architecture
- Providing a solid foundation for real-time collaborative editing without unnecessary overhead
