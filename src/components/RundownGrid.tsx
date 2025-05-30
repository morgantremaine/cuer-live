import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Play, Clock, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RundownItem {
  id: string;
  segmentName: string;
  duration: string;
  startTime: string;
  endTime: string;
  notes: string;
  status: 'upcoming' | 'current' | 'completed';
  color?: string;
}

const RundownGrid = () => {
  const [items, setItems] = useState<RundownItem[]>([
    {
      id: '1',
      segmentName: 'Opening Headlines',
      duration: '00:02:30',
      startTime: '18:00:00',
      endTime: '18:02:30',
      notes: 'Live from studio A',
      status: 'upcoming'
    },
    {
      id: '2',
      segmentName: 'Weather Report',
      duration: '00:03:00',
      startTime: '18:02:30',
      endTime: '18:05:30',
      notes: 'Green screen setup',
      status: 'upcoming'
    },
    {
      id: '3',
      segmentName: 'Breaking News',
      duration: '00:05:00',
      startTime: '18:05:30',
      endTime: '18:10:30',
      notes: 'VTR ready',
      status: 'upcoming'
    }
  ]);

  const [selectedCell, setSelectedCell] = useState<{ itemId: string; field: keyof RundownItem } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});

  const colorOptions = [
    { name: 'Default', value: '' },
    { name: 'Red', value: '#fef2f2' },
    { name: 'Orange', value: '#fff7ed' },
    { name: 'Yellow', value: '#fefce8' },
    { name: 'Green', value: '#f0fdf4' },
    { name: 'Blue', value: '#eff6ff' },
    { name: 'Purple', value: '#faf5ff' },
    { name: 'Pink', value: '#fdf2f8' },
    { name: 'Gray', value: '#f9fafb' }
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString('en-US', { hour12: false });
  };

  const timeToSeconds = (timeStr: string) => {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  };

  const secondsToTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateEndTime = (startTime: string, duration: string) => {
    const startSeconds = timeToSeconds(startTime);
    const durationSeconds = timeToSeconds(duration);
    return secondsToTime(startSeconds + durationSeconds);
  };

  const updateItem = (id: string, field: keyof RundownItem, value: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-calculate end time when start time or duration changes
        if (field === 'startTime' || field === 'duration') {
          updatedItem.endTime = calculateEndTime(updatedItem.startTime, updatedItem.duration);
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const updateItemColor = (id: string, color: string) => {
    updateItem(id, 'color', color);
    setShowColorPicker(null);
  };

  const addRow = () => {
    const newId = (items.length + 1).toString();
    const lastItem = items[items.length - 1];
    const newStartTime = lastItem ? lastItem.endTime : '18:00:00';
    
    const newItem: RundownItem = {
      id: newId,
      segmentName: 'New Segment',
      duration: '00:01:00',
      startTime: newStartTime,
      endTime: calculateEndTime(newStartTime, '00:01:00'),
      notes: '',
      status: 'upcoming'
    };
    
    setItems(prev => [...prev, newItem]);
  };

  const deleteRow = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleCellClick = (itemId: string, field: keyof RundownItem) => {
    setSelectedCell({ itemId, field });
  };

  const handleKeyDown = (e: React.KeyboardEvent, itemId: string, field: keyof RundownItem) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentIndex = items.findIndex(item => item.id === itemId);
      const fields: (keyof RundownItem)[] = ['segmentName', 'duration', 'startTime', 'notes'];
      const currentFieldIndex = fields.indexOf(field);
      
      if (currentFieldIndex < fields.length - 1) {
        // Move to next field in same row
        const nextField = fields[currentFieldIndex + 1];
        setSelectedCell({ itemId, field: nextField });
        setTimeout(() => {
          cellRefs.current[`${itemId}-${nextField}`]?.focus();
        }, 0);
      } else if (currentIndex < items.length - 1) {
        // Move to first field of next row
        const nextItemId = items[currentIndex + 1].id;
        setSelectedCell({ itemId: nextItemId, field: 'segmentName' });
        setTimeout(() => {
          cellRefs.current[`${nextItemId}-segmentName`]?.focus();
        }, 0);
      }
    }
  };

  const getRowStatus = (item: RundownItem) => {
    const now = formatTime(currentTime);
    const currentSeconds = timeToSeconds(now);
    const startSeconds = timeToSeconds(item.startTime);
    const endSeconds = timeToSeconds(item.endTime);
    
    if (currentSeconds >= startSeconds && currentSeconds < endSeconds) {
      return 'current';
    } else if (currentSeconds >= endSeconds) {
      return 'completed';
    }
    return 'upcoming';
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Play className="h-6 w-6" />
              <h1 className="text-xl font-bold">Live Broadcast Rundown</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Clock className="h-5 w-5" />
              <span className="text-lg font-mono">{formatTime(currentTime)}</span>
            </div>
          </div>
          
          <div className="p-4 border-b bg-gray-50">
            <Button onClick={addRow} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Segment</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-8">#</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 min-w-48">Segment Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-24">Duration</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-24">Start Time</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-24">End Time</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 min-w-64">Notes</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const status = getRowStatus(item);
                  let rowClass = 'bg-white hover:bg-gray-50';
                  
                  if (item.color) {
                    rowClass = `hover:opacity-90`;
                  } else if (status === 'current') {
                    rowClass = 'bg-green-50 border-l-4 border-green-500';
                  } else if (status === 'completed') {
                    rowClass = 'bg-gray-50 text-gray-500';
                  }
                  
                  return (
                    <tr 
                      key={item.id} 
                      className={`border-b border-gray-200 ${rowClass} transition-colors`}
                      style={{ backgroundColor: item.color || undefined }}
                    >
                      <td className="px-4 py-2 text-sm text-gray-600 font-mono">
                        {index + 1}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          ref={el => el && (cellRefs.current[`${item.id}-segmentName`] = el)}
                          type="text"
                          value={item.segmentName}
                          onChange={(e) => updateItem(item.id, 'segmentName', e.target.value)}
                          onClick={() => handleCellClick(item.id, 'segmentName')}
                          onKeyDown={(e) => handleKeyDown(e, item.id, 'segmentName')}
                          className="w-full border-none bg-transparent focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          ref={el => el && (cellRefs.current[`${item.id}-duration`] = el)}
                          type="text"
                          value={item.duration}
                          onChange={(e) => updateItem(item.id, 'duration', e.target.value)}
                          onClick={() => handleCellClick(item.id, 'duration')}
                          onKeyDown={(e) => handleKeyDown(e, item.id, 'duration')}
                          className="w-full border-none bg-transparent focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 text-sm font-mono"
                          placeholder="00:00:00"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          ref={el => el && (cellRefs.current[`${item.id}-startTime`] = el)}
                          type="text"
                          value={item.startTime}
                          onChange={(e) => updateItem(item.id, 'startTime', e.target.value)}
                          onClick={() => handleCellClick(item.id, 'startTime')}
                          onKeyDown={(e) => handleKeyDown(e, item.id, 'startTime')}
                          className="w-full border-none bg-transparent focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 text-sm font-mono"
                          placeholder="00:00:00"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {item.endTime}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <textarea
                          ref={el => el && (cellRefs.current[`${item.id}-notes`] = el)}
                          value={item.notes}
                          onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                          onClick={() => handleCellClick(item.id, 'notes')}
                          onKeyDown={(e) => handleKeyDown(e, item.id, 'notes')}
                          className="w-full border-none bg-transparent focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 text-sm resize-none"
                          rows={1}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center space-x-1">
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowColorPicker(showColorPicker === item.id ? null : item.id)}
                              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            >
                              <Palette className="h-4 w-4" />
                            </Button>
                            
                            {showColorPicker === item.id && (
                              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 min-w-48">
                                <div className="grid grid-cols-3 gap-2">
                                  {colorOptions.map((color) => (
                                    <button
                                      key={color.name}
                                      onClick={() => updateItemColor(item.id, color.value)}
                                      className="flex flex-col items-center p-2 rounded hover:bg-gray-100 text-xs"
                                    >
                                      <div 
                                        className="w-6 h-6 rounded border border-gray-300 mb-1"
                                        style={{ backgroundColor: color.value || '#ffffff' }}
                                      />
                                      {color.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRow(item.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="bg-gray-50 p-4 border-t">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>{items.length} segments total</span>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Current</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded"></div>
                  <span>Completed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Upcoming</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RundownGrid;
