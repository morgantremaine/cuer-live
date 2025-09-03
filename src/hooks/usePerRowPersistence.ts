import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';
import { logger } from '@/utils/logger';

interface PerRowPersistenceOptions {
  rundownId: string;
  onItemsChange: (items: RundownItem[]) => void;
}

export const usePerRowPersistence = ({ rundownId, onItemsChange }: PerRowPersistenceOptions) => {
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const lastSavedVersionsRef = useRef<Record<string, number>>({});

  // Load items from normalized table
  const loadItems = useCallback(async (): Promise<RundownItem[]> => {
    if (!rundownId) return [];

    try {
      const { data, error } = await supabase
        .from('rundown_items')
        .select('*')
        .eq('rundown_id', rundownId)
        .order('item_index');

      if (error) throw error;

      const items = data?.map(row => row.item_data as RundownItem) || [];
      
      // Update version tracking
      data?.forEach(row => {
        lastSavedVersionsRef.current[row.item_id] = row.item_version;
      });

      logger.debug('Loaded items from normalized table:', { count: items.length });
      return items;
    } catch (error) {
      logger.error('Failed to load items from normalized table:', error);
      return [];
    }
  }, [rundownId]);

  // Save individual item
  const saveItem = useCallback(async (item: RundownItem, index: number) => {
    if (!rundownId) return;

    try {
      const currentVersion = lastSavedVersionsRef.current[item.id] || 0;
      const newVersion = currentVersion + 1;

      const { error } = await supabase
        .from('rundown_items')
        .upsert({
          rundown_id: rundownId,
          item_id: item.id,
          item_index: index,
          item_data: item,
          item_version: newVersion,
          last_edited_by: (await supabase.auth.getUser()).data.user?.id,
          last_edited_at: new Date().toISOString()
        }, {
          onConflict: 'rundown_id,item_id'
        });

      if (error) throw error;

      lastSavedVersionsRef.current[item.id] = newVersion;
      logger.debug('Saved item:', { itemId: item.id, version: newVersion });
    } catch (error) {
      logger.error('Failed to save item:', error);
      throw error;
    }
  }, [rundownId]);

  // Save multiple items (for bulk operations)
  const saveItems = useCallback(async (items: RundownItem[]) => {
    if (!rundownId || items.length === 0) return;

    setIsSaving(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const now = new Date().toISOString();

      const upsertData = items.map((item, index) => {
        const currentVersion = lastSavedVersionsRef.current[item.id] || 0;
        const newVersion = currentVersion + 1;
        lastSavedVersionsRef.current[item.id] = newVersion;

        return {
          rundown_id: rundownId,
          item_id: item.id,
          item_index: index,
          item_data: item,
          item_version: newVersion,
          last_edited_by: userId,
          last_edited_at: now
        };
      });

      const { error } = await supabase
        .from('rundown_items')
        .upsert(upsertData, {
          onConflict: 'rundown_id,item_id'
        });

      if (error) throw error;

      logger.debug('Saved bulk items:', { count: items.length });
    } catch (error) {
      logger.error('Failed to save bulk items:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [rundownId]);

  // Delete item
  const deleteItem = useCallback(async (itemId: string) => {
    if (!rundownId) return;

    try {
      const { error } = await supabase
        .from('rundown_items')
        .delete()
        .eq('rundown_id', rundownId)
        .eq('item_id', itemId);

      if (error) throw error;

      delete lastSavedVersionsRef.current[itemId];
      logger.debug('Deleted item:', { itemId });
    } catch (error) {
      logger.error('Failed to delete item:', error);
      throw error;
    }
  }, [rundownId]);

  // Debounced save for individual item
  const debouncedSaveItem = useCallback((item: RundownItem, index: number, delay = 1000) => {
    // Clear existing timeout for this item
    if (saveTimeoutRef.current[item.id]) {
      clearTimeout(saveTimeoutRef.current[item.id]);
    }

    // Set new timeout
    saveTimeoutRef.current[item.id] = setTimeout(() => {
      saveItem(item, index);
      delete saveTimeoutRef.current[item.id];
    }, delay);
  }, [saveItem]);

  // Reorder items (update all indices)
  const reorderItems = useCallback(async (items: RundownItem[]) => {
    if (!rundownId) return;

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const now = new Date().toISOString();

      // Update item_index for all items
      const updates = items.map((item, index) => ({
        rundown_id: rundownId,
        item_id: item.id,
        item_index: index,
        last_edited_by: userId,
        last_edited_at: now
      }));

      const { error } = await supabase
        .from('rundown_items')
        .upsert(updates, {
          onConflict: 'rundown_id,item_id'
        });

      if (error) throw error;

      logger.debug('Reordered items:', { count: items.length });
    } catch (error) {
      logger.error('Failed to reorder items:', error);
      throw error;
    }
  }, [rundownId]);

  // Migrate existing rundown to normalized format
  const migrateRundown = useCallback(async () => {
    if (!rundownId) return false;

    try {
      const { data, error } = await supabase.rpc('migrate_rundown_to_normalized_items', {
        target_rundown_id: rundownId
      });

      if (error) throw error;

      logger.debug('Migrated rundown to normalized format:', { itemsMigrated: data });
      return data > 0;
    } catch (error) {
      logger.error('Failed to migrate rundown:', error);
      return false;
    }
  }, [rundownId]);

  return {
    loadItems,
    saveItem,
    saveItems,
    deleteItem,
    debouncedSaveItem,
    reorderItems,
    migrateRundown,
    isSaving
  };
};