import React, { useState, useRef, useEffect } from 'react';
import { Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RundownHeader from './RundownHeader';
import RundownRow from './RundownRow';
import RundownFooter from './RundownFooter';
import ColumnManager from './ColumnManager';

interface RundownItem {
  id: string;
  segmentName: string;
  duration: string;
  startTime: string;
  endTime: string;
  notes: string;
  status: 'upcoming' | 'current' | 'completed';
  color?: string;
  isHeader?: boolean;
  customFields?: { [key: string]: string };
}

interface Column {
  id: string;
  name: string;
  key: string;
  width: string;
  isCustom: boolean;
  isEditable: boolean;
}

const RundownGrid = () => {
  const [items, setItems] = useState<RundownItem[]>([
    {
      id: '1',
      segmentName: 'A',
      duration: '',
      startTime: '',
      endTime: '',
      notes: '',
      status: 'upcoming',
      isHeader: true
    },
    {
      id: '2',
      segmentName: 'Opening Headlines',
      duration: '00:02:30',
      startTime: '18:00:00',
      endTime: '18:02:30',
      notes: 'Live from studio A',
      status: 'upcoming'
    },
    {
      id: '3',
      segmentName: 'Weather Report',
      duration: '00:03:00',
      startTime: '18:02:30',
      endTime: '18:05:30',
      notes: 'Green screen setup',
      status: 'upcoming'
    },
    {
      id: '4',
      segmentName: 'Breaking News',
      duration: '00:05:00',
      startTime: '18:05:30',
      endTime: '18:10:30',
      notes: 'VTR ready',
      status: 'upcoming'
    }
  ]);

  const [columns, setColumns] = useState<Column[]>([
    { id: 'segmentName', name: 'Segment Name', key: 'segmentName', width: 'min-w-48', isCustom: false, isEditable: true },
    { id: 'duration', name: 'Duration', key: 'duration', width: 'w-24', isCustom: false, isEditable: true },
    { id: 'startTime', name: 'Start Time', key: 'startTime', width: 'w-24', isCustom: false, isEditable: true },
    { id: 'endTime', name: 'End Time', key: 'endTime', width: 'w-24', isCustom: false, isEditable: false },
    { id: 'notes', name: 'Notes', key: 'notes', width: 'min-w-64', isCustom: false, isEditable: true }
  ]);

  const [selectedCell, setSelectedCell] = useState<{ itemId: string; field: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  const updateItem = (id: string, field: string, value: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        let updatedItem = { ...item };
        
        if (field.startsWith('custom_')) {
          updatedItem.customFields = { ...updatedItem.customFields, [field]: value };
        } else {
          updatedItem = { ...updatedItem, [field]: value };
        }
        
        if (!item.isHeader && (field === 'startTime' || field === 'duration')) {
          updatedItem.endTime = calculateEndTime(updatedItem.startTime, updatedItem.duration);
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const handleToggleColorPicker = (itemId: string) => {
    setShowColorPicker(showColorPicker === itemId ? null : itemId);
  };

  const handleColorSelect = (id: string, color: string) => {
    updateItem(id, 'color', color);
    setShowColorPicker(null);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) {
      setDraggedItemIndex(null);
      return;
    }

    const newItems = [...items];
    const draggedItem = newItems[draggedItemIndex];
    
    // Remove the dragged item from its original position
    newItems.splice(draggedItemIndex, 1);
    
    // Insert the dragged item at the new position
    newItems.splice(dropIndex, 0, draggedItem);
    
    setItems(newItems);
    setDraggedItemIndex(null);
  };

  const addRow = () => {
    const newId = (items.length + 1).toString();
    const lastItem = items[items.length - 1];
    const newStartTime = lastItem && !lastItem.isHeader ? lastItem.endTime : '18:00:00';
    
    const newItem: RundownItem = {
      id: newId,
      segmentName: 'New Segment',
      duration: '00:01:00',
      startTime: newStartTime,
      endTime: calculateEndTime(newStartTime, '00:01:00'),
      notes: '',
      status: 'upcoming',
      customFields: {}
    };
    
    setItems(prev => [...prev, newItem]);
  };

  const addHeader = () => {
    const newId = (items.length + 1).toString();
    const nextLetter = String.fromCharCode(65 + getNextHeaderLetter());
    
    const newHeader: RundownItem = {
      id: newId,
      segmentName: nextLetter,
      duration: '',
      startTime: '',
      endTime: '',
      notes: '',
      status: 'upcoming',
      isHeader: true,
      customFields: {}
    };
    
    setItems(prev => [...prev, newHeader]);
  };

  const getNextHeaderLetter = () => {
    const headers = items.filter(item => item.isHeader);
    return headers.length;
  };

  const getRowNumber = (index: number) => {
    if (items[index].isHeader) {
      return items[index].segmentName;
    }

    let currentHeaderLetter = 'A';
    let rowCount = 0;

    for (let i = 0; i <= index; i++) {
      if (items[i].isHeader) {
        currentHeaderLetter = items[i].segmentName;
        rowCount = 0;
      } else {
        rowCount++;
      }
    }

    return `${currentHeaderLetter}${rowCount}`;
  };

  const deleteRow = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleCellClick = (itemId: string, field: string) => {
    setSelectedCell({ itemId, field });
  };

  const handleKeyDown = (e: React.KeyboardEvent, itemId: string, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentIndex = items.findIndex(item => item.id === itemId);
      const editableColumns = columns.filter(col => col.isEditable);
      const currentFieldIndex = editableColumns.findIndex(col => col.key === field || `custom_${col.key}` === field);
      
      if (currentFieldIndex < editableColumns.length - 1) {
        const nextField = editableColumns[currentFieldIndex + 1];
        const nextFieldKey = nextField.isCustom ? `custom_${nextField.key}` : nextField.key;
        setSelectedCell({ itemId, field: nextFieldKey });
        setTimeout(() => {
          cellRefs.current[`${itemId}-${nextFieldKey}`]?.focus();
        }, 0);
      } else if (currentIndex < items.length - 1) {
        const nextItemId = items[currentIndex + 1].id;
        const firstField = editableColumns[0];
        const firstFieldKey = firstField.isCustom ? `custom_${firstField.key}` : firstField.key;
        setSelectedCell({ itemId: nextItemId, field: firstFieldKey });
        setTimeout(() => {
          cellRefs.current[`${nextItemId}-${firstFieldKey}`]?.focus();
        }, 0);
      }
    }
  };

  const getRowStatus = (item: RundownItem) => {
    const formatTime = (time: Date) => {
      return time.toLocaleTimeString('en-US', { hour12: false });
    };
    
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

  const handleAddColumn = (name: string) => {
    const newColumn: Column = {
      id: `custom_${Date.now()}`,
      name,
      key: `custom_${Date.now()}`,
      width: 'min-w-32',
      isCustom: true,
      isEditable: true
    };
    setColumns(prev => [...prev, newColumn]);
  };

  const handleReorderColumns = (newColumns: Column[]) => {
    setColumns(newColumns);
  };

  const handleDeleteColumn = (columnId: string) => {
    setColumns(prev => prev.filter(col => col.id !== columnId));
    // Remove the custom field data from all items
    setItems(prev => prev.map(item => {
      if (item.customFields) {
        const { [columnId]: removed, ...rest } = item.customFields;
        return { ...item, customFields: rest };
      }
      return item;
    }));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <RundownHeader currentTime={currentTime} />
          
          <div className="p-4 border-b bg-gray-50 flex space-x-2">
            <Button onClick={addRow} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Segment</span>
            </Button>
            <Button onClick={addHeader} variant="outline" className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Header</span>
            </Button>
            <Button onClick={() => setShowColumnManager(true)} variant="outline" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Manage Columns</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white w-8">#</th>
                  {columns.map((column) => (
                    <th key={column.id} className={`px-4 py-3 text-left text-sm font-semibold text-white ${column.width}`}>
                      {column.name}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <RundownRow
                    key={item.id}
                    item={item}
                    index={index}
                    rowNumber={getRowNumber(index)}
                    status={getRowStatus(item)}
                    showColorPicker={showColorPicker}
                    cellRefs={cellRefs}
                    columns={columns}
                    onUpdateItem={updateItem}
                    onCellClick={handleCellClick}
                    onKeyDown={handleKeyDown}
                    onToggleColorPicker={handleToggleColorPicker}
                    onColorSelect={handleColorSelect}
                    onDeleteRow={deleteRow}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    isDragging={draggedItemIndex === index}
                  />
                ))}
              </tbody>
            </table>
          </div>
          
          <RundownFooter totalSegments={items.filter(item => !item.isHeader).length} />
        </div>
      </div>

      {showColumnManager && (
        <ColumnManager
          columns={columns}
          onAddColumn={handleAddColumn}
          onReorderColumns={handleReorderColumns}
          onDeleteColumn={handleDeleteColumn}
          onClose={() => setShowColumnManager(false)}
        />
      )}
    </div>
  );
};

export default RundownGrid;
