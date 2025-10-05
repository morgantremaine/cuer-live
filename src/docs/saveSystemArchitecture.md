# Per-Cell Save System Architecture Documentation

## Overview

The rundown save system implements a per-cell save architecture designed for real-time collaborative editing. **Per-cell save is always enabled** - there is no delta save fallback or mode switching. This document explains the intentional design decisions and architectural patterns.

## System Layers

### Layer 1: Base Operations
**Files**: Individual save hooks (`useCellLevelSave`, `useStructuralSave`)
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

### Layer 3: Unified Interface
**Files**: `useSimpleAutoSave`
**Purpose**: Provide consistent interface to UI components
**Responsibilities**:
- Present unified save state to UI
- Abstract complexity from components
- Handle different save types consistently
- Manage global save indicators

## Save Strategy Architecture

### Cell-Level Save Strategy
**When Used**: Individual field edits (always enabled)
**Benefits**:
- Instant user feedback
- Granular conflict resolution
- Efficient bandwidth usage
- Real-time collaboration support

**Process Flow**:
```
User Edit → Field Change Tracking → Cell-Level Edge Function → Database Update → Broadcast
```

### Structural Save Strategy
**When Used**: Row operations (add, delete, move, reorder)
**Benefits**:
- Atomic operations
- Conflict prevention
- Proper sequencing
- Data integrity
- Content snapshots preserve concurrent edits

**Process Flow**:
```
Structural Operation → Coordination Queue → Edge Function → Database Update → State Sync
```

## Signature System Architecture

### Multiple Signature Types Rationale

**Why we need multiple signature approaches:**

#### 1. Content Signatures (`createContentSignature`)
- **Purpose**: Detect actual content changes
- **When**: Before autosave to prevent no-op saves
- **Includes**: Items, global fields, timestamps
- **Cost**: Medium computational cost
- **Precision**: High - catches all meaningful changes

#### 2. Lightweight Signatures (`createLightweightSignature`)
- **Purpose**: Fast computation for frequent operations
- **When**: During typing detection, real-time validation
- **Includes**: Essential fields only
- **Cost**: Low computational cost
- **Precision**: Medium - catches major changes

#### 3. Unified Signatures (`createUnifiedSignature`)
- **Purpose**: Complete state validation
- **When**: Conflict detection, version validation
- **Includes**: Everything (content + UI + metadata)
- **Cost**: High computational cost
- **Precision**: Maximum - catches all state changes

**Why not just one?**
- Performance: Lightweight for frequent operations
- Accuracy: Full signatures for important decisions
- Collaboration: Different needs for local vs. remote changes
- Conflict resolution: Need varying granularity

## Coordination Patterns

### Operation Priority System

```typescript
enum OperationPriority {
  STRUCTURAL = 1,    // Highest - affects data integrity
  CELL_UPDATE = 2,   // Medium - content changes
  UI_UPDATE = 3      // Lowest - visual only
}
```

### Queue Management

**Immediate Execution:**
- Structural operations (properly coordinated)
- Cell updates (debounced for typing)

**Priority Ordering:**
- All operations execute immediately
- No blocking or complex queuing
- Simple, predictable behavior

### Blocking Policies

**Removed in Phase 5 Simplification:**
- No autosave blocking
- No operation queuing
- No complex coordination delays
- All saves execute immediately (with debouncing)

**Current Approach:**
- Simple "last write wins" for concurrent edits
- ID-based operations prevent most conflicts
- Content snapshots for structural operations

## State Management Architecture

### Distributed State Concerns

The system separates different state concerns:

1. **Content State** (`usePersistedRundownState`)
   - Rundown items and fields
   - Global rundown settings
   - Persisted to database

2. **UI State** (`useRundownUIState`)
   - Selected cells, focus state
   - Scroll positions
   - Ephemeral, not persisted

3. **Coordination State** (`useCellUpdateCoordination`)
   - Operation queues
   - Save timers
   - Typing detection

4. **Performance State** (various tracking refs)
   - Signature caching
   - Debounce timers
   - Operation throttling

**Why separate?**
- Single Responsibility Principle
- Easier testing and debugging
- Better performance (selective updates)
- Clearer data flow
- Improved scalability

## Integration Patterns

### Hook Composition

```typescript
// Careful composition maintains separation of concerns
useSimpleAutoSave(
  state,                    // Content state
  rundownId,                // Identity
  onSaved,                  // Callbacks
  pendingStructuralChangeRef, // Coordination
  suppressUntilRef,         // Timing
  isInitiallyLoaded,        // Lifecycle
  // ...
)
```

### Event Flow

1. **User Action** → Component
2. **State Update** → `usePersistedRundownState`
3. **Change Detection** → `usePerCellSaveCoordination`
4. **Save Coordination** → `useCellLevelSave` or `useStructuralSave`
5. **Database Update** → Edge Function
6. **Broadcast** → Real-time channel
7. **Remote Application** → Other users' clients

### Error Handling

**Layer Isolation:**
- Each layer handles its own errors
- Errors don't cascade unnecessarily
- Graceful degradation

**Recovery Strategies:**
- Retry with exponential backoff
- Queue failed operations
- User notification for critical failures

**User Feedback:**
- Toast notifications for errors
- Loading states during saves
- Clear error messages

## Collaboration Features

### Real-time Synchronization

**Dual Broadcasting Pattern:**
1. **Immediate Broadcast**: UI updates instantly (optimistic)
2. **Database Save**: Persists in parallel
3. **ID-Based Operations**: Prevents most race conditions
4. **Content Snapshots**: Structural operations preserve concurrent edits

**Benefits:**
- Google Sheets-like instant feedback
- Zero perceived latency
- Automatic conflict resolution
- Scales to many concurrent users

### Multi-tab Support

**Coordination:**
- Own update tracking prevents self-conflicts
- Tab ID system identifies update source
- Real-time sync across tabs

## Performance Optimizations

### Debounced Operations

```typescript
// Autosave: Wait for typing to stop
debounce(autoSave, 1000)

// Signature generation: Prevent excessive computation
debounce(createSignature, 500)

// UI updates: Prevent layout thrashing
debounce(updateUI, 100)
```

### Selective Updates

**Content-only changes:**
- Skip UI-only fields in signatures
- Prevent unnecessary saves

**Field-level updates:**
- Only send changed fields
- Minimize network traffic

**Lazy loading:**
- Defer non-critical operations
- Prioritize user-facing updates

## Common Anti-Patterns to Avoid

❌ **Don't bypass the coordination layer**
```typescript
// Bad: Direct database write
supabase.from('rundowns').update(...)

// Good: Use coordination
handleStructuralOperation('add_row', data)
```

❌ **Don't mix state concerns**
```typescript
// Bad: UI state in content hook
const [items, scrollPosition] = useState(...)

// Good: Separate hooks
const items = usePersistedRundownState(...)
const scrollPosition = useRundownUIState(...)
```

❌ **Don't create new layers without justification**
```typescript
// Bad: Unnecessary abstraction
useMyCustomSaveWrapper(useCellLevelSave(...))

// Good: Use existing layers
const { trackFieldChange } = usePerCellSaveCoordination(...)
```

## Summary

This architecture provides:
- **Reliability**: Per-cell save is always enabled, single code path
- **Performance**: Optimized for real-time collaboration
- **Maintainability**: Clear separation of concerns
- **Scalability**: Handles many concurrent users
- **Simplicity**: No mode switching or fallback logic

The key is understanding which layer handles which concern and using the appropriate abstraction level for each use case.
