
import React from 'react';
import RundownLayoutWrapper from './RundownLayoutWrapper';
import { useRundownKeyboardShortcuts } from '@/hooks/useRundownKeyboardShortcuts';
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';

const RundownIndexContent = () => {
  const { interactions } = useRundownStateCoordination();
  const { handleAddRow, handleAddHeader } = interactions;

  // Add keyboard shortcuts
  useRundownKeyboardShortcuts({
    onAddRow: handleAddRow,
    onAddHeader: handleAddHeader
  });

  return (
    <RundownLayoutWrapper>
      <div>
        {/* Content will be added here */}
      </div>
    </RundownLayoutWrapper>
  );
};

export default RundownIndexContent;
