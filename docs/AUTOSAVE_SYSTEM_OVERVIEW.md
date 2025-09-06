# Bulletproof Autosave System - Complete Overview

## System Architecture

The autosave system is built around a bulletproof realtime collaboration architecture that ensures zero data loss and optimal user experience across all scenarios including offline editing, network issues, and concurrent collaboration.

## Core Components

### 1. `useBulletproofRundownState` - Master State Controller
**Location**: `src/hooks/useBulletproofRundownState.ts`

**Key Features**:
- **Offline-first architecture** with persistent local queue
- **Enhanced auto-save** with debounced triggering (1.5s delay)
- **Focus-based sync** that checks for latest data when tab becomes active
- **Granular conflict resolution** using operational transformation
- **Network status awareness** with automatic fallback to offline mode

**Auto-save Triggers**:
- `handleFieldChange()` - Triggered on any field modification
- `updateItem()` - Triggered on item updates
- `markAsChanged()` - Manual trigger for external components
- `triggerAutoSave()` - Debounced auto-save trigger

### 2. `useEnhancedDataSync` - Conflict Resolution Engine
**Location**: `src/hooks/useEnhancedDataSync.ts`

**Key Features**:
- **Intelligent conflict detection** comparing timestamps and document versions
- **Operational transformation** for merging conflicting changes
- **Stale data detection** with automatic refresh on focus
- **Optimistic concurrency control** using doc_version tracking

### 3. `useOfflineQueue` - Persistent Change Queue
**Location**: `src/hooks/useOfflineQueue.ts`

**Key Features**:
- **Persistent localStorage queue** that survives browser restarts
- **Change deduplication** to prevent duplicate operations
- **Automatic queue processing** when connection is restored
- **Field-level granular tracking** for precise conflict resolution

### 4. `useNetworkStatus` - Connection Monitoring
**Location**: `src/hooks/useNetworkStatus.ts`

**Key Features**:
- **Real-time network status detection** (online/offline/slow)
- **Connection type awareness** (wifi/cellular/ethernet)
- **Automatic reconnection handling**
- **Focus-based sync triggers**

## Auto-save Flow

### 1. User Makes Edit
```
User types in field → handleFieldChange() → trackOfflineChange() → triggerAutoSave()
```

### 2. Debounced Save Process
```
triggerAutoSave() → (1.5s delay) → autoSave() → saveToServer() → syncWithServer()
```

### 3. Conflict Resolution
```
syncWithServer() → fetchLatestData() → detectConflicts() → resolveConflicts() → mergeChanges()
```

### 4. Offline Handling
```
saveToServer() → (no connection) → queueOperation() → localStorage persistence
```

### 5. Reconnection Recovery
```
networkStatus.isConnected → processQueue() → applyQueuedChanges() → syncWithServer()
```

## State Management Integration

### Primary State Coordination
**Location**: `src/hooks/useRundownStateCoordination.ts`

The coordination layer exposes all autosave functionality:
- `coreState.markAsChanged` - Manual save trigger
- `coreState.saveNow` - Immediate save (bypasses debounce)
- `coreState.syncNow` - Force sync with server
- `coreState.hasUnsavedChanges` - Save status indicator
- `coreState.isSaving` - Save progress indicator

### Component Integration
**Location**: `src/components/RundownIndexContent.tsx`

Components automatically trigger autosave through:
- Grid cell changes
- Field updates
- Item additions/deletions
- Structural changes

## Conflict Resolution Strategy

### 1. Document Version Tracking
- Each save increments `doc_version` in database
- Local state tracks `lastKnownDocVersion`
- Conflicts detected when server version > local version

### 2. Field-level Granular Resolution
- Changes tracked at individual field level
- Recent local changes take priority
- Server changes applied to non-conflicting fields

### 3. Operational Transformation
- Automatic merging of compatible changes
- User notification for unresolvable conflicts
- Backup creation before applying server changes

## Focus-based Sync Strategy

### Mobile Sleep/Wake Handling
```javascript
// Tab becomes active
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    forceFocusCheck(); // Sync with server before allowing edits
  }
});
```

### Network Reconnection
```javascript
// Connection restored
networkStatus.onReconnect(() => {
  syncWithServer(); // Apply queued changes and get latest data
});
```

## Data Persistence Layers

### 1. Primary Database (Supabase)
- Real-time subscriptions for live collaboration
- Document versioning for conflict detection
- Automatic backup creation via triggers

### 2. Local Storage Queue
- Persistent offline changes across sessions
- Change deduplication and conflict tracking
- Automatic cleanup after successful sync

### 3. Memory State
- Optimistic UI updates for responsiveness
- Rollback capability for failed saves
- Conflict merge buffers

## Performance Optimizations

### Debounced Saving
- 1.5 second delay to batch rapid changes
- Cancellation of pending saves for new changes
- Immediate save for critical operations

### Change Detection
- Shallow comparison for performance
- Field-level granular tracking
- Efficient conflict detection algorithms

### Memory Management
- Automatic cleanup of processed offline changes
- Limited retention of revision history
- Efficient state update patterns

## Error Handling & Recovery

### Save Failures
- Automatic retry with exponential backoff
- Fallback to offline queue
- User notification for persistent failures

### Network Issues
- Seamless offline/online transitions
- Queue persistence across browser sessions
- Automatic sync on reconnection

### Conflict Resolution
- User-friendly conflict notifications
- Automatic backup before merging
- Manual resolution UI for complex conflicts

## Integration with Other Systems

### Showcaller Integration
- Separate state management to prevent conflicts
- Visual state overlay without affecting main data
- Independent save/sync cycles

### Team Collaboration
- Real-time presence indicators
- Live cursor tracking
- Change attribution and history

### Undo/Redo System
- Coordination with autosave to prevent conflicts
- Preservation of undo history during saves
- Rollback capability for bad saves

## Testing & Monitoring

### Debug Tools
- Console logging for all autosave operations
- Network status indicators
- Offline queue inspection tools

### Performance Metrics
- Save latency tracking
- Conflict resolution success rates
- Offline/online transition timing

## Best Practices

### For Developers
1. Always use `markAsChanged()` when modifying state outside of standard hooks
2. Never bypass the autosave system for critical data
3. Test offline scenarios thoroughly
4. Monitor console logs for autosave issues

### For Users
1. System automatically saves every 1.5 seconds
2. Manual save available via Ctrl+S
3. Offline changes preserved until reconnection
4. Focus/unfocus browser tab to force sync

## Troubleshooting

### Common Issues
1. **Save not triggering**: Check if `markAsChanged()` is being called
2. **Offline changes lost**: Verify localStorage persistence
3. **Conflicts not resolving**: Check document version tracking
4. **Performance issues**: Review debounce timing and change detection

### Debug Commands
```javascript
// Enable autosave debugging
localStorage.setItem('debugAutosave', '1');

// Force immediate save
coreState.saveNow();

// Force sync with server
coreState.syncNow();

// Check offline queue status
console.log(offlineQueue.getQueueStatus());
```

This system ensures that users never lose data, can work seamlessly offline, and experience smooth real-time collaboration with automatic conflict resolution.