
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
  const stableItemsRef = useRef<RundownItem[]>([]);

  // Create a stable signature that doesn't change unnecessarily
  const createStateSignature = useCallback(() => {
    if (!items || !Array.isArray(items) || !rundownTitle.trim()) return '';
    
    // Only update stable items if items have actually changed
    const itemsString = JSON.stringify(items);
    const lastItemsString = JSON.stringify(stableItemsRef.current);
    
    if (itemsString !== lastItemsString) {
      stableItemsRef.current = [...items];
    }
    
    return JSON.stringify({
      title: rundownTitle.trim(),
      itemsCount: stableItemsRef.current.length,
      timezone: timezone || '',
      startTime: startTime || '',
      itemsHash: stableItemsRef.current.map(item => `${item.id}-${item.name}-${item.duration}-${item.type}`).join('|')
    });
  }, [items, rundownTitle, timezone, startTime]);

  // Initialize baseline when we have valid data
  useEffect(() => {
    if (!isInitializedRef.current && items.length > 0 && rundownTitle.trim() && user) {
      const signature = createStateSignature();
      if (signature) {
        lastSavedStateRef.current = signature;
        stableItemsRef.current = [...items];
        isInitializedRef.current = true;
        setHasUnsavedChanges(false);
        console.log('Auto-save: Initialized baseline for', rundownId || 'new rundown');
      }
    }
  }, [items.length, rundownTitle, user, createStateSignature, rundownId]);

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
    console.log('Auto-save: Executing scheduled save', { rundownId, title: rundownTitle, itemsCount: items.length });

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

      // Update baseline after successful save
      const newSignature = createStateSignature();
      lastSavedStateRef.current = newSignature;
      stableItemsRef.current = [...items];
      setHasUnsavedChanges(false);
      
      return true;
    } catch (error) {
      console.error('Auto-save: Save failed:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, user, rundownTitle, items, rundownId, updateRundown, saveRundown, columns, timezone, startTime, navigate, createStateSignature]);

  // Auto-save when changes are detected
  useEffect(() => {
    if (!isInitializedRef.current || isSaving || !user) {
      return;
    }

    const currentSignature = createStateSignature();
    if (!currentSignature) return;
    
    const hasChanges = lastSavedStateRef.current !== currentSignature;
    
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
  }, [createStateSignature, isSaving, user, performSave]);

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
