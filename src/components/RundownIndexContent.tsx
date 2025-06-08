
import React from 'react';
import RundownLayoutWrapper from './RundownLayoutWrapper';
import RundownGrid from './RundownGrid';
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';
import { useRundownKeyboardShortcuts } from '@/hooks/useRundownKeyboardShortcuts';

const RundownIndexContent = () => {
  const { interactions } = useRundownStateCoordination();
  const { handleAddRow, handleAddHeader } = interactions;

  // Add keyboard shortcuts for rundown pages
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
