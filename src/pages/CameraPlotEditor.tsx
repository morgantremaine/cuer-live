import React, { useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import { useCameraPlotEditor } from '@/hooks/useCameraPlotEditor';
import { useCameraPlotZoom } from '@/hooks/cameraPlot/useCameraPlotZoom';
import CameraPlotCanvas from '@/components/cameraPlot/CameraPlotCanvas';
import EnhancedToolbar from '@/components/cameraPlot/tools/EnhancedToolbar';
import FurnitureLibrary from '@/components/cameraPlot/furniture/FurnitureLibrary';
import CameraPlotSceneManager from '@/components/cameraPlot/CameraPlotSceneManager';

const CameraPlotEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedColor, setSelectedColor] = React.useState('#3B82F6');

  const {
    scenes,
    activeScene,
    selectedTool,
    selectedElements,
    showGrid,
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
    updatePlot,
    toggleGrid,
    snapToGrid
  } = useCameraPlotEditor(id || '');

  const {
    zoom,
    pan,
    zoomIn,
    zoomOut,
    resetZoom,
    updatePan
  } = useCameraPlotZoom();

  // Create initial scene if none exist
  useEffect(() => {
    if (scenes.length === 0) {
      createScene('Scene 1');
    }
  }, [scenes.length, createScene]);

  const handleBackToDashboard = () => {
    navigate(`/rundown/${id}/blueprint`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFurnitureSelect = (furniture: any) => {
    setSelectedTool('furniture');
    // Store furniture type for placement
    addElement(furniture.id, 0, 0);
  };

  const handleCopy = () => {
    selectedElements.forEach(elementId => {
      duplicateElement(elementId);
    });
  };

  const handleDelete = () => {
    selectedElements.forEach(elementId => {
      deleteElement(elementId);
    });
  };

  const handleDuplicate = () => {
    selectedElements.forEach(elementId => {
      duplicateElement(elementId);
    });
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-canvas {
            transform: none !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
          }
          body {
            background: white !important;
          }
          .print-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 16px;
            text-align: center;
            color: black;
          }
          .print-scene-name {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 12px;
            text-align: center;
            color: black;
          }
        }
      `}</style>
      
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Print-only header */}
        <div className="print-only hidden">
          <div className="print-title">Camera Plot - Blueprint</div>
          {activeScene && (
            <div className="print-scene-name">{activeScene.name}</div>
          )}
        </div>

        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4 no-print">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleBackToDashboard}
                variant="outline"
                size="sm"
                className="text-white border-gray-600 hover:bg-gray-700 bg-transparent"
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
                className="text-white border-gray-600 hover:bg-gray-700 bg-transparent"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print View
              </Button>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(100vh-73px)]">
          {/* Left Sidebar - Tools */}
          <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 flex flex-col no-print overflow-y-auto">
            <EnhancedToolbar
              selectedTool={selectedTool}
              selectedElements={selectedElements}
              onToolSelect={setSelectedTool}
              onFurnitureSelect={handleFurnitureSelect}
              showGrid={showGrid}
              onToggleGrid={toggleGrid}
              zoom={zoom}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onResetZoom={resetZoom}
              onColorChange={setSelectedColor}
              selectedColor={selectedColor}
              onCopy={handleCopy}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
            
            <div className="mt-6">
              <FurnitureLibrary
                onSelectFurniture={handleFurnitureSelect}
                selectedTool={selectedTool}
              />
            </div>
            
            <div className="mt-6">
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
              showGrid={showGrid}
              zoom={zoom}
              pan={pan}
              updatePan={updatePan}
              onAddElement={addElement}
              onUpdateElement={updateElement}
              onDeleteElement={deleteElement}
              onDuplicateElement={duplicateElement}
              onSelectElement={selectElement}
              snapToGrid={snapToGrid}
              updatePlot={updatePlot}
              setSelectedTool={setSelectedTool}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default CameraPlotEditor;
