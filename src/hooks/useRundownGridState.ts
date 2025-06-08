import { useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLocalStorage } from './useLocalStorage';
import { useAuth } from './useAuth';
import { useDebounce } from './useDebounce';
import { useToast } from './use-toast';
import { useUndo } from './useUndo';
import {
  defaultColumnLayout,
  useColumnsManager,
  Column
} from './useColumnsManager';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from '@/types/rundown';
import { useShowcallerState } from './useShowcallerState';
import { useShowcallerRealtime } from './useShowcallerRealtime';
import { useShowcallerPersistence } from './useShowcallerPersistence';

export const useRundownGridState = () => {
  const location = useLocation();
  const rundownId = location.pathname.split('/').pop();
  const { user } = useAuth();
  const { toast } = useToast();

  // Column layout and visibility
  const [columnLayout, setColumnLayout] = useLocalStorage<Column[]>(
    `columnLayout-${rundownId}`,
    defaultColumnLayout
  );
  const {
    columns,
    visibleColumns,
    getColumnWidth,
    updateColumnWidth,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout
  } = useColumnsManager(columnLayout, setColumnLayout);

  // Undo/Redo state
  const {
    undoStack,
    redoStack,
    pushToUndo,
    undo,
    redo,
    canUndo,
    canRedo,
    lastAction
  } = useUndo();

  // Items state
  const [items, setItems] = useState<RundownItem[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [isDraggingMultiple, setIsDraggingMultiple] = useState<boolean>(false);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [hasClipboardData, setHasClipboardData] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [showColorPicker, setShowColorPicker] = useState<{
    itemId: string | null;
    field: string | null;
  }>({ itemId: null, field: null });
  const [rundownTitle, setRundownTitle] = useState<string>('');
  const [rundownStartTime, setRundownStartTime] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isProcessingRealtimeUpdate, setIsProcessingRealtimeUpdate] = useState<boolean>(false);

  const isPlaying = false;
  const timeRemaining = 0;

  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});

  // Local storage for items (debounced)
  const {
    savedRundowns,
    saveRundown,
    deleteRundown,
    hasUnsavedChanges,
    updateSavedSignature
  } = useRundownStorage({
    items,
    columns,
    title: rundownTitle,
    timezone: timezone,
    startTime: rundownStartTime,
    rundownId,
    pushToUndo,
    setItems,
    setIsSaving
  });

  // Debounced save
  const debouncedSave = useDebounce(saveRundown, 500);

  // Showcaller persistence
  const { handleShowcallerStateChange, handleApplyShowcallerState } = useShowcallerPersistence({
    rundownId,
    debouncedSave
  });

  // Realtime clock
  useInterval(() => {
    setCurrentTime(new Date());
  }, 1000);

  // Function to update an item
  const updateItem = useCallback((id: string, field: string, value: any) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          return updatedItem;
        }
        return item;
      });
      return newItems;
    });
  }, []);

  // Function to handle item updates
  const handleUpdateItem = useCallback((id: string, field: string, value: any, skipSave?: boolean) => {
    const originalItem = items.find(item => item.id === id);
    const originalValue = originalItem ? originalItem[field] : undefined;

    updateItem(id, field, value);

    if (!skipSave) {
      markAsChanged(`Updated ${field} for item ${id}`, () => {
        updateItem(id, field, originalValue);
      });
    }
  }, [items, updateItem, markAsChanged]);

  // Function to toggle row selection
  const toggleRowSelection = useCallback((id: string) => {
    setSelectedRows(prevSelectedRows => {
      const newSelectedRows = new Set(prevSelectedRows);
      if (newSelectedRows.has(id)) {
        newSelectedRows.delete(id);
      } else {
        newSelectedRows.add(id);
      }
      return newSelectedRows;
    });
  }, []);

  // Function to handle row selection
  const handleRowSelection = useCallback((id: string, isCtrlPressed: boolean, isShiftPressed: boolean) => {
    setSelectedRows(prevSelectedRows => {
      const newSelectedRows = new Set(prevSelectedRows);
      const itemIndex = items.findIndex(item => item.id === id);

      if (isCtrlPressed) {
        if (newSelectedRows.has(id)) {
          newSelectedRows.delete(id);
        } else {
          newSelectedRows.add(id);
        }
      } else if (isShiftPressed && draggedItemIndex !== null) {
        const currentItemIndex = items.findIndex(item => item.id === id);
        const start = Math.min(draggedItemIndex, currentItemIndex);
        const end = Math.max(draggedItemIndex, currentItemIndex);

        for (let i = start; i <= end; i++) {
          newSelectedRows.add(items[i].id);
        }
      } else {
        if (newSelectedRows.size === 1 && newSelectedRows.has(id)) {
          newSelectedRows.clear();
        } else {
          newSelectedRows.clear();
          newSelectedRows.add(id);
        }
      }

      return newSelectedRows;
    });
  }, [items, draggedItemIndex]);

  // Function to handle drag start
  const handleDragStart = useCallback((index: number) => {
    setDraggedItemIndex(index);
    setIsDraggingMultiple(selectedRows.size > 1);
  }, [selectedRows]);

  // Function to handle drag over
  const handleDragOver = useCallback((index: number) => {
    setDropTargetIndex(index);
  }, []);

  // Function to handle drag leave
  const handleDragLeave = useCallback(() => {
    setDropTargetIndex(null);
  }, []);

  // Function to handle drop
  const handleDrop = useCallback((index: number) => {
    if (draggedItemIndex === null) return;

    setItems(prevItems => {
      const newItems = [...prevItems];
      const [draggedItem] = newItems.splice(draggedItemIndex, 1);
      newItems.splice(index, 0, draggedItem);
      return newItems;
    });

    setDraggedItemIndex(null);
    setDropTargetIndex(null);

    markAsChanged(`Reordered item from ${draggedItemIndex} to ${index}`, () => {
      // Revert the item positions
      setItems(prevItems => {
        const newItems = [...prevItems];
        const [draggedItem] = newItems.splice(index, 1);
        newItems.splice(draggedItemIndex, 0, draggedItem);
        return newItems;
      });
    });
  }, [draggedItemIndex, markAsChanged]);

  // Function to handle copy selected rows
  const handleCopySelectedRows = useCallback(() => {
    const selectedItems = items.filter(item => selectedRows.has(item.id));
    const selectedItemsJSON = JSON.stringify(selectedItems);
    navigator.clipboard.writeText(selectedItemsJSON);
    setHasClipboardData(true);
    toast({
      title: 'Copied',
      description: `${selectedItems.length} row(s) copied to clipboard.`,
    });
  }, [items, selectedRows, toast]);

  // Function to handle paste rows
  const handlePasteRows = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      const pastedItems = JSON.parse(clipboardText);

      if (!Array.isArray(pastedItems)) {
        toast({
          title: 'Paste Failed',
          description: 'Invalid data in clipboard.',
          variant: 'destructive',
        });
        return;
      }

      const newItems = pastedItems.map((item: RundownItem) => ({
        ...item,
        id: crypto.randomUUID(),
      }));

      setItems(prevItems => {
        const newItemsArray = [...prevItems, ...newItems];
        return newItemsArray;
      });

      markAsChanged(`Pasted ${newItems.length} row(s) from clipboard`, () => {
        setItems(prevItems => {
          const revertedItems = prevItems.slice(0, prevItems.length - newItems.length);
          return revertedItems;
        });
      });

      toast({
        title: 'Pasted',
        description: `${newItems.length} row(s) pasted from clipboard.`,
      });
    } catch (error) {
      toast({
        title: 'Paste Failed',
        description: 'Could not read data from clipboard.',
        variant: 'destructive',
      });
    }
  }, [markAsChanged, toast]);

  // Function to handle delete selected rows
  const handleDeleteSelectedRows = useCallback(() => {
    const selectedItems = items.filter(item => selectedRows.has(item.id));

    setItems(prevItems => {
      const newItems = prevItems.filter(item => !selectedRows.has(item.id));
      return newItems;
    });

    clearSelection();

    markAsChanged(`Deleted ${selectedItems.length} row(s)`, () => {
      setItems(prevItems => {
        const revertedItems = [...prevItems];
        selectedItems.forEach(item => {
          revertedItems.push(item);
        });
        return revertedItems;
      });
    });

    toast({
      title: 'Deleted',
      description: `${selectedItems.length} row(s) deleted.`,
    });
  }, [items, selectedRows, clearSelection, markAsChanged, toast]);

  // Function to clear selection
  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  const addRow = useCallback(() => {
    const newItem: RundownItem = {
      id: crypto.randomUUID(),
      type: 'regular',
      rowNumber: '',
      name: '',
      startTime: '',
      duration: '',
      endTime: '',
      elapsedTime: '',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '',
      isFloating: false,
      customFields: {}
    };

    setItems(prevItems => {
      const newItems = [...prevItems, newItem];
      return newItems;
    });

    markAsChanged('Added new row', () => {
      setItems(prevItems => {
        const revertedItems = prevItems.slice(0, prevItems.length - 1);
        return revertedItems;
      });
    });
  }, [markAsChanged]);

  const addHeader = useCallback(() => {
    const newHeader: RundownItem = {
      id: crypto.randomUUID(),
      type: 'header',
      rowNumber: '',
      name: 'New Header',
      startTime: '',
      duration: '',
      endTime: '',
      elapsedTime: '',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '',
      isFloating: false,
      customFields: {}
    };

    setItems(prevItems => {
      const newItems = [...prevItems, newHeader];
      return newItems;
    });

    markAsChanged('Added new header', () => {
      setItems(prevItems => {
        const revertedItems = prevItems.slice(0, prevItems.length - 1);
        return revertedItems;
      });
    });
  }, [markAsChanged]);

  const deleteRow = useCallback((id: string) => {
    const deletedItem = items.find(item => item.id === id);

    setItems(prevItems => {
      const newItems = prevItems.filter(item => item.id !== id);
      return newItems;
    });

    markAsChanged(`Deleted row ${id}`, () => {
      setItems(prevItems => {
        const revertedItems = [...prevItems, deletedItem!];
        return revertedItems;
      });
    });
  }, [items, markAsChanged]);

  const toggleFloatRow = useCallback((id: string) => {
    const originalItem = items.find(item => item.id === id);
    const originalValue = originalItem ? originalItem.isFloating : false;

    setItems(prevItems => {
      const newItems = prevItems.map(item => {
        if (item.id === id) {
          return { ...item, isFloating: !item.isFloating };
        }
        return item;
      });
      return newItems;
    });

    markAsChanged(`Toggled float for row ${id}`, () => {
      setItems(prevItems => {
        const newItems = prevItems.map(item => {
          if (item.id === id) {
            return { ...item, isFloating: originalValue };
          }
          return item;
        });
        return newItems;
      });
    });
  }, [items, markAsChanged]);

  const selectColor = useCallback((id: string, color: string) => {
    handleUpdateItem(id, 'color', color);
    setShowColorPicker({ itemId: null, field: null });
  }, [handleUpdateItem]);

  const handleToggleColorPicker = useCallback((itemId: string | null, field: string | null) => {
    setShowColorPicker({ itemId, field });
  }, []);

  const getRowNumber = useCallback((index: number) => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let letterIndex = 0;
    let numberIndex = 0;
    
    for (let i = 0; i <= index; i++) {
      if (items[i]?.type === 'header') {
        letterIndex++;
        numberIndex = 0;
      } else {
        numberIndex++;
      }
    }
    
    if (items[index]?.type === 'header') {
      return letters[letterIndex - 1] || 'A';
    } else {
      const letter = letters[letterIndex - 1] || 'A';
      return `${letter}${numberIndex}`;
    }
  }, [items]);

  const getRowStatus = useCallback((id: string) => {
    const item = items.find(item => item.id === id);
    return item?.status || 'upcoming';
  }, [items]);

  const calculateHeaderDuration = useCallback((index: number) => {
    let totalDuration = 0;
    let i = index + 1;

    while (i < items.length && items[i].type !== 'header') {
      const durationParts = items[i].duration.split(':').map(Number);
      let durationInSeconds = 0;

      if (durationParts.length === 2) {
        durationInSeconds = durationParts[0] * 60 + durationParts[1];
      } else if (durationParts.length === 3) {
        durationInSeconds = durationParts[0] * 3600 + durationParts[1] * 60 + durationParts[2];
      }

      totalDuration += durationInSeconds;
      i++;
    }

    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);
    const seconds = totalDuration % 60;

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }, [items]);

  const calculateTotalRuntime = useCallback(() => {
    let totalRuntimeInSeconds = 0;

    items.forEach(item => {
      const timeParts = item.duration.split(':').map(Number);
      let seconds = 0;

      if (timeParts.length === 2) {
        seconds = timeParts[0] * 60 + timeParts[1];
      } else if (timeParts.length === 3) {
        seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
      }

      totalRuntimeInSeconds += seconds;
    });

    const hours = Math.floor(totalRuntimeInSeconds / 3600);
    const minutes = Math.floor((totalRuntimeInSeconds % 3600) / 60);
    const seconds = totalRuntimeInSeconds % 60;

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }, [items]);

  const calculateEndTime = useCallback(() => {
    if (!rundownStartTime) return 'Invalid Date';

    let totalRuntimeInSeconds = 0;

    items.forEach(item => {
      const timeParts = item.duration.split(':').map(Number);
      let seconds = 0;

      if (timeParts.length === 2) {
        seconds = timeParts[0] * 60 + timeParts[1];
      } else if (timeParts.length === 3) {
        seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
      }

      totalRuntimeInSeconds += seconds;
    });

    const [startHours, startMinutes] = rundownStartTime.split(':').map(Number);
    let startTime = new Date();
    startTime.setHours(startHours);
    startTime.setMinutes(startMinutes);
    startTime.setSeconds(0);
    startTime.setMilliseconds(0);

    let endTime = new Date(startTime.getTime() + totalRuntimeInSeconds * 1000);

    const formattedHours = String(endTime.getHours()).padStart(2, '0');
    const formattedMinutes = String(endTime.getMinutes()).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}`;
  }, [items, rundownStartTime]);

  const markAsChanged = useCallback((actionName: string, revertAction: () => void) => {
    pushToUndo(actionName, revertAction);
  }, [pushToUndo]);

  // Showcaller realtime setup
  const { trackOwnUpdate } = useShowcallerRealtime({
    rundownId,
    onShowcallerStateReceived: handleApplyShowcallerState,
    enabled: !!rundownId && !!user
  });

  // Showcaller state management
  const {
    showcallerState,
    play,
    pause,
    forward,
    backward,
    isController: isShowcallerController
  } = useShowcallerState({
    items,
    updateItem: handleUpdateItem,
    onShowcallerStateChange: handleShowcallerStateChange,
    userId: user?.id,
    trackOwnUpdate // Pass the tracking function
  });

  return {
    items,
    setItems,
    visibleColumns,
    columns,
    currentTime,
    showColorPicker,
    cellRefs,
    selectedRows,
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    currentSegmentId: showcallerState.currentSegmentId,
    hasClipboardData,
    getColumnWidth,
    updateColumnWidth,
    getRowNumber,
    getRowStatus,
    calculateHeaderDuration,
    updateItem,
    handleUpdateItem,
    toggleRowSelection,
    handleRowSelection,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleCopySelectedRows,
    handleDeleteSelectedRows,
    handlePasteRows,
    clearSelection,
    addRow,
    addHeader,
    deleteRow,
    toggleFloatRow,
    selectColor,
    handleToggleColorPicker,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    hasUnsavedChanges,
    isSaving,
    rundownTitle,
    setRundownTitle,
    rundownStartTime,
    setRundownStartTime,
    timezone,
    setTimezone,
    calculateTotalRuntime,
    calculateEndTime,
    markAsChanged,
    handleUndo: undo,
    handleRedo: redo,
    canUndo,
    canRedo,
    lastAction,
    showColumnManager: false,
    setShowColumnManager: () => {},
    play,
    pause,
    forward,
    backward,
    isPlaying,
    timeRemaining,
    rundownId,
    isConnected: false,
    isProcessingRealtimeUpdate
  };
};

// Hook to manage clock interval
function useInterval(callback: () => void, delay: number) {
  const savedCallback = useRef<() => void>();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}
