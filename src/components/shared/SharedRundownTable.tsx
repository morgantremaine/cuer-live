
import React from 'react';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { format } from 'date-fns';

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

  // Simple row status calculation for shared view
  const getSimpleRowStatus = (item: RundownItem): 'upcoming' | 'current' | 'completed' => {
    // For shared view, we'll use a simplified status based on current time
    // This is less complex than the full calculation system
    const now = new Date();
    const currentTimeString = now.toTimeString().slice(0, 8);
    
    // If we have start and end times, use them for comparison
    if (item.startTime && item.endTime) {
      if (currentTimeString >= item.startTime && currentTimeString < item.endTime) {
        return 'current';
      } else if (currentTimeString >= item.endTime) {
        return 'completed';
      }
    }
    
    return 'upcoming';
  };

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
                  className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider print:px-1 print:py-1 ${
                    isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}
                  style={{ width: column.width }}
                >
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`${isDark ? 'bg-gray-900' : 'bg-white'} divide-y ${
            isDark ? 'divide-gray-700' : 'divide-gray-200'
          }`}>
            {items.map((item, index) => {
              const rowStatus = getSimpleRowStatus(item);
              const isCurrentSegment = currentSegmentId === item.id;
              
              return (
                <tr
                  key={item.id}
                  data-item-id={item.id}
                  className={`
                    ${isCurrentSegment && isPlaying ? (
                      isDark ? 'bg-blue-900 border-blue-600' : 'bg-blue-50 border-blue-200'
                    ) : rowStatus === 'current' ? (
                      isDark ? 'bg-yellow-900 border-yellow-600' : 'bg-yellow-50 border-yellow-200'
                    ) : rowStatus === 'completed' ? (
                      isDark ? 'bg-green-900 border-green-600' : 'bg-green-50 border-green-200'
                    ) : (
                      isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                    )}
                    transition-colors print:break-inside-avoid
                  `}
                >
                  {visibleColumns.map((column) => {
                    let cellContent;
          
                    switch (column.key) {
                      case 'segmentName':
                        cellContent = item.segmentName || item.name;
                        break;
                      case 'duration':
                        cellContent = item.duration;
                        break;
                      case 'startTime':
                        cellContent = formatTime(item.startTime || '00:00');
                        break;
                      case 'endTime':
                        cellContent = formatTime(item.endTime || '00:00');
                        break;
                      case 'description':
                        cellContent = item.notes;
                        break;
                      default:
                        cellContent = item[column.key] || '';
                    }
          
                    return (
                      <td
                        key={column.id}
                        className={`px-3 py-2 text-sm print:px-1 print:py-1 ${
                          isDark ? 'text-gray-300' : 'text-gray-900'
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
