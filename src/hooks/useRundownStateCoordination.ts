import { useBulletproofRundownState } from './useBulletproofRundownState';

/**
 * Simple adapter that returns the bulletproof rundown state directly.
 * This replaces the complex coordination layer with a clean interface.
 */
export const useRundownStateCoordination = () => {
  // Return the bulletproof state directly - it handles all coordination internally
  return useBulletproofRundownState();
};