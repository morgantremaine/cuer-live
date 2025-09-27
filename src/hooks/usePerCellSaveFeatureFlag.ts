import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Feature flag emails - ONLY these users get the new per-cell save system
const FEATURE_FLAG_EMAILS = ['morgan@cuer.live', 'morgantremaine@me.com'];

export const usePerCellSaveFeatureFlag = () => {
  const { user } = useAuth();
  const [isPerCellSaveEnabled, setIsPerCellSaveEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkFeatureFlag = async () => {
      if (!user) {
        setIsPerCellSaveEnabled(false);
        setIsLoading(false);
        return;
      }

      try {
        // Get user email from auth.users or profiles
        const userEmail = user.email || user.user_metadata?.email;
        
        console.log('🧪 PER-CELL SAVE: Checking feature flag for user', {
          userId: user.id,
          userEmail,
          userEmailLower: userEmail?.toLowerCase(),
          targetEmails: FEATURE_FLAG_EMAILS,
          userMetadata: user.user_metadata
        });
        
        if (!userEmail) {
          logger.warn('No email found for user', { userId: user.id });
          setIsPerCellSaveEnabled(false);
          setIsLoading(false);
          return;
        }

        // Check if user is in feature flag list
        const shouldUsePerCellSave = false; // TEMPORARILY DISABLED FOR DEBUGGING
        
        console.log('🧪 PER-CELL SAVE: Feature flag decision', {
          userEmail,
          shouldUsePerCellSave,
          userId: user.id
        });

        setIsPerCellSaveEnabled(shouldUsePerCellSave);
        setIsLoading(false);
      } catch (error) {
        logger.error('Error checking per-cell save feature flag', error);
        setIsPerCellSaveEnabled(false);
        setIsLoading(false);
      }
    };

    checkFeatureFlag();
  }, [user]);

  return {
    isPerCellSaveEnabled,
    isLoading,
    userEmails: FEATURE_FLAG_EMAILS // For debugging
  };
};