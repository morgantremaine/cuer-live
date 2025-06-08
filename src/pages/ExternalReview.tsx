
import React from 'react';
import { useExternalReviewState } from '@/hooks/useExternalReviewState';
import { getVisibleColumns } from '@/utils/sharedRundownUtils';
import SharedRundownHeader from '@/components/shared/SharedRundownHeader';
import ExternalReviewTable from '@/components/external/ExternalReviewTable';
import SharedRundownFooter from '@/components/shared/SharedRundownFooter';

const ExternalReview = () => {
  const { rundownData, currentTime, currentSegmentId, loading, error, updateExternalNote } = useExternalReviewState();

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
            This rundown may not be available for external review.
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
            This rundown may not be available for external review.
          </div>
        </div>
      </div>
    );
  }

  const visibleColumns = getVisibleColumns(rundownData.columns);

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

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-sm text-blue-800">
          <strong>External Review Mode:</strong> You can view this rundown and add notes in the "External Notes" column.
          Your notes will be visible to the rundown team.
        </div>
      </div>

      <ExternalReviewTable
        items={rundownData.items}
        visibleColumns={visibleColumns}
        currentSegmentId={currentSegmentId}
        externalNotes={rundownData.external_notes || {}}
        onUpdateExternalNote={updateExternalNote}
      />

      <SharedRundownFooter />
    </div>
  );
};

export default ExternalReview;
