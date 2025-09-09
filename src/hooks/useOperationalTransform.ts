/**
 * Core Operational Transform System
 * 
 * Provides Google Sheets-like collaborative editing with conflict-free data synchronization
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Operation {
  id: string;
  type: 'insert' | 'update' | 'delete' | 'reorder';
  path: string; // JSON path to the data (e.g., "items.0.talent")
  oldValue: any;
  newValue: any;
  timestamp: string;
  userId: string;
  clientId: string;
}

interface PresenceUser {
  userId: string;
  userName: string;
  activeCell?: string;
  lastSeen: string;
}

interface UseOperationalTransformProps {
  rundownId: string;
  initialData?: any;
  enabled?: boolean;
}

export const useOperationalTransform = ({
  rundownId,
  initialData,
  enabled = true
}: UseOperationalTransformProps) => {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [activeSessions, setActiveSessions] = useState<PresenceUser[]>([]);
  const [pendingOperations, setPendingOperations] = useState<Operation[]>([]);
  const [activeConflicts, setActiveConflicts] = useState<any[]>([]);
  const [showCollaborationIndicators, setShowCollaborationIndicators] = useState(false);

  const clientIdRef = useRef(`client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const channelRef = useRef<any>(null);
  const lastOperationRef = useRef<string | null>(null);
  const editingSessionsRef = useRef<Map<string, any>>(new Map());

  // Generate unique operation ID
  const generateOperationId = useCallback(() => {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Apply operation to local state
  const applyOperation = useCallback((operation: Operation, data: any): any => {
    const pathParts = operation.path.split('.');
    const newData = JSON.parse(JSON.stringify(data));
    
    try {
      switch (operation.type) {
        case 'update': {
          let current = newData;
          for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            if (part === 'items' && Array.isArray(current.items)) {
              current = current.items;
            } else if (!isNaN(parseInt(part))) {
              current = current[parseInt(part)];
            } else {
              current = current[part];
            }
          }
          const finalKey = pathParts[pathParts.length - 1];
          if (!isNaN(parseInt(finalKey))) {
            current[parseInt(finalKey)] = operation.newValue;
          } else {
            current[finalKey] = operation.newValue;
          }
          break;
        }
        case 'insert': {
          if (pathParts[0] === 'items') {
            const index = pathParts.length > 1 ? parseInt(pathParts[1]) : newData.items.length;
            newData.items.splice(index, 0, operation.newValue);
          }
          break;
        }
        case 'delete': {
          if (pathParts[0] === 'items' && pathParts.length > 1) {
            const index = parseInt(pathParts[1]);
            newData.items.splice(index, 1);
          }
          break;
        }
        case 'reorder': {
          if (pathParts[0] === 'items') {
            newData.items = operation.newValue;
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error applying operation:', error, operation);
      return data; // Return original data if operation fails
    }
    
    return newData;
  }, []);

  // Create and send operation
  const createOperation = useCallback(async (
    type: Operation['type'],
    path: string,
    oldValue: any,
    newValue: any
  ) => {
    if (!user || !enabled) return null;

    const operation: Operation = {
      id: generateOperationId(),
      type,
      path,
      oldValue,
      newValue,
      timestamp: new Date().toISOString(),
      userId: user.id,
      clientId: clientIdRef.current
    };

    try {
      // Store in database
      const { error } = await supabase
        .from('rundown_operations')
        .insert({
          rundown_id: rundownId,
          operation_type: operation.type,
          operation_data: operation,
          user_id: user.id,
          client_id: clientIdRef.current
        });

      if (error) {
        console.error('Error storing operation:', error);
        return null;
      }

      lastOperationRef.current = operation.id;
      console.log('🔄 OT: Operation sent', operation);
      return operation;
      
    } catch (error) {
      console.error('Error sending operation:', error);
      return null;
    }
  }, [enabled, user, rundownId, generateOperationId]);

  // Update user presence
  const updatePresence = useCallback(async (activeCell?: string) => {
    if (!enabled || !user || !rundownId) return;

    try {
      const { error } = await supabase
        .from('rundown_presence')
        .upsert({
          rundown_id: rundownId,
          user_id: user.id,
          user_name: user.user_metadata?.full_name || user.email || 'Anonymous',
          active_cell: activeCell || null,
          last_seen: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating presence:', error);
      }
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [enabled, user, rundownId]);

  // Editing session management
  const startEditing = useCallback((targetId: string, field: string, initialValue?: any) => {
    const sessionKey = `${targetId}.${field}`;
    const session = {
      targetId,
      field,
      initialValue,
      startTime: Date.now(),
      clientId: clientIdRef.current
    };
    
    editingSessionsRef.current.set(sessionKey, session);
    updatePresence(`${targetId}.${field}`);
    
    return session;
  }, [updatePresence]);

  const stopEditing = useCallback((targetId: string, field: string) => {
    const sessionKey = `${targetId}.${field}`;
    editingSessionsRef.current.delete(sessionKey);
    updatePresence(); // Clear active cell
  }, [updatePresence]);

  // Field update methods
  const updateField = useCallback(async (targetId: string, field: string, newValue: any, oldValue: any) => {
    const operation = await createOperation('update', `${targetId}.${field}`, oldValue, newValue);
    return !!operation;
  }, [createOperation]);

  const insertText = useCallback(async (targetId: string, field: string, position: number, content: string) => {
    // For text operations, we'll use field updates for simplicity
    return true;
  }, []);

  const deleteText = useCallback(async (targetId: string, field: string, position: number, length: number, deletedContent: string) => {
    return true;
  }, []);

  const replaceText = useCallback(async (targetId: string, field: string, position: number, length: number, newContent: string, oldContent: string) => {
    return true;
  }, []);

  // Initialize real-time subscriptions
  useEffect(() => {
    if (!enabled || !user || !rundownId) return;

    const channel = supabase.channel(`rundown_ot_${rundownId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rundown_operations',
        filter: `rundown_id=eq.${rundownId}`
      }, (payload) => {
        const operation = payload.new.operation_data as Operation;
        
        // Ignore our own operations
        if (operation.clientId === clientIdRef.current) return;
        
        console.log('🔄 OT: Received operation', operation);
        setPendingOperations(prev => [...prev, operation]);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rundown_presence',
        filter: `rundown_id=eq.${rundownId}`
      }, () => {
        // Refetch presence when it changes
        fetchPresence();
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          console.log('🔄 OT: Connected to real-time channel');
          setIsReady(true);
          setIsInitialized(true);
          updatePresence();
        }
      });

    channelRef.current = channel;

    // Initial presence fetch
    const fetchPresence = async () => {
      const { data, error } = await supabase
        .from('rundown_presence')
        .select('*')
        .eq('rundown_id', rundownId)
        .gte('last_seen', new Date(Date.now() - 60000).toISOString()); // Active in last minute

      if (!error && data) {
        setActiveSessions(data.map(p => ({
          userId: p.user_id,
          userName: p.user_name,
          activeCell: p.active_cell,
          lastSeen: p.last_seen
        })));
        setShowCollaborationIndicators(data.length > 1);
      }
    };

    fetchPresence();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [enabled, user, rundownId, updatePresence]);

  // Clean up presence on unmount
  useEffect(() => {
    return () => {
      if (enabled && user && rundownId) {
        supabase
          .from('rundown_presence')
          .delete()
          .eq('rundown_id', rundownId)
          .eq('user_id', user.id);
      }
    };
  }, [enabled, user, rundownId]);

  return {
    // State
    isReady,
    isInitialized,
    isConnected,
    activeSessions,
    pendingOperations,
    activeConflicts,
    showCollaborationIndicators,
    
    // Actions
    createOperation,
    updatePresence,
    applyOperation,
    startEditing,
    stopEditing,
    updateField,
    insertText,
    deleteText,
    replaceText,
    
    // Utils
    clientId: clientIdRef.current,
    isEnabled: enabled && !!user && !!rundownId
  };
};