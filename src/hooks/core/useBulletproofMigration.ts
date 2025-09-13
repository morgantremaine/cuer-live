import { useCallback, useEffect, useRef } from 'react';
import { useBulletproofAutoSave } from './useBulletproofAutoSave';
import { ComponentType } from './useComponentSpecificSync';

// Legacy hook signatures for gradual migration
interface LegacyAutoSaveHooks {
  onItemUpdate?: (itemId: string, updates: Record<string, any>) => void;
  onFieldUpdate?: (itemId: string, fieldName: string, value: any) => void;
  updateRundownItem?: (itemId: string, updates: Record<string, any>) => void;
  saveRundown?: () => void;
  isSaving?: boolean;
}

interface MigrationOptions {
  componentType: ComponentType;
  enableGradualMigration: boolean;
  logMigrationEvents: boolean;
  onMigrationComplete?: () => void;
}

/**
 * Migration hook that provides backward compatibility while transitioning
 * to the new bulletproof auto-save system
 */
export const useBulletproofMigration = (
  rundownId: string,
  legacyHooks: LegacyAutoSaveHooks,
  options: MigrationOptions
) => {
  const migrationPhaseRef = useRef<'legacy' | 'hybrid' | 'new'>('hybrid');
  const migrationStatsRef = useRef({
    legacyCalls: 0,
    newCalls: 0,
    conflicts: 0,
    startTime: Date.now()
  });

  // Initialize the new bulletproof system
  const bulletproofHooks = useBulletproofAutoSave(rundownId, options.componentType, {
    onDataUpdate: (data) => {
      if (options.logMigrationEvents) {
        console.log('🔄 Migration: New system data update', data);
      }
    },
    onConflictDetected: (conflict) => {
      migrationStatsRef.current.conflicts++;
      if (options.logMigrationEvents) {
        console.warn('⚠️ Migration: Conflict detected', conflict);
      }
    },
    onSaveComplete: (success) => {
      migrationStatsRef.current.newCalls++;
      if (options.logMigrationEvents) {
        console.log('✅ Migration: New system save complete', { success });
      }
    }
  });

  // Wrapped legacy handlers that route to new system
  const wrappedOnItemUpdate = useCallback((itemId: string, updates: Record<string, any>) => {
    migrationStatsRef.current.legacyCalls++;
    
    if (options.logMigrationEvents) {
      console.log('🔄 Migration: Legacy item update intercepted', { itemId, updates });
    }

    if (migrationPhaseRef.current === 'legacy') {
      // Pure legacy mode
      legacyHooks.onItemUpdate?.(itemId, updates);
    } else if (migrationPhaseRef.current === 'hybrid') {
      // Hybrid mode - use new system but maintain legacy compatibility
      Object.entries(updates).forEach(([fieldName, value]) => {
        // Get current value (this would need to be passed in or retrieved)
        const currentValue = null; // TODO: Get from state
        bulletproofHooks.onFieldFocus(itemId, fieldName, currentValue);
        bulletproofHooks.onFieldChange(itemId, fieldName, value);
        bulletproofHooks.onFieldBlur(itemId, fieldName, value);
      });
      
      // Also call legacy for safety during migration
      if (options.enableGradualMigration) {
        legacyHooks.onItemUpdate?.(itemId, updates);
      }
    } else {
      // Pure new system mode
      Object.entries(updates).forEach(([fieldName, value]) => {
        const currentValue = null; // TODO: Get from state
        bulletproofHooks.onFieldFocus(itemId, fieldName, currentValue);
        bulletproofHooks.onFieldChange(itemId, fieldName, value);
        bulletproofHooks.onFieldBlur(itemId, fieldName, value);
      });
    }
  }, [legacyHooks, bulletproofHooks, options]);

  const wrappedOnFieldUpdate = useCallback((itemId: string, fieldName: string, value: any) => {
    migrationStatsRef.current.legacyCalls++;
    
    if (options.logMigrationEvents) {
      console.log('🔄 Migration: Legacy field update intercepted', { itemId, fieldName, value });
    }

    if (migrationPhaseRef.current === 'legacy') {
      legacyHooks.onFieldUpdate?.(itemId, fieldName, value);
    } else {
      // Route to new system
      const currentValue = null; // TODO: Get from state
      bulletproofHooks.onFieldFocus(itemId, fieldName, currentValue);
      bulletproofHooks.onFieldChange(itemId, fieldName, value);
      bulletproofHooks.onFieldBlur(itemId, fieldName, value);
      
      if (options.enableGradualMigration) {
        legacyHooks.onFieldUpdate?.(itemId, fieldName, value);
      }
    }
  }, [legacyHooks, bulletproofHooks, options]);

  const wrappedSaveRundown = useCallback(() => {
    migrationStatsRef.current.legacyCalls++;
    
    if (options.logMigrationEvents) {
      console.log('🔄 Migration: Legacy save intercepted');
    }

    if (migrationPhaseRef.current === 'legacy') {
      legacyHooks.saveRundown?.();
    } else {
      bulletproofHooks.forceSave();
      
      if (options.enableGradualMigration) {
        legacyHooks.saveRundown?.();
      }
    }
  }, [legacyHooks, bulletproofHooks, options]);

  // Migration phase control
  const setMigrationPhase = useCallback((phase: 'legacy' | 'hybrid' | 'new') => {
    const oldPhase = migrationPhaseRef.current;
    migrationPhaseRef.current = phase;
    
    if (options.logMigrationEvents) {
      console.log(`🔄 Migration: Phase changed from ${oldPhase} to ${phase}`);
    }

    if (phase === 'new' && oldPhase !== 'new') {
      options.onMigrationComplete?.();
    }
  }, [options]);

  // Migration statistics
  const getMigrationStats = useCallback(() => {
    const stats = migrationStatsRef.current;
    const runtime = Date.now() - stats.startTime;
    
    return {
      ...stats,
      runtime,
      migrationPhase: migrationPhaseRef.current,
      migrationRatio: stats.newCalls / (stats.legacyCalls + stats.newCalls) || 0
    };
  }, []);

  // Auto-migration based on usage patterns
  useEffect(() => {
    if (!options.enableGradualMigration) return;

    const checkMigrationReadiness = () => {
      const stats = getMigrationStats();
      
      // Auto-migrate to full new system after stable usage
      if (
        stats.runtime > 60000 && // 1 minute of runtime
        stats.conflicts < 5 && // Low conflict rate
        stats.migrationRatio > 0.8 // Mostly using new system
      ) {
        setMigrationPhase('new');
      }
    };

    const interval = setInterval(checkMigrationReadiness, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [options.enableGradualMigration, getMigrationStats, setMigrationPhase]);

  // Return both new and legacy interfaces for gradual migration
  return {
    // New bulletproof system (recommended)
    bulletproof: bulletproofHooks,
    
    // Legacy-compatible interface (for gradual migration)
    legacy: {
      onItemUpdate: wrappedOnItemUpdate,
      onFieldUpdate: wrappedOnFieldUpdate,
      updateRundownItem: wrappedOnItemUpdate, // Alias
      saveRundown: wrappedSaveRundown,
      isSaving: bulletproofHooks.isSaving || legacyHooks.isSaving || false
    },
    
    // Migration control
    migration: {
      setPhase: setMigrationPhase,
      getStats: getMigrationStats,
      currentPhase: migrationPhaseRef.current
    }
  };
};