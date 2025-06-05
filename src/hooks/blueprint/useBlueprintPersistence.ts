import { useCallback } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useBlueprintPersistence = (
  rundownId: string,
  rundownTitle: string,
  showDate: string,
  savedBlueprint: any,
  setSavedBlueprint: (blueprint: any) => void
) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const loadBlueprint = useCallback(async () => {
    console.warn('useBlueprintPersistence: This hook is deprecated. Use useBlueprintUnifiedPersistence instead.');
    return null;
  }, []);

  const saveBlueprint = useCallback(async (
    title: string, 
    lists: BlueprintList[], 
    showDate?: string, 
    silent?: boolean, 
    notes?: string, 
    crewData?: any[], 
    cameraPlots?: any[]
  ) => {
    console.warn('useBlueprintPersistence: This hook is deprecated. Use useBlueprintUnifiedPersistence instead.');
    return null;
  }, []);

  return {
    loadBlueprint,
    saveBlueprint
  };
};
