import { useRef, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { localShadowStore } from '@/state/localShadows';
import { logger } from '@/utils/logger';

export interface FieldChange {
  itemId: string;
  fieldName: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
  userId: string;
  changeId: string;
}

export interface SaveOperation {
  id: string;
  type: 'field' | 'item' | 'structure' | 'blueprint' | 'camera_plot' | 'teleprompter';
  priority: number;
  changes: FieldChange[];
  retryCount: number;
  timestamp: number;
  userId: string;
}

interface RealtimeUpdate {
  type: 'field_change' | 'item_update' | 'structure_change';
  rundownId: string;
  userId: string;
  changes: FieldChange[];
  timestamp: number;
}

export const useUnifiedRealtimeCoordinator = (rundownId: string) => {
  const { user } = useAuth();
  const userId = user?.id || 'anonymous';
  
  // Core state management
  const changeQueueRef = useRef<Map<string, FieldChange>>(new Map());
  const saveQueueRef = useRef<SaveOperation[]>([]);
  const activeSavesRef = useRef<Set<string>>(new Set());
  const processingRef = useRef(false);
  const realtimeChannelRef = useRef<any>(null);
  const broadcastTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Performance tracking
  const [stats, setStats] = useState({
    pendingChanges: 0,
    activeSaves: 0,
    totalChangesSaved: 0,
    totalBroadcastsSent: 0,
    lastSaveTime: null as Date | null
  });

  // Generate unique IDs
  const generateId = useCallback(() => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, []);

  // Track field changes with deduplication
  const trackFieldChange = useCallback((
    itemId: string,
    fieldName: string,
    oldValue: any,
    newValue: any
  ) => {
    if (oldValue === newValue) return;

    const changeKey = `${itemId}:${fieldName}`;
    const changeId = generateId();
    
    const change: FieldChange = {
      itemId,
      fieldName,
      oldValue,
      newValue,
      timestamp: Date.now(),
      userId,
      changeId
    };

    // Update local shadow for conflict resolution
    localShadowStore.setShadow(itemId, fieldName, newValue, true);
    
    // Add to change queue (deduplicating by key)
    changeQueueRef.current.set(changeKey, change);
    
    console.log(`📝 Tracked field change: ${changeKey}`, { oldValue, newValue });
    
    // Schedule processing
    scheduleProcessing();
    
    updateStats();
  }, [userId, generateId]);

  // Schedule processing with debouncing
  const scheduleProcessing = useCallback(() => {
    if (processingRef.current) return;
    
    // Clear existing timeout
    if (broadcastTimeoutRef.current) {
      clearTimeout(broadcastTimeoutRef.current);
    }
    
    // Schedule with smart delay based on activity
    const delayMs = changeQueueRef.current.size > 5 ? 500 : 1500;
    
    broadcastTimeoutRef.current = setTimeout(() => {
      processChangeQueue();
    }, delayMs);
  }, []);

  // Process the change queue
  const processChangeQueue = useCallback(async () => {
    if (processingRef.current || changeQueueRef.current.size === 0) return;
    
    processingRef.current = true;
    
    try {
      // Extract all pending changes
      const changes = Array.from(changeQueueRef.current.values());
      changeQueueRef.current.clear();
      
      console.log(`🔄 Processing ${changes.length} field changes`);
      
      // Group changes by priority/type
      const fieldChanges = changes.filter(c => c.fieldName !== 'structure');
      const structureChanges = changes.filter(c => c.fieldName === 'structure');
      
      // Create save operations
      if (fieldChanges.length > 0) {
        const saveOp: SaveOperation = {
          id: generateId(),
          type: 'field',
          priority: 1,
          changes: fieldChanges,
          retryCount: 0,
          timestamp: Date.now(),
          userId
        };
        
        saveQueueRef.current.push(saveOp);
      }
      
      if (structureChanges.length > 0) {
        const saveOp: SaveOperation = {
          id: generateId(),
          type: 'structure',
          priority: 2,
          changes: structureChanges,
          retryCount: 0,
          timestamp: Date.now(),
          userId
        };
        
        saveQueueRef.current.push(saveOp);
      }
      
      // Broadcast changes immediately for realtime sync
      await broadcastChanges(changes);
      
      // Process save queue
      await processSaveQueue();
      
    } catch (error) {
      console.error('❌ Error processing change queue:', error);
      // Re-queue failed changes
      const failedChanges = Array.from(changeQueueRef.current.values());
      failedChanges.forEach(change => {
        const changeKey = `${change.itemId}:${change.fieldName}`;
        changeQueueRef.current.set(changeKey, change);
      });
    } finally {
      processingRef.current = false;
      updateStats();
    }
  }, [userId, generateId]);

  // Broadcast changes for realtime sync
  const broadcastChanges = useCallback(async (changes: FieldChange[]) => {
    if (!realtimeChannelRef.current || changes.length === 0) return;
    
    try {
      const payload: RealtimeUpdate = {
        type: 'field_change',
        rundownId,
        userId,
        changes,
        timestamp: Date.now()
      };
      
      await realtimeChannelRef.current.send({
        type: 'broadcast',
        event: 'field_changes',
        payload
      });
      
      console.log(`📡 Broadcasted ${changes.length} changes`);
      
      setStats(prev => ({
        ...prev,
        totalBroadcastsSent: prev.totalBroadcastsSent + 1
      }));
      
    } catch (error) {
      console.error('❌ Error broadcasting changes:', error);
    }
  }, [rundownId, userId]);

  // Process save queue with intelligent retry
  const processSaveQueue = useCallback(async () => {
    if (saveQueueRef.current.length === 0) return;
    
    // Sort by priority and timestamp
    saveQueueRef.current.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.timestamp - b.timestamp;
    });
    
    const operation = saveQueueRef.current.shift();
    if (!operation) return;
    
    activeSavesRef.current.add(operation.id);
    
    try {
      console.log(`💾 Executing save operation: ${operation.type} (${operation.changes.length} changes)`);
      
      await executeSaveOperation(operation);
      
      console.log(`✅ Save operation completed: ${operation.id}`);
      
      setStats(prev => ({
        ...prev,
        totalChangesSaved: prev.totalChangesSaved + operation.changes.length,
        lastSaveTime: new Date()
      }));
      
    } catch (error) {
      console.error(`❌ Save operation failed: ${operation.id}`, error);
      
      // Retry logic with exponential backoff
      if (operation.retryCount < 5) {
        operation.retryCount++;
        operation.timestamp = Date.now() + (Math.pow(2, operation.retryCount) * 1000);
        
        // Re-queue for retry
        saveQueueRef.current.push(operation);
        console.log(`🔄 Queued retry ${operation.retryCount} for operation: ${operation.id}`);
      } else {
        console.error(`💥 Save operation permanently failed: ${operation.id}`);
        // TODO: Add to failed operations log for recovery
      }
    } finally {
      activeSavesRef.current.delete(operation.id);
      updateStats();
    }
    
    // Continue processing queue if more operations exist
    if (saveQueueRef.current.length > 0) {
      setTimeout(() => processSaveQueue(), 100);
    }
  }, []);

  // Execute individual save operation
  const executeSaveOperation = useCallback(async (operation: SaveOperation) => {
    const { changes, type } = operation;
    
    switch (type) {
      case 'field':
        await executeFieldSave(changes);
        break;
      case 'structure':
        await executeStructureSave(changes);
        break;
      case 'blueprint':
        await executeBlueprintSave(changes);
        break;
      case 'camera_plot':
        await executeCameraPlotSave(changes);
        break;
      case 'teleprompter':
        await executeTeleprompterSave(changes);
        break;
      default:
        throw new Error(`Unknown save operation type: ${type}`);
    }
  }, []);

  // Execute field-level saves (most common)
  const executeFieldSave = useCallback(async (changes: FieldChange[]) => {
    // Group by item for batch updates
    const itemUpdates = new Map<string, Record<string, any>>();
    
    changes.forEach(change => {
      if (!itemUpdates.has(change.itemId)) {
        itemUpdates.set(change.itemId, {});
      }
      itemUpdates.get(change.itemId)![change.fieldName] = change.newValue;
    });
    
    // Execute batch updates
    for (const [itemId, updates] of itemUpdates) {
      try {
        const { error } = await supabase
          .from('rundown_items')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', itemId)
          .eq('rundown_id', rundownId);
          
        if (error) throw error;
        
        // Clear shadows after successful save
        Object.keys(updates).forEach(fieldName => {
          localShadowStore.markInactive(itemId, fieldName);
        });
        
      } catch (error) {
        console.error(`❌ Failed to save item ${itemId}:`, error);
        throw error;
      }
    }
  }, [rundownId]);

  // Execute structure saves (adding/removing items)
  const executeStructureSave = useCallback(async (changes: FieldChange[]) => {
    // Implementation for structural changes
    console.log('🏗️ Executing structure save:', changes);
    // TODO: Implement based on specific structure change types
  }, []);

  // Execute blueprint saves
  const executeBlueprintSave = useCallback(async (changes: FieldChange[]) => {
    console.log('📋 Executing blueprint save:', changes);
    // TODO: Implement blueprint-specific save logic
  }, []);

  // Execute camera plot saves
  const executeCameraPlotSave = useCallback(async (changes: FieldChange[]) => {
    console.log('📹 Executing camera plot save:', changes);
    // TODO: Implement camera plot-specific save logic
  }, []);

  // Execute teleprompter saves
  const executeTeleprompterSave = useCallback(async (changes: FieldChange[]) => {
    console.log('📺 Executing teleprompter save:', changes);
    // TODO: Implement teleprompter-specific save logic
  }, []);

  // Setup realtime channel for receiving updates
  const setupRealtimeChannel = useCallback(() => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }
    
    const channel = supabase.channel(`rundown-realtime-${rundownId}`)
      .on('broadcast', { event: 'field_changes' }, (payload) => {
        const update = payload.payload as RealtimeUpdate;
        
        // Skip our own updates
        if (update.userId === userId) return;
        
        console.log(`📨 Received ${update.changes.length} field changes from user: ${update.userId}`);
        
        // Apply changes to local shadows and trigger UI updates
        update.changes.forEach(change => {
          localShadowStore.setShadow(change.itemId, change.fieldName, change.newValue, false);
        });
        
        // Trigger re-render by updating stats
        updateStats();
      })
      .subscribe((status) => {
        console.log(`📡 Realtime channel status: ${status}`);
      });
    
    realtimeChannelRef.current = channel;
  }, [rundownId, userId]);

  // Update performance stats
  const updateStats = useCallback(() => {
    setStats(prev => ({
      ...prev,
      pendingChanges: changeQueueRef.current.size,
      activeSaves: activeSavesRef.current.size
    }));
  }, []);

  // Initialize realtime channel
  useEffect(() => {
    if (!rundownId || !user) return;
    
    setupRealtimeChannel();
    
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
      if (broadcastTimeoutRef.current) {
        clearTimeout(broadcastTimeoutRef.current);
      }
    };
  }, [rundownId, user, setupRealtimeChannel]);

  // Periodic stats update
  useEffect(() => {
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, [updateStats]);

  // Public API
  return {
    // Core functionality
    trackFieldChange,
    
    // Status information
    stats,
    isProcessing: processingRef.current,
    hasPendingChanges: changeQueueRef.current.size > 0,
    
    // Manual control
    forceProcess: processChangeQueue,
    
    // Queue management
    clearQueue: () => {
      changeQueueRef.current.clear();
      saveQueueRef.current.length = 0;
      updateStats();
    }
  };
};