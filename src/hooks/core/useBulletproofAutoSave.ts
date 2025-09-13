import { useCallback, useEffect, useRef } from 'react';
import { useUnifiedRealtimeCoordinator } from './useUnifiedRealtimeCoordinator';
import { useGranularChangeTracker } from './useGranularChangeTracker';
import { useMultiUserConflictResolution } from './useMultiUserConflictResolution';
import { useComponentSpecificSync, ComponentType } from './useComponentSpecificSync';
import { localShadowStore } from '@/state/localShadows';

export interface AutoSaveHooks {
  // Field editing hooks
  onFieldFocus: (itemId: string, fieldName: string, currentValue: any) => void;
  onFieldChange: (itemId: string, fieldName: string, newValue: any) => void;
  onFieldBlur: (itemId: string, fieldName: string, finalValue: any) => void;
  
  // Manual save controls
  forceSave: () => void;
  forceSaveField: (itemId: string, fieldName: string, value: any) => void;
  
  // Status information
  isSaving: boolean;
  hasPendingChanges: boolean;
  lastSaveTime: Date | null;
  
  // Conflict resolution
  hasConflicts: boolean;
  conflictCount: number;
  
  // Component-specific broadcasting
  broadcastUpdate: (data: any) => void;
}

export const useBulletproofAutoSave = (
  rundownId: string,
  componentType: ComponentType = 'main_rundown',
  options?: {
    onDataUpdate?: (data: any) => void;
    onConflictDetected?: (conflict: any) => void;
    onSaveComplete?: (success: boolean) => void;
  }
): AutoSaveHooks => {
  
  // Initialize all the coordination systems
  const coordinator = useUnifiedRealtimeCoordinator(rundownId);
  const changeTracker = useGranularChangeTracker(rundownId);
  const conflictResolver = useMultiUserConflictResolution();
  const componentSync = useComponentSpecificSync(rundownId, componentType, options?.onDataUpdate);
  
  // Track component-specific state
  const conflictCountRef = useRef(0);
  const lastConflictCheckRef = useRef(0);

  // Enhanced field focus handler
  const onFieldFocus = useCallback((itemId: string, fieldName: string, currentValue: any) => {
    console.log(`🎯 Field focus: ${itemId}:${fieldName}`);
    
    // Start tracking this field
    changeTracker.startFieldEdit(itemId, fieldName, currentValue);
    
    // Set local shadow to prevent conflicts during editing
    localShadowStore.setShadow(itemId, fieldName, currentValue, true);
    
    // Mark as recently typed for conflict resolution (using proper ShadowEntry)
    const fieldKey = `${itemId}:${fieldName}`;
    const typingEntry = {
      value: currentValue,
      timestamp: Date.now(),
      isActive: true,
      lastTyped: Date.now()
    };
    (localShadowStore as any)['typingBuffer'].set(fieldKey, typingEntry);
  }, [changeTracker]);

  // Enhanced field change handler (for keystroke tracking)
  const onFieldChange = useCallback((itemId: string, fieldName: string, newValue: any) => {
    // Track individual keystrokes for conflict resolution
    changeTracker.trackKeystroke(itemId, fieldName, newValue);
    
    // Update local shadow
    localShadowStore.setShadow(itemId, fieldName, newValue, true);
    
    // Mark as recently typed for conflict resolution (using proper ShadowEntry)
    const fieldKey = `${itemId}:${fieldName}`;
    const typingEntry = {
      value: newValue,
      timestamp: Date.now(),
      isActive: true,
      lastTyped: Date.now()
    };
    (localShadowStore as any)['typingBuffer'].set(fieldKey, typingEntry);
    
    // Component-specific change tracking
    const oldValue = changeTracker.getFieldValue(itemId, fieldName);
    componentSync.trackChange(itemId, fieldName, oldValue, newValue);
  }, [changeTracker, componentSync]);

  // Enhanced field blur handler (triggers save)
  const onFieldBlur = useCallback((itemId: string, fieldName: string, finalValue: any) => {
    console.log(`✅ Field blur: ${itemId}:${fieldName}`);
    
    // End field editing and trigger save if changed
    changeTracker.endFieldEdit(itemId, fieldName, finalValue);
    
    // Check for conflicts before saving
    const conflict = conflictResolver.detectConflict(itemId, fieldName, finalValue, Date.now());
    
    if (conflict) {
      console.warn('⚠️ Conflict detected during save:', conflict);
      
      const resolution = conflictResolver.resolveConflict(conflict);
      const resolvedValue = conflictResolver.applyResolution(conflict, resolution);
      
      // Use resolved value for final save
      if (resolvedValue !== finalValue) {
        changeTracker.forceSaveField(itemId, fieldName, resolvedValue);
      }
      
      conflictCountRef.current++;
      options?.onConflictDetected?.(conflict);
    }
    
    // Broadcast to component-specific channels
    componentSync.broadcastUpdate({
      type: 'field_update',
      itemId,
      fieldName,
      value: finalValue,
      timestamp: Date.now()
    });
  }, [changeTracker, conflictResolver, componentSync, options]);

  // Force save all pending changes
  const forceSave = useCallback(() => {
    console.log('💾 Force saving all pending changes...');
    coordinator.forceProcess();
  }, [coordinator]);

  // Force save a specific field
  const forceSaveField = useCallback((itemId: string, fieldName: string, value: any) => {
    console.log(`💾 Force saving field: ${itemId}:${fieldName}`);
    changeTracker.forceSaveField(itemId, fieldName, value);
  }, [changeTracker]);

  // Broadcast component updates
  const broadcastUpdate = useCallback((data: any) => {
    componentSync.broadcastUpdate(data);
  }, [componentSync]);

  // Periodic conflict resolution cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      conflictResolver.cleanupConflictHistory();
      
      // Update conflict stats
      const stats = conflictResolver.getConflictStats();
      conflictCountRef.current = stats.totalConflicts;
      lastConflictCheckRef.current = Date.now();
      
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [conflictResolver]);

  // Handle incoming realtime updates with conflict resolution
  useEffect(() => {
    if (!options?.onDataUpdate) return;
    
    // Create enhanced data update handler that includes conflict resolution
    const enhancedOnDataUpdate = (data: any) => {
      console.log('📨 Processing incoming realtime update:', data);
      
      // Check for conflicts with local shadows
      if (Array.isArray(data)) {
        data.forEach(item => {
          Object.keys(item).forEach(fieldName => {
            if (fieldName === 'id' || fieldName === 'updated_at') return;
            
            const conflict = conflictResolver.detectConflict(
              item.id,
              fieldName,
              item[fieldName],
              new Date(item.updated_at).getTime()
            );
            
            if (conflict) {
              const resolution = conflictResolver.resolveConflict(conflict);
              const resolvedValue = conflictResolver.applyResolution(conflict, resolution);
              
              // Update the incoming data with resolved value
              item[fieldName] = resolvedValue;
              
              options?.onConflictDetected?.(conflict);
            }
          });
        });
      }
      
      // Pass the (potentially conflict-resolved) data to the original handler
      options.onDataUpdate?.(data);
    };
    
    // Note: This enhanced handler would need to be integrated more deeply
    // into the component sync system for full effectiveness
    
  }, [options?.onDataUpdate, conflictResolver, options]);

  // Save completion callback
  useEffect(() => {
    if (!options?.onSaveComplete) return;
    
    // This would need to be integrated with the coordinator's save completion events
    // For now, we'll use the stats to infer completion
    const lastSaveTime = coordinator.stats.lastSaveTime;
    if (lastSaveTime) {
      options.onSaveComplete(true);
    }
  }, [coordinator.stats.lastSaveTime, options]);

  return {
    // Field editing hooks
    onFieldFocus,
    onFieldChange,
    onFieldBlur,
    
    // Manual save controls
    forceSave,
    forceSaveField,
    
    // Status information  
    isSaving: coordinator.stats.activeSaves > 0,
    hasPendingChanges: coordinator.hasPendingChanges,
    lastSaveTime: coordinator.stats.lastSaveTime,
    
    // Conflict resolution
    hasConflicts: conflictCountRef.current > 0,
    conflictCount: conflictCountRef.current,
    
    // Component-specific broadcasting
    broadcastUpdate
  };
};