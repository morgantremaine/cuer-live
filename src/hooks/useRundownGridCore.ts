
import { useState, useCallback, useRef } from 'react';
import { useRundownStateCoordination } from './useRundownStateCoordination';

export const useRundownGridCore = () => {
  // Use the unified state coordination instead of the deleted integration
  const unifiedState = useRundownStateCoordination();
  
  // Debug logging for autoscroll props
  console.log('🔄 useRundownGridCore: Autoscroll props:', {
    autoScrollEnabled: unifiedState.coreState.autoScrollEnabled,
    hasToggleFunction: !!unifiedState.coreState.toggleAutoScroll,
    toggleFunctionType: typeof unifiedState.coreState.toggleAutoScroll
  });
  
  // Return the unified state
  return unifiedState;
};
