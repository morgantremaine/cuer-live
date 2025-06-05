
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

  console.log('SharedRundown theme debug:', { isDark });

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center`} style={{ backgroundColor: isDark ? '#111827' : '#ffffff' }}>
        <div style={{ color: isDark ? '#d1d5db' : '#6b7280' }} className="text-lg">Loading rundown...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center`} style={{ backgroundColor: isDark ? '#111827' : '#ffffff' }}>
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">Error loading rundown</div>
          <div style={{ color: isDark ? '#9ca3af' : '#6b7280' }} className="text-sm">{error}</div>
          <div style={{ color: isDark ? '#6b7280' : '#6b7280' }} className="text-xs mt-4">
            This rundown may be private or the link may be incorrect.
          </div>
        </div>
      </div>
    );
  }

  if (!rundownData) {
    return (
      <div className={`min-h-screen flex items-center justify-center`} style={{ backgroundColor: isDark ? '#111827' : '#ffffff' }}>
        <div className="text-center">
          <div style={{ color: isDark ? '#d1d5db' : '#6b7280' }} className="text-lg mb-2">Rundown not found</div>
          <div style={{ color: isDark ? '#6b7280' : '#6b7280' }} className="text-sm">
            This rundown may be private or the link may be incorrect.
          </div>
        </div>
      </div>
    );
  }

  const visibleColumns = getVisibleColumns(rundownData.columns);

  return (
    <div className="min-h-screen p-4 print:p-2" style={{ backgroundColor: isDark ? '#111827' : '#ffffff' }}>
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
