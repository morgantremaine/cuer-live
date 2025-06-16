
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
    <>
      <style>
        {`
          @media print {
            .print-table {
              width: 100% !important;
              table-layout: fixed !important;
              font-size: 9px !important;
            }
            
            .print-table th,
            .print-table td {
              padding: 2px 3px !important;
              font-size: 9px !important;
              line-height: 1.2 !important;
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              hyphens: auto !important;
              border: 0.5px solid #666 !important;
            }
            
            .print-table th {
              font-size: 8px !important;
              font-weight: bold !important;
              padding: 3px 2px !important;
              background: #f0f0f0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color: #000 !important;
            }
            
            .print-header-row {
              background: #e5e5e5 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .print-truncate {
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
            }
            
            .print-break-words {
              word-break: break-all !important;
              hyphens: auto !important;
              overflow-wrap: break-word !important;
            }
            
            .print-header-text {
              font-weight: bold !important;
              color: #000 !important;
              font-size: 8px !important;
              text-transform: uppercase !important;
            }
          }
        `}
      </style>
      <div className="overflow-hidden border border-gray-200 rounded-lg print:border-gray-400 print:overflow-visible">
        <table className="w-full print:text-xs print-table">
          <thead className="bg-gray-50 print:bg-gray-100 sticky top-0 z-10 print:static">
            <tr className="print-header-row">
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 print:border-gray-400 print:px-1 print:py-0.5">
                <span className="print-header-text">#</span>
              </th>
              {visibleColumns.map((column) => (
                <th
                  key={column.id}
                  className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 print:border-gray-400 print:px-1 print:py-0.5 print:max-w-0 print:overflow-hidden"
                >
                  <div className="truncate print-truncate">
                    <span className="print-header-text">{column.name}</span>
                  </div>
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
                      print:break-inside-avoid print:border-0
                    `}
                    style={{ backgroundColor: item.color !== '#ffffff' && item.color && !isFloated && !isShowcallerCurrent ? item.color : undefined }}
                  >
                    <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200 print:border-gray-400 print:px-1 print:py-0.5 print:text-xs">
                      <div className="flex items-center">
                        {/* Blue play icon - matching main rundown styling */}
                        {isShowcallerCurrent && (
                          <Play 
                            className="h-3 w-3 text-blue-500 fill-blue-500 mr-2 print:hidden" 
                          />
                        )}
                        {isFloated && (
                          <span className="text-yellow-400 mr-1 print:mr-0.5">🛟</span>
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
                            <td key={column.id} className="px-2 py-1 text-sm text-gray-900 border-r border-gray-200 print:border-gray-400 print:px-1 print:py-0.5 print:text-xs print:max-w-0">
                              <div className="break-words whitespace-pre-wrap print-break-words">{item.name || ''}</div>
                            </td>
                          );
                        } else if (column.key === 'duration') {
                          // Show the calculated header duration (excluding floated items)
                          return (
                            <td key={column.id} className="px-2 py-1 text-sm text-gray-600 border-r border-gray-200 print:border-gray-400 print:px-1 print:py-0.5 print:text-xs print:max-w-0">
                              <div className="break-words whitespace-pre-wrap print-break-words">({calculateHeaderDuration(index)})</div>
                            </td>
                          );
                        } else if (column.key === 'startTime' || column.key === 'endTime' || column.key === 'elapsedTime') {
                          // Don't show time fields for headers
                          return (
                            <td key={column.id} className="px-2 py-1 text-sm text-gray-900 border-r border-gray-200 print:border-gray-400 print:px-1 print:py-0.5 print:text-xs print:max-w-0">
                              <div className="break-words whitespace-pre-wrap print-break-words"></div>
                            </td>
                          );
                        } else {
                          // For other columns, show empty cell for headers
                          return (
                            <td key={column.id} className="px-2 py-1 text-sm text-gray-900 border-r border-gray-200 print:border-gray-400 print:px-1 print:py-0.5 print:text-xs print:max-w-0">
                              <div className="break-words whitespace-pre-wrap print-break-words"></div>
                            </td>
                          );
                        }
                      }
                      
                      // For regular items, use the calculated times
                      const value = getCellValue(item, column, rundownStartTime, calculatedStartTime);
                      
                      return (
                        <td
                          key={column.id}
                          className={`px-2 py-1 text-sm border-r border-gray-200 print:border-gray-400 print:px-1 print:py-0.5 print:text-xs print:max-w-0 ${isFloated ? 'text-white' : 'text-gray-900'}`}
                        >
                          <div className="break-words whitespace-pre-wrap print-break-words">{value}</div>
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
    </>
  );
};

export default SharedRundownTable;
