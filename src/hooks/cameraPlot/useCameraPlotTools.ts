
import { useState } from 'react';

export const useCameraPlotTools = () => {
  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [showGrid, setShowGrid] = useState(true);

  const selectElement = (elementId: string, multiSelect = false) => {
    console.log('🎯 selectElement called:', { elementId, multiSelect, currentSelected: selectedElements });
    
    if (multiSelect) {
      setSelectedElements(prev => {
        const newSelection = prev.includes(elementId) 
          ? prev.filter(id => id !== elementId)
          : [...prev, elementId];
        console.log('🎯 Multi-select result:', { prev, newSelection });
        return newSelection;
      });
    } else {
      const newSelection = elementId ? [elementId] : [];
      console.log('🎯 Single-select result:', { elementId, newSelection });
      setSelectedElements(newSelection);
    }
  };

  const toggleGrid = () => {
    setShowGrid(!showGrid);
  };

  const resetSelection = () => {
    setSelectedElements([]);
  };

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
