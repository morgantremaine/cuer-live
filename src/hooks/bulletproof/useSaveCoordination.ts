import { useRef, useCallback } from 'react';

interface SaveOperation {
  id: string;
  type: 'auto' | 'manual' | 'offline';
  priority: number;
  timestamp: number;
}

interface QueuedSaveOperation extends SaveOperation {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  saveFunction: () => Promise<any>;
}

export const useSaveCoordination = () => {
  const activeSaveRef = useRef<SaveOperation | null>(null);
  const saveQueueRef = useRef<QueuedSaveOperation[]>([]);

  const createSaveOperation = useCallback((type: SaveOperation['type'], id?: string): SaveOperation => {
    const priorities = { manual: 1, offline: 2, auto: 3 };
    return {
      id: id || `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      priority: priorities[type],
      timestamp: Date.now()
    };
  }, []);

  const processQueue = useCallback(() => {
    if (activeSaveRef.current || saveQueueRef.current.length === 0) return;

    const nextOperation = saveQueueRef.current.shift();
    if (!nextOperation) return;

    activeSaveRef.current = {
      id: nextOperation.id,
      type: nextOperation.type,
      priority: nextOperation.priority,
      timestamp: nextOperation.timestamp
    };

    console.log('🔄 Save coordination: Processing queued save', nextOperation.id);

    nextOperation.saveFunction()
      .then(nextOperation.resolve)
      .catch(nextOperation.reject)
      .finally(() => {
        activeSaveRef.current = null;
        setTimeout(() => processQueue(), 10);
      });
  }, []);

  const coordinatedSave = useCallback(async <T>(
    saveFunction: () => Promise<T>,
    options: { type?: SaveOperation['type']; id?: string; timeout?: number } = {}
  ): Promise<T> => {
    const { type = 'auto', id, timeout = 10000 } = options;
    const operation = createSaveOperation(type, id);

    if (!activeSaveRef.current) {
      activeSaveRef.current = operation;
      console.log('🔒 Save coordination: Starting save', operation.id);
      
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Save operation timed out')), timeout);
        });

        const result = await Promise.race([saveFunction(), timeoutPromise]);
        console.log('✅ Save coordination: Save completed', operation.id);
        return result;
      } catch (error) {
        console.error('❌ Save coordination: Save failed', operation.id, error);
        throw error;
      } finally {
        activeSaveRef.current = null;
        setTimeout(() => processQueue(), 10);
      }
    }

    return new Promise<T>((resolve, reject) => {
      const queuedOperation: QueuedSaveOperation = {
        ...operation,
        resolve: resolve as (value: any) => void,
        reject,
        saveFunction
      };
      
      saveQueueRef.current.push(queuedOperation);
      saveQueueRef.current.sort((a, b) => a.priority - b.priority);
      console.log('⏳ Save coordination: Queued save', operation.id);
    });
  }, [createSaveOperation, processQueue]);

  const isActiveSave = useCallback((id?: string) => {
    if (!id) return !!activeSaveRef.current;
    return activeSaveRef.current?.id === id;
  }, []);

  const getQueueStatus = useCallback(() => ({
    activeSave: activeSaveRef.current,
    queueLength: saveQueueRef.current.length
  }), []);

  return {
    coordinatedSave,
    isActiveSave,
    getQueueStatus
  };
};