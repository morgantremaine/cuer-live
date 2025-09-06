
import React from 'react';
import RundownLayoutWrapper from './RundownLayoutWrapper';
import RundownMainPropsAdapter from './RundownMainPropsAdapter';
import { RundownContainerProps } from '@/types/rundownContainer';
import { CellUpdateProvider } from '@/contexts/CellUpdateContext';

const RundownContainer = (props: RundownContainerProps) => {
  return (
    <CellUpdateProvider>
      <RundownLayoutWrapper>
        <RundownMainPropsAdapter props={props} />
      </RundownLayoutWrapper>
    </CellUpdateProvider>
  );
};

export default RundownContainer;
