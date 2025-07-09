
import { useState } from 'react';

export const useCameraPlotTools = () => {
  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [showGrid, setShowGrid] = useState(true);

  const selectElement = (elementId: string, multiSelect = false) => {
    if (multiSelect) {
      setSelectedElements(prev => 
        prev.includes(elementId) 
          ? prev.filter(id => id !== elementId)
          : [...prev, elementId]
      );
    } else {
      setSelectedElements(elementId ? [elementId] : []);
    }
  };

  const toggleGrid = () => {
    setShowGrid(!showGrid);
  };

  const resetSelection = () => {
    setSelectedElements([]);
  };

  console.log('📊 Current selectedElements state:', selectedElements);
  
  return {
    selectedTool,
    selectedElements,
    showGrid,
    setSelectedTool,
    selectElement,
    toggleGrid,
    resetSelection
  };
};
