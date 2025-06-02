
import React from 'react';
import HeaderLogo from './header/HeaderLogo';
import HeaderTitle from './header/HeaderTitle';
import HeaderControls from './header/HeaderControls';
import HeaderBottomSection from './header/HeaderBottomSection';
import { SearchHighlight } from '@/types/search';

interface RundownHeaderProps {
  currentTime: Date;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  totalRuntime: string;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  title: string;
  onTitleChange: (title: string) => void;
  rundownStartTime: string;
  onRundownStartTimeChange: (startTime: string) => void;
  items?: any[];
  visibleColumns?: any[];
  onHighlightMatch?: (itemId: string, field: string, startIndex: number, endIndex: number) => void;
  onReplaceText?: (itemId: string, field: string, searchText: string, replaceText: string, replaceAll: boolean) => void;
  currentHighlight?: SearchHighlight | null;
}

const RundownHeader = ({ 
  currentTime, 
  timezone, 
  onTimezoneChange, 
  totalRuntime,
  hasUnsavedChanges,
  isSaving,
  title,
  onTitleChange,
  rundownStartTime,
  onRundownStartTimeChange,
  items = [],
  visibleColumns = [],
  onHighlightMatch = () => {},
  onReplaceText = () => {}
}: RundownHeaderProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-3 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-4">
          <HeaderLogo />
          <HeaderTitle
            title={title}
            onTitleChange={onTitleChange}
            hasUnsavedChanges={hasUnsavedChanges}
            isSaving={isSaving}
          />
        </div>
        <HeaderControls
          currentTime={currentTime}
          timezone={timezone}
          onTimezoneChange={onTimezoneChange}
          items={items}
          visibleColumns={visibleColumns}
          onHighlightMatch={onHighlightMatch}
          onReplaceText={onReplaceText}
        />
      </div>

      <HeaderBottomSection
        totalRuntime={totalRuntime}
        rundownStartTime={rundownStartTime}
        onRundownStartTimeChange={onRundownStartTimeChange}
      />
    </div>
  );
};

export default RundownHeader;
