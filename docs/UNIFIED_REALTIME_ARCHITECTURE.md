# Unified Realtime Collaboration Architecture

## Overview

This document describes the unified realtime collaboration system that enables Google Sheets-style real-time updates across all clients.

## Core Principle

**ONE broadcast channel for ALL operations** - Every change (cell edits, structural changes, metadata updates, showcaller updates) broadcasts through a single unified channel to ensure consistent, reliable real-time collaboration.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Unified Broadcast Channel                   │
│              rundown-unified-{rundownId}                     │
└─────────────────────────────────────────────────────────────┘
                           ▲     ▼
                           │     │
        ┌──────────────────┴─────┴──────────────────┐
        │                                            │
        ▼                                            ▼
┌───────────────┐                          ┌──────────────────┐
│   BROADCAST   │                          │     RECEIVE      │
│               │                          │                  │
│  OT System    │◄─────────────────────────┤  OT System       │
│  Structural   │                          │  Structural      │
│  Metadata     │                          │  Metadata        │
│  Showcaller   │                          │  Showcaller      │
└───────────────┘                          └──────────────────┘
```

## Operation Types

### 1. Cell Edits (OT System)
- **Type**: `CELL_EDIT`
- **Handler**: `useOperationBasedRundown`
- **Broadcasting**: Via `useUnifiedRealtimeBroadcast`
- **Database**: `apply-operation` edge function
- **Real-time**: Immediate broadcast after DB save

### 2. Structural Changes
- **Types**: `ROW_INSERT`, `ROW_DELETE`, `ROW_MOVE`, `ROW_COPY`
- **Handler**: `useStructuralSave`
- **Broadcasting**: Via `useUnifiedRealtimeBroadcast`
- **Database**: `structural-operation-save` edge function
- **Real-time**: Immediate broadcast after DB save

### 3. Metadata Updates
- **Type**: `METADATA_UPDATE`
- **Fields**: Title, timezone, start time
- **Broadcasting**: Via `useUnifiedRealtimeBroadcast`
- **Database**: Direct Supabase update
- **Real-time**: Immediate broadcast after DB save

### 4. Showcaller Updates
- **Type**: `SHOWCALLER_UPDATE`
- **Handler**: `useShowcallerStateCoordination`
- **Broadcasting**: Via `useUnifiedRealtimeBroadcast`
- **Database**: `update_showcaller_state_silent` function
- **Real-time**: Immediate broadcast after DB save

## Key Components

### `useUnifiedRealtimeBroadcast`
- **Purpose**: Single source of truth for broadcasting ALL operations
- **Channel**: `rundown-unified-{rundownId}`
- **Features**:
  - Client ID filtering (ignores own operations)
  - Standardized payload format
  - Sequence number tracking
  - Error handling and retry logic

### `useUnifiedRealtimeReceiver`
- **Purpose**: Routes incoming operations to appropriate handlers
- **Features**:
  - Operation type-based routing
  - Handler registration per operation type
  - Comprehensive logging
  - Error boundary protection

### Standardized Payload Format
```typescript
interface UnifiedOperationPayload {
  type: OperationType;
  rundownId: string;
  clientId: string;
  userId: string;
  timestamp: number;
  sequenceNumber?: number;
  data: any; // Operation-specific data
}
```

## Implementation Flow

### Broadcasting an Operation
1. User performs action (edit cell, delete row, etc.)
2. Action handler processes change
3. Change saved to database via appropriate edge function
4. On successful save, create `UnifiedOperationPayload`
5. Broadcast via `useUnifiedRealtimeBroadcast.broadcastOperation()`
6. All other clients receive broadcast

### Receiving an Operation
1. Client receives broadcast on unified channel
2. `useUnifiedRealtimeReceiver` validates and routes operation
3. Operation routed to appropriate handler based on type
4. Handler applies operation to local state
5. UI re-renders with updated state

## State Synchronization

### Preventing Echo/Duplicate Updates
- Each client has unique `clientId`
- Broadcasting system filters out operations from same `clientId`
- Own updates tracked via `ownUpdateTracker`
- Database updates include `updatedAt` timestamp for conflict detection

### Sequence Numbers
- Every operation has optional `sequenceNumber`
- Based on database `doc_version`
- Used for operation ordering and conflict resolution
- Gaps trigger pending operation fetch

### State Refresh Coordination
- After structural operations, OT system refreshes from DB
- Ensures UI reflects most recent state
- Prevents stale data rendering
- Coordinated via `refreshFromDatabase()` method

## Migration from Legacy Systems

### Deprecated Systems
- ❌ `useRundownBroadcast` - Replaced by unified broadcast
- ❌ `cellBroadcast.broadcastCellUpdate()` - Replaced by unified broadcast
- ❌ Multiple separate channels - Consolidated into one

### Migration Path
1. All new operations use `useUnifiedRealtimeBroadcast`
2. Legacy systems maintained for backwards compatibility
3. Gradual migration of all operation types
4. Remove legacy systems once migration complete

## Benefits

### Consistency
- Single broadcast channel = no missed updates
- Standardized payload format = predictable behavior
- Centralized routing = easier debugging

### Reliability
- Every operation broadcasts after DB save
- Client ID filtering prevents echo updates
- Sequence numbers enable conflict resolution

### Maintainability
- One system to understand and debug
- Clear operation type definitions
- Comprehensive logging at every step

### Performance
- Immediate broadcasts = real-time feel
- Efficient payload format = minimal bandwidth
- Database fallback via Supabase realtime

## Testing

### Manual Testing Checklist
- [ ] Cell edit on Client A appears immediately on Client B
- [ ] Row delete on Client A removes row on Client B
- [ ] Row insert on Client A adds row on Client B
- [ ] Row move on Client A reorders on Client B
- [ ] Title change on Client A updates on Client B
- [ ] Showcaller state change on Client A reflects on Client B
- [ ] No echo updates (own changes don't cause duplicates)
- [ ] Sequence numbers increment properly
- [ ] Conflict resolution works correctly

### Debug Commands
```typescript
// Enable verbose logging
localStorage.setItem('debug', 'unified-broadcast:*');

// Monitor broadcast channel
// Open browser console and watch for:
// - 📤 UNIFIED BROADCAST: Broadcasting operation
// - 📡 UNIFIED BROADCAST: Received operation
// - 🎯 UNIFIED RECEIVER: Routing operation
```

## Future Enhancements

- [ ] Presence indicators (who's viewing/editing)
- [ ] Cursor position sharing
- [ ] Collaborative undo/redo
- [ ] Operation batching for performance
- [ ] Offline queue with sync on reconnect
- [ ] Conflict resolution UI
