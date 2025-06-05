
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';
import { useParams, useNavigate } from 'react-router-dom';

interface UseRundownAutoSaveProps {
  items: RundownItem[];
  rundownTitle: string;
  columns?: Column[];
  timezone?: string;
  startTime?: string;
  markAsChanged: () => void;
}

export const useRundownAutoSave = ({
  items,
  rundownTitle,
  columns,
  timezone,
  startTime,
  markAsChanged
}: UseRundownAutoSaveProps) => {
  const { user } = useAuth();
  const { saveRundown, updateRundown } = useRundownStorage();
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const rundownId = params.id && params.id !== ':id' ? params.id : undefined;
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedStateRef = useRef<string>('');
  const isInitializedRef = useRef(false);
  const lastItemsRef = useRef<RundownItem[]>([]);
  const lastTitleRef = useRef<string>('');
  const lastTimezoneRef = useRef<string>('');
  const lastStartTimeRef = useRef<string>('');

  // Stable signature creation function
  const createStateSignature = useCallback((itemsToSign: RundownItem[], titleToSign: string, timezoneToSign?: string, startTimeToSign?: string) => {
    if (!itemsToSign || !Array.isArray(itemsToSign) || !titleToSign.trim()) return '';
    
    return JSON.stringify({
      title: titleToSign.trim(),
      itemsCount: itemsToSign.length,
      timezone: timezoneToSign || '',
      startTime: startTimeToSign || '',
      itemsHash: itemsToSign.map(item => `${item.id}-${item.name}-${item.duration}-${item.type}-${JSON.stringify(item.customFields || {})}`).join('|')
    });
  }, []);

  // Perform the actual save operation
  const performSave = useCallback(async () => {
    if (isSaving) {
      console.log('Auto-save: Save already in progress, skipping');
      return false;
    }

    if (!user || !rundownTitle.trim() || !items.length) {
      console.log('Auto-save: Missing required data for save');
      return false;
    }

    setIsSaving(true);
    console.log('Auto-save: Executing save operation', { rundownId, title: rundownTitle, itemsCount: items.length });

    try {
      if (rundownId) {
        // Update existing rundown
        await updateRundown(rundownId, rundownTitle, items, true, false, columns, timezone, startTime);
        console.log('Auto-save: Updated existing rundown successfully');
      } else {
        // Save new rundown
        const result = await saveRundown(rundownTitle, items, columns, timezone, startTime);
        if (result?.id) {
          console.log('Auto-save: Created new rundown with ID:', result.id);
          navigate(`/rundown/${result.id}`, { replace: true });
        } else {
          throw new Error('Failed to create new rundown');
        }
      }

      // Update all refs after successful save
      const newSignature = createStateSignature(items, rundownTitle, timezone, startTime);
      lastSavedStateRef.current = newSignature;
      lastItemsRef.current = [...items];
      lastTitleRef.current = rundownTitle;
      lastTimezoneRef.current = timezone || '';
      lastStartTimeRef.current = startTime || '';
      setHasUnsavedChanges(false);
      
      return true;
    } catch (error) {
      console.error('Auto-save: Save failed:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, user, rundownTitle, items, rundownId, updateRundown, saveRundown, columns, timezone, startTime, navigate, createStateSignature]);

  // Initialize baseline when we have valid data
  useEffect(() => {
    if (!isInitializedRef.current && items.length > 0 && rundownTitle.trim() && user) {
      const signature = createStateSignature(items, rundownTitle, timezone, startTime);
      if (signature) {
        lastSavedStateRef.current = signature;
        lastItemsRef.current = [...items];
        lastTitleRef.current = rundownTitle;
        lastTimezoneRef.current = timezone || '';
        lastStartTimeRef.current = startTime || '';
        isInitializedRef.current = true;
        setHasUnsavedChanges(false);
        console.log('Auto-save: Initialized baseline for', rundownId || 'new rundown');
      }
    }
  }, [items.length, rundownTitle, user, rundownId, createStateSignature, timezone, startTime]);

  // Check for changes and schedule save
  useEffect(() => {
    if (!isInitializedRef.current || isSaving || !user) {
      return;
    }

    // Check if anything has actually changed by comparing with refs
    const itemsChanged = JSON.stringify(items) !== JSON.stringify(lastItemsRef.current);
    const titleChanged = rundownTitle !== lastTitleRef.current;
    const timezoneChanged = (timezone || '') !== lastTimezoneRef.current;
    const startTimeChanged = (startTime || '') !== lastStartTimeRef.current;
    
    const hasChanges = itemsChanged || titleChanged || timezoneChanged || startTimeChanged;
    
    setHasUnsavedChanges(hasChanges);

    if (hasChanges) {
      console.log('Auto-save: Changes detected, scheduling save in 2 seconds');
      
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Schedule save
      saveTimeoutRef.current = setTimeout(() => {
        console.log('Auto-save: Executing scheduled save');
        performSave();
      }, 2000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [items, rundownTitle, timezone, startTime, isSaving, user, performSave]);

  // Manual save trigger
  const triggerSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    return await performSave();
  }, [performSave]);

  return {
    isSaving,
    hasUnsavedChanges,
    triggerSave
  };
};
