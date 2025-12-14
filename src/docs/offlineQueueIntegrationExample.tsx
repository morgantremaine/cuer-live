/**
 * Example: Integrating Offline Conflict Resolution with Rundown Editor
 * 
 * This example shows how to integrate the conflict-aware offline queue
 * with a typical rundown editor component.
 */

import { useState, useCallback } from 'react';
import { useOfflineQueueWithConflicts } from '@/hooks/useOfflineQueueWithConflicts';
import { useCellLevelSave } from '@/hooks/useCellLevelSave';
import { createContentSignature } from '@/utils/contentSignature';
import { toast } from 'sonner';

interface RundownItem {
  id: string;
  name: string;
  script: string;
  talent: string;
  duration: string;
}

interface RundownState {
  items: RundownItem[];
  title: string;
  showDate: string | null;
  timezone: string;
  startTime: string;
  docVersion: number;
}

export function RundownEditorWithOfflineSupport({ rundownId }: { rundownId: string }) {
  const [rundownState, setRundownState] = useState<RundownState>({
    items: [],
    title: '',
    showDate: null,
    timezone: 'America/New_York',
    startTime: '09:00',
    docVersion: 0
  });

  // Offline queue with conflict resolution
  const offlineQueue = useOfflineQueueWithConflicts(rundownId);

  // Cell-level save for online mode
  const cellLevelSave = useCellLevelSave(
    rundownId,
    (savedUpdates, completionCount) => {
      console.log('✅ Cell save completed:', completionCount);
      // Update local doc version after successful save
      setRundownState(prev => ({
        ...prev,
        docVersion: prev.docVersion + 1
      }));
    },
    () => console.log('💾 Cell save started'),
    () => console.log('📝 Unsaved changes'),
    () => console.log('✅ Changes saved')
  );

  /**
   * Handle field changes - routes to offline queue or cell-level save
   * depending on connection status
   */
  const handleFieldChange = useCallback((
    itemId: string | undefined,
    field: string,
    value: any
  ) => {
    // Update local state immediately (optimistic update)
    setRundownState(prev => {
      if (itemId) {
        // Item-level field
        const newItems = prev.items.map(item =>
          item.id === itemId ? { ...item, [field]: value } : item
        );
        return { ...prev, items: newItems };
      } else {
        // Rundown-level field
        return { ...prev, [field]: value };
      }
    });

    // Route to appropriate save mechanism
    if (!offlineQueue.isConnected) {
      // OFFLINE MODE: Queue the change with baseline state
      console.log('📵 Offline - queuing change:', field);
      
      offlineQueue.queueOperation(
        'cell-updates',
        {
          fieldUpdates: [{
            itemId,
            field,
            value,
            timestamp: Date.now()
          }],
          contentSignature: 'signature-placeholder' // Use your actual signature function
        },
        rundownId,
        { ...rundownState }, // Capture current state as baseline
        rundownState.docVersion // Capture current doc version
      );

      toast.info('Change saved offline - will sync when online');
    } else {
      // ONLINE MODE: Use cell-level save
      cellLevelSave.trackCellChange(itemId, field, value);
    }
  }, [
    rundownState,
    rundownId,
    offlineQueue,
    cellLevelSave
  ]);

  /**
   * Handle connection restoration
   */
  useCallback(() => {
    if (offlineQueue.isConnected && offlineQueue.queueLength > 0) {
      toast.success(`🔌 Connection restored - syncing ${offlineQueue.queueLength} changes`);
      offlineQueue.processQueue();
    }
  }, [offlineQueue.isConnected, offlineQueue.queueLength, offlineQueue.processQueue])();

  return (
    <div className="rundown-editor">
      {/* Connection Status Indicator */}
      <div className="status-bar">
        {!offlineQueue.isConnected && (
          <div className="offline-indicator">
            📵 Offline - {offlineQueue.queueLength} changes queued
          </div>
        )}
        {offlineQueue.hasPendingConflicts && (
          <div className="conflict-indicator">
            ⚠️ Conflicts detected - review needed
          </div>
        )}
      </div>

      {/* Rundown Title */}
      <input
        type="text"
        value={rundownState.title}
        onChange={(e) => handleFieldChange(undefined, 'title', e.target.value)}
        placeholder="Rundown Title"
        className="title-input"
      />

      {/* Rundown Items */}
      <div className="rundown-items">
        {rundownState.items.map(item => (
          <div key={item.id} className="rundown-item">
            <input
              type="text"
              value={item.name}
              onChange={(e) => handleFieldChange(item.id, 'name', e.target.value)}
              placeholder="Item Name"
            />
            <textarea
              value={item.script}
              onChange={(e) => handleFieldChange(item.id, 'script', e.target.value)}
              placeholder="Script"
            />
            <input
              type="text"
              value={item.talent}
              onChange={(e) => handleFieldChange(item.id, 'talent', e.target.value)}
              placeholder="Talent"
            />
          </div>
        ))}
      </div>

      {/* Conflict Resolution Modal - automatically shown when needed */}
      <offlineQueue.ConflictModal />
    </div>
  );
}

/**
 * Alternative: Integration with existing save system
 * 
 * If you already have a save system and just want to add offline support,
 * you can selectively use the offline queue only when needed.
 */
export function RundownEditorWithSelectiveOffline({ rundownId }: { rundownId: string }) {
  const offlineQueue = useOfflineQueueWithConflicts(rundownId);
  const [pendingChanges, setPendingChanges] = useState<any[]>([]);

  const handleFieldChange = useCallback((itemId: string | undefined, field: string, value: any) => {
    // Add to pending changes
    setPendingChanges(prev => [...prev, { itemId, field, value, timestamp: Date.now() }]);

    // Debounce and save
    setTimeout(() => {
      if (offlineQueue.isConnected) {
        // Normal save via your existing system
        saveToDatabaseViaYourExistingSystem();
      } else {
        // Offline - use queue
        offlineQueue.queueOperation(
          'cell-updates',
          { fieldUpdates: pendingChanges },
          rundownId,
          captureCurrentState(),
          getCurrentDocVersion()
        );
        setPendingChanges([]);
      }
    }, 1000);
  }, [offlineQueue, pendingChanges]);

  return (
    <div>
      {/* Your existing editor UI */}
      <offlineQueue.ConflictModal />
    </div>
  );
}

// Helper functions (implement based on your needs)
function saveToDatabaseViaYourExistingSystem() {
  // Your existing save logic
}

function captureCurrentState() {
  // Return current rundown state
  return {};
}

function getCurrentDocVersion() {
  // Return current doc version
  return 0;
}
