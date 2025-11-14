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
  
  // 3. Parallel structural save
  persistedState.markStructuralChange('reorder', { 
    order
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
    item: newItem
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

## Why ID-Based Operations Prevent Race Conditions

### The Key Insight: Separation of Content and Structure

**The system maintains a critical separation**: 
- **Broadcasts** carry only **IDs and order** (structure)
- **Local state** holds the **full item content** (data)
- **Database saves** include **content snapshots** for persistence

This separation is what prevents the classic race condition between concurrent structural changes (like reordering) and content edits (like typing in cells).

### Example Scenario: Concurrent Cell Edit + Reorder

**Setup:**
- User A is editing the script field of Item #5
- User B simultaneously reorders rows, moving Item #5 to a new position

**What happens:**

1. **User A types "Breaking news..."**
   - Local state updates immediately: `items[4].script = "Breaking news..."`
   - Cell broadcast sent: `{ type: 'cell:update', itemId: '5', field: 'script', value: 'Breaking news...' }`
   - Database save queued (parallel)

2. **User B reorders rows** (moves Item #5 from position 5 to position 2)
   - Local state updates: items array reordered based on drag operation
   - Structural broadcast sent: `{ type: 'items:reorder', order: ['1','3','5','2','4',...] }`
   - Database save with content snapshot (parallel)

3. **User A receives reorder broadcast**
   ```typescript
   // From useSimplifiedRundownState.ts lines 541-560
   case 'items:reorder': {
     const order = update.value?.order as string[];
     const itemMap = new Map(stateRef.current.items.map(item => [item.id, item]));
     
     // CRITICAL: Reorder uses existing items from local state
     const reorderedItems = order
       .map(id => itemMap.get(id))  // ← Preserves all content!
       .filter(Boolean) as RundownItem[];
     
     actionsRef.current.loadState({ items: reorderedItems });
   }
   ```
   - **Result**: Item #5 moves to position 2 **with the updated script text intact**
   - The broadcast only told us the new order, not new content

4. **User B receives cell edit broadcast**
   - Applies content update to Item #5 (wherever it is in their local order)
   - **Result**: Item #5's script updates to "Breaking news..."

### Why This Works

**The magic is in the reordering logic:**
```typescript
// Step 1: Create map of existing items (WITH all their current content)
const itemMap = new Map(stateRef.current.items.map(item => [item.id, item]));

// Step 2: Reorder using IDs from broadcast
const reorderedItems = order.map(id => itemMap.get(id))
```

**Key points:**
1. The broadcast contains **only IDs**: `['1','3','5','2','4',...]`
2. We map those IDs to **existing items from local state**
3. Local state has the **latest content** (from concurrent edits)
4. Therefore, reordering **preserves concurrent content changes**

### What Would Go Wrong Without IDs

**If we used position-based reordering** (common anti-pattern):
```typescript
❌ BAD: Position-based approach
case 'items:reorder': {
  // Broadcast includes full items at new positions
  const newItems = update.value.items; // Full item objects
  actionsRef.current.loadState({ items: newItems });
}
```

**Problems:**
- User A's typed text exists only in their local state
- User B's reorder broadcast includes the OLD content (before A's edit)
- When A receives the broadcast, it **overwrites their edit** with old data
- Result: **Data loss** - A's changes disappear

### Comparison: Position-Based vs ID-Based

| Aspect | Position-Based (❌ Bad) | ID-Based (✅ Good) |
|--------|------------------------|-------------------|
| **Broadcast Payload** | Full items with content | Only IDs and order |
| **Payload Size** | Large (~10-50KB) | Small (~500 bytes) |
| **Content Source** | Broadcast (stale) | Local state (fresh) |
| **Concurrent Edits** | Lost/overwritten | Preserved |
| **Network Usage** | High | Low |
| **Race Conditions** | Frequent | Eliminated |

### Code Evidence

**Reordering preserves content** (from `useSimplifiedRundownState.ts`):
```typescript
// Lines 546-556
const itemMap = new Map(stateRef.current.items.map(item => [item.id, item]));

const reorderedItems = order
  .map(id => itemMap.get(id))  // Uses local content, not broadcast content
  .filter(Boolean) as RundownItem[];

if (reorderedItems.length === stateRef.current.items.length) {
  actionsRef.current.loadState({ items: reorderedItems });
}
```

**Cell updates target by ID** (from `useSimplifiedRundownState.ts`):
```typescript
// Lines 428-434
case 'cell:update': {
  const { itemId, field, value } = update.value || {};
  if (itemId && field) {
    const updatedItems = stateRef.current.items.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item  // ID-based targeting
    );
    actionsRef.current.loadState({ items: updatedItems });
  }
}
```

### Summary

**ID-based operations prevent race conditions because:**
1. Structural broadcasts carry **only IDs**, not content
2. Reordering uses **local state content** (which has concurrent edits)
3. Content updates target items **by ID** (position-independent)
4. Database snapshots handle **persistence**, not real-time sync
5. Users see **instant updates** without data loss

**Result**: User A can edit Item #5's content while User B reorders rows, and both operations succeed without conflict. This is the foundation of reliable real-time collaboration.

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
