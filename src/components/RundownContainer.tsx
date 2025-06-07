
import React from 'react';
import RundownLayoutWrapper from './RundownLayoutWrapper';
import RundownMainPropsAdapter from './RundownMainPropsAdapter';
import { RundownContainerProps } from '@/types/rundownContainer';

const RundownContainer = (props: RundownContainerProps) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <RundownLayoutWrapper>
        <RundownMainPropsAdapter props={props} />
      </RundownLayoutWrapper>
    </div>
  );
};

export default RundownContainer;
