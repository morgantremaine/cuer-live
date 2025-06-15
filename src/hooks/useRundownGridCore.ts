
import { useState, useCallback, useRef } from 'react';
import { useRundownStateCoordination } from './useRundownStateCoordination';

export const useRundownGridCore = () => {
  // Use the unified state coordination instead of the deleted integration
  const unifiedState = useRundownStateCoordination();
  
  // Return the unified state
  return unifiedState;
};
