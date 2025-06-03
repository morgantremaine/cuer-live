
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Copy, Edit2 } from 'lucide-react';
import { CameraPlotScene } from '@/hooks/useCameraPlot';

interface CameraPlotSceneManagerProps {
  scenes: CameraPlotScene[];
  activeSceneId?: string;
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

  const handleStartEdit = (scene: CameraPlotScene) => {
    setEditingSceneId(scene.id);
    setEditingName(scene.name);
  };

  const handleSaveEdit = () => {
    if (editingSceneId && editingName.trim()) {
      onRenameScene(editingSceneId, editingName.trim());
      setEditingSceneId(null);
      setEditingName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingSceneId(null);
    setEditingName('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Scenes</h3>
        <Button
          onClick={() => setIsCreating(true)}
          size="sm"
          variant="outline"
          className="text-gray-300 border-gray-600 hover:bg-gray-700"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {isCreating && (
        <div className="space-y-2">
          <Input
            value={newSceneName}
            onChange={(e) => setNewSceneName(e.target.value)}
            placeholder="Scene name"
            className="bg-gray-700 border-gray-600 text-white text-sm"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateScene()}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              onClick={handleCreateScene}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
            >
              Create
            </Button>
            <Button
              onClick={() => setIsCreating(false)}
              size="sm"
              variant="outline"
              className="text-gray-300 border-gray-600 hover:bg-gray-700"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1 max-h-60 overflow-y-auto">
        {scenes.map((scene) => (
          <div
            key={scene.id}
            className={`p-2 rounded border transition-colors ${
              activeSceneId === scene.id
                ? 'bg-blue-600 border-blue-500'
                : 'bg-gray-700 border-gray-600 hover:bg-gray-650'
            }`}
          >
            {editingSceneId === scene.id ? (
              <div className="space-y-2">
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="bg-gray-600 border-gray-500 text-white text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                  autoFocus
                />
                <div className="flex gap-1">
                  <Button
                    onClick={handleSaveEdit}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white flex-1 text-xs"
                  >
                    Save
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    size="sm"
                    variant="outline"
                    className="text-gray-300 border-gray-500 hover:bg-gray-600 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="cursor-pointer text-sm font-medium text-white mb-2"
                  onClick={() => onSelectScene(scene.id)}
                >
                  {scene.name}
                </div>
                <div className="flex gap-1">
                  <Button
                    onClick={() => handleStartEdit(scene)}
                    size="sm"
                    variant="ghost"
                    className="text-gray-300 hover:bg-gray-600 p-1 h-auto"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={() => onDuplicateScene(scene.id)}
                    size="sm"
                    variant="ghost"
                    className="text-gray-300 hover:bg-gray-600 p-1 h-auto"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  {scenes.length > 1 && (
                    <Button
                      onClick={() => onDeleteScene(scene.id)}
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:bg-red-900/20 p-1 h-auto"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CameraPlotSceneManager;
