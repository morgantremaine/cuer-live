# `save-system/offline-save-persistence-catch-block-fix`

The catch block in `useCellLevelSave.ts` (savePendingUpdates function) must persist failed saves to localStorage instead of re-throwing exceptions. When offline, token refresh failures and network errors would throw exceptions that bypassed the failedSavesRef persistence logic, causing data loss on page refresh.

**Critical pattern**: All catch blocks in save paths must:
1. Push updates to `failedSavesRef`
2. Call `persistFailedSaves()` to write to localStorage
3. Call `onUnsavedChanges()` and `onSaveError()` callbacks
4. Call `scheduleRetry()` for automatic retry
5. Clear `saveInProgressRef` flag

This ensures offline edits survive page refresh and are automatically retried when network is restored. The "Network restored - retrying failed saves" → "Retry successful" flow confirms proper recovery.
