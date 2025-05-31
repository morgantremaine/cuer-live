
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { RundownItem } from '@/types/rundown';
import { format } from 'date-fns';

const SharedRundown = () => {
  const { id: rundownId } = useParams<{ id: string }>();
  const { savedRundowns, loading } = useRundownStorage();
  const [rundownData, setRundownData] = useState<{
    title: string;
    items: RundownItem[];
    columns: any[];
    startTime: string;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load rundown data
  useEffect(() => {
    if (loading || !rundownId) return;

    const rundown = savedRundowns.find(r => r.id === rundownId);
    if (rundown) {
      setRundownData({
        title: rundown.title,
        items: rundown.items || [],
        columns: rundown.columns || [],
        startTime: rundown.startTime || '09:00'
      });
    }
  }, [rundownId, savedRundowns, loading]);

  // Calculate current segment based on time
  useEffect(() => {
    if (!rundownData) return;

    const now = currentTime;
    const todayDateStr = format(now, 'yyyy-MM-dd');
    
    for (const item of rundownData.items) {
      if (item.type === 'header') continue;
      
      const startDateTime = new Date(`${todayDateStr}T${item.startTime}`);
      const endDateTime = new Date(`${todayDateStr}T${item.endTime}`);
      
      if (now >= startDateTime && now <= endDateTime) {
        setCurrentSegmentId(item.id);
        return;
      }
    }
    setCurrentSegmentId(null);
  }, [currentTime, rundownData]);

  const getVisibleColumns = () => {
    if (!rundownData?.columns) return [];
    return rundownData.columns.filter(col => col.isVisible !== false);
  };

  const getRowNumber = (index: number) => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let letterIndex = 0;
    let numberIndex = 0;
    
    // Count actual rows (both headers and regular items)
    for (let i = 0; i <= index; i++) {
      if (rundownData?.items[i]?.type === 'header') {
        letterIndex++;
        numberIndex = 0; // Reset number for new section
      } else {
        numberIndex++;
      }
    }
    
    const currentItem = rundownData?.items[index];
    if (currentItem?.type === 'header') {
      // For headers, just return the letter
      return letters[letterIndex - 1] || 'A';
    } else {
      // For regular items, return letter + number
      const letter = letters[letterIndex - 1] || 'A';
      return `${letter}${numberIndex}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg text-gray-600">Loading rundown...</div>
      </div>
    );
  }

  if (!rundownData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg text-gray-600">Rundown not found</div>
      </div>
    );
  }

  const visibleColumns = getVisibleColumns();

  return (
    <div className="min-h-screen bg-white p-4 print:p-2">
      {/* Header */}
      <div className="mb-6 print:mb-4">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-2xl font-bold text-gray-900 print:text-xl">
            {rundownData.title}
          </h1>
          <div className="text-right text-sm text-gray-600">
            <div>Live at {format(currentTime, 'HH:mm:ss')}</div>
            <div>Start: {rundownData.startTime}</div>
          </div>
        </div>
        
        {currentSegmentId && (
          <div className="bg-red-100 border-l-4 border-red-500 p-3 print:p-2">
            <div className="flex items-center">
              <div className="text-red-600 font-semibold mr-2">● LIVE</div>
              <div className="text-red-800">
                {rundownData.items.find(item => item.id === currentSegmentId)?.name || 'Current Segment'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden border border-gray-200 rounded-lg print:border-gray-400">
        <table className="w-full">
          <thead className="bg-gray-50 print:bg-gray-100">
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
            {rundownData.items.map((item, index) => {
              const isCurrentSegment = currentSegmentId === item.id;
              
              return (
                <tr
                  key={item.id}
                  className={`
                    ${item.type === 'header' ? 'bg-gray-100 font-semibold print:bg-gray-200' : ''}
                    ${isCurrentSegment ? 'bg-red-50 border-l-4 border-red-500' : ''}
                    print:break-inside-avoid
                  `}
                  style={{ backgroundColor: item.color !== '#ffffff' && item.color ? item.color : undefined }}
                >
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200 print:border-gray-400">
                    {isCurrentSegment && (
                      <span className="text-red-600 mr-1">▶</span>
                    )}
                    {getRowNumber(index)}
                  </td>
                  
                  {visibleColumns.map((column) => {
                    let value = '';
                    switch (column.key) {
                      case 'segmentName':
                        // Only show name if it's not the default placeholder text
                        value = (item.name && item.name !== 'New Header' && item.name !== 'New Segment') ? item.name : '';
                        break;
                      case 'duration':
                        value = item.duration || '';
                        break;
                      case 'startTime':
                        value = item.startTime || '';
                        break;
                      case 'endTime':
                        value = item.endTime || '';
                        break;
                      case 'notes':
                        value = item.notes || '';
                        break;
                      default:
                        value = item.customFields?.[column.key] || '';
                    }
                    
                    return (
                      <td
                        key={column.id}
                        className="px-3 py-2 text-sm text-gray-900 border-r border-gray-200 print:border-gray-400"
                      >
                        <div className="break-words">{value}</div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Print footer */}
      <div className="mt-4 text-gray-500 text-sm text-center hidden print:block">
        Generated from {window.location.hostname} • {format(new Date(), 'yyyy-MM-dd HH:mm')}
      </div>
      
      {/* Screen-only footer with print button */}
      <div className="mt-4 flex justify-between items-center print:hidden">
        <div className="text-sm text-gray-500">
          This is a read-only view of the rundown. Updates appear live.
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 text-sm flex items-center"
        >
          <span className="mr-1">📄</span> Print View
        </button>
      </div>
    </div>
  );
};

export default SharedRundown;
