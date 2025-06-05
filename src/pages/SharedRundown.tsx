
import React from 'react';
import { useSharedRundownState } from '@/hooks/useSharedRundownState';
import { getVisibleColumns } from '@/utils/sharedRundownUtils';
import SharedRundownHeader from '@/components/shared/SharedRundownHeader';
import SharedRundownTable from '@/components/shared/SharedRundownTable';
import SharedRundownFooter from '@/components/shared/SharedRundownFooter';

const SharedRundown = () => {
  const { rundownData, currentTime, currentSegmentId, loading, error } = useSharedRundownState();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-lg text-gray-600 dark:text-gray-300">Loading rundown...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">Error loading rundown</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{error}</div>
          <div className="text-xs mt-4 text-gray-500 dark:text-gray-500">
            This rundown may be private or the link may be incorrect.
          </div>
        </div>
      </div>
    );
  }

  if (!rundownData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="text-lg mb-2 text-gray-600 dark:text-gray-300">Rundown not found</div>
          <div className="text-sm text-gray-500 dark:text-gray-500">
            This rundown may be private or the link may be incorrect.
          </div>
        </div>
      </div>
    );
  }

  const visibleColumns = getVisibleColumns(rundownData.columns);

  return (
    <div className="min-h-screen p-4 print:p-2 bg-white dark:bg-gray-900">
      <SharedRundownHeader
        title={rundownData.title}
        currentTime={currentTime}
        startTime={rundownData.startTime || '09:00:00'}
        currentSegmentId={currentSegmentId}
        items={rundownData.items}
        timezone={rundownData.timezone || 'UTC'}
      />

      <SharedRundownTable
        items={rundownData.items}
        visibleColumns={visibleColumns}
        currentSegmentId={currentSegmentId}
      />

      <SharedRundownFooter />
    </div>
  );
};

export default SharedRundown;
