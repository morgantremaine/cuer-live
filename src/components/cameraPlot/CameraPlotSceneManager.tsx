
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Copy, Edit2, Check, X } from 'lucide-react';
import { CameraPlotScene } from '@/hooks/useCameraPlot';

interface CameraPlotSceneManagerProps {
  scenes: CameraPlotScene[];
  activeSceneId: string | undefined;
  onCreateScene: (name: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onDuplicateScene: (sceneId: string) => void;
  onSelectScene: (sceneId: string) => void;
  onRenameScene: (sceneId: string, newName: string) => void;
}

const CameraPlotSceneManager = ({
  scenes,
  activeSceneId,
  onCreateScene,
  onDeleteScene,
  onDuplicateScene,
  onSelectScene,
  onRenameScene
}: CameraPlotSceneManagerProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleCreateScene = () => {
    if (newSceneName.trim()) {
      onCreateScene(newSceneName.trim());
      setNewSceneName('');
      setIsCreating(false);
    }
  };

  const startEditing = (scene: CameraPlotScene) => {
    setEditingSceneId(scene.id);
    setEditingName(scene.name);
  };

  const handleRename = () => {
    if (editingSceneId && editingName.trim()) {
      onRenameScene(editingSceneId, editingName.trim());
    }
    setEditingSceneId(null);
    setEditingName('');
  };

  const cancelEditing = () => {
    setEditingSceneId(null);
    setEditingName('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Scenes</h3>
        <Button
          onClick={() => setIsCreating(true)}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {isCreating && (
        <div className="space-y-2">
          <Input
            value={newSceneName}
            onChange={(e) => setNewSceneName(e.target.value)}
            placeholder="Scene name"
            className="bg-gray-700 border-gray-600 text-white"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateScene()}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleCreateScene}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => {
                setIsCreating(false);
                setNewSceneName('');
              }}
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {scenes.map((scene) => (
          <div
            key={scene.id}
            className={`p-3 rounded border cursor-pointer transition-colors ${
              activeSceneId === scene.id
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
            }`}
            onClick={() => onSelectScene(scene.id)}
          >
            {editingSceneId === scene.id ? (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleRename()}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleRename}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={cancelEditing}
                    size="sm"
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{scene.name}</div>
                  <div className="text-xs opacity-75">
                    {scene.elements.length} element{scene.elements.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="flex gap-1 opacity-75 hover:opacity-100">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(scene);
                    }}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-gray-600"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateScene(scene.id);
                    }}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-gray-600"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  {scenes.length > 1 && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteScene(scene.id);
                      }}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-gray-600 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CameraPlotSceneManager;
