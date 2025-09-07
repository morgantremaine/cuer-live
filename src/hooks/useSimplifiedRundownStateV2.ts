import { useState, useRef, useCallback, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';
import { useAuth } from '@/hooks/useAuth';
import { useRundownRealtime } from '@/hooks/realtime/useRundownRealtime';
import { useDebouncedOCCSave } from '@/hooks/save/useDebouncedOCCSave';
import { getTabId } from '@/utils/tabUtils';
import { SYNC_CONFIG } from '@/utils/realtime/types';

interface RundownData {
  id: string;
  items: RundownItem[];
  title: string;
  start_time?: string;
  timezone?: string;
  external_notes?: any;
  show_date?: string;
  showcaller_state?: any;
}

interface UseSimplifiedRundownStateV2Props {
  initialData: RundownData;
  enabled?: boolean;
}

export const useSimplifiedRundownStateV2 = ({
  initialData,
  enabled = true
}: UseSimplifiedRundownStateV2Props) => {
  const { user } = useAuth();
  
  // Core state
  const [items, setItems] = useState<RundownItem[]>(initialData?.items || []);
  const [title, setTitle] = useState<string>(initialData?.title || '');
  const [startTime, setStartTime] = useState<string>(initialData?.start_time || '');
  const [timezone, setTimezone] = useState<string>(initialData?.timezone || 'UTC');
  const [externalNotes, setExternalNotes] = useState<any>(initialData?.external_notes || {});
  const [showDate, setShowDate] = useState<string>(initialData?.show_date || '');
  const [showcallerState, setShowcallerState] = useState<any>(initialData?.showcaller_state);

  // Refs for current values
  const currentDataRef = useRef({
    items, title, startTime, timezone, externalNotes, showDate, showcallerState
  });

  // Keep ref current
  currentDataRef.current = { items, title, startTime, timezone, externalNotes, showDate, showcallerState };

  // Simplified save logic
  const { debouncedSave, immediateySave } = useDebouncedOCCSave({
    onSuccess: (data) => {
      console.log('✅ Save successful:', data);
    },
    onError: (error) => {
      console.error('❌ Save failed:', error);
    }
  });

  // Auto-save trigger
  const triggerSave = useCallback(() => {
    const current = currentDataRef.current;
    
    if (!initialData?.id) return;

    const saveData = {
      id: initialData.id,
      items: current.items,
      title: current.title,
      start_time: current.startTime,
      timezone: current.timezone,
      external_notes: current.externalNotes,
      show_date: current.showDate,
      showcaller_state: current.showcallerState
    };

    debouncedSave(saveData);
  }, [initialData?.id, debouncedSave]);

  // Handle incoming content updates
  const handleContentUpdate = useCallback((data: any) => {
    console.log('📨 Applying content update:', data);
    
    // Apply updates with field protection
    if (data.items !== undefined) setItems(data.items);
    if (data.title !== undefined) setTitle(data.title);
    if (data.start_time !== undefined) setStartTime(data.start_time);
    if (data.timezone !== undefined) setTimezone(data.timezone);
    if (data.external_notes !== undefined) setExternalNotes(data.external_notes);
    if (data.show_date !== undefined) setShowDate(data.show_date);
  }, []);

  // Handle showcaller updates
  const handleShowcallerUpdate = useCallback((data: any) => {
    console.log('📺 Applying showcaller update:', data.showcaller_state);
    if (data.showcaller_state !== undefined) {
      setShowcallerState(data.showcaller_state);
    }
  }, []);

  // Simplified realtime hook
  const { syncState, protectField } = useRundownRealtime({
    rundownId: initialData?.id || '',
    onContentUpdate: handleContentUpdate,
    onShowcallerUpdate: handleShowcallerUpdate,
    enabled: enabled && !!initialData?.id && !!user
  });

  // State update helpers with field protection
  const updateItems = useCallback((newItems: RundownItem[]) => {
    protectField(`${initialData?.id}-items`);
    setItems(newItems);
    triggerSave();
  }, [initialData?.id, protectField, triggerSave]);

  const updateTitle = useCallback((newTitle: string) => {
    protectField(`${initialData?.id}-title`);
    setTitle(newTitle);
    triggerSave();
  }, [initialData?.id, protectField, triggerSave]);

  const updateStartTime = useCallback((newStartTime: string) => {
    protectField(`${initialData?.id}-start_time`);
    setStartTime(newStartTime);
    triggerSave();
  }, [initialData?.id, protectField, triggerSave]);

  const updateTimezone = useCallback((newTimezone: string) => {
    protectField(`${initialData?.id}-timezone`);
    setTimezone(newTimezone);
    triggerSave();
  }, [initialData?.id, protectField, triggerSave]);

  const updateExternalNotes = useCallback((newNotes: any) => {
    protectField(`${initialData?.id}-external_notes`);
    setExternalNotes(newNotes);
    triggerSave();
  }, [initialData?.id, protectField, triggerSave]);

  const updateShowDate = useCallback((newShowDate: string) => {
    protectField(`${initialData?.id}-show_date`);
    setShowDate(newShowDate);
    triggerSave();
  }, [initialData?.id, protectField, triggerSave]);

  const updateShowcallerState = useCallback((newState: any) => {
    setShowcallerState(newState);
    // Showcaller updates are immediate, no debouncing
    if (initialData?.id) {
      immediateySave({
        id: initialData.id,
        showcaller_state: newState
      });
    }
  }, [initialData?.id, immediateySave]);

  // Initialize from fresh data
  useEffect(() => {
    if (initialData) {
      setItems(initialData.items || []);
      setTitle(initialData.title || '');
      setStartTime(initialData.start_time || '');
      setTimezone(initialData.timezone || 'UTC');
      setExternalNotes(initialData.external_notes || {});
      setShowDate(initialData.show_date || '');
      setShowcallerState(initialData.showcaller_state);
    }
  }, [initialData]);

  return {
    // State
    items,
    title,
    startTime,
    timezone,
    externalNotes,
    showDate,
    showcallerState,
    
    // Updates
    updateItems,
    updateTitle,
    updateStartTime,
    updateTimezone,
    updateExternalNotes,
    updateShowDate,
    updateShowcallerState,
    
    // Sync status
    isConnected: syncState.isConnected,
    isProcessingUpdate: syncState.isProcessing,
    lastSyncTime: syncState.lastSyncTime,
    
    // Manual save
    forceSave: triggerSave
  };
};
