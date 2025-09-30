import { useCallback, useRef, useEffect } from 'react';
import { createContentSignature } from '@/utils/contentSignature';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/columns';

interface TabSignatureMessage {
  type: 'signature-update' | 'signature-request' | 'signature-response';
  rundownId: string;
  signature: string;
  timestamp: number;
  tabId: string;
  source: 'autosave' | 'manual-save' | 'undo' | 'conflict-resolution';
}

/**
 * Multi-tab signature coordination to prevent signature mismatches
 * across different browser tabs editing the same rundown
 */
export const useMultiTabSignatureCoordination = (
  rundownId: string,
  getCurrentState: () => {
    items: RundownItem[];
    title: string;
    columns: Column[];
    timezone: string;
    startTime: string;
    showDate: Date | null;
    externalNotes: any;
  }
) => {
  const tabIdRef = useRef<string>(`tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const lastKnownSignatureRef = useRef<string | null>(null);
  const lastBroadcastRef = useRef<number>(0);

  // Create current signature
  const createCurrentSignature = useCallback(() => {
    const state = getCurrentState();
    return createContentSignature({
      items: state.items,
      title: state.title,
      columns: state.columns,
      timezone: state.timezone,
      startTime: state.startTime,
      showDate: state.showDate,
      externalNotes: state.externalNotes
    });
  }, [getCurrentState]);

  // Broadcast signature update to other tabs
  const broadcastSignatureUpdate = useCallback((
    signature: string,
    source: 'autosave' | 'manual-save' | 'undo' | 'conflict-resolution'
  ) => {
    const now = Date.now();
    
    // Throttle broadcasts to prevent spam
    if (now - lastBroadcastRef.current < 500) return;
    lastBroadcastRef.current = now;

    const message: TabSignatureMessage = {
      type: 'signature-update',
      rundownId,
      signature,
      timestamp: now,
      tabId: tabIdRef.current,
      source
    };

    try {
      localStorage.setItem(`signature-${rundownId}`, JSON.stringify(message));
      
      // Use BroadcastChannel if available (more reliable)
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(`rundown-signatures-${rundownId}`);
        channel.postMessage(message);
        channel.close();
      }
      
      console.log('📡 Multi-tab: Broadcasted signature update', {
        rundownId,
        source,
        signaturePreview: signature.slice(0, 50),
        tabId: tabIdRef.current
      });
    } catch (error) {
      console.warn('📡 Multi-tab: Failed to broadcast signature:', error);
    }
  }, [rundownId]);

  // Request current signature from other tabs
  const requestSignatureFromOtherTabs = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 1000);
      
      const message: TabSignatureMessage = {
        type: 'signature-request',
        rundownId,
        signature: '',
        timestamp: Date.now(),
        tabId: tabIdRef.current,
        source: 'manual-save'
      };

      const handleResponse = (event: StorageEvent) => {
        if (event.key === `signature-response-${rundownId}`) {
          try {
            const response: TabSignatureMessage = JSON.parse(event.newValue || '{}');
            if (response.tabId !== tabIdRef.current && response.signature) {
              clearTimeout(timeout);
              window.removeEventListener('storage', handleResponse);
              resolve(response.signature);
            }
          } catch (error) {
            // Ignore parsing errors
          }
        }
      };

      window.addEventListener('storage', handleResponse);
      localStorage.setItem(`signature-request-${rundownId}`, JSON.stringify(message));
      
      // Also try BroadcastChannel
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(`rundown-signatures-${rundownId}`);
        channel.postMessage(message);
        
        channel.onmessage = (event) => {
          const response = event.data as TabSignatureMessage;
          if (response.type === 'signature-response' && response.tabId !== tabIdRef.current) {
            clearTimeout(timeout);
            channel.close();
            window.removeEventListener('storage', handleResponse);
            resolve(response.signature);
          }
        };
      }
    });
  }, [rundownId]);

  // Check for signature conflicts across tabs
  const checkCrossTabSignatureConsistency = useCallback(async (): Promise<{
    isConsistent: boolean;
    otherTabSignature?: string;
    currentSignature: string;
  }> => {
    const currentSignature = createCurrentSignature();
    const otherTabSignature = await requestSignatureFromOtherTabs();
    
    if (!otherTabSignature) {
      return {
        isConsistent: true,
        currentSignature
      };
    }
    
    const isConsistent = currentSignature === otherTabSignature;
    
    if (!isConsistent) {
      console.warn('🚨 Multi-tab signature inconsistency detected:', {
        currentTab: currentSignature.slice(0, 50),
        otherTab: otherTabSignature.slice(0, 50),
        rundownId
      });
    }
    
    return {
      isConsistent,
      otherTabSignature,
      currentSignature
    };
  }, [createCurrentSignature, requestSignatureFromOtherTabs]);

  // Handle incoming signature messages from other tabs
  useEffect(() => {
    const handleSignatureMessage = (event: StorageEvent) => {
      if (event.key?.startsWith(`signature-${rundownId}`) || event.key?.startsWith(`signature-request-${rundownId}`)) {
        try {
          const message: TabSignatureMessage = JSON.parse(event.newValue || '{}');
          
          if (message.tabId === tabIdRef.current) return; // Ignore own messages
          
          if (message.type === 'signature-update') {
            lastKnownSignatureRef.current = message.signature;
            console.log('📡 Multi-tab: Received signature update from other tab', {
              source: message.source,
              signaturePreview: message.signature.slice(0, 50)
            });
          } else if (message.type === 'signature-request') {
            // Respond with current signature
            const currentSignature = createCurrentSignature();
            const response: TabSignatureMessage = {
              type: 'signature-response',
              rundownId,
              signature: currentSignature,
              timestamp: Date.now(),
              tabId: tabIdRef.current,
              source: 'manual-save'
            };
            
            localStorage.setItem(`signature-response-${rundownId}`, JSON.stringify(response));
          }
        } catch (error) {
          // Ignore parsing errors
        }
      }
    };

    const handleBroadcastMessage = (event: MessageEvent) => {
      const message = event.data as TabSignatureMessage;
      if (message.rundownId === rundownId && message.tabId !== tabIdRef.current) {
        if (message.type === 'signature-update') {
          lastKnownSignatureRef.current = message.signature;
        } else if (message.type === 'signature-request') {
          const currentSignature = createCurrentSignature();
          const response: TabSignatureMessage = {
            type: 'signature-response',
            rundownId,
            signature: currentSignature,
            timestamp: Date.now(),
            tabId: tabIdRef.current,
            source: 'manual-save'
          };
          
          if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel(`rundown-signatures-${rundownId}`);
            channel.postMessage(response);
            channel.close();
          }
        }
      }
    };

    window.addEventListener('storage', handleSignatureMessage);
    
    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel(`rundown-signatures-${rundownId}`);
      broadcastChannel.addEventListener('message', handleBroadcastMessage);
    }

    return () => {
      window.removeEventListener('storage', handleSignatureMessage);
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', handleBroadcastMessage);
        broadcastChannel.close();
      }
    };
  }, [rundownId, createCurrentSignature]);

  return {
    broadcastSignatureUpdate,
    checkCrossTabSignatureConsistency,
    createCurrentSignature,
    tabId: tabIdRef.current
  };
};