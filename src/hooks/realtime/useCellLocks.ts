import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TimeoutManager } from '@/utils/realtimeUtils';

interface CellLock {
  cellKey: string;
  userId: string;
  userName: string;
  timestamp: string;
}

interface UseCellLocksProps {
  rundownId: string;
  enabled?: boolean;
}

export const useCellLocks = ({ rundownId, enabled = true }: UseCellLocksProps) => {
  const { user } = useAuth();
  const [lockedCells, setLockedCells] = useState<Map<string, CellLock>>(new Map());
  const [myLocks, setMyLocks] = useState<Set<string>>(new Set());
  const channelRef = useRef<any>(null);
  const timeoutManager = useRef(new TimeoutManager());
  const heartbeatRef = useRef<any>(null);

  // Get user display name
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Unknown User';

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutManager.current.clearAll();
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Setup presence channel
  useEffect(() => {
    if (!enabled || !rundownId || !user?.id) return;

    const channelName = `cell_locks_${rundownId}`;
    
    const channel = supabase.channel(channelName, {
      config: { presence: { key: user.id } }
    });

    // Track presence state
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const newLockedCells = new Map<string, CellLock>();

        Object.entries(presenceState).forEach(([userId, presences]) => {
          const presenceArray = Array.isArray(presences) ? presences : [presences];
          const latestPresence = presenceArray[0] as any;
          if (latestPresence?.locks) {
            Object.entries(latestPresence.locks).forEach(([cellKey, lockData]: [string, any]) => {
              newLockedCells.set(cellKey, {
                cellKey,
                userId,
                userName: lockData.userName,
                timestamp: lockData.timestamp
              });
            });
          }
        });

        setLockedCells(newLockedCells);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('Cell locks: user joined', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Cell locks: user left', leftPresences);
      });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Cell locks channel subscribed');
        channelRef.current = channel;
      }
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [enabled, rundownId, user?.id, userName]);

  // Acquire lock for a cell
  const acquireLock = useCallback(async (cellKey: string): Promise<boolean> => {
    if (!channelRef.current || !user?.id) return false;

    // Check if cell is already locked by someone else
    const existingLock = lockedCells.get(cellKey);
    if (existingLock && existingLock.userId !== user.id) {
      return false;
    }

    const lockData = {
      userName,
      timestamp: new Date().toISOString()
    };

    try {
      // Update our presence with the new lock
      const currentLocks = Object.fromEntries(
        Array.from(myLocks).map(key => [key, lockData])
      );
      currentLocks[cellKey] = lockData;

      await channelRef.current.track({
        locks: currentLocks,
        user_id: user.id,
        user_name: userName
      });

      setMyLocks(prev => new Set([...prev, cellKey]));

      // Set up heartbeat to maintain lock
      timeoutManager.current.set(`heartbeat_${cellKey}`, () => {
        if (channelRef.current && myLocks.has(cellKey)) {
          channelRef.current.track({
            locks: currentLocks,
            user_id: user.id,
            user_name: userName
          });
        }
      }, 10000); // Heartbeat every 10 seconds

      // Auto-release after 30 seconds of inactivity
      timeoutManager.current.set(`auto_release_${cellKey}`, () => {
        releaseLock(cellKey);
      }, 30000);

      return true;
    } catch (error) {
      console.error('Failed to acquire cell lock:', error);
      return false;
    }
  }, [lockedCells, myLocks, user?.id, userName]);

  // Release lock for a cell
  const releaseLock = useCallback(async (cellKey: string) => {
    if (!channelRef.current || !user?.id || !myLocks.has(cellKey)) return;

    try {
      const updatedLocks = new Set(myLocks);
      updatedLocks.delete(cellKey);
      setMyLocks(updatedLocks);

      // Clear timeouts for this cell
      timeoutManager.current.clear(`heartbeat_${cellKey}`);
      timeoutManager.current.clear(`auto_release_${cellKey}`);

      // Update presence without this cell lock
      const currentLocks = Object.fromEntries(
        Array.from(updatedLocks).map(key => [key, {
          userName,
          timestamp: new Date().toISOString()
        }])
      );

      await channelRef.current.track({
        locks: currentLocks,
        user_id: user.id,
        user_name: userName
      });

      console.log(`Released lock for cell: ${cellKey}`);
    } catch (error) {
      console.error('Failed to release cell lock:', error);
    }
  }, [myLocks, user?.id, userName]);

  // Refresh lock (reset timeout)
  const refreshLock = useCallback((cellKey: string) => {
    if (myLocks.has(cellKey)) {
      // Reset auto-release timeout
      timeoutManager.current.set(`auto_release_${cellKey}`, () => {
        releaseLock(cellKey);
      }, 30000);
    }
  }, [myLocks, releaseLock]);

  // Check if a cell is locked
  const isCellLocked = useCallback((cellKey: string): CellLock | null => {
    return lockedCells.get(cellKey) || null;
  }, [lockedCells]);

  // Check if we own a lock
  const isMyLock = useCallback((cellKey: string): boolean => {
    return myLocks.has(cellKey);
  }, [myLocks]);

  // Release all locks (cleanup)
  const releaseAllLocks = useCallback(async () => {
    for (const cellKey of myLocks) {
      await releaseLock(cellKey);
    }
  }, [myLocks, releaseLock]);

  // Auto-release locks on window blur/unload
  useEffect(() => {
    const handleWindowBlur = () => {
      // Release all locks when window loses focus
      releaseAllLocks();
    };

    const handleBeforeUnload = () => {
      // Release all locks before page unload
      releaseAllLocks();
    };

    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [releaseAllLocks]);

  return {
    acquireLock,
    releaseLock,
    refreshLock,
    isCellLocked,
    isMyLock,
    releaseAllLocks,
    lockedCells: Array.from(lockedCells.values()),
    isConnected: !!channelRef.current
  };
};