import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { useSmartTransportSwitching } from './useSmartTransportSwitching';

export interface NetworkQuality {
  score: number; // 0-100
  description: string;
  latency: number;
  lastCheck: number;
}

export interface EnhancedNetworkState {
  isOnline: boolean;
  isConnected: boolean;
  quality: NetworkQuality;
  transportMode: 'cloud' | 'local' | 'offline';
  transportHealth: any;
  isStable: boolean;
  failoverCount: number;
  lastFailover: number;
}

export const useEnhancedNetworkStatus = (rundownId: string | null) => {
  const baseNetwork = useNetworkStatus();
  const smartTransport = useSmartTransportSwitching(rundownId);
  
  const [enhancedState, setEnhancedState] = useState<EnhancedNetworkState>({
    isOnline: false,
    isConnected: false,
    quality: {
      score: 0,
      description: 'Unknown',
      latency: 0,
      lastCheck: 0
    },
    transportMode: 'offline',
    transportHealth: {},
    isStable: false,
    failoverCount: 0,
    lastFailover: 0
  });

  const failoverCountRef = useRef(0);
  const lastModeRef = useRef<'cloud' | 'local' | 'offline'>('offline');

  // Calculate network quality score
  const calculateQuality = useCallback((cloudHealth: any, localHealth: any): NetworkQuality => {
    let score = 0;
    let description = 'Poor';
    let latency = 0;

    if (smartTransport.transportState.mode === 'cloud' && cloudHealth?.available) {
      latency = cloudHealth.latency || 0;
      if (latency < 100) {
        score = 100;
        description = 'Excellent';
      } else if (latency < 300) {
        score = 80;
        description = 'Good';
      } else if (latency < 1000) {
        score = 60;
        description = 'Fair';
      } else {
        score = 30;
        description = 'Poor';
      }
    } else if (smartTransport.transportState.mode === 'local' && localHealth?.available) {
      latency = localHealth.latency || 0;
      if (latency < 50) {
        score = 95;
        description = 'Excellent (Local)';
      } else if (latency < 100) {
        score = 85;
        description = 'Very Good (Local)';
      } else {
        score = 70;
        description = 'Good (Local)';
      }
    } else if (smartTransport.transportState.mode === 'offline') {
      score = 20;
      description = 'Offline Mode';
      latency = 0;
    }

    return {
      score,
      description,
      latency,
      lastCheck: Date.now()
    };
  }, [smartTransport.transportState.mode]);

  // Track transport mode changes for failover counting
  useEffect(() => {
    const currentMode = smartTransport.transportState.mode;
    const lastMode = lastModeRef.current;

    if (currentMode !== lastMode && lastMode !== 'offline') {
      // This is a failover (switching from one active transport to another)
      failoverCountRef.current += 1;
      setEnhancedState(prev => ({
        ...prev,
        failoverCount: failoverCountRef.current,
        lastFailover: Date.now()
      }));
    }

    lastModeRef.current = currentMode;
  }, [smartTransport.transportState.mode]);

  // Update enhanced state when transport or network changes
  useEffect(() => {
    const cloudHealth = smartTransport.transportHealth.cloud;
    const localHealth = smartTransport.transportHealth.local;
    const quality = calculateQuality(cloudHealth, localHealth);

    setEnhancedState(prev => ({
      ...prev,
      isOnline: baseNetwork.isOnline,
      isConnected: smartTransport.isConnected,
      quality,
      transportMode: smartTransport.transportState.mode,
      transportHealth: smartTransport.transportHealth,
      isStable: smartTransport.transportState.isStable
    }));
  }, [
    baseNetwork.isOnline,
    smartTransport.isConnected,
    smartTransport.transportState.mode,
    smartTransport.transportState.isStable,
    smartTransport.transportHealth,
    calculateQuality
  ]);

  // Get connection status for UI components
  const getConnectionStatus = useCallback(() => {
    const { quality, transportMode, isConnected, isStable } = enhancedState;
    
    let statusColor = 'gray';
    let statusText = 'Disconnected';
    
    if (isConnected) {
      if (quality.score >= 80) {
        statusColor = 'green';
        statusText = isStable ? 'Excellent Connection' : 'Connecting...';
      } else if (quality.score >= 60) {
        statusColor = 'yellow';
        statusText = isStable ? 'Good Connection' : 'Stabilizing...';
      } else {
        statusColor = 'orange';
        statusText = isStable ? 'Poor Connection' : 'Unstable...';
      }
    } else if (transportMode === 'offline') {
      statusColor = 'blue';
      statusText = 'Offline Mode';
    }

    return {
      color: statusColor,
      text: statusText,
      score: quality.score,
      mode: transportMode,
      latency: quality.latency,
      description: quality.description
    };
  }, [enhancedState]);

  // Force transport mode with quality-aware logic
  const forceOptimalTransport = useCallback(async () => {
    await smartTransport.performHealthCheck();
    
    // Let the smart transport switching choose the best option
    // This will trigger automatic selection based on current health
  }, [smartTransport]);

  // Get detailed network diagnostics
  const getNetworkDiagnostics = useCallback(() => {
    return {
      baseNetwork: {
        isOnline: baseNetwork.isOnline,
        connectionType: baseNetwork.connectionType,
        reconnectAttempts: baseNetwork.reconnectAttempts
      },
      transport: {
        mode: smartTransport.transportState.mode,
        status: smartTransport.transportState.status,
        reconnectAttempts: smartTransport.transportState.reconnectAttempts,
        lastConnection: smartTransport.transportState.lastSuccessfulConnection
      },
      health: smartTransport.transportHealth,
      quality: enhancedState.quality,
      stability: {
        isStable: enhancedState.isStable,
        failoverCount: enhancedState.failoverCount,
        lastFailover: enhancedState.lastFailover
      }
    };
  }, [baseNetwork, smartTransport, enhancedState]);

  return {
    // Enhanced state
    ...enhancedState,
    
    // Status helpers
    getConnectionStatus,
    getNetworkDiagnostics,
    
    // Actions
    forceOptimalTransport,
    forceTransportMode: smartTransport.forceTransportMode,
    performHealthCheck: smartTransport.performHealthCheck,
    
    // Raw transport access
    smartTransport
  };
};