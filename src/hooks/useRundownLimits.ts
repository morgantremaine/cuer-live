import { useMemo } from 'react';
import { useSubscription } from './useSubscription';
import { SavedRundown } from './useRundownStorage/types';

interface RundownLimits {
  totalCount: number;
  activeCount: number;
  archivedCount: number;
  isAtLimit: boolean;
  canCreateNew: boolean;
  canImport: boolean;
  maxRundowns: number;
}

export const useRundownLimits = (rundowns: SavedRundown[]): RundownLimits => {
  const { subscription_tier, access_type } = useSubscription();

  return useMemo(() => {
    const activeRundowns = rundowns.filter(r => !r.archived);
    const archivedRundowns = rundowns.filter(r => r.archived);
    const totalCount = rundowns.length;
    const activeCount = activeRundowns.length;
    const archivedCount = archivedRundowns.length;

    // Determine if user is on free tier
    const isFreeUser = (subscription_tier === 'Free' || subscription_tier === null) && 
                      (access_type === 'free' || access_type === 'none');

    const maxRundowns = isFreeUser ? 3 : Infinity;
    const isAtLimit = isFreeUser && totalCount >= 3;
    const canCreateNew = !isAtLimit;
    const canImport = !isAtLimit;

    return {
      totalCount,
      activeCount,
      archivedCount,
      isAtLimit,
      canCreateNew,
      canImport,
      maxRundowns
    };
  }, [rundowns, subscription_tier, access_type]);
};