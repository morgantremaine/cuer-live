
import React, { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import { useCameraPlotEditor } from '@/hooks/useCameraPlotEditor';
import CameraPlotCanvas from '@/components/cameraPlot/CameraPlotCanvas';
import CameraPlotToolbar from '@/components/cameraPlot/CameraPlotToolbar';
import CameraPlotSceneManager from '@/components/cameraPlot/CameraPlotSceneManager';

const CameraPlotEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);

  const {
    scenes,
    activeScene,
    selectedTool,
    selectedElements,
    isDrawingWall,
    wallStart,
    setSelectedTool,
    addElement,
    updateElement,
    deleteElement,
    duplicateElement,
    selectElement,
    createScene,
    deleteScene,
    duplicateScene,
    setActiveScene,
    updateSceneName,
    stopDrawingWalls
  } = useCameraPlotEditor(id || '');

  const handleBackToDashboard = () => {
    navigate(`/blueprint/${id}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDuplicateElement = (elementId: string) => {
    duplicateElement(elementId);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleBackToDashboard}
              variant="outline"
              size="sm"
              className="text-white border-gray-600 hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blueprint
            </Button>
            <h1 className="text-xl font-bold">Camera Plot Editor</h1>
            {activeScene && (
              <span className="text-gray-400">- {activeScene.name}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="text-white border-gray-600 hover:bg-gray-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print View
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Sidebar - Tools */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 flex flex-col">
          <CameraPlotToolbar
            selectedTool={selectedTool}
            onToolSelect={setSelectedTool}
            isDrawingWall={isDrawingWall}
            onStopDrawingWalls={stopDrawingWalls}
          />
          
          <div className="mt-8">
            <CameraPlotSceneManager
              scenes={scenes}
              activeSceneId={activeScene?.id}
              onCreateScene={createScene}
              onDeleteScene={deleteScene}
              onDuplicateScene={duplicateScene}
              onSelectScene={setActiveScene}
              onRenameScene={updateSceneName}
            />
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 relative overflow-hidden">
          <CameraPlotCanvas
            ref={canvasRef}
            scene={activeScene}
            selectedTool={selectedTool}
            selectedElements={selectedElements}
            isDrawingWall={isDrawingWall}
            wallStart={wallStart}
            onAddElement={addElement}
            onUpdateElement={updateElement}
            onDeleteElement={deleteElement}
            onSelectElement={selectElement}
          />
        </div>
      </div>
    </div>
  );
};

export default CameraPlotEditor;
