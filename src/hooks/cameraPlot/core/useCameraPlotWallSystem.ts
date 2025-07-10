import { useState, useCallback } from 'react';
import { useWallInteractions } from '../wallSystem/useWallInteractions';
import { CameraPlotScene } from '@/hooks/useCameraPlot';
import { WallSystemElement } from '../wallSystem/types';

interface UseCameraPlotWallSystemProps {
  selectedTool: string;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
  activeScene: CameraPlotScene | undefined;
  updatePlot: (plotId: string, updatedPlot: Partial<CameraPlotScene>) => void;
  setSelectedTool: (tool: string) => void;
}

export const useCameraPlotWallSystem = ({
  selectedTool,
  snapToGrid,
  activeScene,
  updatePlot,
  setSelectedTool
}: UseCameraPlotWallSystemProps) => {
  const wallInteractions = useWallInteractions({
    selectedTool,
    snapToGrid
  });

  // Get or create the wall system element in the scene
  const getWallSystemElement = useCallback((): WallSystemElement | null => {
    if (!activeScene) return null;
    
    const wallElement = activeScene.elements.find(el => (el as any).type === 'wall-system');
    if (!wallElement) return null;
    
    // Use proper type casting through unknown first
    return (wallElement as unknown) as WallSystemElement;
  }, [activeScene]);

  // Update the wall system in the scene
  const updateWallSystem = useCallback(() => {
    if (!activeScene) return;

    const { wallSystem } = wallInteractions.wallDrawing;
    
    // Find existing wall system element or create new one
    let wallSystemElement = getWallSystemElement();
    
    if (!wallSystemElement) {
      // Create new wall system element
      wallSystemElement = {
        id: 'wall-system',
        type: 'wall-system',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        scale: 1,
        label: 'Wall System',
        wallSystemData: wallSystem
      } as WallSystemElement;
      
      const updatedElements = [...activeScene.elements, wallSystemElement as any];
      updatePlot(activeScene.id, { elements: updatedElements });
    } else {
      // Update existing wall system element
      const updatedElements = activeScene.elements.map(el => 
        (el as any).type === 'wall-system' 
          ? { ...el, wallSystemData: wallSystem }
          : el
      );
      updatePlot(activeScene.id, { elements: updatedElements });
    }
  }, [activeScene, wallInteractions.wallDrawing, getWallSystemElement, updatePlot]);

  // Load wall system from scene when scene changes
  const loadWallSystemFromScene = useCallback(() => {
    const wallSystemElement = getWallSystemElement();
    if (wallSystemElement && wallSystemElement.wallSystemData) {
      wallInteractions.wallDrawing.loadWallSystem(wallSystemElement.wallSystemData);
    }
  }, [getWallSystemElement, wallInteractions.wallDrawing]);

  // Auto-save wall system changes
  const handleWallSystemChange = useCallback(() => {
    updateWallSystem();
  }, [updateWallSystem]);

  return {
    wallInteractions,
    wallSystemElement: getWallSystemElement(),
    updateWallSystem,
    loadWallSystemFromScene,
    handleWallSystemChange
  };
};