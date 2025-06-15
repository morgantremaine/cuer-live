
import React from 'react';
import RundownLayoutWrapper from './RundownLayoutWrapper';
import RundownMainPropsAdapter from './RundownMainPropsAdapter';
import { RundownContainerProps } from '@/types/rundownContainer';

const RundownContainer = (props: RundownContainerProps) => {
  return (
    <RundownLayoutWrapper rundownData={{ items: props.items || [], columns: props.columns || [] }}>
      <RundownMainPropsAdapter props={props} />
    </RundownLayoutWrapper>
  );
};

export default RundownContainer;
