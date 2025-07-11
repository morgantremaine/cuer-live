import { useState } from 'react';

export const useCameraPlotTools = () => {
  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [showGrid, setShowGrid] = useState(true);

  const selectElement = (elementId: string, multiSelect = false) => {
    if (!elementId) {
      setSelectedElements([]);
      return;
    }

    if (multiSelect) {
      setSelectedElements(prev => 
        prev.includes(elementId)
          ? prev.filter(id => id !== elementId)
          : [...prev, elementId]
      );
    } else {
      setSelectedElements([elementId]);
    }
  };

  const resetSelection = () => {
    setSelectedElements([]);
  };

  const toggleGrid = () => {
    setShowGrid(prev => !prev);
  };

  return {
    selectedTool,
    selectedElements,
    showGrid,
    setSelectedTool,
    selectElement,
    resetSelection,
    toggleGrid
  };
};