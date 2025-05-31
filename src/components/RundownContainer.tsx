
import React from 'react';
import RundownLayoutWrapper from './RundownLayoutWrapper';
import RundownHeaderPropsAdapter from './RundownHeaderPropsAdapter';
import RundownMainPropsAdapter from './RundownMainPropsAdapter';
import SearchBar from './SearchBar';
import { RundownContainerProps } from '@/types/rundownContainer';
import { useSearchAndReplace } from '@/hooks/useSearchAndReplace';

const RundownContainer = (props: RundownContainerProps) => {
  const {
    searchTerm,
    replaceTerm,
    setReplaceTerm,
    currentMatchIndex,
    isSearchActive,
    caseSensitive,
    setCaseSensitive,
    showReplaceOptions,
    setShowReplaceOptions,
    matches,
    currentMatch,
    handleSearchTermChange,
    nextMatch,
    previousMatch,
    replaceCurrent,
    replaceAll,
    clearSearch
  } = useSearchAndReplace(props.items, props.visibleColumns, props.onUpdateItem);

  return (
    <RundownLayoutWrapper>
      <RundownHeaderPropsAdapter 
        props={{
          ...props,
          searchBar: (
            <SearchBar
              searchTerm={searchTerm}
              replaceTerm={replaceTerm}
              currentMatchIndex={currentMatchIndex}
              totalMatches={matches.length}
              caseSensitive={caseSensitive}
              showReplaceOptions={showReplaceOptions}
              onSearchTermChange={handleSearchTermChange}
              onReplaceTermChange={setReplaceTerm}
              onCaseSensitiveChange={setCaseSensitive}
              onShowReplaceOptionsChange={setShowReplaceOptions}
              onNextMatch={nextMatch}
              onPreviousMatch={previousMatch}
              onReplaceCurrent={replaceCurrent}
              onReplaceAll={replaceAll}
              onClearSearch={clearSearch}
            />
          )
        }} 
      />
      <RundownMainPropsAdapter props={props} />
    </RundownLayoutWrapper>
  );
};

export default RundownContainer;
