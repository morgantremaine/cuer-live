
import { useCleanRundownState } from './useCleanRundownState';
import { useRundownData } from './useRundownData';
import { useMemo } from 'react';
import { validateRundownItems, validateColumns } from '@/utils/validationUtils';
import { logger } from '@/utils/logger';

/**
 * Enhanced rundown state hook that combines clean state management
 * with proper data validation and error handling
 */
export const useEnhancedRundownState = () => {
  // Get the clean state coordination
  const cleanState = useCleanRundownState();
  
  // Get basic rundown data loading
  const dataLoader = useRundownData();

  // Memoized validated data to prevent unnecessary re-processing
  const validatedData = useMemo(() => {
    if (!dataLoader.data) return null;
    
    try {
      return {
        ...dataLoader.data,
        items: validateRundownItems(dataLoader.data.items),
        columns: validateColumns(dataLoader.data.columns)
      };
    } catch (error) {
      logger.error(`Data validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }, [dataLoader.data]);

  // Enhanced error handling
  const hasError = !!(dataLoader.error || (!dataLoader.isLoading && !validatedData));
  const errorMessage = dataLoader.error || (validatedData ? null : 'Invalid rundown data');

  return {
    // Core state from clean coordination
    ...cleanState,
    
    // Data loading state
    isDataLoading: dataLoader.isLoading,
    dataError: errorMessage,
    hasDataError: hasError,
    reloadData: dataLoader.reload,
    
    // Validated data
    validatedData,
    
    // Combined loading state
    isFullyLoading: dataLoader.isLoading || cleanState.isLoading,
    
    // Enhanced debugging info (only in development)
    debugInfo: process.env.NODE_ENV === 'development' ? {
      hasValidData: !!validatedData,
      itemCount: validatedData?.items.length || 0,
      columnCount: validatedData?.columns.length || 0,
      rundownId: dataLoader.rundownId
    } : undefined
  };
};
