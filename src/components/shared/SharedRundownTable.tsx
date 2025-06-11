import React from 'react';
import { RundownItem } from '@/types/rundown';
import { getRowNumber, getCellValue } from '@/utils/sharedRundownUtils';
import { Play } from 'lucide-react';

interface SharedRundownTableProps {
  items: RundownItem[];
  visibleColumns: any[];
  currentSegmentId: string | null;
  isPlaying?: boolean;
  rundownStartTime?: string;
}

const SharedRundownTable = ({ 
  items, 
  visibleColumns, 
  currentSegmentId, 
  isPlaying = false,
  rundownStartTime = '09:00:00'
}: SharedRundownTableProps) => {
  // Helper function to convert time string to seconds
  const timeToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      const [minutes, seconds] = parts;
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  };

  // Helper function to convert seconds to time string
  const secondsToTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate start times for all items based on their position and durations
  const calculateItemTimes = () => {
    let currentTime = rundownStartTime;
    const itemsWithTimes: Array<{ item: RundownItem; calculatedStartTime: string }> = [];

    items.forEach((item, index) => {
      if (item.type === 'header') {
        // Headers don't advance time
        itemsWithTimes.push({ item, calculatedStartTime: currentTime });
      } else {
        // Regular items
        itemsWithTimes.push({ item, calculatedStartTime: currentTime });
        
        // Only advance time if item is not floated
        if (!item.isFloating && !item.isFloated && item.duration) {
          const durationSeconds = timeToSeconds(item.duration);
          const currentSeconds = timeToSeconds(currentTime);
          currentTime = secondsToTime(currentSeconds + durationSeconds);
        }
      }
    });

    return itemsWithTimes;
  };

  const calculateHeaderDuration = (headerIndex: number) => {
    if (headerIndex < 0 || headerIndex >= items.length || items[headerIndex].type !== 'header') {
      return '00:00:00';
    }

    let totalSeconds = 0;
    let i = headerIndex + 1;

    while (i < items.length && items[i].type !== 'header') {
      // Only count non-floated items in header duration
      if (!items[i].isFloating && !items[i].isFloated) {
        totalSeconds += timeToSeconds(items[i].duration || '00:00');
      }
      i++;
    }

    return secondsToTime(totalSeconds);
  };

  const itemsWithTimes = calculateItemTimes();

  return (
    <div className="overflow-hidden border border-gray-200 rounded-lg print:border-gray-400">
      <table className="w-full">
        <thead className="bg-gray-50 print:bg-gray-100 sticky top-0 z-10">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 print:border-gray-400">
              #
            </th>
            {visibleColumns.map((column) => (
              <th
                key={column.id}
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 print:border-gray-400"
              >
                {column.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200 print:divide-gray-400">
          {itemsWithTimes.map(({ item, calculatedStartTime }, index) => {
            const isShowcallerCurrent = item.type !== 'header' && currentSegmentId === item.id;
            const isCurrentlyPlaying = isShowcallerCurrent && isPlaying;
            const isFloated = item.isFloating || item.isFloated;
            
            return (
              <React.Fragment key={item.id}>
                {/* Green line above current row - no spacing, just the line */}
                {isShowcallerCurrent && (
                  <tr className="print:hidden">
                    <td colSpan={visibleColumns.length + 1} className="p-0">
                      <div className="h-1 bg-green-500"></div>
                    </td>
                  </tr>
                )}
                
                <tr
                  className={`
                    ${item.type === 'header' ? 'bg-gray-100 font-semibold print:bg-gray-200' : ''}
                    ${isFloated ? 'bg-red-800 text-white opacity-75' : ''}
                    ${isShowcallerCurrent ? 'bg-blue-50 border-l-4 border-blue-500' : ''}
                    print:break-inside-avoid
                  `}
                  style={{ backgroundColor: item.color !== '#ffffff' && item.color && !isFloated && !isShowcallerCurrent ? item.color : undefined }}
                >
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200 print:border-gray-400">
                    <div className="flex items-center">
                      {/* Blue play icon - matching main rundown styling */}
                      {isShowcallerCurrent && (
                        <Play 
                          className="h-3 w-3 text-blue-500 fill-blue-500 mr-2 print:hidden" 
                        />
                      )}
                      {isFloated && (
                        <span className="text-yellow-400 mr-1">🛟</span>
                      )}
                      <span>{getRowNumber(index, items)}</span>
                    </div>
                  </td>
                  
                  {visibleColumns.map((column) => {
                    // For headers, handle special cases
                    if (item.type === 'header') {
                      if (column.key === 'segmentName') {
                        // Show the header name
                        return (
                          <td key={column.id} className="px-3 py-2 text-sm text-gray-900 border-r border-gray-200 print:border-gray-400">
                            <div className="break-words whitespace-pre-wrap">{item.name || ''}</div>
                          </td>
                        );
                      } else if (column.key === 'duration') {
                        // Show the calculated header duration (excluding floated items)
                        return (
                          <td key={column.id} className="px-3 py-2 text-sm text-gray-600 border-r border-gray-200 print:border-gray-400">
                            <div className="break-words whitespace-pre-wrap">({calculateHeaderDuration(index)})</div>
                          </td>
                        );
                      } else if (column.key === 'startTime' || column.key === 'endTime' || column.key === 'elapsedTime') {
                        // Don't show time fields for headers
                        return (
                          <td key={column.id} className="px-3 py-2 text-sm text-gray-900 border-r border-gray-200 print:border-gray-400">
                            <div className="break-words whitespace-pre-wrap"></div>
                          </td>
                        );
                      } else {
                        // For other columns, show empty cell for headers
                        return (
                          <td key={column.id} className="px-3 py-2 text-sm text-gray-900 border-r border-gray-200 print:border-gray-400">
                            <div className="break-words whitespace-pre-wrap"></div>
                          </td>
                        );
                      }
                    }
                    
                    // For regular items, use the calculated times
                    const value = getCellValue(item, column, rundownStartTime, calculatedStartTime);
                    
                    return (
                      <td
                        key={column.id}
                        className={`px-3 py-2 text-sm border-r border-gray-200 print:border-gray-400 ${isFloated ? 'text-white' : 'text-gray-900'}`}
                      >
                        <div className="break-words whitespace-pre-wrap">{value}</div>
                      </td>
                    );
                  })}
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SharedRundownTable;
