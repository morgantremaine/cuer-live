# Dual Broadcasting Pattern

## Overview

The "Dual Broadcasting" pattern is the core coordination strategy for real-time collaborative editing after Phase 5 simplification. It replaces complex queuing and blocking systems with a simpler "broadcast-first, save-parallel" approach inspired by Google Sheets.

## Pattern Definition

```typescript
// Dual Broadcasting Pattern
updateState(change) → {
  1. Update local UI immediately (optimistic)
  2. Broadcast change to all users (instant feedback)
  3. Save to database in parallel (persistence)
  4. Handle conflicts via state refresh if needed
}
```

## Core Principles

### 1. Immediate Broadcast
- Changes are broadcast **immediately** after local state update
- No waiting for database persistence
- Provides instant feedback to all users
- Creates Google Sheets-like collaborative experience

### 2. Parallel Database Persistence
- Database save happens **in parallel** with broadcast
- Does not block UI or collaboration
- Conflicts handled via timestamp validation
- Database is source of truth for conflict resolution

### 3. ID-Based Operations
- All operations use stable item IDs (not positions)
- Eliminates most race conditions
- Row reordering doesn't invalidate concurrent cell edits
- Position changes don't affect content operations

## Implementation Examples

### Cell Content Updates

```typescript
// Example: Updating a cell field
const updateCellField = async (itemId: string, field: string, value: any) => {
  // 1. Optimistic UI update
  persistedState.updateItem(itemId, { [field]: value })
  
  // 2. Immediate broadcast (dual broadcasting)
  cellBroadcast.broadcastCellUpdate(
    rundownId,
    itemId,
    `${field}:update`,
    { [field]: value },
    userId
  )
  
  // 3. Parallel database save
  await saveCellField(itemId, field, value)
}
```

### Structural Operations (Row Reorder)

```typescript
// Example: Moving a row
const moveItemUp = (index: number) => {
  // 1. Update local state
  const newItems = reorderItems(items, index, index - 1)
  persistedState.setItems(newItems)
  
  // 2. Immediate broadcast for realtime sync
  const order = newItems.map(item => item.id)
  cellBroadcast.broadcastCellUpdate(
    rundownId,
    undefined,
    'items:reorder',
    { order },
    userId
  )
  
  // 3. Parallel structural save with content snapshot
  persistedState.markStructuralChange('reorder', { 
    order,
    contentSnapshot: newItems // Preserves concurrent edits
  })
}
```

### Add/Delete Operations

```typescript
// Example: Adding a row
const addRow = (newItem: Item) => {
  // 1. Optimistic local update
  const newItems = [...items, newItem]
  persistedState.setItems(newItems)
  
  // 2. Immediate broadcast
  cellBroadcast.broadcastCellUpdate(
    rundownId,
    undefined,
    'items:add',
    { item: newItem, position: items.length },
    userId
  )
  
  // 3. Parallel structural save
  persistedState.markStructuralChange('add', {
    item: newItem,
    contentSnapshot: newItems
  })
}
```

## Benefits Over Previous Queue System

### Before (Queue System)
❌ Complex operation queuing
❌ Blocking policies preventing saves
❌ Race conditions between autosave and broadcasts
❌ LocalShadow system for conflict protection
❌ itemDirtyQueue for managing dirty state
❌ 408+ lines of complex protection code

### After (Dual Broadcasting)
✅ Immediate execution (no queuing)
✅ Parallel operations (broadcast + save)
✅ Simple conflict resolution (last write wins + refresh)
✅ ID-based operations eliminate most race conditions
✅ Content snapshots preserve concurrent edits
✅ Google Sheets-like instant collaboration

## Conflict Resolution

### How Conflicts Are Detected
```typescript
// Database timestamp validation
if (incomingTimestamp <= lastKnownTimestamp) {
  // Stale update, ignore
  return
}

// Signature validation (optional additional check)
if (incomingSignature !== expectedSignature) {
  // Content diverged, refresh from database
  await refreshState()
}
```

### How Conflicts Are Resolved
1. **Last Write Wins**: Database uses timestamps to determine winning write
2. **State Refresh**: Client detects conflict and refreshes from database
3. **Content Snapshots**: Structural operations preserve concurrent content edits
4. **ID Stability**: Item IDs remain stable during reordering, preventing invalid references

## Content Snapshot Approach

### Why Content Snapshots?
Structural operations (add/delete/reorder) can conflict with concurrent content edits. Content snapshots preserve both operations:

```typescript
// User A: Reordering rows
markStructuralChange('reorder', {
  order: ['item-2', 'item-1', 'item-3'],
  contentSnapshot: items // Includes any concurrent edits from User B
})

// User B: Editing cell content (concurrent)
saveCellField('item-1', 'title', 'Updated Title')

// Result: Both operations preserved
// - New order: item-2, item-1, item-3
// - item-1 has updated title
```

### Implementation
```typescript
interface StructuralChange {
  operation: 'add' | 'delete' | 'reorder' | 'copy'
  order?: string[] // New item order
  contentSnapshot: Item[] // Current content state
  timestamp: string
}
```

## Removed Systems (Phase 5)

### LocalShadow System (Removed)
- **Was**: 291 lines of field-level protection
- **Problem**: Could cause "changes disappear" scenarios
- **Replaced By**: Immediate broadcasts + simple state refresh

### itemDirtyQueue (Removed)
- **Was**: 117 lines of dirty state queue management
- **Problem**: Could deadlock, complex state tracking
- **Replaced By**: Direct broadcast, database is source of truth

### Operation Queue (Removed)
- **Was**: Priority-based operation queuing and blocking
- **Problem**: Complex coordination, delayed operations
- **Replaced By**: Immediate execution with ID-based operations

## Performance Characteristics

### Latency
- **Broadcast**: ~50ms (instant user feedback)
- **Database Save**: ~150-300ms (parallel, doesn't block)
- **Conflict Refresh**: ~200ms (only when needed)

### Bandwidth
- **Cell Update**: ~500 bytes (field + metadata)
- **Structural Update**: ~2-5KB (order array + snapshot)
- **State Refresh**: ~10-50KB (full document, rare)

### Scalability
- ✅ Handles unlimited concurrent users (ID-based)
- ✅ No server-side locking required
- ✅ Database handles conflict detection
- ✅ Broadcasts don't wait for each other

## Common Patterns

### Pattern: Cell Edit Lifecycle
```typescript
onCellEdit(itemId, field, value) →
  1. Update local state
  2. Broadcast change (dual broadcasting)
  3. Save to database (parallel)
  4. If conflict: refresh state
```

### Pattern: Receiving Broadcasts
```typescript
onBroadcastReceived(change) →
  1. Validate timestamp (ignore stale)
  2. Apply change immediately (no queuing)
  3. Update UI (instant feedback)
```

### Pattern: Structural Operation
```typescript
onStructuralChange(operation, data) →
  1. Update local state
  2. Broadcast with content snapshot
  3. Save structural change + snapshot (parallel)
  4. Database merges content edits + structural changes
```

## Best Practices

### ✅ Always Use Item IDs
```typescript
// GOOD: ID-based updates
updateCell(itemId, field, value)

// BAD: Position-based updates
updateCell(rowIndex, field, value) // Position can change!
```

### ✅ Include Content Snapshots
```typescript
// GOOD: Structural change with snapshot
markStructuralChange('reorder', { order, contentSnapshot: items })

// BAD: Structural change without snapshot
markStructuralChange('reorder', { order }) // Loses concurrent edits!
```

### ✅ Broadcast Immediately
```typescript
// GOOD: Immediate broadcast
setItems(newItems)
broadcastChange(...)

// BAD: Delayed broadcast
setItems(newItems)
setTimeout(() => broadcastChange(...), 1000) // Users see stale state!
```

## Troubleshooting

### Problem: Changes Not Appearing
**Check**:
1. Is broadcast being sent? (Check network tab for `cell_field_updates` broadcasts)
2. Is local state updating? (Check console logs for state changes)
3. Is database save completing? (Check edge function logs)

### Problem: Conflicts/Overwrites
**Check**:
1. Are IDs being used correctly? (Should use `itemId`, not `rowIndex`)
2. Is content snapshot included? (Structural operations need snapshot)
3. Are timestamps being validated? (Check for stale timestamp logs)

### Problem: Performance Issues
**Check**:
1. Are broadcasts being debounced? (Rapid edits should batch)
2. Is signature caching working? (Avoid recomputing signatures)
3. Are too many full refreshes happening? (Should be rare)

## Future Enhancements

### Potential Optimizations
- **Delta Broadcasting**: Broadcast only changed fields (not full items)
- **Broadcast Batching**: Group rapid edits into single broadcast
- **Selective Refresh**: Refresh only affected items (not full state)
- **Optimistic Conflict Resolution**: Predict and auto-resolve common conflicts

### Advanced Features
- **Operational Transform**: Mathematical merge of concurrent edits
- **Conflict Visualization**: Show users when conflicts occur
- **Manual Conflict Resolution**: UI for choosing between versions
- **Change History**: Track and replay all changes

## Conclusion

The Dual Broadcasting pattern provides a simple, scalable foundation for real-time collaborative editing. By eliminating complex queuing and protection systems, it's easier to reason about, debug, and maintain while providing excellent user experience through instant feedback and parallel persistence.
