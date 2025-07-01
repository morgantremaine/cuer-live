
import React from 'react';
import RundownContent from './RundownContent';
import ColumnManager from './ColumnManager';
import { RundownContainerProps } from '@/types/rundownContainer';

interface RundownMainContentProps extends RundownContainerProps {
  currentSegmentName: string;
  totalDuration: string;
}

const RundownMainContent = (props: RundownMainContentProps) => {
  return (
    <>
      <RundownContent {...props} />
    </>
  );
};

export default RundownMainContent;
