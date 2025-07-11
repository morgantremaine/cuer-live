
import { useState, useCallback, useRef } from 'react';
import { useCameraPlotScenes } from '../useCameraPlotScenes';
import { CameraPlotScene, CameraElement } from '@/hooks/useCameraPlot';

export const useCameraPlotStateUnified = (rundownId: string) => {
  // Core scene management
  const sceneState = useCameraPlotScenes(rundownId, false);
  
  // Tool state - simplified
  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [showGrid, setShowGrid] = useState(true);

  // Wall drawing state - unified and simplified
  const [wallDrawingState, setWallDrawingState] = useState({
    isDrawing: false,
    currentPath: [] as Array<{ x: number; y: number }>,
    previewPoint: null as { x: number; y: number } | null
  });

  const resetSelection = useCallback(() => {
    setSelectedElements([]);
  }, []);

  const selectElement = useCallback((elementId: string, multiSelect = false) => {
    setSelectedElements(prev => {
      if (!elementId) return [];
      if (multiSelect) {
        return prev.includes(elementId) 
          ? prev.filter(id => id !== elementId)
          : [...prev, elementId];
      }
      return [elementId];
    });
  }, []);

  const toggleGrid = useCallback(() => {
    setShowGrid(prev => !prev);
  }, []);

  // Wall drawing handlers - simplified and coordinated
  const startWallDrawing = useCallback((point: { x: number; y: number }) => {
    setWallDrawingState({
      isDrawing: true,
      currentPath: [point],
      previewPoint: null
    });
  }, []);

  const updateWallPreview = useCallback((point: { x: number; y: number }) => {
    setWallDrawingState(prev => ({
      ...prev,
      previewPoint: point
    }));
  }, []);

  const completeWall = useCallback((finalPoint?: { x: number; y: number }) => {
    if (!sceneState.activeScene) return;

    const { currentPath } = wallDrawingState;
    if (currentPath.length < 1) {
      setWallDrawingState({ isDrawing: false, currentPath: [], previewPoint: null });
      return;
    }

    // Add final point if provided
    const fullPath = finalPoint ? [...currentPath, finalPoint] : currentPath;
    
    if (fullPath.length >= 2) {
      // Create simple wall line elements
      const newElements: CameraElement[] = [];
      const timestamp = Date.now();
      
      for (let i = 0; i < fullPath.length - 1; i++) {
        const start = fullPath[i];
        const end = fullPath[i + 1];
        
        // Create a simple wall line element
        newElements.push({
          id: `wall-${timestamp}-${i}`,
          type: 'wall',
          x: start.x,
          y: start.y,
          width: 4, // Fixed wall thickness
          height: 4, // Fixed wall thickness
          rotation: 0,
          scale: 1,
          label: '',
          // Store end coordinates for wall rendering
          endX: end.x,
          endY: end.y
        } as any);
      }

      const updatedElements = [...sceneState.activeScene.elements, ...newElements];
      sceneState.updatePlot(sceneState.activeScene.id, { elements: updatedElements });
    }

    setWallDrawingState({ isDrawing: false, currentPath: [], previewPoint: null });
    setSelectedTool('select'); // Auto-switch back to select
  }, [wallDrawingState, sceneState, setSelectedTool]);

  const stopDrawingWalls = useCallback(() => {
    setWallDrawingState({ isDrawing: false, currentPath: [], previewPoint: null });
  }, []);

  return {
    // Scene management
    ...sceneState,
    
    // Tool state
    selectedTool,
    selectedElements,
    showGrid,
    setSelectedTool,
    selectElement,
    resetSelection,
    toggleGrid,

    // Wall drawing state - unified
    isDrawingWall: wallDrawingState.isDrawing,
    wallStart: wallDrawingState.currentPath[0] || null,
    wallPreview: wallDrawingState.previewPoint,
    startWallDrawing,
    updateWallPreview,
    completeWall,
    stopDrawingWalls
  };
};
