
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

  // Helper function to check if a URL is likely an image
  const isLikelyImageUrl = (url: string): boolean => {
    if (!url || !url.trim()) return false;
    return (
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) ||
      /\.(jpg|jpeg|png|gif|webp|svg)\?/i.test(url) ||
      url.includes('images') ||
      url.includes('photos') ||
      url.includes('imgur') ||
      url.includes('unsplash') ||
      url.includes('gstatic.com') ||
      url.includes('amazonaws.com') ||
      url.includes('cloudinary.com')
    );
  };

  // Helper function to render cell content
  const renderCellContent = (item: RundownItem, column: any, calculatedStartTime: string) => {
    // Get the raw value first
    let value;
    
    // Check if this is the images column specifically
    if (column.key === 'images' || column.id === 'images') {
      value = item.images || '';
    } else {
      value = getCellValue(item, column, rundownStartTime, calculatedStartTime);
    }
    
    // Special handling for images column - render as image if it's a valid URL
    if ((column.key === 'images' || column.id === 'images') && value && isLikelyImageUrl(value)) {
      return (
        <div className="flex items-center justify-center h-16">
          <img
            src={value}
            alt="Rundown image"
            className="max-w-16 max-h-16 object-contain rounded print:max-w-12 print:max-h-12"
            onError={(e) => {
              // If image fails to load, show the URL as text instead
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `<span class="text-xs text-gray-500">${value}</span>`;
              }
            }}
          />
        </div>
      );
    }
    
    return value;
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
      {/* Enhanced print styles with light mode colors */}
      <style>
        {`
          @media print {
            .print-table {
              width: 100% !important;
              table-layout: auto !important;
              font-size: 10px !important;
            }
            
            .print-table th,
            .print-table td {
              padding: 3px 4px !important;
              font-size: 10px !important;
              line-height: 1.3 !important;
              word-break: normal !important;
              overflow-wrap: break-word !important;
              white-space: normal !important;
              border: 0.5px solid #666 !important;
              vertical-align: top !important;
              background: white !important;
              color: black !important;
            }
            
            .print-table th {
              font-size: 9px !important;
              font-weight: bold !important;
              background: #f0f0f0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color: #000 !important;
            }
            
            .print-header-row {
              background: #e5e5e5 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color: black !important;
            }
            
            .print-current-segment {
              background: #3b82f6 !important;
              color: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .print-row-number {
              width: 40px !important;
              min-width: 40px !important;
              max-width: 40px !important;
            }
            
            .print-time-column {
              width: 80px !important;
              min-width: 80px !important;
              max-width: 80px !important;
            }
            
            .print-content-column {
              word-break: normal !important;
              overflow-wrap: break-word !important;
              white-space: normal !important;
            }
          }
        `}
      </style>
      <div className="overflow-hidden border border-border rounded-lg print:border-gray-400 print:overflow-visible">
        <table className="w-full print:text-xs print-table">
          <thead className="bg-muted print:bg-gray-100 sticky top-0 z-10 print:static">
            <tr className="print-header-row">
              <th className="px-2 py-1 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border print:border-gray-400 print-row-number print:text-black">
                #
              </th>
              {visibleColumns.map((column) => (
                <th
                  key={column.id}
                  className={`px-2 py-1 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border print:border-gray-400 print:text-black ${
                    ['duration', 'startTime', 'endTime', 'elapsedTime'].includes(column.key) 
                      ? 'print-time-column' 
                      : 'print-content-column'
                  }`}
                >
                  <div className="truncate">
                    {column.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-background divide-y divide-border print:divide-gray-400 print:bg-white">
            {itemsWithTimes.map(({ item, calculatedStartTime }, index) => {
              const isShowcallerCurrent = item.type !== 'header' && currentSegmentId === item.id;
              const isCurrentlyPlaying = isShowcallerCurrent && isPlaying;
              const isFloated = item.isFloating || item.isFloated;
              
              return (
                <tr
                  key={item.id}
                  className={`
                    ${item.type === 'header' ? 'bg-muted font-semibold print:bg-gray-200' : ''}
                    ${isFloated ? 'bg-red-800 text-white opacity-75' : ''}
                    print:break-inside-avoid print:border-0 print:bg-white print:text-black
                  `}
                  style={{ backgroundColor: item.color !== '#ffffff' && item.color && !isFloated && !isShowcallerCurrent ? item.color : undefined }}
                >
                  <td className="px-2 py-1 whitespace-nowrap text-sm border-r border-border print:border-gray-400 print-row-number print:text-black">
                    <div className="flex items-center">
                      {/* Blue play icon for current segment */}
                      {isShowcallerCurrent && (
                        <Play 
                          className="h-5 w-5 text-blue-500 fill-blue-500 mr-2 print:hidden" 
                        />
                      )}
                      {isFloated && (
                        <span className="text-yellow-400 mr-1 print:mr-0.5 print:text-black">🛟</span>
                      )}
                      <span>{getRowNumber(index, items)}</span>
                    </div>
                  </td>
                  
                  {visibleColumns.map((column) => {
                    // Check if this is the current segment and this is the segment name column
                    const isCurrentSegmentName = isShowcallerCurrent && 
                      (column.key === 'segmentName' || column.key === 'name');
                    
                    // For headers, handle special cases
                    if (item.type === 'header') {
                      if (column.key === 'segmentName' || column.key === 'name') {
                        // Show the header name for both segmentName and name columns
                        return (
                          <td key={column.id} className="px-2 py-1 text-sm border-r border-border print:border-gray-400 print-content-column print:text-black">
                            <div className="break-words whitespace-pre-wrap">{item.name || ''}</div>
                          </td>
                        );
                      } else if (column.key === 'duration') {
                        // Show the calculated header duration (excluding floated items)
                        return (
                          <td key={column.id} className="px-2 py-1 text-sm text-muted-foreground border-r border-border print:border-gray-400 print-time-column print:text-gray-600">
                            <div className="break-words whitespace-pre-wrap">({calculateHeaderDuration(index)})</div>
                          </td>
                        );
                      } else if (column.key === 'startTime' || column.key === 'endTime' || column.key === 'elapsedTime') {
                        // Don't show time fields for headers
                        return (
                          <td key={column.id} className="px-2 py-1 text-sm border-r border-border print:border-gray-400 print-time-column">
                            <div className="break-words whitespace-pre-wrap"></div>
                          </td>
                        );
                      } else {
                        // For other columns, show empty cell for headers
                        return (
                          <td key={column.id} className="px-2 py-1 text-sm border-r border-border print:border-gray-400 print-content-column">
                            <div className="break-words whitespace-pre-wrap"></div>
                          </td>
                        );
                      }
                    }
                    
                    // For regular items, render content with special highlighting for current segment name
                    return (
                      <td
                        key={column.id}
                        className={`px-2 py-1 text-sm border-r border-border print:border-gray-400 ${
                          ['duration', 'startTime', 'endTime', 'elapsedTime'].includes(column.key) 
                            ? 'print-time-column' 
                            : 'print-content-column'
                        } ${isFloated ? 'text-white' : 'text-foreground print:text-black'} ${
                          isCurrentSegmentName ? 'bg-blue-500 text-white print-current-segment' : ''
                        }`}
                      >
                        <div className="break-words whitespace-pre-wrap">
                          {renderCellContent(item, column, calculatedStartTime)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default SharedRundownTable;
