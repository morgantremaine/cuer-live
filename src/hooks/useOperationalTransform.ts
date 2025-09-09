/**
 * Operational Transform Hook
 * 
 * React hook that provides OT-based collaborative editing capabilities
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import { useCollaborativeStore, useCollaborativeActions } from '@/stores/collaborativeState';
import { 
  createTextInsert, 
  createTextDelete, 
  createTextReplace, 
  createFieldUpdate,
  createItemInsert,
  createItemDelete,
  createItemMove
} from '@/lib/operationalTransform/operations';
import { Operation } from '@/lib/operationalTransform/types';

interface UseOperationalTransformProps {
  rundownId: string | null;
  initialData: any;
  enabled?: boolean;
}

interface EditingContext {
  targetId: string;
  field: string;
  sessionId: string | null;
  lastValue: any;
  sequenceNumber: number;
}

export const useOperationalTransform = ({
  rundownId,
  initialData,
  enabled = true
}: UseOperationalTransformProps) => {
  const { user } = useAuth();
  const collaborativeStore = useCollaborativeStore();
  const actions = useCollaborativeActions();
  
  const [isReady, setIsReady] = useState(false);
  const editingContexts = useRef<Map<string, EditingContext>>(new Map());
  const sequenceCounterRef = useRef(0);
  const vectorClockRef = useRef<Record<string, number>>({});

  // Initialize OT system when ready
  useEffect(() => {
    if (!enabled || !rundownId || !user || !initialData) {
      return;
    }

    if (!collaborativeStore.isInitialized) {
      console.log('🤝 Initializing collaborative editing for rundown:', rundownId);
      
      // Initialize vector clock for this user
      vectorClockRef.current = { [user.id]: 0 };
      
      actions.initialize(user.id, initialData, {
        textConflicts: 'prefer_latest',
        fieldConflicts: 'prefer_latest',
        structuralConflicts: 'prefer_latest',
        autoResolveTimeout: 3000
      });
      
      setIsReady(true);
    }

    return () => {
      if (collaborativeStore.isInitialized) {
        actions.cleanup();
        setIsReady(false);
      }
    };
  }, [rundownId, user, initialData, enabled]);

  // Get next sequence number
  const getNextSequence = useCallback(() => {
    return ++sequenceCounterRef.current;
  }, []);

  // Update vector clock
  const updateVectorClock = useCallback(() => {
    if (user) {
      vectorClockRef.current[user.id] = getNextSequence();
    }
  }, [user, getNextSequence]);

  // Start editing a field
  const startEditing = useCallback((targetId: string, field: string, initialValue?: any) => {
    if (!isReady || !user) return null;

    const contextKey = `${targetId}-${field}`;
    let context = editingContexts.current.get(contextKey);
    
    if (!context) {
      const sessionId = actions.startEditSession(targetId, field, initialValue);
      context = {
        targetId,
        field,
        sessionId,
        lastValue: initialValue,
        sequenceNumber: getNextSequence()
      };
      editingContexts.current.set(contextKey, context);
    }

    return context;
  }, [isReady, user, actions, getNextSequence]);

  // Stop editing a field
  const stopEditing = useCallback((targetId: string, field: string) => {
    const contextKey = `${targetId}-${field}`;
    const context = editingContexts.current.get(contextKey);
    
    if (context && context.sessionId) {
      actions.endEditSession(context.sessionId);
      editingContexts.current.delete(contextKey);
    }
  }, [actions]);

  // Update editing activity
  const updateActivity = useCallback((targetId: string, field: string, value: any) => {
    const contextKey = `${targetId}-${field}`;
    const context = editingContexts.current.get(contextKey);
    
    if (context && context.sessionId) {
      actions.updateSessionActivity(context.sessionId, value);
      context.lastValue = value;
    }
  }, [actions]);

  // Text editing operations
  const insertText = useCallback(async (
    targetId: string, 
    field: string, 
    position: number, 
    content: string
  ): Promise<boolean> => {
    if (!user || !isReady) return false;

    updateVectorClock();
    const operation = createTextInsert(
      targetId,
      field,
      position,
      content,
      user.id,
      { ...vectorClockRef.current },
      getNextSequence()
    );

    const result = await actions.submitOperation(operation);
    
    if (result.success) {
      updateActivity(targetId, field, null); // Let the component provide the new value
    }
    
    return result.success;
  }, [user, isReady, updateVectorClock, getNextSequence, actions, updateActivity]);

  const deleteText = useCallback(async (
    targetId: string,
    field: string,
    position: number,
    length: number,
    deletedContent: string
  ): Promise<boolean> => {
    if (!user || !isReady) return false;

    updateVectorClock();
    const operation = createTextDelete(
      targetId,
      field,
      position,
      length,
      deletedContent,
      user.id,
      { ...vectorClockRef.current },
      getNextSequence()
    );

    const result = await actions.submitOperation(operation);
    
    if (result.success) {
      updateActivity(targetId, field, null);
    }
    
    return result.success;
  }, [user, isReady, updateVectorClock, getNextSequence, actions, updateActivity]);

  const replaceText = useCallback(async (
    targetId: string,
    field: string,
    position: number,
    length: number,
    newContent: string,
    oldContent: string
  ): Promise<boolean> => {
    if (!user || !isReady) return false;

    updateVectorClock();
    const operation = createTextReplace(
      targetId,
      field,
      position,
      length,
      newContent,
      oldContent,
      user.id,
      { ...vectorClockRef.current },
      getNextSequence()
    );

    const result = await actions.submitOperation(operation);
    
    if (result.success) {
      updateActivity(targetId, field, newContent);
    }
    
    return result.success;
  }, [user, isReady, updateVectorClock, getNextSequence, actions, updateActivity]);

  // Field update operation
  const updateField = useCallback(async (
    targetId: string,
    field: string,
    newValue: any,
    oldValue: any
  ): Promise<boolean> => {
    if (!user || !isReady) return false;

    updateVectorClock();
    const operation = createFieldUpdate(
      targetId,
      field,
      newValue,
      oldValue,
      user.id,
      { ...vectorClockRef.current },
      getNextSequence()
    );

    const result = await actions.submitOperation(operation);
    
    if (result.success) {
      updateActivity(targetId, field, newValue);
    }
    
    return result.success;
  }, [user, isReady, updateVectorClock, getNextSequence, actions, updateActivity]);

  // Structural operations
  const insertItem = useCallback(async (
    position: number,
    item: any
  ): Promise<boolean> => {
    if (!user || !isReady) return false;

    updateVectorClock();
    const operation = createItemInsert(
      position,
      item,
      user.id,
      { ...vectorClockRef.current },
      getNextSequence()
    );

    const result = await actions.submitOperation(operation);
    return result.success;
  }, [user, isReady, updateVectorClock, getNextSequence, actions]);

  const deleteItem = useCallback(async (
    position: number,
    deletedItem: any
  ): Promise<boolean> => {
    if (!user || !isReady) return false;

    updateVectorClock();
    const operation = createItemDelete(
      position,
      deletedItem,
      user.id,
      { ...vectorClockRef.current },
      getNextSequence()
    );

    const result = await actions.submitOperation(operation);
    return result.success;
  }, [user, isReady, updateVectorClock, getNextSequence, actions]);

  const moveItem = useCallback(async (
    fromPosition: number,
    toPosition: number,
    itemId: string
  ): Promise<boolean> => {
    if (!user || !isReady) return false;

    updateVectorClock();
    const operation = createItemMove(
      fromPosition,
      toPosition,
      itemId,
      user.id,
      { ...vectorClockRef.current },
      getNextSequence()
    );

    const result = await actions.submitOperation(operation);
    return result.success;
  }, [user, isReady, updateVectorClock, getNextSequence, actions]);

  // Check if field is being edited by others
  const isFieldBeingEdited = useCallback((targetId: string, field: string) => {
    return actions.isFieldBeingEdited(targetId, field);
  }, [actions]);

  // Get active sessions for UI indicators
  const getActiveSessionsForTarget = useCallback((targetId: string) => {
    return actions.getActiveSessionsForTarget(targetId);
  }, [actions]);

  // Cleanup editing contexts on unmount
  useEffect(() => {
    return () => {
      for (const [, context] of editingContexts.current.entries()) {
        if (context.sessionId) {
          actions.endEditSession(context.sessionId);
        }
      }
      editingContexts.current.clear();
    };
  }, [actions]);

  return {
    // State
    isReady,
    isInitialized: collaborativeStore.isInitialized,
    
    // Session management
    startEditing,
    stopEditing,
    updateActivity,
    
    // Text operations
    insertText,
    deleteText,
    replaceText,
    
    // Field operations
    updateField,
    
    // Structural operations
    insertItem,
    deleteItem,
    moveItem,
    
    // Queries
    isFieldBeingEdited,
    getActiveSessionsForTarget,
    
    // Collaboration state
    activeSessions: collaborativeStore.activeSessions,
    activeConflicts: collaborativeStore.activeConflicts,
    showCollaborationIndicators: collaborativeStore.showCollaborationIndicators
  };
};