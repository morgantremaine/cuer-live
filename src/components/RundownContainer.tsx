
import React from 'react';
import RundownLayoutWrapper from './RundownLayoutWrapper';
import RundownHeaderPropsAdapter from './RundownHeaderPropsAdapter';
import RundownMainPropsAdapter from './RundownMainPropsAdapter';
import { RundownContainerProps } from '@/types/rundownContainer';

const RundownContainer = (props: RundownContainerProps) => {
  return (
    <RundownLayoutWrapper>
      <RundownHeaderPropsAdapter props={props} />
      <RundownMainPropsAdapter props={props} />
    </RundownLayoutWrapper>
  );
};

export default RundownContainer;
