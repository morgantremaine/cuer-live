
import React from 'react';
import RundownLayoutWrapper from './RundownLayoutWrapper';
import RundownHeaderPropsAdapter from './RundownHeaderPropsAdapter';
import RundownMainPropsAdapter from './RundownMainPropsAdapter';
import { RundownContainerProps } from '@/types/rundownContainer';

const RundownContainer = (props: RundownContainerProps) => {
  console.log('RundownContainer - Add functions:', {
    onAddRowAfter: !!props.onAddRowAfter,
    onAddHeaderAfter: !!props.onAddHeaderAfter
  });

  return (
    <RundownLayoutWrapper>
      <RundownHeaderPropsAdapter props={props} />
      <RundownMainPropsAdapter props={props} />
    </RundownLayoutWrapper>
  );
};

export default RundownContainer;
