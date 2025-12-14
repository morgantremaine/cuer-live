# Offline Conflict Resolution System

## Overview

This system provides a conflict-aware offline queue for rundown edits, with Google Docs-style three-way merge and user-friendly conflict resolution UI.

## Key Features

✅ **Zero Data Loss**: Both offline and online changes are preserved  
✅ **Smart Auto-Merge**: Non-conflicting changes are automatically merged  
✅ **User Control**: Real conflicts are presented to the user for resolution  
✅ **Persistent Queue**: Operations survive browser crashes via localStorage  
✅ **Progressive Retry**: Failed operations retry with exponential backoff  
✅ **Version Tracking**: Uses doc_version for optimistic conflict detection  

## Architecture

### Three-Way Merge

The system uses three versions of the data to intelligently merge changes:

- **Base**: State when user went offline
- **Theirs**: Current server state (changes by other users)
- **Ours**: Offline changes (current user's edits)

**Merge Rules:**
1. If `base === theirs`: No remote change → Apply our change ✅
2. If `base === ours`: We didn't change it → Keep their change ✅
3. If `theirs === ours`: Both made same change → Auto-merge ✅
4. Else: **CONFLICT** → User resolves ⚠️

### Conflict Detection Flow

```
User Goes Offline
      ↓
Queue Operation (capture baseline state + doc_version)
      ↓
User Comes Back Online
      ↓
Process Queue
      ↓
Fetch Current Server State
      ↓
Compare doc_version
      ↓
   Changed?
   /      \
  NO      YES
  ↓        ↓
Apply   Three-Way Merge
         /         \
    No Conflicts   Conflicts
        ↓              ↓
   Auto-Apply    Show Conflict UI
                       ↓
                  User Resolves
                       ↓
                  Apply Merged Changes
```

## Usage

### Basic Integration

```typescript
import { useOfflineQueueWithConflicts } from '@/hooks/useOfflineQueueWithConflicts';

function RundownEditor({ rundownId }) {
  const {
    queueOperation,
    processQueue,
    ConflictModal,
    isConnected,
    queueLength,
    hasPendingConflicts
  } = useOfflineQueueWithConflicts(rundownId);

  // Queue a cell update when offline
  const handleFieldChange = (itemId, field, value, currentState, docVersion) => {
    queueOperation(
      'cell-updates',
      {
        fieldUpdates: [{ itemId, field, value, timestamp: Date.now() }],
        contentSignature: createContentSignature(currentState)
      },
      rundownId,
      currentState, // baseline state
      docVersion    // baseline doc version
    );
  };

  // Render conflict modal
  return (
    <>
      {/* Your editor UI */}
      <ConflictModal />
    </>
  );
}
```

### Integration with useCellLevelSave

```typescript
import { useOfflineQueueWithConflicts } from '@/hooks/useOfflineQueueWithConflicts';
import { useCellLevelSave } from '@/hooks/useCellLevelSave';

function RundownEditorWithOfflineSupport({ rundownId }) {
  const offlineQueue = useOfflineQueueWithConflicts(rundownId);
  const cellLevelSave = useCellLevelSave(rundownId, ...);

  const handleFieldChange = (itemId, field, value) => {
    if (!offlineQueue.isConnected) {
      // Offline - queue the change
      offlineQueue.queueOperation(
        'cell-updates',
        {
          fieldUpdates: [{ itemId, field, value, timestamp: Date.now() }]
        },
        rundownId,
        currentRundownState,
        currentDocVersion
      );
    } else {
      // Online - use normal cell-level save
      cellLevelSave.trackCellChange(itemId, field, value);
    }
  };

  return (
    <>
      {/* Editor UI */}
      <offlineQueue.ConflictModal />
    </>
  );
}
```

## Edge Function Changes

The `cell-field-save` edge function now accepts:

```typescript
{
  rundownId: string;
  fieldUpdates: FieldUpdate[];
  contentSignature: string;
  baselineDocVersion?: number;    // NEW: Version when offline began
  baselineTimestamp?: number;     // NEW: Timestamp when offline began
}
```

**Conflict Response (409):**
```json
{
  "success": false,
  "conflict": true,
  "currentDocVersion": 42,
  "currentState": {
    "items": [...],
    "title": "...",
    "show_date": "...",
    ...
  },
  "message": "Conflict detected - state changed since offline"
}
```

## Conflict Resolution UI

The `ConflictResolutionModal` presents each conflict with:

- **Your version** (offline changes) with timestamp
- **Other user's version** (current server state) with timestamp  
- **Original value** (baseline) for reference

Users can choose:
- Keep your version
- Keep other user's version

Unresolved conflicts default to "keep your version".

## Database Changes

The `rundowns` table now uses `doc_version` for optimistic concurrency control:

```sql
ALTER TABLE rundowns ADD COLUMN doc_version INTEGER DEFAULT 0;
```

Each save increments `doc_version`:
```typescript
doc_version = (current_doc_version || 0) + 1
```

## Testing Scenarios

### Scenario 1: Non-Conflicting Changes
1. User A goes offline, edits Row 5 Script
2. User B edits Row 3 Script (different row)
3. User A comes online
4. **Result**: ✅ Auto-merged, both changes applied

### Scenario 2: Same Field Conflict
1. User A goes offline, edits Row 5 Script
2. User B edits Row 5 Script (same row)
3. User A comes online
4. **Result**: ⚠️ Conflict modal shown, user resolves

### Scenario 3: Browser Crash
1. User goes offline, makes 5 edits
2. Browser crashes
3. User reopens browser
4. **Result**: ✅ Queue restored from localStorage, auto-syncs when online

## Performance Considerations

- **Baseline Capture**: Minimal overhead (~1-2ms to clone state)
- **Conflict Detection**: Only for offline operations, not regular saves
- **Three-Way Merge**: O(n) where n = number of field updates
- **localStorage**: Persistent queue survives crashes

## Future Enhancements

- [ ] Manual merge text editor for complex conflicts
- [ ] Conflict preview before applying
- [ ] Merge history/audit log
- [ ] Real-time conflict notifications
- [ ] Operational transformation for concurrent edits
