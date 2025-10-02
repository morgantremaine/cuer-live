# Architecture Quick Reference

## 🎯 Current System Overview (Post Phase 5)

### Key Principles
1. **Dual Broadcasting**: Immediate broadcast + parallel database save
2. **ID-Based Operations**: Use item IDs (not positions) for all operations
3. **Last Write Wins**: Simple conflict resolution via database timestamps
4. **Content Snapshots**: Structural operations preserve concurrent edits
5. **Immediate Execution**: No queuing or blocking (Google Sheets-like)

### What Was Removed (Phase 5 - 2025)
- ❌ **LocalShadow System** (291 lines) - Complex field protection
- ❌ **itemDirtyQueue** (117 lines) - Dirty state queue management
- ❌ **Operation Queue** - Priority-based operation queuing
- ❌ **Blocking Policies** - Complex blocking logic for saves
- ❌ **Shadow Signatures** - Three-way merge conflict resolution

### What Replaced Them
- ✅ **Dual Broadcasting Pattern** - Immediate broadcast + parallel save
- ✅ **Simple State Refresh** - Refresh from database on conflicts
- ✅ **Content Snapshots** - Preserve concurrent edits during structural changes
- ✅ **Timestamp Validation** - Database-level conflict detection

## 📂 Key Files & Their Purposes

### State Management
- **`usePersistedRundownState.ts`** - Core rundown state (items, title, columns)
- **`useRundownUIState.ts`** - UI state (selection, scroll, expanded sections)
- **`useSimplifiedRundownState.ts`** - Unified state interface

### Save Coordination
- **`useUnifiedSaveCoordination.ts`** - Unified save interface (UI-facing)
- **`usePerCellSaveCoordination.ts`** - Routes per-cell vs traditional saves
- **`useCellUpdateCoordination.ts`** - Manages cell updates (simplified in Phase 5)

### Real-Time Collaboration
- **`useConsolidatedRealtimeRundown.ts`** - Receives broadcasts, applies immediately
- **`cellBroadcast.ts`** - Sends broadcasts to other users
- **`useShowcallerBroadcastSync.ts`** - Showcaller real-time sync

### Save Operations
- **`useCellLevelSave.ts`** - Per-cell field saves via edge function
- **`useFieldDeltaSave.ts`** - Traditional full-document saves
- **`useStructuralSave.ts`** - Structural operations (add/delete/reorder)

### Drag & Drop
- **`useDragAndDrop.ts`** - Row reordering with dual broadcasting

## 🔄 Save Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Action (edit/add/move)               │
└───────────────────────────┬─────────────────────────────────┘
                            │
                ┌───────────▼───────────┐
                │  Update Local State   │ (Optimistic)
                └───────────┬───────────┘
                            │
            ┌───────────────┼───────────────┐
            │                               │
  ┌─────────▼─────────┐         ┌─────────▼─────────┐
  │ Immediate Broadcast│         │ Parallel DB Save  │
  │ (Instant Feedback) │         │ (Persistence)     │
  └─────────┬─────────┘         └─────────┬─────────┘
            │                               │
            │                               │
  ┌─────────▼──────────┐        ┌─────────▼──────────┐
  │ Other Users See    │        │ Database Validates │
  │ Change Immediately │        │ Timestamp/Conflicts│
  └────────────────────┘        └─────────┬──────────┘
                                           │
                                  ┌────────▼────────┐
                                  │ If Conflict:    │
                                  │ Refresh State   │
                                  └─────────────────┘
```

## 🎨 Operation Types

### Cell Content Operations
**Example**: Editing a cell field
```typescript
updateCell(itemId, field, value)
  → Local update
  → Immediate broadcast
  → Parallel DB save
```

### Structural Operations
**Example**: Reordering rows
```typescript
moveRow(index, newIndex)
  → Local reorder
  → Immediate broadcast (with order array)
  → Parallel DB save (with content snapshot)
```

### Add/Delete Operations
**Example**: Adding a row
```typescript
addRow(newItem)
  → Local add
  → Immediate broadcast (with new item)
  → Parallel DB save (with content snapshot)
```

## 🔧 Conflict Resolution

### How It Works
1. **Database Validation**: Checks timestamps on every write
2. **Stale Detection**: Ignores writes with old timestamps
3. **State Refresh**: Client refreshes from database on conflicts
4. **Content Snapshots**: Structural operations preserve concurrent content edits

### Why It's Simple
- **ID-based operations eliminate position conflicts** - Structural broadcasts carry only IDs, reordering uses local content (see detailed explanation in `dualBroadcastingPattern.md` → "Why ID-Based Operations Prevent Race Conditions")
- Content snapshots preserve concurrent edits (in database, not broadcasts)
- Database is single source of truth
- No complex three-way merge needed

## 📊 Per-Cell Save System

### Enablement
- **Feature Flag**: `per_cell_save_enabled` boolean on rundown
- **Test Users**: `morgan@cuer.live`, `morgantremaine@me.com`
- **Benefit**: Eliminates doc_version conflicts completely

### How It Works
```typescript
// User edits cell
onCellEdit(itemId, field, value)
  → Immediate broadcast (via cellBroadcast)
  → Parallel save (via cell-field-save edge function)
  → Database updates JSONB item_field_updates column
  → No doc_version conflict!
```

### Edge Functions
- **`cell-field-save`** - Individual field saves
- **`structural-operation-save`** - Row operations (add/delete/reorder)
- **`save-rundown-content-delta`** - Traditional full-document saves

## 🚀 Performance Optimizations

### Signature Caching
- Content signatures cached via `useMemo`
- Avoid recomputing on every render
- Invalidate only when content changes

### Selective Updates
- Cell broadcasts only send changed field
- Structural broadcasts include order array + snapshot
- Database saves only affected fields

### Debouncing
- Autosave debounced to 2 seconds
- Signature generation debounced
- Prevents excessive saves during rapid edits

## 🐛 Common Issues & Solutions

### Issue: Changes Not Syncing
**Check**:
1. Is broadcast being sent? (Network tab → `cell_field_updates`)
2. Is database save completing? (Edge function logs)
3. Is realtime subscription active? (Console → "✅ Cell realtime channel subscribed")

### Issue: Changes Disappearing
**Check**:
1. Are IDs stable? (Should use `itemId`, not `rowIndex`)
2. Is content snapshot included? (For structural operations)
3. Is state refresh happening too often? (Check for conflict logs)

### Issue: Stale Data
**Check**:
1. Is timestamp validation working? (Console → "⏭️ Stale timestamp ignored")
2. Is signature matching? (Console → content signature logs)
3. Is database up to date? (Query `rundowns` table directly)

## 📚 Documentation Index

### Detailed Architecture Docs
- **`architecturalOverview.md`** - System design principles
- **`saveSystemArchitecture.md`** - Save system layers
- **`collaborativeEditingArchitecture.md`** - Real-time collaboration
- **`signatureSystemArchitecture.md`** - Signature types and usage

### Pattern Documentation
- **`dualBroadcastingPattern.md`** - Dual broadcasting pattern details
- **`perCellSaveSystem.ts`** - Per-cell save system overview

### Analysis & History
- **`systemAnalysis.md`** - System analysis and completed optimizations

## 🎯 Development Guidelines

### When Adding New Features

#### ✅ DO
- Use item IDs for all operations
- Include content snapshots in structural operations
- Broadcast immediately after local update
- Save to database in parallel
- Handle conflicts via state refresh

#### ❌ DON'T
- Use row positions/indices for operations
- Block UI during saves
- Create new coordination layers
- Mix UI and content state
- Skip timestamp validation

### When Debugging

#### Check These First
1. **Console logs** - Look for error patterns
2. **Network tab** - Verify broadcasts are sent
3. **Edge function logs** - Check database operations
4. **State signatures** - Verify change detection

#### Use These Tools
- **Save Coordination Dashboard** - Real-time save monitoring
- **Signature comparison** - Detect unexpected changes
- **Realtime subscription status** - Verify connection

## 🔮 Future Considerations

### Potential Enhancements
- **Operational Transform** - Mathematical merge of concurrent edits
- **Conflict Visualization** - Show users when conflicts occur
- **Change History** - Track and replay all changes
- **Selective Sync** - Sync only visible sections

### Scalability Notes
- Current architecture supports unlimited concurrent users
- Database handles conflict detection (no server-side locking)
- Broadcasts don't wait for each other
- Per-cell saves eliminate most conflicts

## 📞 Quick Reference Card

### System Status: ✅ Phase 5 Complete (Dramatically Simplified)

**Before Phase 5**: 408+ lines of complex protection code, queuing, blocking  
**After Phase 5**: Simple dual broadcasting, immediate execution, last write wins

**Key Achievement**: Zero data loss + instant collaboration + easy debugging

**For Questions**: Refer to detailed docs or search codebase for specific hooks/functions
