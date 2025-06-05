
import React from 'react';
import { useSharedRundownState } from '@/hooks/useSharedRundownState';
import { getVisibleColumns } from '@/utils/sharedRundownUtils';
import { useTheme } from '@/hooks/useTheme';
import SharedRundownHeader from '@/components/shared/SharedRundownHeader';
import SharedRundownTable from '@/components/shared/SharedRundownTable';
import SharedRundownFooter from '@/components/shared/SharedRundownFooter';

const SharedRundown = () => {
  const { rundownData, currentTime, currentSegmentId, loading, error } = useSharedRundownState();
  const { isDark } = useTheme();

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading rundown...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">Error loading rundown</div>
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{error}</div>
          <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-4`}>
            This rundown may be private or the link may be incorrect.
          </div>
        </div>
      </div>
    );
  }

  if (!rundownData) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="text-center">
          <div className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Rundown not found</div>
          <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            This rundown may be private or the link may be incorrect.
          </div>
        </div>
      </div>
    );
  }

  const visibleColumns = getVisibleColumns(rundownData.columns);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-white'} p-4 print:p-2`}>
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
