
import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';
import { useTheme } from '@/hooks/useTheme';
import { getVisibleColumns } from '@/utils/sharedRundownUtils';
import { getCellValue } from '@/utils/sharedRundownUtils';
import { getRowNumber } from '@/utils/sharedRundownUtils';
import { getContrastTextColor } from '@/utils/colorUtils';
import { Play } from 'lucide-react';

const ADView = () => {
  const { id } = useParams();
  const { coreState } = useRundownStateCoordination();
  const { isDark } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const [dynamicRowHeight, setDynamicRowHeight] = useState(60);

  // Calculate dynamic row height based on available space
  useEffect(() => {
    const calculateRowHeight = () => {
      if (!containerRef.current || !headerRef.current || !controlsRef.current) return;

      const containerHeight = containerRef.current.clientHeight;
      const headerHeight = headerRef.current.clientHeight;
      const controlsHeight = controlsRef.current.clientHeight;
      
      // Account for padding and margins (approximate)
      const padding = 40;
      const availableHeight = containerHeight - headerHeight - controlsHeight - padding;
      
      // Get visible columns to determine how many rows of content we have
      const visibleColumns = getVisibleColumns(coreState.visibleColumns);
      const itemCount = coreState.items.length;
      
      if (itemCount > 0) {
        // Calculate optimal row height, with min and max constraints
        const calculatedRowHeight = Math.max(40, Math.min(120, availableHeight / itemCount));
        setDynamicRowHeight(calculatedRowHeight);
      }
    };

    // Calculate on mount and window resize
    calculateRowHeight();
    
    const resizeObserver = new ResizeObserver(calculateRowHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [coreState.items.length, coreState.visibleColumns]);

  const visibleColumns = getVisibleColumns(coreState.visibleColumns);

  // Helper function to render cell content with proper sizing
  const renderCellContent = (item: any, column: any) => {
    const value = getCellValue(item, column, coreState.rundownStartTime, '00:00:00');
    
    // For custom columns, truncate long content
    if (column.key && !['segmentName', 'duration', 'startTime', 'endTime'].includes(column.key)) {
      const maxLength = Math.floor(dynamicRowHeight / 3); // Adjust based on row height
      if (typeof value === 'string' && value.length > maxLength) {
        return value.substring(0, maxLength) + '...';
      }
    }
    
    return value;
  };

  if (!id) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div>No rundown ID provided</div>
      </div>
    );
  }

  if (coreState.isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-xl">Loading rundown...</div>
      </div>
    );
  }

  if (!coreState.items || coreState.items.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div>No rundown items found</div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden"
    >
      {/* Header Section */}
      <div 
        ref={headerRef}
        className="flex-shrink-0 p-4 border-b border-gray-700"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">TIMING STATUS</div>
            <div className={`text-lg font-bold ${coreState.isPlaying ? 'text-green-400' : 'text-green-400'}`}>
              {coreState.isPlaying ? 'LIVE' : 'PAUSED'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center space-x-2">
              <Play className="h-6 w-6 text-blue-500" />
              <span className="text-xl font-bold">{coreState.rundownTitle}</span>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-400">TIME OF DAY</div>
            <div className="text-blue-400 text-lg font-mono">
              {coreState.currentTime?.toLocaleTimeString('en-US', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Dynamically Sized */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 flex-shrink-0 p-4 space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">SHOW ELAPSED</div>
            <div className="text-blue-400 text-2xl font-mono">
              {coreState.currentSegmentId ? '00:00:00' : '00:00:00'}
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">SHOW REMAINING</div>
            <div className="text-orange-400 text-2xl font-mono">
              {coreState.totalRuntime || '00:00:00'}
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">ITEM ELAPSED</div>
            <div className="text-green-400 text-2xl font-mono">
              {coreState.timeRemaining ? '00:00' : '00:00'}
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">ITEM REMAINING</div>
            <div className="text-yellow-400 text-2xl font-mono">
              {typeof coreState.timeRemaining === 'string' ? coreState.timeRemaining : '00:00'}
            </div>
          </div>
        </div>

        {/* Center Content - Rundown Table with Dynamic Height */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="h-full bg-gray-800 rounded-lg overflow-hidden">
            <div className="h-full flex flex-col">
              {/* Table Content */}
              <div className="flex-1 overflow-hidden">
                <table className="w-full h-full">
                  <tbody className="h-full">
                    {coreState.items.map((item, index) => {
                      const isCurrentSegment = item.id === coreState.currentSegmentId;
                      const isFloated = item.isFloating || item.isFloated;
                      
                      // Determine row styling
                      let rowBackgroundColor = undefined;
                      let textColor = '#ffffff';
                      
                      if (item.type === 'header') {
                        rowBackgroundColor = '#374151'; // gray-700
                      } else if (isFloated) {
                        rowBackgroundColor = '#dc2626'; // red-600
                      } else if (item.color && item.color !== '#ffffff' && item.color !== '#FFFFFF' && item.color !== '') {
                        rowBackgroundColor = item.color;
                        textColor = getContrastTextColor(item.color);
                      }
                      
                      const rowStyles: React.CSSProperties = {
                        height: `${dynamicRowHeight}px`,
                        backgroundColor: rowBackgroundColor,
                        color: textColor
                      };
                      
                      return (
                        <tr
                          key={item.id}
                          className={`border-b border-gray-700 ${isCurrentSegment ? 'ring-2 ring-blue-500' : ''}`}
                          style={rowStyles}
                        >
                          {/* Row Number */}
                          <td className="px-3 py-2 text-center align-middle" style={{ width: '60px' }}>
                            <div className="flex items-center justify-center">
                              {isCurrentSegment && (
                                <Play className="h-4 w-4 text-blue-500 fill-blue-500 mr-1" />
                              )}
                              {isFloated && (
                                <span className="text-yellow-400 mr-1">🛟</span>
                              )}
                              <span className="text-sm">{getRowNumber(index, coreState.items)}</span>
                            </div>
                          </td>
                          
                          {/* Dynamic Columns */}
                          {visibleColumns.map((column) => {
                            const isSegmentNameColumn = column.key === 'segmentName' || column.key === 'name';
                            
                            return (
                              <td
                                key={column.id}
                                className={`px-3 py-2 align-middle ${
                                  isCurrentSegment && isSegmentNameColumn ? 'bg-blue-600' : ''
                                }`}
                                style={{
                                  fontSize: `${Math.max(12, dynamicRowHeight / 5)}px`,
                                  lineHeight: '1.2'
                                }}
                              >
                                <div 
                                  className="break-words overflow-hidden"
                                  style={{
                                    maxHeight: `${dynamicRowHeight - 16}px`,
                                    display: '-webkit-box',
                                    WebkitLineClamp: Math.floor(dynamicRowHeight / 20),
                                    WebkitBoxOrient: 'vertical'
                                  }}
                                >
                                  {item.type === 'header' ? (
                                    isSegmentNameColumn ? (
                                      <strong>{item.name || ''}</strong>
                                    ) : column.key === 'duration' ? (
                                      <span className="text-sm text-gray-400">
                                        ({coreState.calculateHeaderDuration(index)})
                                      </span>
                                    ) : ''
                                  ) : (
                                    renderCellContent(item, column)
                                  )}
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
            </div>
          </div>
        </div>

        {/* Right Sidebar - Script */}
        <div className="w-96 flex-shrink-0 p-4">
          <div className="h-full bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm text-gray-400 mb-4 uppercase tracking-wider">Current Script</h3>
            <div className="text-white leading-relaxed overflow-y-auto h-full">
              {coreState.currentSegmentId ? (
                (() => {
                  const currentItem = coreState.items.find(item => item.id === coreState.currentSegmentId);
                  return currentItem?.script || 'No script available for current segment.';
                })()
              ) : (
                'No segment currently playing.'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div 
        ref={controlsRef}
        className="flex-shrink-0 p-4 border-t border-gray-700"
      >
        <div className="flex justify-center items-center space-x-4">
          <div className="text-sm text-gray-400">Additional Columns:</div>
          <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm">
            ➕ Add Column
          </button>
          <button className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-sm">
            👁️ Hide Script
          </button>
        </div>
      </div>
    </div>
  );
};

export default ADView;
