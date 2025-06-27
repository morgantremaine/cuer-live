
import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import RundownLayout from './layout/RundownLayout';
import { useRundownData } from '@/hooks/useRundownData';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';

interface RundownIndexContentProps {
  rundownId?: string;
  searchTerm?: string;
  caseSensitive?: boolean;
  currentMatchIndex?: number;
  matchCount?: number;
  matches?: any[];
}

const RundownIndexContent = ({ 
  rundownId: propRundownId,
  searchTerm = '',
  caseSensitive = false,
  currentMatchIndex = 0,
  matchCount = 0,
  matches = []
}: RundownIndexContentProps) => {
  const { id: paramRundownId } = useParams();
  const { user } = useAuth();
  const rundownId = propRundownId || paramRundownId;
  
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Monitor auth state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingAuth(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [user]);

  const {
    rundown,
    items,
    loading: dataLoading,
    error,
    updateRundown,
    updateItem,
    deleteRow,
    addRow,
    reorderItems,
    addHeader,
    duplicateRow,
    toggleFloatRow
  } = useRundownData(rundownId);

  // Show loading while checking auth
  if (isLoadingAuth) {
    logger.log('🔄 RundownIndexContent: Waiting for auth state...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    logger.log('🔄 RundownIndexContent: No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Redirect to dashboard if no rundown ID
  if (!rundownId) {
    logger.log('🔄 RundownIndexContent: No rundown ID, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  if (dataLoading) {
    logger.log('🔄 RundownIndexContent: Loading rundown data...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    logger.error('🔄 RundownIndexContent: Error loading rundown:', error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Error Loading Rundown
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <Navigate to="/dashboard" replace />
        </div>
      </div>
    );
  }

  if (!rundown) {
    logger.log('🔄 RundownIndexContent: No rundown found, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  logger.log('🔄 RundownIndexContent: Rendering rundown layout with search props:', {
    searchTerm,
    caseSensitive,
    currentMatchIndex,
    matchCount
  });

  return (
    <RundownLayout
      rundown={rundown}
      items={items}
      onUpdateRundown={updateRundown}
      onUpdateItem={updateItem}
      onDeleteRow={deleteRow}
      onAddRow={addRow}
      onReorderItems={reorderItems}
      onAddHeader={addHeader}
      onDuplicateRow={duplicateRow}
      onToggleFloat={toggleFloatRow}
      searchTerm={searchTerm}
      caseSensitive={caseSensitive}
      currentMatchIndex={currentMatchIndex}
      matchCount={matchCount}
      matches={matches}
    />
  );
};

export default RundownIndexContent;
