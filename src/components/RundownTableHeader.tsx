
import React from 'react';
import { Column } from '@/types/columns';
import ResizableColumnHeader from './ResizableColumnHeader';
import ShowcallerTimingIndicator from './showcaller/ShowcallerTimingIndicator';
import { TimingStatus } from '@/hooks/useShowcallerUnifiedTiming';

interface RundownTableHeaderProps {
  columns: Column[];
  getColumnWidth: (columnId: string) => number;
  onColumnResize: (columnId: string, width: number) => void;
  timingStatus?: TimingStatus;
}

const RundownTableHeader = ({ 
  columns, 
  getColumnWidth, 
  onColumnResize,
  timingStatus 
}: RundownTableHeaderProps) => {
  return (
    <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center min-h-[48px]">
        {/* Timing indicator - positioned at the start */}
        {timingStatus && (
          <div className="flex-shrink-0 px-4">
            <ShowcallerTimingIndicator
              isOnTime={timingStatus.isOnTime}
              isAhead={timingStatus.isAhead}
              timeDifference={timingStatus.timeDifference}
              isVisible={timingStatus.isVisible}
            />
          </div>
        )}
        
        {/* Column headers */}
        <div className="flex flex-1">
          {columns.map((column) => (
            <ResizableColumnHeader
              key={column.id}
              column={column}
              width={getColumnWidth(column.id)}
              onResize={(width) => onColumnResize(column.id, width)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RundownTableHeader;
