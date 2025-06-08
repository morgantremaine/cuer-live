
import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useAutoSaveOperations = () => {
  const params = useParams<{ id: string }>();
  const rundownId = (!params.id || params.id === 'new' || params.id === ':id' || params.id.trim() === '') ? undefined : params.id;
  const { updateRundown } = useRundownStorage();
  const [isSaving, setIsSaving] = useState(false);

  const performSave = useCallback(async (
    items: RundownItem[], 
    title: string, 
    columns?: Column[], 
    timezone?: string, 
    startTime?: string,
    skipRealtimeUpdate: boolean = false
  ): Promise<boolean> => {
    if (!rundownId) {
      console.log('💾 Cannot save - no rundown ID');
      return false;
    }

    console.log('💾 Auto-saving rundown...', { 
      itemCount: items.length, 
      title,
      timezone,
      startTime,
      skipRealtimeUpdate 
    });

    setIsSaving(true);
    
    try {
      await updateRundown(
        rundownId,
        title,
        items,
        true, // silent save
        false, // not archived
        columns,
        timezone,
        startTime
      );
      
      console.log('✅ Auto-save successful');
      return true;
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [rundownId, updateRundown]);

  return {
    isSaving,
    performSave
  };
};
