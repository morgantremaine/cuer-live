
import React from 'react';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { format } from 'date-fns';
import { calculateItemsWithTiming, CalculatedRundownItem, getRowStatus } from '@/utils/rundownCalculations';
import { getCellValue } from '@/utils/sharedRundownUtils';

interface SharedRundownTableProps {
  items: RundownItem[];
  visibleColumns: Column[];
  currentSegmentId: string | null;
  isPlaying: boolean;
  rundownStartTime: string;
  isDark: boolean;
}

const SharedRundownTable = ({
  items,
  visibleColumns,
  currentSegmentId,
  isPlaying,
  rundownStartTime,
  isDark
}: SharedRundownTableProps) => {

  // Calculate all items with timing and row numbers
  const calculatedItems = calculateItemsWithTiming(items, rundownStartTime);

  // Helper function to format time
  const formatTime = (time: string): string => {
    try {
      const [hours, minutes] = time.split(':');
      return `${hours}:${minutes}`;
    } catch (error) {
      console.error("Error formatting time:", error);
      return "Invalid Time";
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="overflow-x-auto flex-1">
        <table className="w-full border-collapse min-w-max">
          <thead className={`sticky top-0 z-10 ${
            isDark ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'
          } border-b`}>
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column.id}
                  className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider border-r print:px-1 print:py-1 ${
                    isDark ? 'text-gray-300 border-gray-600' : 'text-gray-500 border-gray-200'
                  }`}
                  style={{ width: column.width }}
                >
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`${isDark ? 'bg-gray-900' : 'bg-white'}`}>
            {calculatedItems.map((item, index) => {
              const currentTime = new Date();
              const rowStatus = getRowStatus(item, currentTime);
              const isCurrentSegment = currentSegmentId === item.id;
              
              // Determine row background color with proper priority
              let rowBackgroundColor = '';
              let rowBorderColor = '';
              let customStyle = {};
              
              if (isCurrentSegment && isPlaying) {
                // Highest priority: Currently playing segment - blue
                rowBackgroundColor = isDark ? 'bg-blue-900' : 'bg-blue-50';
                rowBorderColor = isDark ? 'border-blue-600' : 'border-blue-200';
              } else if (rowStatus === 'current') {
                // Second priority: Current time segment - yellow
                rowBackgroundColor = isDark ? 'bg-yellow-900' : 'bg-yellow-50';
                rowBorderColor = isDark ? 'border-yellow-600' : 'border-yellow-200';
              } else if (rowStatus === 'completed') {
                // Third priority: Completed segment - green
                rowBackgroundColor = isDark ? 'bg-green-900' : 'bg-green-50';
                rowBorderColor = isDark ? 'border-green-600' : 'border-green-200';
              } else if (item.color && item.color !== '#FFFFFF' && item.color !== '#ffffff') {
                // Fourth priority: Custom row color
                rowBackgroundColor = '';
                rowBorderColor = isDark ? 'border-gray-700' : 'border-gray-200';
                customStyle = { backgroundColor: item.color };
              } else {
                // Default row
                rowBackgroundColor = isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50';
                rowBorderColor = isDark ? 'border-gray-700' : 'border-gray-200';
              }
              
              return (
                <tr
                  key={item.id}
                  data-item-id={item.id}
                  className={`
                    ${rowBackgroundColor} ${rowBorderColor} border-b
                    transition-colors print:break-inside-avoid
                  `}
                  style={customStyle}
                >
                  {visibleColumns.map((column) => {
                    let cellContent;
          
                    switch (column.key) {
                      case 'rowNumber':
                        cellContent = item.calculatedRowNumber;
                        break;
                      case 'segmentName':
                        cellContent = item.segmentName || item.name;
                        break;
                      case 'duration':
                        cellContent = item.duration;
                        break;
                      case 'startTime':
                        cellContent = formatTime(item.calculatedStartTime || '00:00');
                        break;
                      case 'endTime':
                        cellContent = formatTime(item.calculatedEndTime || '00:00');
                        break;
                      case 'elapsedTime':
                        cellContent = formatTime(item.calculatedElapsedTime || '00:00');
                        break;
                      case 'description':
                      case 'notes':
                        cellContent = item.notes;
                        break;
                      case 'talent':
                        cellContent = item.talent;
                        break;
                      case 'script':
                        cellContent = item.script;
                        break;
                      case 'gfx':
                        cellContent = item.gfx;
                        break;
                      case 'video':
                        cellContent = item.video;
                        break;
                      case 'images':
                        cellContent = item.images;
                        break;
                      default:
                        // Handle custom fields and any other properties
                        if (column.isCustom) {
                          cellContent = item.customFields?.[column.key] || '';
                        } else {
                          cellContent = (item as any)[column.key] || '';
                        }
                    }
          
                    return (
                      <td
                        key={column.id}
                        className={`px-3 py-2 text-sm border-r print:px-1 print:py-1 ${
                          isDark ? 'text-gray-300 border-gray-600' : 'text-gray-900 border-gray-200'
                        }`}
                        style={{ width: column.width }}
                      >
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SharedRundownTable;
