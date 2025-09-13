import { useCallback, useRef, useEffect } from 'react';
import { useUnifiedRealtimeCoordinator } from './useUnifiedRealtimeCoordinator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ComponentType = 'main_rundown' | 'shared_rundown' | 'showcaller' | 'teleprompter' | 'blueprint' | 'camera_plot';

export interface ComponentSyncConfig {
  updateFrequency: 'realtime' | 'fast' | 'medium' | 'slow';
  conflictResolution: 'merge' | 'overwrite' | 'queue';
  broadcastChanges: boolean;
  receiveUpdates: boolean;
}

const COMPONENT_CONFIGS: Record<ComponentType, ComponentSyncConfig> = {
  main_rundown: {
    updateFrequency: 'realtime',
    conflictResolution: 'merge',
    broadcastChanges: true,
    receiveUpdates: true
  },
  shared_rundown: {
    updateFrequency: 'medium', // Polled updates as requested
    conflictResolution: 'overwrite',
    broadcastChanges: false,
    receiveUpdates: true
  },
  showcaller: {
    updateFrequency: 'realtime', // Completely realtime as requested
    conflictResolution: 'overwrite',
    broadcastChanges: true,
    receiveUpdates: true
  },
  teleprompter: {
    updateFrequency: 'realtime', // Realtime editing as requested
    conflictResolution: 'merge',
    broadcastChanges: true,
    receiveUpdates: true
  },
  blueprint: {
    updateFrequency: 'fast',
    conflictResolution: 'merge',
    broadcastChanges: true,
    receiveUpdates: true
  },
  camera_plot: {
    updateFrequency: 'fast',
    conflictResolution: 'overwrite',
    broadcastChanges: true,
    receiveUpdates: true
  }
};

export const useComponentSpecificSync = (
  rundownId: string,
  componentType: ComponentType,
  onDataUpdate?: (data: any) => void
) => {
  const { user } = useAuth();
  const coordinator = useUnifiedRealtimeCoordinator(rundownId);
  const config = COMPONENT_CONFIGS[componentType];
  
  const channelRef = useRef<any>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<number>(0);

  // Component-specific change tracking
  const trackComponentChange = useCallback((
    itemId: string,
    fieldName: string,
    oldValue: any,
    newValue: any,
    metadata?: Record<string, any>
  ) => {
    // Add component-specific metadata
    const enhancedChange = {
      itemId,
      fieldName,
      oldValue,
      newValue,
      component: componentType,
      metadata: {
        ...metadata,
        timestamp: Date.now(),
        userId: user?.id
      }
    };

    console.log(`🎯 ${componentType} change:`, enhancedChange);
    
    // Use the unified coordinator
    coordinator.trackFieldChange(itemId, fieldName, oldValue, newValue);
  }, [componentType, coordinator, user?.id]);

  // Setup component-specific realtime channel
  const setupRealtimeSync = useCallback(() => {
    if (!config.receiveUpdates || config.updateFrequency === 'slow') return;

    const channelName = `${componentType}-${rundownId}`;
    
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(channelName)
      .on('broadcast', { event: `${componentType}_update` }, (payload) => {
        // Skip our own updates
        if (payload.payload.userId === user?.id) return;
        
        console.log(`📨 ${componentType} received update:`, payload.payload);
        
        if (onDataUpdate) {
          onDataUpdate(payload.payload.data);
        }
        
        lastUpdateRef.current = Date.now();
      })
      .subscribe((status) => {
        console.log(`📡 ${componentType} channel status: ${status}`);
      });

    channelRef.current = channel;
  }, [componentType, rundownId, config, user?.id, onDataUpdate]);

  // Setup polling for components that need it
  const setupPolling = useCallback(() => {
    if (config.updateFrequency !== 'medium' && config.updateFrequency !== 'slow') return;
    
    const interval = config.updateFrequency === 'medium' ? 5000 : 15000; // 5s or 15s
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        console.log(`🔄 ${componentType} polling for updates...`);
        
        // Fetch latest data from database
        const { data, error } = await supabase
          .from(getTableForComponent(componentType))
          .select('*')
          .eq('rundown_id', rundownId)
          .gte('updated_at', new Date(lastUpdateRef.current).toISOString());
        
        if (error) throw error;
        
        if (data && data.length > 0 && onDataUpdate) {
          console.log(`📥 ${componentType} received ${data.length} polled updates`);
          onDataUpdate(data);
          lastUpdateRef.current = Date.now();
        }
        
      } catch (error) {
        console.error(`❌ ${componentType} polling error:`, error);
      }
    }, interval);
    
  }, [componentType, config, rundownId, onDataUpdate]);

  // Broadcast component-specific updates
  const broadcastUpdate = useCallback(async (data: any) => {
    if (!config.broadcastChanges || !channelRef.current) return;
    
    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: `${componentType}_update`,
        payload: {
          data,
          userId: user?.id,
          timestamp: Date.now(),
          component: componentType
        }
      });
      
      console.log(`📡 ${componentType} broadcast sent`);
      
    } catch (error) {
      console.error(`❌ ${componentType} broadcast error:`, error);
    }
  }, [componentType, config, user?.id]);

  // Get appropriate table name for component
  const getTableForComponent = useCallback((component: ComponentType): string => {
    switch (component) {
      case 'main_rundown':
      case 'shared_rundown':
        return 'rundown_items';
      case 'showcaller':
        return 'rundowns';
      case 'teleprompter':
        return 'rundown_items';
      case 'blueprint':
        return 'blueprints';
      case 'camera_plot':
        return 'camera_plots';
      default:
        return 'rundown_items';
    }
  }, []);

  // Initialize sync mechanisms
  useEffect(() => {
    if (!rundownId || !user) return;

    console.log(`🚀 Initializing ${componentType} sync (${config.updateFrequency})`);
    
    setupRealtimeSync();
    setupPolling();
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [rundownId, user, componentType, setupRealtimeSync, setupPolling]);

  return {
    trackChange: trackComponentChange,
    broadcastUpdate,
    config,
    isRealtime: config.updateFrequency === 'realtime',
    lastUpdate: lastUpdateRef.current
  };
};