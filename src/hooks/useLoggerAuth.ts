import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { setLoggerUserEmail } from '@/utils/logger';

/**
 * Hook to automatically sync the current user's email with the logger system
 * This enables account-specific logging for debug users
 */
export const useLoggerAuth = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Set the user email in the logger when user changes
    setLoggerUserEmail(user?.email || null);
  }, [user?.email]);

  return null; // This hook doesn't return anything, it just sets up the sync
};