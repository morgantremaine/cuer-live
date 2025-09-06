# Enhanced Blueprints & Notes Realtime System

## Overview

The blueprints and notes systems have been upgraded with bulletproof realtime functionality, similar to the main rundown system. This ensures zero data loss, seamless offline functionality, and smooth real-time collaboration.

## Architecture

### Blueprints System
**Location**: `src/hooks/useBulletproofBlueprintState.ts`

**Key Features**:
- **Bulletproof offline support** with persistent local queue
- **Enhanced auto-save** with 1.5s debounced triggering
- **Focus-based sync** checks for latest data when tab becomes active
- **Granular conflict resolution** for lists, notes, and component order
- **Network status awareness** with automatic fallback to offline mode

**Data Synced**:
- Blueprint lists (asset lists generated from rundown columns)
- Show date
- Notes/scratchpad content
- Camera plots
- Component ordering (drag & drop layout)

### Notes System
**Location**: `src/hooks/useBulletproofNotesState.ts`

**Key Features**:
- **Bulletproof offline support** with persistent local queue
- **Fast auto-save** with 1s debounced triggering (faster than rundown/blueprints)
- **Focus-based sync** checks for latest data when tab becomes active
- **Smart conflict resolution** preserving recent edits
- **Auto-title extraction** from note content
- **Multi-note support** with reordering and management

**Data Synced**:
- Multiple notes with individual IDs
- Note titles and content
- Creation/update timestamps
- Note ordering

## Auto-save Flow

### Blueprints
```
User modifies list/notes → handleFieldChange() → trackOfflineChange() → triggerAutoSave() → (1.5s delay) → saveToServer()
```

### Notes
```
User types in note → updateNoteContent() → trackOfflineChange() → triggerAutoSave() → (1s delay) → saveToServer()
```

## Conflict Resolution

### Blueprint Conflicts
- **Lists**: Local changes take priority if recent offline edits exist
- **Notes**: Recent local changes preferred
- **Show Date**: Non-empty values preferred
- **Component Order**: Local changes take priority

### Notes Conflicts
- **Content**: Recent local changes take priority if offline edits exist
- **Ordering**: Local changes preserved
- **Active Note**: Maintained if note still exists, otherwise first note selected

## Integration Points

### Existing Components Updated

1. **useExternalNotes** → Now uses `useBulletproofNotesState`
2. **Blueprint Context** → Can be enhanced to use bulletproof state
3. **FloatingNotesWindow** → Automatically gets bulletproof functionality
4. **Blueprint Components** → Will get enhanced sync when integrated

### Database Tables

**Blueprints**: Stored in `blueprints` table
- `lists` (jsonb) - Asset lists generated from rundown
- `notes` (text) - Scratchpad notes
- `show_date` (date) - Show date
- `camera_plots` (jsonb) - Camera plot data
- `component_order` (jsonb) - Layout ordering

**Notes**: Stored in `rundowns.external_notes` field
- JSON array of note objects
- Each note has id, title, content, timestamps

## Network Status Handling

### Online Operation
- Real-time sync with conflict detection
- Immediate save to server
- Live collaboration support

### Offline Operation
- Changes queued in localStorage
- Responsive UI with optimistic updates
- Automatic sync when connection restored

### Mobile Sleep/Wake
- Focus event triggers sync check
- Offline changes preserved across sessions
- Conflict resolution on reconnection

## Performance Optimizations

### Blueprints
- 1.5 second debounced saves
- Partial updates for different components
- Efficient list regeneration
- Smart change detection

### Notes
- 1 second debounced saves (faster for typing)
- Individual note tracking
- Content-based title extraction
- Malformed JSON cleanup

## Error Handling

### Save Failures
- Automatic retry with exponential backoff
- Fallback to offline queue
- Silent error handling to prevent UI disruption

### Sync Conflicts
- Automatic resolution using operational transformation
- User notification for complex conflicts
- Backup creation before applying changes

## Testing Scenarios

### Offline/Online Transitions
1. Work offline → Connection restored → Changes sync automatically
2. Multiple users editing → Conflicts resolved automatically
3. Tab sleep/wake → Latest data fetched on focus

### Data Integrity
1. Browser restart → Offline changes preserved
2. Network interruption → Seamless continuation
3. Concurrent edits → Proper conflict resolution

## Migration Path

### For Existing Blueprint Components
```typescript
// Old way
const { saveBlueprint, loadBlueprint } = useBlueprintPersistence();

// New way (when ready to migrate)
const {
  updateLists,
  updateNotes,
  saveNow,
  hasUnsavedChanges,
  isSaving
} = useBulletproofBlueprintState(rundownId);
```

### For Existing Notes Components
```typescript
// Already migrated automatically via useExternalNotes
const {
  notes,
  activeNote,
  updateNoteContent,
  createNote,
  hasUnsavedChanges,
  isSaving
} = useExternalNotes(rundownId);
```

## Debug Tools

### Console Logging
- Blueprint operations: Filter by 'Blueprint' in console
- Notes operations: Filter by 'Notes' in console
- Sync operations: Filter by 'sync' in console

### Status Indicators
- `hasUnsavedChanges` - Shows if data needs saving
- `isSaving` - Shows active save operation
- `isConnected` - Shows network status
- `hasOfflineChanges` - Shows queued offline changes

## Best Practices

### For Developers
1. Always use the bulletproof hooks instead of direct database calls
2. Monitor `hasUnsavedChanges` for user feedback
3. Test offline scenarios thoroughly
4. Use `forceFocusCheck()` after user actions that require fresh data

### For Users
1. System automatically saves every 1-1.5 seconds
2. Work continues seamlessly offline
3. Changes preserved across browser sessions
4. Focus/unfocus browser tab to force sync

This enhanced system ensures that blueprints and notes work as reliably as the main rundown system, with the same bulletproof guarantees for data integrity and collaboration.