/**
 * Hybrid Save System: OT Operations + Direct Metadata Saves
 * 
 * This system eliminates doc_version conflicts and optimizes saves by operation type:
 * 
 * OT OPERATIONS (High Conflict Risk):
 * - All content edits (cell fields)
 * - All structural operations (row add/delete/move/copy/reorder/float/color)
 * - Uses Operational Transformation for robust conflict resolution
 * - Queued and processed through apply-operation edge function
 * 
 * DIRECT SAVES (Low Conflict Risk):
 * - Metadata (title, start time, date, timezone)
 * - Preferences (column layouts, saved layouts)
 * - Playback state (showcaller/teleprompter)
 * - Direct database updates via useSimpleAutoSave
 * 
 * Benefits:
 * - Zero data loss during concurrent editing (OT)
 * - Perfect real-time synchronization (OT)
 * - Fast metadata updates (Direct)
 * - Right tool for each job (Hybrid)
 * - Eliminates doc_version conflicts completely
 * - Scales efficiently for large teams
 */

export const HYBRID_SAVE_SYSTEM_DOCS = {
  overview: `
The hybrid save system uses different strategies optimized by conflict risk:
- OT Operations for high-conflict content and structural changes
- Direct Saves for low-conflict metadata and preferences

This eliminates doc_version conflicts while providing optimal performance.
`,

  otOperations: `
HANDLED BY OT SYSTEM (useOperationBasedRundown):
✓ Cell content edits (script, talent, duration, etc.)
✓ Row reordering (drag & drop)
✓ Row copy/paste operations
✓ Row deletion
✓ Adding rows/headers
✓ Row floating/unfloating
✓ Row coloring

Process: Operation Queue → apply-operation edge function → Real-time broadcast
Benefits: Robust conflict resolution, operation history, atomic updates
`,

  directSaves: `
HANDLED BY DIRECT SAVES (useSimpleAutoSave):
✓ Rundown metadata (title, start time, date, timezone)
✓ Column preferences and saved layouts
✓ Showcaller/teleprompter state
✓ UI preferences

Process: Direct database update → Broadcast change notification
Benefits: Fast saves, low latency, no OT overhead for simple fields
`,

  architecture: `
1. OT System (apply-operation edge function)
   - Receives queued operations
   - Applies with conflict resolution
   - Broadcasts to connected clients
   - Tracks operation sequence

2. Direct Save System (useSimpleAutoSave)
   - Debounced auto-save for metadata
   - Direct Supabase updates
   - Change detection via signatures
   - Broadcast notifications

3. Integration Layer (useCellEditIntegration)
   - Routes operations to correct system
   - Provides unified API to UI
   - Handles operation lifecycle
`,

  enablement: `
Per-cell architecture is enabled for all rundowns (per_cell_save_enabled: true).
All operations automatically route to the appropriate save system based on type.
`,

  benefits: `
- Eliminates doc_version conflicts completely
- Optimizes performance by operation type
- Perfect real-time synchronization for content
- Fast metadata updates without OT overhead
- Clear rules for when to use each system
- Scales to unlimited concurrent users
- Maintains simplicity where appropriate
`
};