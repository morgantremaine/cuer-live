
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Copy, Plus, Edit2, Check, X } from 'lucide-react';
import { CameraPlotScene } from '@/hooks/useCameraPlot';

interface CameraPlotSceneManagerProps {
  scenes: CameraPlotScene[];
  activeSceneId?: string;
  onCreateScene: (name: string) => CameraPlotScene | null;
  onDeleteScene: (sceneId: string) => void;
  onDuplicateScene: (sceneId: string) => CameraPlotScene | null;
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
  const [newSceneName, setNewSceneName] = useState('');
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleCreateScene = () => {
    if (newSceneName.trim()) {
      const newScene = onCreateScene(newSceneName.trim());
      if (newScene) {
        // Automatically switch to the new scene
        onSelectScene(newScene.id);
      }
      setNewSceneName('');
    }
  };

  const handleDuplicateScene = (sceneId: string) => {
    const duplicatedScene = onDuplicateScene(sceneId);
    if (duplicatedScene) {
      // Automatically switch to the duplicated scene
      onSelectScene(duplicatedScene.id);
    }
  };

  const startEditing = (scene: CameraPlotScene) => {
    setEditingSceneId(scene.id);
    setEditingName(scene.name);
  };

  const cancelEditing = () => {
    setEditingSceneId(null);
    setEditingName('');
  };

  const saveEditing = () => {
    if (editingSceneId && editingName.trim()) {
      onRenameScene(editingSceneId, editingName.trim());
    }
    cancelEditing();
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-2">Scenes</h3>
        
        {/* Create new scene */}
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Scene name"
            value={newSceneName}
            onChange={(e) => setNewSceneName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateScene()}
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          />
          <Button
            onClick={handleCreateScene}
            size="sm"
            disabled={!newSceneName.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Scene list */}
        <div className="space-y-2">
          {scenes.map((scene) => (
            <div
              key={scene.id}
              className={`p-2 rounded border transition-colors ${
                activeSceneId === scene.id
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {editingSceneId === scene.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') saveEditing();
                      if (e.key === 'Escape') cancelEditing();
                    }}
                    className="bg-gray-800 border-gray-600 text-white text-sm"
                    autoFocus
                  />
                  <Button
                    onClick={saveEditing}
                    size="sm"
                    variant="ghost"
                    className="p-1 h-6 w-6 text-green-400 hover:text-green-300"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={cancelEditing}
                    size="sm"
                    variant="ghost"
                    className="p-1 h-6 w-6 text-red-400 hover:text-red-300"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => onSelectScene(scene.id)}
                    className="flex-1 text-left text-sm font-medium truncate"
                  >
                    {scene.name}
                  </button>
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => startEditing(scene)}
                      size="sm"
                      variant="ghost"
                      className="p-1 h-6 w-6 text-gray-400 hover:text-gray-300"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => handleDuplicateScene(scene.id)}
                      size="sm"
                      variant="ghost"
                      className="p-1 h-6 w-6 text-gray-400 hover:text-gray-300"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    {scenes.length > 1 && (
                      <Button
                        onClick={() => onDeleteScene(scene.id)}
                        size="sm"
                        variant="ghost"
                        className="p-1 h-6 w-6 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                {scene.elements?.length || 0} elements
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CameraPlotSceneManager;
