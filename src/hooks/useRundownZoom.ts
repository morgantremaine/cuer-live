import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const ZOOM_LEVELS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0];
const DEFAULT_ZOOM = 1.0;

interface ZoomPreferences {
  id: string;
  user_id: string;
  rundown_id: string;
  zoom_level: number;
  created_at: string;
  updated_at: string;
}

export const useRundownZoom = (rundownId: string | null) => {
  const { user } = useAuth();
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<number>(DEFAULT_ZOOM);
  const isLoadingRef = useRef(false);

  // Load zoom preferences for this rundown
  const loadZoomPreferences = useCallback(async () => {
    if (!user?.id || !rundownId || isLoadingRef.current) {
      setZoomLevel(DEFAULT_ZOOM);
      setIsLoading(false);
      return;
    }

    isLoadingRef.current = true;
    
    try {
      const { data, error } = await supabase
        .from('user_rundown_zoom_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('rundown_id', rundownId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading zoom preferences:', error);
        setZoomLevel(DEFAULT_ZOOM);
      } else if (data?.zoom_level) {
        // Ensure zoom level is within valid range
        const validZoom = Math.max(0.5, Math.min(2.0, data.zoom_level));
        setZoomLevel(validZoom);
        lastSavedRef.current = validZoom;
      } else {
        setZoomLevel(DEFAULT_ZOOM);
        lastSavedRef.current = DEFAULT_ZOOM;
      }
    } catch (error) {
      console.error('Failed to load zoom preferences:', error);
      setZoomLevel(DEFAULT_ZOOM);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [user?.id, rundownId]);

  // Save zoom preferences with debouncing
  const saveZoomPreferences = useCallback(async (newZoomLevel: number) => {
    if (!user?.id || !rundownId || newZoomLevel === lastSavedRef.current) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('user_rundown_zoom_preferences')
          .upsert({
            user_id: user.id,
            rundown_id: rundownId,
            zoom_level: newZoomLevel
          }, {
            onConflict: 'user_id,rundown_id'
          });

        if (error) {
          console.error('Error saving zoom preferences:', error);
        } else {
          lastSavedRef.current = newZoomLevel;
          console.log('🔍 Zoom preference saved:', newZoomLevel);
        }
      } catch (error) {
        console.error('Failed to save zoom preferences:', error);
      }
    }, 500); // Debounce saves
  }, [user?.id, rundownId]);

  // Update zoom level
  const updateZoomLevel = useCallback((newZoomLevel: number) => {
    // Clamp to valid range
    const clampedZoom = Math.max(0.5, Math.min(2.0, newZoomLevel));
    setZoomLevel(clampedZoom);
    
    if (!isLoadingRef.current) {
      saveZoomPreferences(clampedZoom);
    }
  }, [saveZoomPreferences]);

  // Zoom in to next level
  const zoomIn = useCallback(() => {
    const currentIndex = ZOOM_LEVELS.findIndex(level => level >= zoomLevel);
    const nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1);
    updateZoomLevel(ZOOM_LEVELS[nextIndex]);
  }, [zoomLevel, updateZoomLevel]);

  // Zoom out to previous level
  const zoomOut = useCallback(() => {
    const currentIndex = ZOOM_LEVELS.findIndex(level => level >= zoomLevel);
    const prevIndex = Math.max((currentIndex === -1 ? ZOOM_LEVELS.length - 1 : currentIndex) - 1, 0);
    updateZoomLevel(ZOOM_LEVELS[prevIndex]);
  }, [zoomLevel, updateZoomLevel]);

  // Reset to default zoom
  const resetZoom = useCallback(() => {
    updateZoomLevel(DEFAULT_ZOOM);
  }, [updateZoomLevel]);

  // Check if zoom actions are available
  const canZoomIn = zoomLevel < 2.0;
  const canZoomOut = zoomLevel > 0.5;
  const isDefaultZoom = Math.abs(zoomLevel - DEFAULT_ZOOM) < 0.01;

  // Load preferences when rundown changes
  useEffect(() => {
    setIsLoading(true);
    loadZoomPreferences();
  }, [rundownId, user?.id, loadZoomPreferences]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    zoomLevel,
    setZoomLevel: updateZoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    canZoomIn,
    canZoomOut,
    isDefaultZoom,
    isLoading,
    ZOOM_LEVELS
  };
};