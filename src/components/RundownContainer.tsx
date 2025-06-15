
import React from 'react';
import RundownLayoutWrapper from './RundownLayoutWrapper';
import RundownMainPropsAdapter from './RundownMainPropsAdapter';
import { RundownContainerProps } from '@/types/rundownContainer';

interface ExtendedRundownContainerProps extends RundownContainerProps {
  rundownData?: {
    id: string | undefined;
    title: string;
    startTime: string;
    timezone: string;
    items: any[];
    columns: any[];
    totalRuntime: string;
  };
}

const RundownContainer = (props: ExtendedRundownContainerProps) => {
  return (
    <RundownLayoutWrapper>
      <RundownMainPropsAdapter props={props} />
    </RundownLayoutWrapper>
  );
};

export default RundownContainer;
