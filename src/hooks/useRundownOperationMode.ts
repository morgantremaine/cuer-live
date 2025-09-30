import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseRundownOperationModeOptions {
  rundownId: string;
  onModeChanged?: (isOperationMode: boolean) => void;
}

export const useRundownOperationMode = ({
  rundownId,
  onModeChanged
}: UseRundownOperationModeOptions) => {
  const [isOperationMode, setIsOperationMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [canToggle, setCanToggle] = useState(false);

  // Check if operation mode is enabled for this rundown
  const checkOperationMode = useCallback(async () => {
    if (!rundownId) return;

    try {
      const { data: rundown, error } = await supabase
        .from('rundowns')
        .select('operation_mode_enabled, user_id, team_id')
        .eq('id', rundownId)
        .single();

      if (error || !rundown) {
        console.error('Failed to check operation mode:', error);
        setIsOperationMode(false);
        setCanToggle(false);
        return;
      }

      const operationModeEnabled = !!rundown.operation_mode_enabled;
      setIsOperationMode(operationModeEnabled);

      // Check if current user can toggle operation mode (only admins/owners)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const canUserToggle = rundown.user_id === user.id || 
          (rundown.team_id && await checkTeamAdminAccess(rundown.team_id, user.id));
        setCanToggle(canUserToggle);
      }

      if (onModeChanged) {
        onModeChanged(operationModeEnabled);
      }

    } catch (error) {
      console.error('Error checking operation mode:', error);
      setIsOperationMode(false);
      setCanToggle(false);
    } finally {
      setIsLoading(false);
    }
  }, [rundownId, onModeChanged]);

  // Enable operation mode for this rundown
  const enableOperationMode = useCallback(async () => {
    if (!rundownId || !canToggle) return false;

    try {
      const { error } = await supabase
        .from('rundowns')
        .update({ operation_mode_enabled: true })
        .eq('id', rundownId);

      if (error) {
        console.error('Failed to enable operation mode:', error);
        return false;
      }

      setIsOperationMode(true);
      if (onModeChanged) {
        onModeChanged(true);
      }

      console.log('✅ OPERATION MODE ENABLED for rundown:', rundownId);
      return true;

    } catch (error) {
      console.error('Error enabling operation mode:', error);
      return false;
    }
  }, [rundownId, canToggle, onModeChanged]);

  // Disable operation mode for this rundown
  const disableOperationMode = useCallback(async () => {
    if (!rundownId || !canToggle) return false;

    try {
      const { error } = await supabase
        .from('rundowns')
        .update({ operation_mode_enabled: false })
        .eq('id', rundownId);

      if (error) {
        console.error('Failed to disable operation mode:', error);
        return false;
      }

      setIsOperationMode(false);
      if (onModeChanged) {
        onModeChanged(false);
      }

      console.log('❌ OPERATION MODE DISABLED for rundown:', rundownId);
      return true;

    } catch (error) {
      console.error('Error disabling operation mode:', error);
      return false;
    }
  }, [rundownId, canToggle, onModeChanged]);

  // Toggle operation mode
  const toggleOperationMode = useCallback(async () => {
    if (isOperationMode) {
      return await disableOperationMode();
    } else {
      return await enableOperationMode();
    }
  }, [isOperationMode, enableOperationMode, disableOperationMode]);

  // Check team admin access
  const checkTeamAdminAccess = useCallback(async (teamId: string, userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single();

      return !error && data?.role === 'admin';
    } catch {
      return false;
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    checkOperationMode();
  }, [checkOperationMode]);

  return {
    isOperationMode,
    isLoading,
    canToggle,
    enableOperationMode,
    disableOperationMode,
    toggleOperationMode,
    checkOperationMode
  };
};