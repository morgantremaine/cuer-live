import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface CellPresenceUser {
  user_id: string;
  full_name: string;
  email: string;
}

interface CellPresence {
  [cellKey: string]: CellPresenceUser[];
}

interface UseCellPresenceProps {
  rundownId: string | null;
  enabled?: boolean;
}

export const useCellPresence = ({ rundownId, enabled = true }: UseCellPresenceProps) => {
  const { user } = useAuth();
  const [cellPresence, setCellPresence] = useState<CellPresence>({});
  const channelRef = useRef<any>(null);
  const currentEditingCellRef = useRef<string | null>(null);

  // Track when user starts editing a cell
  const trackCellEdit = useCallback((itemId: string, field: string) => {
    if (!user || !rundownId || !channelRef.current) return;
    
    const cellKey = `${itemId}-${field}`;
    currentEditingCellRef.current = cellKey;
    
    channelRef.current.track({
      user_id: user.id,
      full_name: user.user_metadata?.full_name || user.email || 'Anonymous',
      email: user.email || 'unknown@example.com',
      editing_cell: cellKey,
      timestamp: new Date().toISOString()
    });
  }, [user, rundownId]);

  // Stop tracking when user stops editing
  const stopCellEdit = useCallback(() => {
    if (!channelRef.current || !currentEditingCellRef.current) return;
    
    currentEditingCellRef.current = null;
    channelRef.current.track({
      user_id: user?.id,
      full_name: user?.user_metadata?.full_name || user?.email || 'Anonymous',
      email: user?.email || 'unknown@example.com',
      editing_cell: null,
      timestamp: new Date().toISOString()
    });
  }, [user]);

  // Get users editing a specific cell
  const getCellEditors = useCallback((itemId: string, field: string): CellPresenceUser[] => {
    const cellKey = `${itemId}-${field}`;
    return cellPresence[cellKey] || [];
  }, [cellPresence]);

  // Check if someone else is editing a cell
  const isCellBeingEdited = useCallback((itemId: string, field: string): boolean => {
    const editors = getCellEditors(itemId, field);
    return editors.some(editor => editor.user_id !== user?.id);
  }, [getCellEditors, user?.id]);

  useEffect(() => {
    if (!rundownId || !user || !enabled) return;

    const channelName = `cell-presence-${rundownId}`;
    const channel = supabase.channel(channelName);

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const newCellPresence: CellPresence = {};

        // Process all users in presence
        Object.values(presenceState).forEach((presences: any[]) => {
          presences.forEach((presence: any) => {
            if (presence.editing_cell && presence.user_id !== user.id) {
              const cellKey = presence.editing_cell;
              if (!newCellPresence[cellKey]) {
                newCellPresence[cellKey] = [];
              }
              newCellPresence[cellKey].push({
                user_id: presence.user_id,
                full_name: presence.full_name,
                email: presence.email
              });
            }
          });
        });

        setCellPresence(newCellPresence);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('👋 User joined cell presence:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('👋 User left cell presence:', leftPresences);
      })
      .subscribe(async (status) => {
        console.log('🤝 Cell presence subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Cell presence connected for rundown:', rundownId);
          
          // Track initial presence
          await channel.track({
            user_id: user.id,
            full_name: user.user_metadata?.full_name || user.email || 'Anonymous',
            email: user.email || 'unknown@example.com',
            editing_cell: null,
            timestamp: new Date().toISOString()
          });
        }
      });

    return () => {
      console.log('🧹 Cleaning up cell presence');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [rundownId, user, enabled]);

  return {
    trackCellEdit,
    stopCellEdit,
    getCellEditors,
    isCellBeingEdited,
    cellPresence
  };
};