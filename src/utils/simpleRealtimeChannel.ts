// Simple Realtime Channel Manager
// Trusts Supabase's built-in reconnection with simple exponential backoff
// Replaces complex coordination layers with straightforward retry logic

import { supabase } from '@/integrations/supabase/client';
import { authMonitor } from '@/services/AuthMonitor';

interface ManagedChannelOptions {
  channelName: string;
  onStatusChange?: (status: string, isConnected: boolean) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  maxRetries?: number;
}

interface ManagedChannel {
  channel: any;
  cleanup: () => void;
  forceReconnect: () => Promise<void>;
  isConnected: () => boolean;
}

/**
 * Creates a managed Supabase realtime channel with simple exponential backoff reconnection.
 * 
 * Philosophy: Trust Supabase, keep it simple
 * - Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s max
 * - Max 10 retries before giving up
 * - Clean channel removal before reconnect
 * - Auth validation before reconnection
 */
export function createManagedChannel(options: ManagedChannelOptions): ManagedChannel {
  const { 
    channelName, 
    onStatusChange, 
    onConnected, 
    onDisconnected,
    maxRetries = 10 
  } = options;

  let currentChannel: any = null;
  let isCleaningUp = false;
  let retryCount = 0;
  let retryTimeout: NodeJS.Timeout | null = null;
  let connected = false;

  const createChannel = () => {
    currentChannel = supabase.channel(channelName);
    return currentChannel;
  };

  const handleStatus = (status: string) => {
    const wasConnected = connected;
    connected = status === 'SUBSCRIBED';
    
    onStatusChange?.(status, connected);

    if (status === 'SUBSCRIBED') {
      retryCount = 0; // Reset on success
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
      if (!wasConnected) {
        onConnected?.();
      }
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      if (isCleaningUp) {
        // Intentional cleanup - don't retry
        return;
      }
      
      if (wasConnected) {
        onDisconnected?.();
      }

      // Schedule retry with exponential backoff
      scheduleRetry();
    }
  };

  const scheduleRetry = () => {
    if (retryCount >= maxRetries) {
      console.error(`🚨 ${channelName}: Max retries (${maxRetries}) reached - giving up`);
      return;
    }

    // Clear any existing retry
    if (retryTimeout) {
      clearTimeout(retryTimeout);
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
    retryCount++;

    console.log(`📡 ${channelName}: Scheduling retry ${retryCount}/${maxRetries} in ${delay}ms`);

    retryTimeout = setTimeout(async () => {
      retryTimeout = null;
      await forceReconnect();
    }, delay);
  };

  const forceReconnect = async (): Promise<void> => {
    // Check auth first
    const isSessionValid = await authMonitor.isSessionValid();
    if (!isSessionValid) {
      console.log(`🔐 ${channelName}: Skipping reconnect - session expired`);
      return;
    }

    console.log(`🔄 ${channelName}: Force reconnecting...`);

    // Set cleanup flag to prevent status callback from triggering retry
    isCleaningUp = true;

    // Remove existing channel
    if (currentChannel) {
      try {
        await supabase.removeChannel(currentChannel);
      } catch (e) {
        console.warn(`${channelName}: Error removing channel:`, e);
      }
    }

    // Clear cleanup flag before creating new channel
    isCleaningUp = false;

    // Create and subscribe to new channel
    createChannel();
    currentChannel.subscribe(handleStatus);
  };

  const cleanup = () => {
    isCleaningUp = true;
    
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }

    if (currentChannel) {
      try {
        supabase.removeChannel(currentChannel);
      } catch (e) {
        console.warn(`${channelName}: Error during cleanup:`, e);
      }
      currentChannel = null;
    }

    connected = false;
  };

  // Create initial channel
  createChannel();

  return {
    channel: currentChannel,
    cleanup,
    forceReconnect,
    isConnected: () => connected
  };
}

// Simple connection status for UI
export interface SimpleConnectionStatus {
  isConnected: boolean;
  isReconnecting: boolean;
  lastError?: string;
}
