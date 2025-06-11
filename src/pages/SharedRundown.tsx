
import React from 'react';
import { useSharedRundownState } from '@/hooks/useSharedRundownState';
import { getVisibleColumns } from '@/utils/sharedRundownUtils';
import { calculateHeaderDuration } from '@/utils/rundownCalculations';
import SharedRundownHeader from '@/components/shared/SharedRundownHeader';
import SharedRundownTable from '@/components/shared/SharedRundownTable';
import SharedRundownFooter from '@/components/shared/SharedRundownFooter';

const SharedRundown = () => {
  const { rundownData, currentTime, currentSegmentId, loading, error } = useSharedRundownState();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg text-gray-600">Loading rundown...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">Error loading rundown</div>
          <div className="text-sm text-gray-600">{error}</div>
          <div className="text-xs text-gray-500 mt-4">
            This rundown may be private or the link may be incorrect.
          </div>
        </div>
      </div>
    );
  }

  if (!rundownData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-lg text-gray-600 mb-2">Rundown not found</div>
          <div className="text-sm text-gray-500">
            This rundown may be private or the link may be incorrect.
          </div>
        </div>
      </div>
    );
  }

  const visibleColumns = getVisibleColumns(rundownData.columns);

  // Helper functions for the table
  const getColumnWidth = (column: any) => column.width || '150px';
  
  const getRowNumber = (index: number) => {
    let rowCount = 0;
    for (let i = 0; i <= index; i++) {
      if (rundownData.items[i]?.type !== 'header') {
        rowCount++;
      }
    }
    return rowCount > 0 ? rowCount.toString() : '';
  };

  const getHeaderDuration = (index: number) => {
    if (!rundownData.items || index >= rundownData.items.length) return '00:00:00';
    return calculateHeaderDuration(rundownData.items, index);
  };

  return (
    <div className="min-h-screen bg-white p-4 print:p-2">
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
        currentTime={currentTime}
        currentSegmentId={currentSegmentId}
        getColumnWidth={getColumnWidth}
        getRowNumber={getRowNumber}
        getHeaderDuration={getHeaderDuration}
      />

      <SharedRundownFooter />
    </div>
  );
};

export default SharedRundown;
