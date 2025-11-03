# MOS Send Message Edge Function

This edge function handles sending MOS Protocol 4 messages to Ross XPression graphics systems.

## Features

- Builds MOS XML messages based on field mappings
- Supports multiple message types:
  - `roCreate` - Initial rundown sync
  - `roElementAction` - Structural changes (INSERT, DELETE, MOVE, SWAP)
  - `roStorySend` - Content updates
  - `roReadyToAir` - Prepare graphic
  - `roStoryTake` - Take graphic live

## Usage

```typescript
const { data, error } = await supabase.functions.invoke('mos-send-message', {
  body: {
    messageType: 'roStorySend',
    teamId: 'team-uuid',
    rundownId: 'rundown-uuid',
    payload: {
      item: { id: 'item-123', name: 'Lower Third', talent: 'Sarah Jones', ... }
    }
  }
});
```

## TODO

- Implement actual TCP connection to XPression (Phase 2)
- Add connection pooling and retry logic
- Implement acknowledgment handling
