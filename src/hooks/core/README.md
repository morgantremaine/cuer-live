# Bulletproof Auto-Save System

A unified, reliable auto-save and real-time collaboration system that eliminates data loss and provides perfect multi-user synchronization.

## Overview

This system replaces the fragmented auto-save coordination with a single, bulletproof solution that:

- ✅ **Guarantees zero data loss** - Every keystroke is tracked and saved
- ✅ **Perfect real-time sync** - Users see each other's changes instantly
- ✅ **Intelligent conflict resolution** - Automatically merges compatible changes
- ✅ **Memory efficient** - Only broadcasts changed fields, not full updates
- ✅ **Component-specific sync** - Different update frequencies for different components
- ✅ **Persistent save queue** - Failed saves are automatically retried

## Quick Start

### 1. Wrap your component with the provider

```tsx
import { UnifiedAutoSaveProvider } from '@/components/UnifiedAutoSaveProvider';
import { SaveStatusIndicator } from '@/components/SaveStatusIndicator';

function RundownEditor({ rundownId }: { rundownId: string }) {
  return (
    <UnifiedAutoSaveProvider
      rundownId={rundownId}
      componentType="main_rundown"
      onDataUpdate={(data) => {
        // Handle incoming real-time updates
        console.log('Received updates:', data);
      }}
      onConflictDetected={(conflict) => {
        // Handle conflicts if needed
        console.warn('Conflict resolved:', conflict);
      }}
    >
      <div className="rundown-editor">
        <SaveStatusIndicator />
        <RundownGrid />
      </div>
    </UnifiedAutoSaveProvider>
  );
}
```

### 2. Use the auto-save hooks in your components

```tsx
import { useUnifiedAutoSave } from '@/components/UnifiedAutoSaveProvider';

function EditableCell({ itemId, fieldName, initialValue }: CellProps) {
  const { onFieldFocus, onFieldChange, onFieldBlur } = useUnifiedAutoSave();
  const [value, setValue] = useState(initialValue);

  return (
    <input
      value={value}
      onFocus={() => onFieldFocus(itemId, fieldName, value)}
      onChange={(e) => {
        setValue(e.target.value);
        onFieldChange(itemId, fieldName, e.target.value);
      }}
      onBlur={() => onFieldBlur(itemId, fieldName, value)}
    />
  );
}
```

## Component Types

Different components have different sync requirements:

| Component | Update Frequency | Conflict Resolution | Broadcasting |
|-----------|------------------|-------------------|--------------|
| `main_rundown` | Real-time | Merge | ✅ |
| `shared_rundown` | Medium (5s polling) | Overwrite | ❌ |
| `showcaller` | Real-time | Overwrite | ✅ |
| `teleprompter` | Real-time | Merge | ✅ |
| `blueprint` | Fast | Merge | ✅ |
| `camera_plot` | Fast | Overwrite | ✅ |

## Migration Guide

### From Legacy Auto-Save Systems

Use the migration hook for gradual transition:

```tsx
import { useBulletproofMigration } from '@/hooks/core/useBulletproofMigration';

function YourComponent({ rundownId }: { rundownId: string }) {
  // Your existing legacy hooks
  const legacyHooks = {
    onItemUpdate: (itemId, updates) => { /* existing logic */ },
    onFieldUpdate: (itemId, field, value) => { /* existing logic */ },
    saveRundown: () => { /* existing logic */ },
    isSaving: false
  };

  const { bulletproof, legacy, migration } = useBulletproofMigration(
    rundownId,
    legacyHooks,
    {
      componentType: 'main_rundown',
      enableGradualMigration: true,
      logMigrationEvents: true
    }
  );

  // Start with legacy interface, gradually switch to bulletproof
  const autoSave = legacy; // or bulletproof for full migration

  return (
    <div>
      {/* Your existing component logic */}
      <button onClick={autoSave.saveRundown}>Save</button>
      <div>Saving: {autoSave.isSaving ? 'Yes' : 'No'}</div>
    </div>
  );
}
```

### Migration Phases

1. **Hybrid Phase** (default): Uses new system with legacy fallback
2. **New Phase**: Pure new system (automatically enabled after stable usage)
3. **Legacy Phase**: Pure legacy system (for rollback if needed)

## API Reference

### UnifiedAutoSaveProvider Props

```tsx
interface UnifiedAutoSaveProviderProps {
  rundownId: string;
  componentType: ComponentType;
  onDataUpdate?: (data: any) => void;
  onConflictDetected?: (conflict: any) => void;
  onSaveComplete?: (success: boolean) => void;
}
```

### useUnifiedAutoSave Hook

```tsx
interface AutoSaveHooks {
  // Field editing
  onFieldFocus: (itemId: string, fieldName: string, currentValue: any) => void;
  onFieldChange: (itemId: string, fieldName: string, newValue: any) => void;
  onFieldBlur: (itemId: string, fieldName: string, finalValue: any) => void;
  
  // Manual controls
  forceSave: () => void;
  forceSaveField: (itemId: string, fieldName: string, value: any) => void;
  
  // Status
  isSaving: boolean;
  hasPendingChanges: boolean;
  lastSaveTime: Date | null;
  hasConflicts: boolean;
  conflictCount: number;
  
  // Broadcasting
  broadcastUpdate: (data: any) => void;
}
```

## Advanced Features

### Conflict Resolution

The system automatically resolves conflicts using intelligent strategies:

1. **Recent Typing Wins** - If user typed within 5 seconds, local changes win
2. **Smart Text Merging** - Automatically merges compatible text changes
3. **Timestamp-Based** - Newer changes win when merge isn't possible

### Performance Monitoring

```tsx
const { stats } = useUnifiedRealtimeCoordinator(rundownId);

console.log('Performance stats:', {
  pendingChanges: stats.pendingChanges,
  activeSaves: stats.activeSaves,
  totalChangesSaved: stats.totalChangesSaved,
  totalBroadcastsSent: stats.totalBroadcastsSent,
  lastSaveTime: stats.lastSaveTime
});
```

### Memory Optimization

- Only changed fields are broadcast (not full items)
- Local shadows are automatically cleaned up
- Change queues are deduplicated by field
- Old conflict history is periodically purged

## Troubleshooting

### Common Issues

1. **Changes not saving**: Check console for coordination blocks
2. **Conflicts not resolving**: Verify LocalShadowStore is working
3. **Memory usage**: Enable periodic cleanup in your component
4. **Real-time not working**: Check Supabase channel connection status

### Debug Logging

Enable detailed logging:

```tsx
// Set in migration options
{
  logMigrationEvents: true
}

// Or check coordinator stats
const coordinator = useUnifiedRealtimeCoordinator(rundownId);
console.log('Coordinator stats:', coordinator.stats);
```

### Performance Monitoring

The system provides detailed performance metrics:

- Pending changes count
- Active saves count  
- Total changes saved
- Broadcast frequency
- Conflict resolution rate

## Architecture

```
┌─────────────────────┐
│ UnifiedAutoSave     │
│ Provider            │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│ BulletproofAutoSave │
│ Hook                │
└─────────┬───────────┘
          │
┌─────────▼───────────┐    ┌────────────────────┐    ┌──────────────────┐
│ UnifiedRealtime     │    │ GranularChange     │    │ ConflictResolution│
│ Coordinator         │◄───┤ Tracker            │◄───┤ System           │
└─────────┬───────────┘    └────────────────────┘    └──────────────────┘
          │
┌─────────▼───────────┐
│ ComponentSpecific   │
│ Sync                │
└─────────────────────┘
```

This system ensures reliable, efficient, and user-friendly auto-saving with perfect multi-user collaboration.