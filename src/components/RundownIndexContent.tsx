
import React from 'react';
import RundownLayoutWrapper from './RundownLayoutWrapper';
import RundownGrid from './RundownGrid';
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
      <RundownGrid />
    </RundownLayoutWrapper>
  );
};

export default RundownIndexContent;
