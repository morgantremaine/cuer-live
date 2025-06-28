
import { useCleanRundownState } from './useCleanRundownState';

export const useRundownGridCore = () => {
  // Use the clean, simplified state coordination
  const state = useCleanRundownState();
  
  // Debug logging for autoscroll props (if they exist)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔄 useRundownGridCore: Clean state loaded:', {
      itemCount: state.items.length,
      columnCount: state.columns.length,
      hasUnsavedChanges: state.hasUnsavedChanges
    });
  }
  
  return state;
};
