
import React from 'react';
import RundownLayoutWrapper from './RundownLayoutWrapper';
import RundownMainPropsAdapter from './RundownMainPropsAdapter';
import { RundownContainerProps } from '@/types/rundownContainer';

const RundownContainer = (props: RundownContainerProps) => {
  return (
    <RundownLayoutWrapper>
      <RundownMainPropsAdapter 
        props={{
          ...props,
          // Ensure find/replace props are passed through
          searchTerm: props.searchTerm,
          caseSensitive: props.caseSensitive,
          currentMatchIndex: props.currentMatchIndex,
          matchCount: props.matchCount,
          matches: props.matches,
          findReplaceActions: props.findReplaceActions
        }} 
      />
    </RundownLayoutWrapper>
  );
};

export default RundownContainer;
