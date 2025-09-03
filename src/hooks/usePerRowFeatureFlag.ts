import { useState, useEffect } from 'react';

// Feature flag for per-row persistence rollout
// Can be controlled via localStorage or environment variables
export const usePerRowFeatureFlag = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [userDismissed, setUserDismissed] = useState(false);

  useEffect(() => {
    // Check localStorage for user preference
    const dismissed = localStorage.getItem('per-row-migration-dismissed') === 'true';
    const enabled = localStorage.getItem('per-row-persistence-enabled') === 'true';
    
    // Enable by default for new feature rollout
    // In production, you might want to enable this gradually
    setIsEnabled(enabled || true); // Default to true for now
    setUserDismissed(dismissed);
  }, []);

  const enablePerRowPersistence = () => {
    localStorage.setItem('per-row-persistence-enabled', 'true');
    setIsEnabled(true);
  };

  const dismissMigrationBanner = () => {
    localStorage.setItem('per-row-migration-dismissed', 'true');
    setUserDismissed(true);
  };

  const resetFeatureFlag = () => {
    localStorage.removeItem('per-row-persistence-enabled');
    localStorage.removeItem('per-row-migration-dismissed');
    setIsEnabled(false);
    setUserDismissed(false);
  };

  return {
    isEnabled,
    userDismissed,
    enablePerRowPersistence,
    dismissMigrationBanner,
    resetFeatureFlag
  };
};