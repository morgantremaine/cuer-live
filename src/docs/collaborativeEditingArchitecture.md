# Collaborative Editing Architecture

## Overview

The rundown system implements sophisticated collaborative editing capabilities that support multiple users editing the same rundown simultaneously while maintaining data consistency and preventing conflicts.

## Core Collaborative Features

### Real-Time Multi-User Editing
- **Simultaneous editing**: Multiple users can edit different parts of the same rundown
- **Live updates**: Changes appear immediately for all users
- **Conflict prevention**: System prevents overwriting of simultaneous edits
- **Presence awareness**: Users see who else is editing

### Cross-Tab Synchronization
- **Multi-tab support**: Same user can have rundown open in multiple tabs
- **State consistency**: All tabs stay synchronized
- **Operation coordination**: Prevents conflicts between tabs

## Architectural Components

### 1. Real-Time Broadcasting System

#### Change Broadcasting
```typescript
// When a user makes a change
updateField(itemId, field, value) → 
  Save to Database → 
  Broadcast to Other Users → 
  Update Local State
```

#### Change Reception
```typescript
// When receiving changes from other users
Receive Broadcast → 
  Validate Changes → 
  Resolve Conflicts → 
  Update Local State → 
  Update UI
```

### 2. Conflict Resolution System (Simplified - Phase 5)

#### Last Write Wins with State Refresh
- **Local State**: User's current changes
- **Remote State**: Changes from other users (via broadcasts)
- **Resolution**: Simple "last write wins" + database state refresh on conflicts

#### Conflict Detection
```typescript
// Simple timestamp and signature comparison
if (remoteTimestamp > localTimestamp || remoteSignature !== localSignature) {
  await refreshFromDatabase() // Remote wins, refresh local state
}
```

#### Resolution Strategy
- **Last Write Wins**: Most recent database write is authoritative
- **State Refresh**: On conflict, refresh entire state from database
- **ID-Based Saves**: Cell saves use itemId (not position) to minimize conflicts
- **Immediate Updates**: Google Sheets-like instant broadcast application

### 3. Operation Coordination (Simplified - Phase 5)

#### ~~Priority-Based Operation Queue~~ (REMOVED)
**Status**: Queue system removed in Phase 5 simplification
**Current Approach**: Immediate execution with dual broadcasting pattern

```typescript
// All operations now execute immediately
addRow() → broadcast + parallel DB save
updateField() → broadcast + parallel DB save  
moveRows() → broadcast + parallel DB save
```

#### Race Condition Prevention (Current Approach)
- **ID-Based Operations**: Use item IDs (not positions) for all operations - structural broadcasts carry only IDs and order, not content. When reordering, we map IDs to existing local state items, which preserves concurrent content edits. This eliminates the classic race condition where a reorder could overwrite uncommitted edits. (See detailed explanation in `dualBroadcastingPattern.md` → "Why ID-Based Operations Prevent Race Conditions")
- **Dual Broadcasting**: Immediate UI broadcast + parallel database persistence
- **Content Snapshots**: Database saves include content snapshot for persistence and conflict resolution (NOT included in broadcasts)
- **Timestamp Validation**: Database checks timestamps to detect conflicts

### 4. State Synchronization

#### Multi-Layer Synchronization
```typescript
// Layer 1: Real-time broadcasts for immediate updates
broadcastChange(change) → allConnectedUsers.receive(change)

// Layer 2: Periodic state reconciliation
setInterval(() => reconcileState(), 5000)

// Layer 3: On-focus state refresh
window.addEventListener('focus', () => refreshState())
```

#### Signature-Based Change Detection
- **Content signatures**: Detect actual content changes
- **Version tracking**: Track document versions
- **Delta detection**: Identify what specifically changed

## Per-Cell Save Architecture for Collaboration

### Granular Field-Level Saves
```typescript
// Traditional approach (problematic for collaboration)
saveEntireDocument() // Can overwrite other users' changes

// Per-cell approach (collaboration-friendly)
saveSingleField(itemId, fieldName, newValue) // Only affects one field
```

### Benefits for Collaboration
- **Minimal conflicts**: Only conflicting fields need resolution
- **Instant feedback**: Users see changes immediately
- **Efficient bandwidth**: Only changed fields are transmitted
- **Conflict isolation**: Problems in one field don't affect others

### Implementation Details
```typescript
// User edits a field
onFieldEdit(itemId, field, value) → {
  // 1. Update local state immediately (optimistic)
  updateLocalState(itemId, field, value)
  
  // 2. Save field to database
  await saveCellField(itemId, field, value)
  
  // 3. Broadcast change to other users
  broadcastFieldChange(itemId, field, value)
  
  // 4. Handle any conflicts
  if (hasConflict) resolveFieldConflict(itemId, field)
}
```

## Presence System

### User Presence Tracking
```typescript
interface UserPresence {
  userId: string
  userName: string
  currentSection?: string  // Which part they're editing
  lastActivity: timestamp
  isActive: boolean
}
```

### Visual Presence Indicators
- **Active users list**: Show who's currently in the rundown
- **Edit indicators**: Highlight sections being edited by others
- **Cursor indicators**: Show where other users are focused

### Presence Coordination
```typescript
// Update presence on user actions
updatePresence(userId, { currentSection: 'item-123', lastActivity: now() })

// Clean up inactive presence
setInterval(() => cleanupInactiveUsers(), 30000)
```

## Network Resilience

### Offline Support
- **Local state**: Continue editing when offline
- **Change queuing**: Queue changes for when connection returns
- **Conflict resolution**: Resolve conflicts when reconnecting

### Connection Recovery
```typescript
// Detect connection loss
connection.onDisconnect(() => {
  enableOfflineMode()
  queuePendingChanges()
})

// Handle reconnection
connection.onReconnect(() => {
  syncQueuedChanges()
  resolveOfflineConflicts()
  resumeRealTimeSync()
})
```

### Error Handling
- **Graceful degradation**: Fall back to traditional saves if real-time fails
- **Retry mechanisms**: Automatic retry with exponential backoff
- **User feedback**: Clear indicators of connection status

## Performance Optimizations

### Debounced Operations
```typescript
// Debounce frequent operations
const debouncedSave = debounce(saveField, 300)
const debouncedBroadcast = debounce(broadcastChange, 100)
```

### Batched Updates
```typescript
// Batch multiple changes together
const changes = collectChanges()
if (changes.length > 0) {
  batchSave(changes)
  batchBroadcast(changes)
}
```

### Selective Synchronization
```typescript
// Only sync visible sections
const visibleItems = getVisibleItems()
syncOnly(visibleItems)

// Lazy load off-screen content
const offScreenItems = getOffScreenItems()
lazySync(offScreenItems)
```

## Security Considerations

### Authorization
- **User permissions**: Verify user can edit before applying changes
- **Team membership**: Ensure user belongs to team
- **Role-based access**: Respect admin/member permissions

### Data Validation
- **Input sanitization**: Clean all user input
- **Schema validation**: Ensure changes match expected format
- **Business logic validation**: Apply business rules

### Audit Trail
```typescript
interface ChangeLog {
  userId: string
  timestamp: Date
  operation: 'update' | 'insert' | 'delete'
  itemId: string
  field: string
  oldValue: any
  newValue: any
}
```

## Testing Strategies

### Multi-User Simulation
```typescript
// Simulate multiple users editing simultaneously
const user1 = createSimulatedUser()
const user2 = createSimulatedUser()

// Test conflict scenarios
user1.editField('item-1', 'title', 'Title A')
user2.editField('item-1', 'title', 'Title B')
// Verify conflict resolution works correctly
```

### Network Condition Testing
- **Connection drops**: Test offline/online transitions
- **Latency simulation**: Test with delayed responses
- **Packet loss**: Test with unreliable connections

### Race Condition Testing
- **Rapid changes**: Test rapid successive edits
- **Concurrent operations**: Test simultaneous structural changes
- **Cross-tab conflicts**: Test same user in multiple tabs

## Common Anti-Patterns

### ❌ Overwriting Remote Changes
```typescript
// DON'T: Save entire document without checking for conflicts
await saveDocument(localState)

// DO: Check for conflicts and resolve
const conflicts = await detectConflicts(localState, remoteState)
if (conflicts.length > 0) {
  localState = await resolveConflicts(conflicts)
}
await saveDocument(localState)
```

### ❌ Ignoring Presence Information
```typescript
// DON'T: Allow editing without checking if someone else is editing
editField(itemId, field, value)

// DO: Check presence and warn user
if (isBeingEditedByOther(itemId, field)) {
  showWarning("Another user is editing this field")
}
editField(itemId, field, value)
```

### ❌ Blocking Operations
```typescript
// DON'T: Block UI during save operations
showSpinner()
await saveField(value) // UI blocked
hideSpinner()

// DO: Use optimistic updates
updateUIImmediately(value) // UI responsive
saveFieldInBackground(value)
```

## Future Enhancements

### Advanced Collaboration Features
- **Collaborative cursor**: Show other users' cursors in real-time
- **Comment system**: Add comments and discussions to rundown items
- **Version history**: Show detailed history of changes
- **Branching**: Create alternative versions of rundowns

### Performance Improvements
- **WebSocket optimization**: More efficient real-time communication
- **Delta compression**: Compress change data for bandwidth efficiency
- **Smart caching**: Intelligent caching of frequently accessed data

### Enhanced Conflict Resolution
- **AI-assisted resolution**: Use AI to suggest conflict resolutions
- **Custom merge strategies**: Allow teams to define custom merge rules
- **Visual merge tools**: Provide UI for manual conflict resolution

## Conclusion

The collaborative editing architecture enables seamless multi-user editing while maintaining data consistency and performance. The combination of real-time synchronization, intelligent conflict resolution, and per-cell saving creates a robust foundation for team collaboration on rundown creation and editing.