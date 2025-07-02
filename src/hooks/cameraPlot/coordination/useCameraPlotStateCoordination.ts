
export interface StateCoordinationProps {
  setActiveScene: (sceneId: string) => void;
  setSelectedTool: (tool: string) => void;
  resetSelection: () => void;
  stopDrawingWalls: () => void;
}

export const useCameraPlotStateCoordination = ({
  setActiveScene,
  setSelectedTool,
  resetSelection,
  stopDrawingWalls
}: StateCoordinationProps) => {
  const handleSetActiveScene = (sceneId: string) => {
    setActiveScene(sceneId);
    resetSelection();
    stopDrawingWalls();
  };

  const handleSetSelectedTool = (tool: string) => {
    setSelectedTool(tool);
    if (tool !== 'wall') {
      stopDrawingWalls();
    }
  };

  return {
    handleSetActiveScene,
    handleSetSelectedTool
  };
};
