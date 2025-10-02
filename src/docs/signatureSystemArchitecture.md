# Signature System Architecture

## Purpose & Design Philosophy

The signature system provides content change detection for collaborative editing, autosave functionality, and conflict resolution. Multiple signature approaches exist intentionally to optimize for different performance and accuracy requirements.

## Signature Types & Use Cases

### Content Signatures
**Purpose**: Detect actual content changes while ignoring UI state
**Implementation**: `createContentSignature(items, title, columns, { excludeUIFields: true })`

**Use Cases**:
- Autosave trigger detection
- Change broadcasting to other users
- Conflict resolution
- Undo/redo system

**Why Separate**: UI state changes (selection, scroll position, etc.) shouldn't trigger saves or broadcasts

### Lightweight Signatures
**Purpose**: Fast computation for performance-critical operations
**Implementation**: `createLightweightSignature(items, title)`

**Use Cases**:
- Real-time collaboration heartbeat
- Frequent change detection
- Performance-critical paths
- Quick dirty checks

**Why Separate**: Some operations happen frequently and need minimal computation overhead

### Unified Signatures
**Purpose**: Comprehensive state validation and debugging
**Implementation**: `createUnifiedSignature(state, { comprehensive: true })`

**Use Cases**:
- Manual save operations
- System debugging
- Complete state validation
- Backup operations

**Why Separate**: Complete validation is expensive and not needed for all operations

### ~~Shadow Signatures~~ (REMOVED - Phase 5 Simplification)
**Status**: Removed in Phase 5 simplification (2025)
**Reason**: System now uses "last write wins" + state refresh instead of complex shadow tracking
**Replaced By**: Simple conflict detection via timestamp comparison and database state refresh

## Performance Optimization Patterns

### Signature Caching
```typescript
// Signatures are cached to avoid recomputation
const cachedSignature = useMemo(() => 
  createContentSignature(items, title, columns), 
  [items, title, columns]
)
```

### Selective Field Inclusion
```typescript
// Only include relevant fields for specific operations
createContentSignature(items, title, columns, {
  excludeFields: ['lastModified', 'uiState'],
  includeStructural: true
})
```

### Hierarchical Validation
```typescript
// Quick check first, comprehensive check only if needed
const quickCheck = createLightweightSignature(items, title)
if (quickCheck !== lastQuickSignature) {
  const fullCheck = createContentSignature(items, title, columns)
  // Proceed with full validation
}
```

## Content vs UI Field Classification

### Content Fields (Included in Content Signatures)
- `items`: Rundown items data
- `title`: Rundown title
- `columns`: Column definitions
- `startTime`: Show start time
- `timezone`: Timezone setting
- `showDate`: Show date

### UI Fields (Excluded from Content Signatures)
- `selectedRow`: Currently selected row
- `scrollPosition`: Viewport scroll position
- `expandedSections`: UI expansion state
- `editMode`: Current edit mode
- `focusedCell`: Currently focused cell

### Why This Separation Matters
1. **Performance**: UI changes don't trigger expensive save operations
2. **Collaboration**: UI state isn't shared between users
3. **Conflict Resolution**: Only content conflicts need resolution
4. **Bandwidth**: Reduced network traffic for UI-only changes

## Signature Coordination Patterns

### Multi-Layer Validation
```typescript
// Layer 1: Quick validation
const lightweightValid = validateLightweightSignature(currentState)

// Layer 2: Content validation (if needed)
if (!lightweightValid) {
  const contentValid = validateContentSignature(currentState)
}

// Layer 3: Comprehensive validation (for critical operations)
if (isCriticalOperation) {
  const comprehensiveValid = validateUnifiedSignature(currentState)
}
```

### Race Condition Prevention
```typescript
// Use signatures to detect concurrent modifications
const beforeSignature = createContentSignature(state)
await performOperation()
const afterSignature = createContentSignature(state)

if (beforeSignature !== afterSignature) {
  // State changed during operation - handle conflict
  await resolveConflict()
}
```

### Cross-Tab Coordination
```typescript
// Detect changes made in other tabs
const currentSignature = createContentSignature(state)
const broadcastSignature = getBroadcastSignature()

if (currentSignature !== broadcastSignature) {
  // Another tab made changes - sync state
  await syncWithRemoteState()
}
```

## Integration with Save Systems

### Autosave Integration
```typescript
// Content signature determines if autosave is needed
const currentSignature = createContentSignature(items, title, columns)
const lastSavedSignature = getLastSavedSignature()

if (currentSignature !== lastSavedSignature) {
  triggerAutosave()
}
```

### Per-Cell Save Integration
```typescript
// Field-level signatures for granular saves
const fieldSignature = createFieldSignature(itemId, fieldName, value)
trackFieldChange(itemId, fieldName, fieldSignature)
```

### Conflict Resolution Integration
```typescript
// Simple "last write wins" with state refresh approach
const localSignature = createContentSignature(localState)
const remoteSignature = createContentSignature(remoteState)

// If signatures differ, remote state wins and local refreshes
if (localSignature !== remoteSignature) {
  await refreshFromDatabase()
}
```

## Common Patterns & Best Practices

### ✅ Use Appropriate Signature Type
```typescript
// For frequent operations
const signature = createLightweightSignature(items, title)

// For save operations
const signature = createContentSignature(items, title, columns)

// For debugging
const signature = createUnifiedSignature(completeState)
```

### ✅ Cache Expensive Signatures
```typescript
const signature = useMemo(() => 
  createUnifiedSignature(state), 
  [state]
)
```

### ✅ Validate Before Operations
```typescript
const isValid = validateSignature(currentState, expectedSignature)
if (!isValid) {
  handleInvalidState()
  return
}
await performOperation()
```

### ❌ Don't Mix Signature Types
```typescript
// DON'T: Compare different signature types
if (lightweightSignature === contentSignature) { /* ... */ }

// DO: Use consistent signature types
if (contentSignature1 === contentSignature2) { /* ... */ }
```

### ❌ Don't Skip Validation
```typescript
// DON'T: Assume signatures are valid
await saveWithoutValidation(data)

// DO: Always validate signatures
if (validateSignature(data)) {
  await saveWithValidation(data)
}
```

## Future Considerations

### Signature Evolution
- New field types may require signature updates
- Performance requirements may change signature strategies
- Collaboration features may need additional signature types

### Backward Compatibility
- Signature format changes must be backward compatible
- Migration strategies for signature format updates
- Graceful handling of unknown signature formats

### Performance Monitoring
- Track signature generation performance
- Monitor signature validation accuracy
- Optimize signature caching strategies

## Conclusion

The multi-signature approach enables the system to optimize for different performance and accuracy requirements while maintaining robust change detection and conflict resolution capabilities. Each signature type serves specific use cases and should not be consolidated without careful consideration of the performance and functionality trade-offs.