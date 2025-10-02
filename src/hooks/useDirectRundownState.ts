import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from './useRundownItems';
import { useConflictNotifications } from './useConflictNotifications';
import { toast } from 'sonner';

interface DirectRundownStateOptions {
  rundownId: string;
  userId: string;
  onDataLoaded?: (items: RundownItem[], title: string) => void;
}

export const useDirectRundownState = ({ rundownId, userId, onDataLoaded }: DirectRundownStateOptions) => {
  const [items, setItems] = useState<RundownItem[]>([]);
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  
  const { notifyConflictResolved } = useConflictNotifications();
  const realtimeChannelRef = useRef<any>(null);

  // Load initial data
  useEffect(() => {
    const loadRundown = async () => {
      if (!rundownId) return;

      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('rundowns')
        .select('items, title, updated_at')
        .eq('id', rundownId)
        .single();

      if (error) {
        console.error('Failed to load rundown:', error);
        toast.error('Failed to load rundown');
        setIsLoading(false);
        return;
      }

      setItems(data.items || []);
      setTitle(data.title || '');
      setLastSavedAt(new Date(data.updated_at));
      setIsLoading(false);
      
      if (onDataLoaded) {
        onDataLoaded(data.items || [], data.title || '');
      }
    };

    loadRundown();
  }, [rundownId]);

  // Set up Supabase Realtime listener
  useEffect(() => {
    if (!rundownId) return;

    const channel = supabase
      .channel(`rundown:${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${rundownId}`
        },
        (payload) => {
          console.log('📡 Received remote update:', payload);
          
          const newData = payload.new as any;
          
          // Apply remote changes with conflict detection
          setItems(prevItems => {
            // Simple last-write-wins for now
            // TODO: Add conflict detection for specific fields
            return newData.items || prevItems;
          });
          
          if (newData.title) {
            setTitle(newData.title);
          }
          
          setLastSavedAt(new Date(newData.updated_at));
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [rundownId]);

  // Direct save to database
  const saveToDatabase = useCallback(async (updates: Partial<{ items: RundownItem[]; title: string }>) => {
    if (!rundownId || isSaving) return;

    setIsSaving(true);
    setHasUnsavedChanges(false);

    try {
      const { data, error } = await supabase
        .from('rundowns')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          last_updated_by: userId
        })
        .eq('id', rundownId)
        .select('updated_at')
        .single();

      if (error) throw error;

      setLastSavedAt(new Date(data.updated_at));
      console.log('✅ Direct save successful');
      
    } catch (error) {
      console.error('❌ Direct save failed:', error);
      toast.error('Failed to save changes');
      setHasUnsavedChanges(true);
    } finally {
      setIsSaving(false);
    }
  }, [rundownId, userId, isSaving]);

  // Update item (local + database)
  const updateItem = useCallback((itemId: string, field: string, value: any) => {
    // Optimistic local update
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId 
          ? { ...item, [field]: value }
          : item
      )
    );
    
    setHasUnsavedChanges(true);
    
    // Return the update function for debouncing
    return () => {
      const updatedItems = items.map(item => 
        item.id === itemId 
          ? { ...item, [field]: value }
          : item
      );
      return saveToDatabase({ items: updatedItems });
    };
  }, [items, saveToDatabase]);

  // Add row
  const addRow = useCallback((index: number, newItem: RundownItem) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      newItems.splice(index, 0, newItem);
      return newItems;
    });
    
    setHasUnsavedChanges(true);
    
    // Save immediately for structural changes
    setTimeout(() => {
      saveToDatabase({ items: [...items, newItem] });
    }, 0);
  }, [items, saveToDatabase]);

  // Delete row
  const deleteRow = useCallback((itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
    
    setHasUnsavedChanges(true);
    
    // Save immediately for structural changes
    setTimeout(() => {
      const updatedItems = items.filter(item => item.id !== itemId);
      saveToDatabase({ items: updatedItems });
    }, 0);
  }, [items, saveToDatabase]);

  // Move row
  const moveRow = useCallback((fromIndex: number, toIndex: number) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);
      return newItems;
    });
    
    setHasUnsavedChanges(true);
    
    // Save immediately for structural changes
    setTimeout(() => {
      saveToDatabase({ items });
    }, 0);
  }, [items, saveToDatabase]);

  return {
    items,
    title,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    lastSavedAt,
    updateItem,
    addRow,
    deleteRow,
    moveRow,
    setTitle: (newTitle: string) => {
      setTitle(newTitle);
      setHasUnsavedChanges(true);
      setTimeout(() => saveToDatabase({ title: newTitle }), 800);
    },
    saveNow: () => saveToDatabase({ items, title })
  };
};
