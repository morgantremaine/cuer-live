import { useState } from 'react';

// Hook to track tab activity status without disconnecting
// Connections remain persistent even when tab is inactive
export const useTabFocus = () => {
  // Always consider tab active to maintain persistent connections
  const [isTabActive] = useState(true);

  return { isTabActive, wasTabInactive: false };
};